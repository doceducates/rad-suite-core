param(
    [switch]$UseWsl = $false,
    [switch]$Debug = $false
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RAD SUITE LINUX BUILD PIPELINE                         " -ForegroundColor Cyan
Write-Host "   Platform: Linux (.deb / .AppImage bundle)              " -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

$isLinux = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)

if ($isLinux) {
    Write-Host "`n[1/3] Linux environment detected. Verifying WebKitGTK and toolchain..." -ForegroundColor Green
    
    $buildArgs = @("build", "--bundles", "deb,appimage")
    if ($Debug) {
        $buildArgs += "--debug"
    }

    Write-Host "`n[2/3] Compiling native Linux packages..." -ForegroundColor Yellow
    & npx @tauri-apps/cli @buildArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[3/3] Linux build completed in src-tauri/target/release/bundle/" -ForegroundColor Green
    } else {
        Write-Error "Tauri Linux build failed."
    }
} else {
    Write-Host "`n[!] Notice: You are currently running on Windows." -ForegroundColor Yellow
    Write-Host "    Linux packages (.deb, .AppImage) require a Linux kernel with WebKitGTK headers." -ForegroundColor Gray
    Write-Host ""

    $wslAvailable = Get-Command wsl.exe -ErrorAction SilentlyContinue
    if ($wslAvailable) {
        Write-Host "WSL2 (Windows Subsystem for Linux) is detected on your machine!" -ForegroundColor Green
        Write-Host "You can build inside WSL2 by running:" -ForegroundColor White
        Write-Host "  wsl -- npm --prefix $(($projectRoot -replace '\\', '/')) run build:linux" -ForegroundColor Cyan
        Write-Host "  (Ensure libwebkit2gtk-4.1-dev and build-essential are installed in WSL)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Recommended Alternative Options:" -ForegroundColor Cyan
    Write-Host "  1. GitHub Actions (Automated Cloud Build):" -ForegroundColor White
    Write-Host "     Run: gh workflow run build-all-platforms.yml" -ForegroundColor Gray
    Write-Host "     Compiles .deb and .AppImage on Ubuntu 22.04 runners automatically." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan
}
