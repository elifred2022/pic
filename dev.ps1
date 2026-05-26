# Arranca el servidor de desarrollo (no requiere npm en el PATH)
$nodeDirs = @(
  "C:\Program Files\nodejs",
  "$env:LOCALAPPDATA\nodejs-portable\node-v22.16.0-win-x64"
)
foreach ($dir in $nodeDirs) {
  if (Test-Path "$dir\npm.cmd") {
    $env:PATH = "$dir;" + $env:PATH
    break
  }
}
Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) {
  Write-Host "Instalando dependencias..."
  npm install
}
npm run dev
