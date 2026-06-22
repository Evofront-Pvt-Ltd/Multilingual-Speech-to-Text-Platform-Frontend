# VoiceBridge AI - Start backend + frontend together (run from Frontend folder)
# Opens the backend in a new terminal, waits for health, then starts this frontend.

$backend = Join-Path $PSScriptRoot "..\Multilingual-Speech-to-Text-Platform-backend" | Resolve-Path

if (-not (Test-Path $backend)) {
    Write-Error "Backend folder not found: $backend"
    exit 1
}

Write-Host "Starting VoiceBridge backend in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backend'; .\start.ps1"
)

Write-Host "Waiting for backend on http://localhost:3001 ..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:3001/health" -TimeoutSec 2 -UseBasicParsing
        if ($res.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($ready) {
    Write-Host "Backend is online." -ForegroundColor Green
} else {
    Write-Host "Backend not ready yet — the app will retry automatically." -ForegroundColor Yellow
}

Write-Host "Starting frontend..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "start.ps1")
