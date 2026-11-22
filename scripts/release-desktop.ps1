param(
    [string]$Version = "",
    [string]$ReleaseNotes = "",
    [switch]$SkipNextBuild = $false,
    [switch]$UploadS3 = $false,
    [switch]$Debug = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RAD SUITE AUTOMATED DESKTOP RELEASE PIPELINE           " -ForegroundColor Cyan
Write-Host "   Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')   " -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

# Step 1: Toolchain Verification
Write-Host ""
Write-Host "[Step 1/7] Verifying toolchain dependencies..." -ForegroundColor Yellow
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "Cargo/Rust is required. Please install Rust from https://rustup.rs"
}
$cargoVer = cargo --version
Write-Host "  * Rust: $cargoVer" -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required."
}
$nodeVer = node --version
Write-Host "  * Node: $nodeVer" -ForegroundColor Green

# Step 2: Database Safeguard (AGENTS.md Rule 6)
Write-Host ""
Write-Host "[Step 2/7] Safeguarding local workstation database..." -ForegroundColor Yellow
$backupDir = Join-Path $projectRoot "db_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
$dbPath = Join-Path $projectRoot "radsuite.db"
if (Test-Path $dbPath) {
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $dbPath -Destination "$backupDir\radsuite_prebuild_$ts.db"
    if (Test-Path "$projectRoot\radsuite.db-wal") { Copy-Item "$projectRoot\radsuite.db-wal" -Destination "$backupDir\radsuite_prebuild_$ts.db-wal" }
    if (Test-Path "$projectRoot\radsuite.db-shm") { Copy-Item "$projectRoot\radsuite.db-shm" -Destination "$backupDir\radsuite_prebuild_$ts.db-shm" }
    Write-Host "  * Database backed up: db_backups\radsuite_prebuild_$ts.db" -ForegroundColor Green
}

# Step 3: Version Bump (if specified)
Write-Host ""
Write-Host "[Step 3/7] Synchronizing application version..." -ForegroundColor Yellow
$pkgJsonPath = Join-Path $projectRoot "package.json"
$pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$currentVersion = $pkg.version

if ($Version -and ($Version -ne $currentVersion)) {
    Write-Host "  * Bumping version: $currentVersion -> $Version" -ForegroundColor Cyan
    $pkg.version = $Version
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgJsonPath

    $tauriConfPath = Join-Path $projectRoot "src-tauri\tauri.conf.json"
    $tauriConf = Get-Content $tauriConfPath -Raw | ConvertFrom-Json
    $tauriConf.version = $Version
    $tauriConf | ConvertTo-Json -Depth 10 | Set-Content $tauriConfPath
    $releaseVersion = $Version
} else {
    $releaseVersion = $currentVersion
    Write-Host "  * Using existing version: $releaseVersion" -ForegroundColor Gray
}

# Step 4: Next.js Standalone Compilation & Node.js Runtime Embedding
Write-Host ""
Write-Host "[Step 4/7] Packaging standalone server & portable Node.js runtime..." -ForegroundColor Yellow

if (-not $SkipNextBuild) {
    $env:BUILD_TARGET = "desktop"
    npm run build
    Write-Host "  * Next.js production build succeeded." -ForegroundColor Green
} else {
    Write-Host "  * Skipping Next.js build as requested." -ForegroundColor DarkGray
}

$standaloneDir = Join-Path $projectRoot ".next\standalone"
$staticSrc = Join-Path $projectRoot ".next\static"
$staticDest = Join-Path $standaloneDir ".next\static"
$publicSrc = Join-Path $projectRoot "public"
$publicDest = Join-Path $standaloneDir "public"

if (Test-Path $staticSrc) {
    if (-not (Test-Path (Split-Path $staticDest))) {
        New-Item -ItemType Directory -Path (Split-Path $staticDest) -Force | Out-Null
    }
    Copy-Item -Path $staticSrc -Destination $staticDest -Recurse -Force
}

if (Test-Path $publicSrc) {
    Copy-Item -Path $publicSrc -Destination $publicDest -Recurse -Force
    # Exclude release installers from being bundled inside the desktop app
    $stagedReleases = Join-Path $publicDest "releases"
    if (Test-Path $stagedReleases) {
        Remove-Item -Path $stagedReleases -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
$standaloneNode = Join-Path $standaloneDir "node.exe"
Copy-Item -Path $nodePath -Destination $standaloneNode -Force
Write-Host "  * Embedded Node.js runtime." -ForegroundColor Green

$tauriResourcesDir = Join-Path $projectRoot "src-tauri\resources\standalone"
if (-not (Test-Path $tauriResourcesDir)) {
    New-Item -ItemType Directory -Path $tauriResourcesDir -Force | Out-Null
}
robocopy $standaloneDir $tauriResourcesDir /E /XD releases /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
# Clean up any previously nested releases in resources
$stagedNestedReleases = Join-Path $tauriResourcesDir "public\releases"
if (Test-Path $stagedNestedReleases) {
    Remove-Item -Path $stagedNestedReleases -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "  * Standalone distribution successfully staged for Tauri (excluding releases)." -ForegroundColor Green

$outDir = Join-Path $projectRoot "out"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $fallbackHtml = '<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Rad Suite Workstation</title><meta http-equiv="refresh" content="0; url=http://localhost:3780/desktop" /><style>body { background: #070d19; color: #38bdf8; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }</style></head><body><div style="text-align: center;"><h2>Connecting to Rad Suite Diagnostic Engine...</h2><p style="color: #94a3b8; font-size: 13px;">Starting GPU Viewport on port 3780</p></div></body></html>'
    Set-Content -Path (Join-Path $outDir "index.html") -Value $fallbackHtml
}

# Step 5: Native Tauri NSIS Build
Write-Host ""
Write-Host "[Step 5/7] Compiling native Windows setup installer..." -ForegroundColor Yellow
# Ensure no lingering background makensis holds locks
Get-Process -Name makensis -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if ($Debug) {
    npx @tauri-apps/cli build --debug
} else {
    npx @tauri-apps/cli build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri build failed with exit code $LASTEXITCODE"
}

# Step 6: Artifact Extraction, Hashing & Manifest Generation
Write-Host ""
Write-Host "[Step 6/7] Staging release artifacts and computing checksums..." -ForegroundColor Yellow
$nsisDir = Join-Path $projectRoot "src-tauri\target\release\bundle\nsis"
$installers = Get-ChildItem -Path $nsisDir -Filter "*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if (-not $installers -or $installers.Count -eq 0) {
    Write-Error "No .exe installer was generated in $nsisDir."
}

$latestInstaller = $installers[0]
$installerSize = $latestInstaller.Length
$installerSizeMb = [Math]::Round($installerSize / 1048576, 2)
$installerHash = (Get-FileHash -Path $latestInstaller.FullName -Algorithm SHA256).Hash.ToLower()

$publicReleasesDir = Join-Path $projectRoot "public\releases"
if (-not (Test-Path $publicReleasesDir)) {
    New-Item -ItemType Directory -Path $publicReleasesDir -Force | Out-Null
}

# PRUNE SUPERSEDED VERSIONS: Keep ONLY the latest build in public\releases
Get-ChildItem -Path $publicReleasesDir -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne $latestInstaller.Name } | ForEach-Object {
    Write-Host "  * Pruning superseded local installer: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
}

$stagedExePath = Join-Path $publicReleasesDir $latestInstaller.Name
Copy-Item $latestInstaller.FullName -Destination $stagedExePath -Force
Write-Host "  * Copied latest installer to public\releases\$($latestInstaller.Name)" -ForegroundColor Green

if (-not $ReleaseNotes) {
    $ReleaseNotes = "Rad Suite Diagnostic Radiology Workstation v$releaseVersion`n- High-performance standalone desktop bundle`n- Gigabit LAN Hospital PACS harvester & DICOM engine`n- Punjab HMIS Zero-Submit Invariant draft safe locking`n- Personal Google Drive DICOM case sync`n- Unified RBAC and Early Access review queue"
}

$manifestObj = [PSCustomObject]@{
    version = $releaseVersion
    notes = $ReleaseNotes
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    downloadUrl = "/api/download/desktop"
    installerFileName = $latestInstaller.Name
    fileSizeBytes = $installerSize
    fileSizeFormatted = "$installerSizeMb MB"
    sha256 = $installerHash
    isMandatory = $false
    minVersion = "1.0.0"
    platforms = [PSCustomObject]@{
        "windows-x86_64" = [PSCustomObject]@{
            url = "https://radiology.sehatai.org/api/download/desktop"
            signature = ""
        }
    }
}

$manifestJson = $manifestObj | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path $publicReleasesDir "latest.json") -Value $manifestJson
Write-Host "  * Generated Tauri & Web auto-updater manifest: public\releases\latest.json" -ForegroundColor Green

# Step 7: Cloud Upload (S3 / VPS)
if ($UploadS3) {
    Write-Host ""
    Write-Host "[Step 7/7] Uploading release artifacts to S3 Cloud Storage..." -ForegroundColor Yellow
    node (Join-Path $projectRoot "scripts\upload-release-s3.js")
} else {
    Write-Host ""
    Write-Host "[Step 7/7] Skipping S3 upload (pass -UploadS3 to push to cloud storage)." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  RELEASE PACKAGING COMPLETE!" -ForegroundColor Green
Write-Host "  Version:       $releaseVersion" -ForegroundColor Cyan
Write-Host "  Installer:     $($latestInstaller.Name) ($installerSizeMb MB)" -ForegroundColor Cyan
Write-Host "  SHA-256:       $installerHash" -ForegroundColor Cyan
Write-Host "  Download URL:  /api/download/desktop" -ForegroundColor Cyan
Write-Host "  Website Hub:   /download" -ForegroundColor Cyan
Write-Host "  Updater Spec:  /api/releases/latest.json" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
