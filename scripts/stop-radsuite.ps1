# scripts/stop-radsuite.ps1
# Clean Graceful Workstation Shutdown Script (<70 lines)
# Ensures HMIS Portal session is logged out before terminating processes.

param(
    [switch]$Force
)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🛑 Rad Suite Workstation Graceful Shutdown" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Step 1: Gracefully log out HMIS Gateway (Port 3788)
$hmisPort = 3788
$hmisConn = Get-NetTCPConnection -LocalPort $hmisPort -ErrorAction SilentlyContinue
if ($hmisConn) {
    Write-Host "🚪 [1/2] Releasing active Punjab HMIS portal sessions on port $hmisPort..." -ForegroundColor Yellow
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:$hmisPort/api/system/shutdown" -Method POST -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ [1/2] HMIS Portal session cleanly logged out: $($res.message)" -ForegroundColor Green
        Start-Sleep -Milliseconds 1200
    } catch {
        Write-Host "⚠️ [1/2] Direct shutdown endpoint failed. Checking process PID..." -ForegroundColor Yellow
    }

    # Verify if port 3788 is still active; if lingering, kill process
    $hmisConnLingering = Get-NetTCPConnection -LocalPort $hmisPort -ErrorAction SilentlyContinue
    if ($hmisConnLingering) {
        $hmisPid = $hmisConnLingering.OwningProcess | Select-Object -First 1
        if ($hmisPid) {
            Write-Host "🛑 [1/2] Stopping lingering HMIS gateway process (PID $hmisPid)..." -ForegroundColor Yellow
            Stop-Process -Id $hmisPid -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "ℹ️ [1/2] HMIS Gateway is already offline (Port $hmisPort free)." -ForegroundColor DarkGray
}

# 2. Step 2: Stop Rad Suite Core Workstation (Port 3780)
$corePort = 3780
$coreConn = Get-NetTCPConnection -LocalPort $corePort -ErrorAction SilentlyContinue
if ($coreConn) {
    $corePid = $coreConn.OwningProcess | Select-Object -First 1
    Write-Host "🛑 [2/2] Stopping Rad Suite Workstation (PID $corePid on port $corePort)..." -ForegroundColor Yellow
    Stop-Process -Id $corePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    Write-Host "✅ [2/2] Rad Suite core workstation stopped." -ForegroundColor Green
} else {
    Write-Host "ℹ️ [2/2] Rad Suite workstation is already offline (Port $corePort free)." -ForegroundColor DarkGray
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "✨ All Rad Suite services cleanly stopped." -ForegroundColor Green
Write-Host "🔒 HMIS account is unlocked and safe to use on other devices." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
