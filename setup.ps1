# Setup script for Windows
Write-Host "Installation des dependances..." -ForegroundColor Cyan
node --version
if ($LASTEXITCODE -ne 0) { Write-Error "Node.js requis (v18+)"; exit 1 }
npm install
npx playwright install chromium
Write-Host ""
Write-Host "Pret. Usage : node src/index.js https://exemple.com" -ForegroundColor Green
Write-Host "  Options   : --depth=2 --output=./out --no-screenshots --no-zip"
