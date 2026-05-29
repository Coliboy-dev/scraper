# Site Scraper CLI

Outil CLI Node.js qui analyse un site web existant et génère un package d'analyse complet
(JSON + Markdown + screenshots) utilisable comme contexte pour recréer le site en Next.js 14 avec Claude.

## Installation

**Windows :**
```powershell
.\setup.ps1
```

**Mac / Linux :**
```bash
chmod +x setup.sh && ./setup.sh
```

## Usage

```bash
node src/index.js https://www.exemple.com --depth=2
```

| Option | Défaut | Description |
|---|---|---|
| `--depth=N` | `1` | Profondeur de crawl |
| `--output=PATH` | `./output/<domaine>` | Dossier de sortie |
| `--no-screenshots` | — | Désactiver les captures |
| `--no-zip` | — | Ne pas créer d'archive |

## Sortie

```
output/<domaine>/
├── analysis/
│   ├── report.md             ← FICHIER CLÉ à donner à Claude
│   ├── audit.json
│   ├── design-system.json
│   ├── design-system.md
│   ├── tailwind.config.ts
│   ├── globals.css
│   ├── content.json
│   ├── content.md
│   ├── assets-manifest.json
│   └── sitemap.json
├── html/
├── css/
├── js/
├── assets/
│   ├── images/
│   ├── fonts/
│   ├── icons/
│   └── videos/
└── screenshots/
```

## Workflow

1. Lance le scraper sur le site cible
2. Ouvre `analysis/report.md`
3. Copie-le dans Claude
4. Demande : *"Reconstruis ce site en Next.js 14 App Router avec TypeScript et Tailwind"*
