# Analyse d'intégration WRS ↔ Start'OnLab OS
> Généré le 2026-05-29

---

## Q1 — WRS lit-il les query params au démarrage ?

**Non.** L'interface (`src/public/index.html`) ne lit aucun paramètre d'URL au chargement. La fonction `startScrape()` récupère l'URL uniquement depuis le champ `<input id="url-input">` saisi manuellement par l'utilisateur. Les paramètres `url`, `client`, `prospect_id`, `os_url` ne sont lus nulle part dans le frontend.

Le schéma `{wrs_url}?url=...&client=...&prospect_id=...&os_url=...` décrit dans votre message ne fonctionnerait pas tel quel — il faudrait ajouter du code pour lire ces params et pré-remplir l'interface (ou déclencher le scrape automatiquement).

---

## Q2 — Existe-t-il déjà du code qui POST vers une URL OS externe ?

**Non.** Tous les appels `fetch()` dans `index.html`, `studio.html` et `compare-studio.html` ciblent uniquement des routes locales :
- `/api/scrape`, `/api/stream/:jobId`, `/api/history`
- `/api/mockup`, `/api/variants/:domain`, `/api/theme/:domain`
- `/api/report/:domain`, `/api/audit-prompt/:domain`, `/api/compare-data`

Aucun appel vers une URL externe dynamique, aucune configuration `os_url`, aucun webhook sortant dans les modules serveur (`server.js`).

---

## Q3 — Y a-t-il une UI ou config pour l'OS URL et un secret partagé ?

**Non.** Il n'existe :
- Aucun champ de formulaire pour `os_url` ou `api_token` dans les interfaces
- Aucun fichier `.env.example` mentionnant ces variables
- Aucune section "configuration" ou "settings" dans les UIs
- Aucune lecture de `process.env.OS_URL` ou similaire dans le code serveur

Le serveur lit uniquement `process.env.PORT` (port 3456) et `process.env.API_TOKEN` (optionnel, ajouté lors du fix de sécurité). Tout est à créer.

---

## Q4 — Y a-t-il des scores SEO / mobile / performance / UX / conversion séparés ?

**Non.** Le module `src/modules/audit.js` génère uniquement :
- `complexityScore` : entier 0–10 (basé sur nombre de pages, formulaires, sections, assets)
- `complexity` : chaîne `"SIMPLE"` / `"MOYEN"` / `"COMPLEXE"`

Il n'existe pas de scores distincts SEO, mobile, performance, UX ou conversion. Le rapport (`report.md`) contient des recommandations textuelles Next.js 14, mais sans notation numérique. Pour le handoff OS, il faudra soit calculer ces scores à la volée depuis les données brutes, soit les créer comme nouveaux modules.

---

## Q5 — Y a-t-il du code qui génère des fichiers CLAUDE.md ou MISSION.md ?

**Non.** Aucun des 18 modules ne génère de fichiers `.md` portant ces noms. Le seul fichier Markdown généré est `report.md` (dans `output/{domain}/analysis/`), produit par `src/modules/report.js`. Il n'existe aucune référence à `CLAUDE.md` ou `MISSION.md` dans le code source.

---

## Q6 — Structure complète de `output/{domain}/` après un scrape complet

```
output/{domain}/
├── analysis/
│   ├── report.md              ← Rapport Markdown complet (stack, design, contenu, recommandations)
│   ├── audit.json             ← { complexityScore, complexity, features[], stack{} }
│   ├── design-system.json     ← { colors{semantic}, typography{h1…p…}, cssVars{} }
│   ├── content.json           ← { headings{h1,h2,h3[]}, nav[], footer{}, ctaButtons[], forms[], sections[] }
│   ├── sitemap.json           ← [ { url, title, depth, links[] } ] (toutes pages crawlées)
│   ├── sections.json          ← [ { id, label, confidence, keywords[], icon } ]
│   ├── assets-manifest.json   ← [ { type, originalUrl, localPath, size } ]
│   └── audit-prompt.md        ← Prompt IA pré-généré pour audit approfondi
├── html/
│   └── *.html                 ← Pages HTML brutes crawlées
├── screenshots/
│   ├── desktop-*.png          ← Capture plein page 1440×900
│   ├── tablet-*.png           ← 768×1024
│   └── mobile-*.png           ← 390×844
├── assets/
│   ├── images/                ← Images téléchargées
│   ├── fonts/                 ← Polices
│   ├── css/                   ← Feuilles de style
│   ├── js/                    ← Scripts
│   └── videos/                ← Vidéos
├── mockup/
│   ├── index.html             ← Mockup page d'accueil (avec éditeur intégré)
│   ├── *.html                 ← Mockups pages secondaires
│   └── theme.json             ← Tokens de design sauvegardés via Studio (couleurs, typo, layout, brief)
└── variants/
    ├── variant-a.json         ← Variante "Professionnel" (bleu corporate)
    ├── variant-b.json         ← Variante "Premium" (noir/or)
    └── variant-c.json         ← Variante "Chaleureux local" (vert/ocre)
```

---

## Q7 — Flux UI complet après la fin d'un scrape

**Étape 1 — Lancement**
L'utilisateur entre une URL + depth dans `index.html`, clique "Analyser". Un `POST /api/scrape` démarre un job (retourne `jobId`).

**Étape 2 — Streaming**
`GET /api/stream/:jobId` (SSE) stream les logs ligne par ligne en temps réel dans une zone log à l'écran. Le job passe par les 6 étapes : crawl → audit → screenshots → assets → design → content/report.

**Étape 3 — Résultat immédiat**
À la fin du stream, une carte résultat apparaît avec :
- Bouton **"Voir report.md"** → ouvre `/output/{domain}/analysis/report.md`
- Bouton **"🖼 Voir le mockup"** (si mockup existe) ou **"⚡ Générer mockup"** (si non) → POST `/api/mockup` puis redirection

**Étape 4 — Historique (grille persistante)**
Toutes les analyses passées apparaissent en cartes dans la grille historique. Chaque carte expose 6 actions :
- **Rapport** → `/output/{domain}/analysis/report.md`
- **Mockup** → `/output/{domain}/mockup/index.html`
- **Studio** → `/studio/{domain}` (éditeur de thème complet, 7 onglets)
- **Prompt** → GET `/api/audit-prompt/{domain}` (copie dans presse-papier)
- **Variantes** → génère/affiche les 3 variantes A/B/C
- **Dossier** → télécharge l'archive `.tar.gz`

**Étape 5 — Compare Studio** (quand ≥ 2 analyses)
Un bouton "Compare Studio" apparaît → ouvre `/compare/{domain1}?ref={domain2}` → `compare-studio.html` avec deux iframes côte à côte et panneau de transfert de tokens entre les deux.

---

## Q8 — Données disponibles pour le payload handoff vers l'OS

Voici ce qui est structurellement disponible dans `output/{domain}/analysis/` pour construire un `POST /api/audits` ou `/api/projects/[id]/handoff` :

### Identité & complexité (`audit.json`)
- `complexityScore` (0–10)
- `complexity` : `"SIMPLE"` / `"MOYEN"` / `"COMPLEXE"`
- `features[]` : liste des fonctionnalités détectées (formulaires, auth, e-commerce…)
- `stack{}` : technos détectées (CMS, framework, analytics…)

### Design system (`design-system.json` + `theme.json`)
- Palette sémantique : primary, secondary, accent, background, text, muted
- Typographie par élément : font-family, size, weight, line-height pour h1–h6, p, button…
- CSS custom properties extraites

### Structure de contenu (`content.json`)
- Navigation principale (`nav[]`)
- CTAs (`ctaButtons[]` : text, href, type)
- Formulaires (`forms[]` : fields, types)
- Sections détectées avec niveaux de confiance (`sections[]`)
- Footer (liens, copyright)
- H1/H2/H3 par page

### Cartographie (`sitemap.json`)
- Toutes les pages avec URL, titre, profondeur, liens internes

### Assets (`assets-manifest.json`)
- Inventaire images/polices/CSS/JS avec taille et URL originale

### Sections sémantiques (`sections.json`)
- hero, services, about, testimonials, pricing, FAQ, contact, CTA… avec score de confiance

### Captures d'écran
- Chemins vers fichiers PNG desktop / tablet / mobile

---

## Ce qui manque pour un handoff complet vers l'OS

| Élément manquant | État actuel | Action requise |
|---|---|---|
| `prospect_id` / `client` | Absents du pipeline WRS | Lire depuis query params et propager |
| `os_url` (webhook retour) | Non stockée nulle part | Injecter via query param, stocker en job context |
| Secret partagé (`x-wrs-secret`) | Aucune infra d'auth sortante | Ajouter `process.env.WRS_SECRET` + header sur POST handoff |
| Scores SEO / mobile / perf / UX | Non calculés | Créer nouveaux modules ou calculer depuis données brutes |
| `theme.json` | N'existe que si Studio ouvert + sauvegardé | Générer une version par défaut à la fin du scrape |
| `CLAUDE.md` / `MISSION.md` | Absents | Créer un générateur si l'OS les attend |

---

*Analyse réalisée par lecture statique complète du code source (18 fichiers).*
