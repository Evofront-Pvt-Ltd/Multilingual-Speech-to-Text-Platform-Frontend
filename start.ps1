# VoiceBridge AI - Frontend start script (Windows)
# Frees port 3000, installs deps, starts Next.js on port 3000 (backend uses 3001)

$nodeDir = "$env:LOCALAPPDATA\Programs\cursor\resources\app\resources\helpers"
$yarnDir = "$env:APPDATA\npm"
$port = 3000

if (-not (Test-Path "$nodeDir\node.exe")) {
    Write-Error "Node.js not found at $nodeDir. Install Node.js from https://nodejs.org or use Cursor's bundled runtime."
    exit 1
}

$env:PATH = "$nodeDir;$yarnDir;" + $env:PATH
Set-Location $PSScriptRoot

# Free port 3000 if occupied (prevents Next.js from jumping to 3001 and blocking the API)
$listeners = netstat -ano | Select-String ":$port\s+.*LISTENING"
foreach ($line in $listeners) {
    $procId = ($line.ToString().Trim() -split '\s+')[-1]
    if ($procId -match '^\d+$') {
        Write-Host "Stopping process on port ${port} (PID $procId)..."
        taskkill /PID $procId /F 2>$null
    }
}
Start-Sleep -Seconds 1

$stillInUse = netstat -ano | Select-String ":$port\s+.*LISTENING"
if ($stillInUse) {
    Write-Error "Port $port is still in use. Stop the other app on port 3000, then run .\start.ps1 again. Frontend must use 3000; backend uses 3001."
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    yarn install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VoiceBridge Frontend -> http://localhost:$port" -ForegroundColor Cyan
Write-Host " Backend API must run on http://localhost:3001" -ForegroundColor Yellow
Write-Host " Tip: run .\start-all.ps1 to start backend + frontend" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

yarn dev
