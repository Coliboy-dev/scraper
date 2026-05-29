#!/bin/bash
echo "Installation des dépendances..."
node --version || { echo "Node.js requis (v18+)"; exit 1; }
npm install
npx playwright install chromium
echo ""
echo "✅ Prêt. Usage : node src/index.js https://exemple.com"
echo "   Options     : --depth=2 --output=./out --no-screenshots --no-zip"
