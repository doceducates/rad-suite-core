<#
.SYNOPSIS
    Rad Suite Android & Tablet Environment Setup & Verification Tool
.DESCRIPTION
    Configures toolchain paths, verifies Java/Gradle/ADB/NDK, installs Rust
    Android compilation targets, and initializes the Tauri 2.0 Mobile scaffold.
#>

param(
    [switch]$InitScaffold = $false,
    [switch]$BuildApk = $false,
    [switch]$Dev = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RAD SUITE ANDROID & TABLET TOOLCHAIN SETUP             " -ForegroundColor Cyan
Write-Host "   Architecture: Tauri 2.0 Mobile + Android NDK + Rust    " -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

# 1. Java 21 Check & Auto-Resolution
Write-Host "`n[1/5] Verifying Java Development Kit (JDK 21)..." -ForegroundColor Yellow
$javaCandidates = @(
    "D:\Softwares\Installed\Java-21",
    $env:JAVA_HOME,
    "C:\Program Files\Java\jdk-21",
    "C:\Program Files\Eclipse Adoptium\jdk-21"
)

$resolvedJava = $null
foreach ($cand in $javaCandidates) {
    if ($cand -and (Test-Path "$cand\bin\java.exe")) {
        $resolvedJava = $cand
        break
    }
}

if ($resolvedJava) {
    $env:JAVA_HOME = $resolvedJava
    $env:Path = "$resolvedJava\bin;" + $env:Path
    $javaVer = (cmd /c "java -version 2>&1")[0]
    Write-Host "  * JDK Active: $resolvedJava ($javaVer)" -ForegroundColor Green
} else {
    Write-Warning "  * JDK 21 not detected. Please install JDK 21 from https://adoptium.net"
}

# 2. Android SDK & NDK Check
Write-Host "`n[2/5] Inspecting Android SDK & NDK environment..." -ForegroundColor Yellow
$sdkCandidates = @(
    $env:ANDROID_HOME,
    "$env:LOCALAPPDATA\Android\Sdk",
    "C:\Android\sdk",
    "D:\Android\sdk"
)

$resolvedSdk = $null
foreach ($cand in $sdkCandidates) {
    if ($cand -and (Test-Path $cand)) {
        $resolvedSdk = $cand
        break
    }
}

if ($resolvedSdk) {
    $env:ANDROID_HOME = $resolvedSdk
    $env:Path = "$resolvedSdk\platform-tools;$resolvedSdk\cmdline-tools\latest\bin;" + $env:Path
    Write-Host "  * Android SDK Active: $resolvedSdk" -ForegroundColor Green
} else {
    Write-Host "  * Note: ANDROID_HOME not currently found in default paths." -ForegroundColor DarkGray
    Write-Host "    To install Android SDK tools, download Android Studio or Command-line Tools" -ForegroundColor DarkGray
    Write-Host "    and point `$env:ANDROID_HOME to your SDK root." -ForegroundColor DarkGray
}

# 3. ADB & Device Detection
Write-Host "`n[3/5] Checking ADB & Connected Android Diagnostic Devices..." -ForegroundColor Yellow
$adbBin = (Get-Command adb.exe -ErrorAction SilentlyContinue)
if (-not $adbBin -and (Test-Path "C:\adb\adb.exe")) {
    $env:Path = "C:\adb;" + $env:Path
    $adbBin = Get-Command adb.exe -ErrorAction SilentlyContinue
}

if ($adbBin) {
    Write-Host "  * ADB: $($adbBin.Source)" -ForegroundColor Green
    $devices = & adb devices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
    if ($devices) {
        Write-Host "  * Connected Devices / Tablets:" -ForegroundColor Cyan
        foreach ($dev in $devices) {
            Write-Host "      -> $dev" -ForegroundColor White
        }
    } else {
        Write-Host "  * No physical Android tablets/phones currently attached via USB." -ForegroundColor Gray
    }
} else {
    Write-Warning "  * ADB not found in Path. Install platform-tools or add C:\adb to Path."
}

# 4. Rust Android Targets
Write-Host "`n[4/5] Checking Rust Cross-Compilation Targets..." -ForegroundColor Yellow
$installedTargets = rustup target list --installed
$desiredTargets = @("aarch64-linux-android", "x86_64-linux-android")

foreach ($t in $desiredTargets) {
    if ($installedTargets -contains $t) {
        Write-Host "  * Target present: $t" -ForegroundColor Green
    } else {
        Write-Host "  * Adding target: $t via rustup..." -ForegroundColor Cyan
        rustup target add $t
    }
}

# 5. Tauri Mobile Scaffolding Check
Write-Host "`n[5/5] Checking Tauri 2.0 Mobile Scaffolding..." -ForegroundColor Yellow
$androidGenDir = Join-Path $projectRoot "src-tauri\gen\android"
if (Test-Path $androidGenDir) {
    Write-Host "  * Android project scaffold exists: src-tauri\gen\android" -ForegroundColor Green
} else {
    if ($InitScaffold) {
        Write-Host "  * Initializing Android target via Tauri CLI..." -ForegroundColor Cyan
        npx tauri android init --ci --skip-targets-install
        Write-Host "  * Initialized Android scaffold in src-tauri\gen\android" -ForegroundColor Green
    } else {
        Write-Host "  * Scaffold not yet generated. Pass -InitScaffold to create it." -ForegroundColor Gray
    }
}

if ($BuildApk) {
    Write-Host "`nBuilding release APK..." -ForegroundColor Cyan
    npx tauri android build --apk
} elseif ($Dev) {
    Write-Host "`nStarting live device development session..." -ForegroundColor Cyan
    npx tauri android dev
} else {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  ANDROID ENVIRONMENT CHECK COMPLETE" -ForegroundColor Green
    Write-Host "  Commands:" -ForegroundColor White
    Write-Host "    .\scripts\setup-android.ps1 -InitScaffold    (Generate Android Project)" -ForegroundColor Gray
    Write-Host "    .\scripts\setup-android.ps1 -Dev             (Hot-reload on Tablet)" -ForegroundColor Gray
    Write-Host "    .\scripts\setup-android.ps1 -BuildApk        (Compile Production APK)" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green
}
