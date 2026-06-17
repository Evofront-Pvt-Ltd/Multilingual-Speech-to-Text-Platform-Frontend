# VoiceBridge AI - Frontend start script (Windows)
# Sets up Node/Yarn PATH and starts the dev server on port 3000

$nodeDir = "$env:LOCALAPPDATA\Programs\cursor\resources\app\resources\helpers"
$yarnDir = "$env:APPDATA\npm"

if (-not (Test-Path "$nodeDir\node.exe")) {
    Write-Error "Node.js not found at $nodeDir. Install Node.js from https://nodejs.org or use Cursor's bundled runtime."
    exit 1
}

$env:PATH = "$nodeDir;$yarnDir;" + $env:PATH

Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    yarn install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting VoiceBridge frontend on http://localhost:3000"
yarn dev
