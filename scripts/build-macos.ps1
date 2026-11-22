param(
    [switch]$Universal = $false,
    [switch]$Debug = $false
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RAD SUITE MACOS BUILD PIPELINE                         " -ForegroundColor Cyan
Write-Host "   Platform: macOS (.dmg / .app bundle)                   " -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

$isDarwin = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::OSX)

if ($isDarwin) {
    Write-Host "`n[1/3] macOS environment detected. Verifying Xcode and Rust..." -ForegroundColor Green
    
    $buildArgs = @("build", "--bundles", "dmg,app")
    if ($Universal) {
        $buildArgs += @("--target", "universal-apple-darwin")
    }
    if ($Debug) {
        $buildArgs += "--debug"
    }

    Write-Host "`n[2/3] Building native macOS app..." -ForegroundColor Yellow
    & npx @tauri-apps/cli @buildArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[3/3] macOS bundle completed in src-tauri/target/release/bundle/dmg/" -ForegroundColor Green
    } else {
        Write-Error "Tauri macOS build failed."
    }
} else {
    Write-Host "`n[!] Notice: You are currently running on $([System.Environment]::OSVersion.Platform) (Windows)." -ForegroundColor Yellow
    Write-Host "    Apple requires macOS (Darwin kernel + Xcode SDK) to compile native .dmg/.app GUI bundles." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Recommended Cross-Platform Options:" -ForegroundColor Cyan
    Write-Host "  1. GitHub Actions (Automated CI):" -ForegroundColor White
    Write-Host "     Run: gh workflow run build-all-platforms.yml" -ForegroundColor Gray
    Write-Host "     This compiles native signed .dmg on GitHub's macos-14 cloud runners." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. On a Mac machine:" -ForegroundColor White
    Write-Host "     git clone -> npm install -> npm run build:macos" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan
}
