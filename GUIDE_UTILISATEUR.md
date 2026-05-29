# Guide Utilisateur — Script Scrapper App
**Version 2.0 — Mockup Editor + Design Studio Comparatif**

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Module 1 — Scraper un site](#3-module-1--scraper-un-site)
4. [Module 2 — Rapport d'audit](#4-module-2--rapport-daudit)
5. [Module 3 — Mockup interactif](#5-module-3--mockup-interactif)
6. [Module 4 — Mockup Editor (panneau latéral)](#6-module-4--mockup-editor-panneau-latéral)
7. [Module 5 — Design Studio Comparatif](#7-module-5--design-studio-comparatif)
8. [Cas concret 1 — Nouveau site (client sans site existant)](#8-cas-concret-1--nouveau-site-client-sans-site-existant)
9. [Cas concret 2 — Refonte en s'inspirant d'un site référence](#9-cas-concret-2--refonte-en-sinspiration-dun-site-référence)
10. [Export vers Claude Code](#10-export-vers-claude-code)
11. [Référence technique](#11-référence-technique)

---

## 1. Vue d'ensemble

Script Scrapper App est un **outil de travail pour designers et développeurs web** qui automatise la phase d'analyse et de maquettage d'un projet web. Il scrape n'importe quel site, extrait son identité visuelle, génère un mockup interactif, et permet de le modifier visuellement avant de l'exporter vers un générateur de code (Claude Code ou similaire).

### Ce que l'app fait pour vous

| Tâche manuelle habituelle | Ce que l'app fait à votre place |
|---|---|
| Ouvrir DevTools, noter les couleurs | Extrait automatiquement toute la palette couleur |
| Identifier les polices utilisées | Détecte les Google Fonts et polices système |
| Recenser les sections page par page | Génère un `sections.json` scoré par confiance |
| Faire des screenshots responsive | 3 screenshots (desktop/tablet/mobile) par page |
| Créer une maquette fil de fer | Génère un mockup HTML complet et éditable |
| Recommander des améliorations UX | Produit un rapport d'audit avec score et suggestions |

### Architecture de l'output

Pour chaque site scrapé, l'app crée :
```
output/
└── mon-site.com/
    ├── analysis/
    │   ├── design-system.json     ← couleurs, typo, espacements
    │   ├── content.json           ← textes H1/H2, CTAs, menus
    │   ├── sitemap.json           ← toutes les pages trouvées
    │   ├── assets-manifest.json   ← logos, images, icônes
    │   ├── audit.json             ← score SEO/UX/perf + recommandations
    │   └── sections.json          ← sections détectées avec score de confiance
    ├── mockup/
    │   ├── index.html             ← mockup de la page d'accueil
    │   ├── [slug].html            ← mockup de chaque sous-page
    │   └── theme.json             ← thème sauvegardé (auto-persisté)
    ├── screenshots/
    │   ├── index--desktop.png
    │   ├── index--tablet.png
    │   └── index--mobile.png
    └── assets/
        ├── images/                ← images téléchargées
        └── icons/                 ← icônes et logos
```

---

## 2. Démarrage rapide

### Lancer l'application

```bash
cd "Script Scrapper App"
npm run server
```

L'interface s'ouvre automatiquement sur **http://localhost:3000**

> Si le port 3000 est occupé, l'app utilise le prochain port disponible (affiché dans la console).

### Interface principale (index.html)

```
┌─────────────────────────────────────────────────────┐
│  Script Scrapper App                                │
│                                                     │
│  URL du site : [________________________] [Scraper] │
│                                                     │
│  ⚙️  Options :                                      │
│  [x] Screenshots  [x] Audit  [ ] Assets seulement  │
│  Profondeur : [2 ▼]   Délai : [800ms ▼]            │
│                                                     │
│  ── Historique ────────────────────────────────── │
│  [sankuno.com]  [judo-sombreffe.vercel.app]  [...]  │
│                                                     │
│  ── Design Studio Comparatif ─────────────────── │
│  Référence : [sankuno.com ▼]  →  Client : [judo ▼] │
│  [✏️ Ouvrir le Studio]                              │
└─────────────────────────────────────────────────────┘
```

---

## 3. Module 1 — Scraper un site

### Comment scraper

1. Collez l'URL complète dans le champ (ex: `https://www.mon-site.com`)
2. Choisissez les options (voir ci-dessous)
3. Cliquez **Scraper**
4. Suivez la progression en temps réel dans la console de logs

### Options disponibles

| Option | Description | Recommandation |
|---|---|---|
| **Screenshots** | Capture 3 viewports par page | Toujours activé pour les audits visuels |
| **Audit** | Génère le rapport score + recommandations | Activé pour les clients existants |
| **Profondeur** | Nombre de niveaux de navigation à explorer | 2 pour la plupart des sites, 3 pour les grands sites |
| **Délai** | Pause entre chaque page (ms) | 800ms par défaut, augmenter si le site bloque |

### Ce qui se passe en coulisses

```
1. Playwright visite la page d'accueil
2. Extrait : couleurs CSS, polices, H1/H2/H3, CTAs, navigation, meta
3. Suit les liens internes jusqu'à la profondeur choisie
4. Fait les screenshots responsive (desktop 1280px / tablet 768px / mobile 375px)
5. Télécharge les assets (logo, images hero, icônes)
6. Génère design-system.json + content.json + sitemap.json
7. Analyse les sections détectables (hero, services, about, FAQ, contact…)
8. Calcule le score d'audit (SEO, accessibilité, performance, UX)
9. Génère le mockup HTML complet avec les vraies données
```

### Durée typique

| Type de site | Temps estimé |
|---|---|
| Landing page (1 page) | 30–60 secondes |
| Site vitrine (5–10 pages) | 2–4 minutes |
| Site moyen (20+ pages) | 5–10 minutes |

### Résultat dans l'historique

Une fois le scraping terminé, une carte apparaît dans l'historique avec :
- Miniature screenshot desktop
- Nom de domaine + date
- Boutons : **Rapport** / **Mockup** / **Studio**

---

## 4. Module 2 — Rapport d'audit

### Accès

Cliquer sur **Rapport** dans la carte historique, ou aller directement à :
`http://localhost:3000/output/mon-site.com/analysis/audit.json`

### Contenu du rapport

Le rapport `audit.json` contient :

#### Score global (0–100)

| Catégorie | Ce qui est évalué |
|---|---|
| **SEO** | Balises title, meta description, H1 unique, alt sur images |
| **Accessibilité** | Contraste couleurs, labels formulaires, navigation clavier |
| **Performance** | Taille des images, polices chargées, scripts bloquants |
| **UX** | CTAs présents, navigation claire, numéro de téléphone visible |
| **Mobile** | Viewport meta, tailles de cibles tactiles, pas de scroll horizontal |

#### Design system extrait

```json
{
  "colors": {
    "primary": "#1a3a6b",
    "secondary": "#c8a951",
    "background": "#ffffff",
    "text": "#333333"
  },
  "typography": {
    "headingFont": "Montserrat",
    "bodyFont": "Open Sans",
    "baseFontSize": "16px"
  },
  "spacing": {
    "borderRadius": "8px",
    "containerWidth": "1200px"
  }
}
```

#### Recommandations

Chaque problème détecté génère une recommandation avec :
- **Catégorie** (SEO, UX, Accessibilité…)
- **Sévérité** (critique / important / mineur)
- **Description** du problème
- **Action suggérée**

---

## 5. Module 3 — Mockup interactif

### Accès

Cliquer sur **Mockup** dans la carte historique.

L'URL est : `http://localhost:3000/output/mon-site.com/mockup/index.html`

### Ce qu'est le mockup

Le mockup est une **reconstruction HTML fidèle** du site scrapé, avec :
- Les vraies couleurs du site (injectées en CSS vars)
- Les vraies polices (chargées depuis Google Fonts)
- Les vrais textes (H1, H2, descriptions extraites)
- Les vraies images (logo, images hero)
- La vraie structure de navigation

Il est **immédiatement éditable** via le Mockup Editor (panneau latéral).

### Structure du mockup

Chaque mockup est composé de **sections détectées automatiquement** :

| Section | Description | Variantes disponibles |
|---|---|---|
| **Hero** | Bannière principale avec H1 et CTA | Centré / Split gauche / Fond plein |
| **Services** | Grille de services ou fonctionnalités | 3 cartes / 2 cartes / Liste icônes |
| **About** | Section à propos ou équipe | Image gauche / Image droite / Centré |
| **Testimonials** | Avis clients ou témoignages | Grille 3 cols / Citation simple |
| **Pricing** | Tarifs ou formules | 3 formules / 2 formules |
| **FAQ** | Foire aux questions | Accordéon / 2 colonnes |
| **Contact** | Formulaire ou coordonnées | Split / Centré |
| **CTA** | Appel à l'action secondaire | Centré / Split |
| **Gallery** | Portfolio ou galerie photos | Grille 3 cols / Masonry |

### Navigation entre les pages

Le mockup inclut la navigation du site original. Cliquer sur les liens dans la nav vous amène aux autres pages du mockup (ex: `/output/mon-site.com/mockup/contact.html`).

### Score de confiance des sections

Chaque section détectée a un **score de confiance** (0–100%) qui indique à quel point l'algorithme est certain de son identification. Un score < 50% signifie que la section a été inférée par heuristique — vérifiez qu'elle correspond bien à votre intention.

---

## 6. Module 4 — Mockup Editor (panneau latéral)

### Ouverture du panneau

Cliquer sur le bouton **✏️ Éditer** flottant en bas à droite du mockup.

Le panneau s'ouvre sur la gauche, le mockup se décale pour rester visible.

### Les 4 onglets de l'éditeur

#### Onglet 🎨 Couleurs

Contrôles disponibles :
- **Couleur primaire** — couleur principale de la marque (header, boutons principaux)
- **Couleur secondaire** — accents, highlights, badges
- **Couleur d'arrière-plan** — fond général de la page
- **Couleur de texte** — couleur du corps de texte

Chaque couleur dispose d'un color picker natif + champ hex.

**Mise à jour en temps réel** : la page se met à jour instantanément via CSS custom properties.

#### Onglet ✍️ Typographie

Contrôles disponibles :
- **Police des titres** — appliquée aux H1, H2, H3
- **Police du corps** — appliquée au texte courant
- **Taille de base** — slider de 12px à 20px (16px recommandé)
- **Rayon des bordures** — slider de 0px (carré) à 24px (très arrondi)

Les polices sont des noms Google Fonts exacts. Taper le nom complet (ex: `Playfair Display`). La police est chargée dynamiquement depuis Google Fonts.

#### Onglet 📐 Mise en page

Contrôles disponibles :
- **Style du header** : Blanc (fond clair) / Couleur primaire / Sombre (#111) / Transparent
- **Largeur du container** : 960px / 1200px / 1400px / Pleine largeur
- **Espacement des sections** : Compact / Normal / Spacieux
- **Animation** : Activé / Désactivé (pour les clients qui préfèrent sans)

#### Onglet 🗂 Sections

Liste de toutes les sections détectées sur la page courante. Pour chaque section :

**En-tête de section :**
- Nom et icône de la section (ex: `🖼 Hero / Bannière`)
- Badge score de confiance (`87%`)
- Checkbox visibility (oeil ouvert/fermé)

**Cliquer sur une section → Panneau contextuel :**

Le panneau bascule en mode contextuel pour cette section spécifique :
- Barre de score de confiance colorée
- Boutons variantes (ex: `Centré` | `Split gauche` | `Fond plein`)
- Aperçu visuel de la variante sélectionnée dans le mockup
- Bouton `← Retour` pour revenir à la liste des sections

### Auto-sauvegarde

Toutes les modifications sont **sauvegardées automatiquement** dans `theme.json` :
- Chaque changement déclenche un timer de 1,5 secondes
- Après 1,5 secondes d'inactivité → sauvegarde envoyée au serveur
- Indicateur en haut du panneau :
  - `⏳ Sauvegarde…` (orange)
  - `✓ Sauvegardé` (vert, disparaît après 3 secondes)
  - `✗ Erreur` (rouge)

Le thème est persisté dans `output/mon-site.com/mockup/theme.json`. À la prochaine ouverture du mockup, les modifications sont rechargées **sans flash visuel** (injectées au build-time dans le CSS).

### Régénérer le mockup

Après avoir modifié le thème, si vous souhaitez que les modifications soient intégrées dans le HTML généré (et non chargées depuis JS) :

1. Aller sur la page principale
2. Cliquer sur **Regénérer mockup** sur la carte du site
3. Le mockup est reconstruit en utilisant `theme.json` comme base

---

## 7. Module 5 — Design Studio Comparatif

### Qu'est-ce que le Design Studio Comparatif ?

C'est une interface **double panneau** qui affiche côte à côte :
- **Gauche (orange)** : le site de référence (en lecture seule)
- **Droite (vert)** : le site client (éditable)
- **Centre** : le panneau de transfert de design

Il permet de **s'inspirer visuellement** d'un site de référence et d'**appliquer ces éléments** au site client en un clic, sans coder.

### Accès au Studio

**Depuis l'interface principale :**
1. Avoir au moins 2 sites dans l'historique
2. La section "Design Studio Comparatif" apparaît en bas de la page
3. Sélectionner le site référence et le site client dans les menus déroulants
4. Cliquer **Ouvrir le Studio**

**Depuis une carte historique :**
Cliquer sur **Studio** → ouvre le studio avec ce site en position référence.

**URL directe :**
`http://localhost:3000/compare-studio/sankuno.com/judo-sombreffe.vercel.app`

### Interface du Studio

```
┌──────────────────────┬──────────────┬──────────────────────┐
│  RÉFÉRENCE           │   TRANSFERT  │  CLIENT              │
│  sankuno.com         │   🎨 ✍️ 🗂   │  judo-sombreffe      │
│  (lecture seule)     │              │  (éditable)          │
│                      │  [Couleurs]  │                      │
│  ┌────────────────┐  │  ── ──── ──  │  ┌────────────────┐  │
│  │                │  │  [Fonts]     │  │                │  │
│  │   Mockup REF   │  │  ── ──── ──  │  │  Mockup CLIENT │  │
│  │                │  │  [Sections]  │  │                │  │
│  └────────────────┘  │              │  └────────────────┘  │
│                      │  [Tout       │                      │
│  Pages: [Home][À]..  │   transférer]│  Pages: [Home][À]..  │
│                      │  [💾 Sauv.]  │  [⟳ Regénérer]      │
└──────────────────────┴──────────────┴──────────────────────┘
```

Les dividers centraux sont **redimensionnables** (glisser-déposer).

### Panneau de transfert — Onglet 🎨 Couleurs

Affiche les couleurs principales des deux sites côte à côte :

```
RÉFÉRENCE              VOTRE SITE
Primary  ████           ████
         #1a6b3a   →   #1e3a6b   [Appliquer]

Secondary ████          ████
          #c8a951  →   #888888   [Appliquer]
```

- Cliquer **Appliquer** sur une ligne → transfère cette couleur au mockup client
- La couleur s'applique immédiatement dans le panneau droit
- Déclenche l'auto-sauvegarde (theme.json mis à jour)

### Panneau de transfert — Onglet ✍️ Polices

Affiche les polices des deux sites :

```
RÉFÉRENCE                    CLIENT
Raleway        [Aperçu]  →   Montserrat    [Appliquer titres]
Open Sans      [Aperçu]  →   Arial         [Appliquer corps]
```

- Bouton **Aperçu** → charge la police depuis Google Fonts pour prévisualisation
- Bouton **Appliquer** → change la police du mockup client en temps réel

### Panneau de transfert — Onglet 🗂 Sections

Compare les sections détectées dans les deux sites :

```
Hero/Bannière          ✅ Référence  ✅ Client
Services               ✅ Référence  ✅ Client
Témoignages            ✅ Référence  ❌ Client  [Ajouter?]
FAQ                    ❌ Référence  ✅ Client
Contact                ✅ Référence  ✅ Client
```

- **Vert** : section présente dans les deux sites
- **Orange** : section présente seulement dans la référence
- **Gris** : section présente seulement dans le client

### Bouton "Tout transférer"

Transfère en une fois :
- Toutes les couleurs (primary, secondary, background, text)
- La police des titres

Idéal pour un "clone de direction" rapide, que vous affinerez ensuite.

### Bouton "💾 Sauvegarder"

Déclenche la sauvegarde complète du thème client dans `theme.json`.

### Bouton "⟳ Régénérer"

Régénère le mockup client complet depuis le serveur, en intégrant le `theme.json` sauvegardé dans le HTML. Le panneau droit se recharge automatiquement.

---

## 8. Cas concret 1 — Nouveau site (client sans site existant)

**Situation :** Votre client veut créer un site pour son club de judo. Il n'a pas encore de site. Il vous a montré 2–3 sites de clubs sportifs qu'il aime.

### Étape 1 : Scraper les sites de référence

Sur la page principale de l'app :

1. Entrez l'URL du premier site de référence (ex: `https://www.sankuno.com`)
2. Cochez : Screenshots ✅, Audit ✅
3. Profondeur : 2
4. Cliquez **Scraper** → attendez la fin (~3 min)
5. Répétez pour les autres références si nécessaire

**Résultat :** Vous avez l'analyse complète des sites qui plaisent au client — leurs couleurs, polices, sections utilisées.

### Étape 2 : Identifier ce qui plaît au client

Dans les cartes de l'historique :
1. Cliquez **Rapport** sur chaque référence → notez les couleurs primaires/secondaires
2. Cliquez **Mockup** → parcourez les sections disponibles
3. Identifiez : quels layouts de section correspondent au style voulu ?

**Notes à prendre :**
- Couleur primaire du site référence : `#1a6b3a` (vert judo ?)
- Police titres : Raleway
- Structure page accueil : Hero split + 3 cartes services + témoignages + contact

### Étape 3 : Créer un "site de départ" pour le mockup client

Puisque le client n'a pas de site, vous avez deux options :

**Option A — Scraper un site similaire existant du client :**
Si le client a un vieux site ou une page Facebook avec du contenu, scrapez-le pour extraire les textes et images.

**Option B — Partir d'un site référence :**
Utilisez directement le mockup du site référence comme base.

Dans les deux cas, ouvrez le **Design Studio Comparatif** :
- Référence : le site qui plaît au client
- Client : votre site de départ (référence ou vieux site)

### Étape 4 : Construire le mockup client dans le Studio

1. Ouvrez le Studio (`/compare-studio/sankuno.com/judo-sombreffe.vercel.app`)
2. Panneau Couleurs → **Appliquer** la couleur primaire du judo (vert → bleumarine, rouge, ou ce que le client préfère)
3. Panneau Fonts → **Appliquer** la police qui correspond à l'univers sportif
4. Panneau Sections → **Identifier** quelles sections ajouter/retirer

### Étape 5 : Affiner dans le Mockup Editor

Cliquez sur **Mockup** du site client (panneau droit du Studio ou depuis l'historique).

Le panneau éditeur s'ouvre à droite. Faites les ajustements fins :

1. **Onglet 🎨** → affiner les couleurs (secondary color, background)
2. **Onglet ✍️** → ajuster la taille de police, le rayon de bordures
3. **Onglet 📐** → choisir le style de header (transparent pour un look sportif premium)
4. **Onglet 🗂** → pour chaque section, tester les variantes :
   - Hero : "Split gauche" ou "Fond plein" pour l'impact visuel
   - Services : "3 cartes" pour les disciplines du club
   - About : "Image droite" pour le photo de l'équipe

### Étape 6 : Présenter au client

Le mockup est accessible à une URL locale :
`http://localhost:3000/output/judo-sombreffe.vercel.app/mockup/index.html`

Vous pouvez :
- **Partager l'écran** en réunion client et modifier en live devant lui
- **Exporter en PDF** depuis le navigateur (impression → PDF)
- **Faire des screenshots** pour un document de présentation

### Étape 7 : Exporter vers Claude Code

Une fois le mockup validé par le client :

1. Récupérez `output/judo-sombreffe.vercel.app/mockup/theme.json`
2. Récupérez `output/judo-sombreffe.vercel.app/analysis/design-system.json`
3. Récupérez `output/judo-sombreffe.vercel.app/analysis/content.json`

Collez dans Claude Code :

```
Voici le design system validé pour le site du Judo Club Sombreffe.
Génère le site complet en Next.js avec Tailwind CSS.

## theme.json (thème validé par le client)
[coller le contenu de theme.json]

## content.json (contenu extrait)
[coller les sections H1/H2/CTAs pertinentes]

## Structure souhaitée
- Page d'accueil : Hero split + 3 services + About + Témoignages + Contact
- Page disciplines : grille des arts martiaux pratiqués
- Page contact : formulaire + adresse + Google Maps

## Contraintes
- Mobile-first
- Couleur primaire : #1a3a6b
- Police titres : Raleway (Google Fonts)
- Header transparent sur la home, coloré sur les sous-pages
```

---

## 9. Cas concret 2 — Refonte en s'inspirant d'un site référence

**Situation :** Le Judo Club Sombreffe a déjà un site (`judo-sombreffe.vercel.app`). Il est vieillissant. Vous avez identifié `sankuno.com` comme référence de design moderne pour l'univers judo.

### Étape 1 : Scraper les deux sites

```
1. Scraper sankuno.com          → référence design moderne
2. Scraper judo-sombreffe.vercel.app → site actuel du client
```

Activez **Audit** pour les deux → vous aurez les scores de comparaison.

### Étape 2 : Analyser les écarts

**Rapport sankuno.com :**
- Score global : 82/100
- Couleurs : vert professionnel `#1a6b3a`, or `#c8a951`
- Polices : Raleway + Open Sans
- Sections : Hero full-bg, 4 services cards, témoignages grille, CTA, contact split

**Rapport judo-sombreffe.vercel.app :**
- Score global : 58/100
- Problèmes : contraste insuffisant, images non optimisées, pas de section témoignages
- Couleurs : bleu pâle `#4a90d9`, blanc cassé
- Polices : Arial (pas de Google Font)

**Écarts identifiés :**
- Manque de section témoignages
- Typographie peu professionnelle
- CTA pas assez visible
- Header trop chargé

### Étape 3 : Ouvrir le Design Studio Comparatif

Page principale → Section "Design Studio Comparatif" :
- Référence : `sankuno.com`
- Client : `judo-sombreffe.vercel.app`
- Cliquer **Ouvrir le Studio**

### Étape 4 : Transfert de design guidé

**Dans le Studio, travaillez dans cet ordre :**

#### 4a. Couleurs (onglet 🎨)

Comparez les palettes côte à côte :
```
REF sankuno.com          CLIENT judo-sombreffe
Primary  █ #1a6b3a   →  █ #4a90d9    [Appliquer]
Secondary █ #c8a951  →  █ #ffffff    [Appliquer]
Background █ #f8f5ed →  █ #ffffff    [Appliquer]
```

Réflexion sur chaque couleur :
- **Primary** : Le vert de sankuno colle-t-il à l'identité judo ? Peut-être garder le bleu mais le rendre plus profond. → Appliquer, puis ajuster dans l'éditeur.
- **Secondary** : L'or de sankuno est élégant, l'adopter pour les accents ? → Appliquer.
- **Background** : La crème chaude de sankuno (`#f8f5ed`) est plus accueillante que le blanc pur → Appliquer.

#### 4b. Polices (onglet ✍️)

```
REF sankuno.com          CLIENT judo-sombreffe
Raleway    [Aperçu]  →   Arial      [Appliquer titres]
Open Sans  [Aperçu]  →   Arial      [Appliquer corps]
```

Cliquez **Aperçu** sur Raleway → voyez le rendu dans le panneau droit.
Si ça convient → **Appliquer titres**.

#### 4c. Sections (onglet 🗂)

```
Hero               ✅ sankuno  ✅ judo
Services           ✅ sankuno  ✅ judo
Témoignages        ✅ sankuno  ❌ judo    ← ajouter !
CTA                ✅ sankuno  ❌ judo    ← ajouter !
Contact            ✅ sankuno  ✅ judo
```

Notez les sections manquantes pour les ajouter manuellement dans Claude Code.

### Étape 5 : Affinage dans l'éditeur

Après le transfert global, cliquez sur le mockup client pour ouvrir l'éditeur latéral.

**Onglet 🎨 — Ajuster les couleurs transférées :**
- La primary `#1a6b3a` (vert sankuno) → l'adapter à l'identité judo : `#1a3a6b` (bleu marine judo)
- Conserver l'or secondary `#c8a951` tel quel

**Onglet 🗂 — Tester les variantes de sections :**
- Hero → passer de "Centré" à "Fond plein" pour plus d'impact
- Services → garder "3 cartes" (disciplines, calendrier, inscriptions)
- About → passer à "Split-right" (coach à droite, texte à gauche)

**Onglet 📐 — Mise en page :**
- Header : "Couleur primaire" (bleu marine, plus professionnel)
- Espacement : "Spacieux" (respire mieux sur mobile)

### Étape 6 : Sauvegarder et régénérer

1. Cliquez **💾 Sauvegarder** dans le Studio → `theme.json` mis à jour
2. Cliquez **⟳ Régénérer** → le mockup est reconstruit avec le nouveau design
3. Naviguez dans le panneau client pour vérifier toutes les pages

### Étape 7 : Présenter la refonte au client

Ouvrez le Studio en réunion client :
- **Panneau gauche** : "Voici votre site actuel"
- **Panneau droit** : "Voici la refonte proposée"

Le client peut voir instantanément la différence. Vous pouvez modifier en live selon ses retours (changer une couleur, tester une autre police, basculer une variante de section).

### Étape 8 : Export vers Claude Code

Avec le thème validé :

```
Voici le design de refonte pour judo-sombreffe.vercel.app,
inspiré de sankuno.com. Génère le nouveau site en Next.js.

## theme.json validé
[coller theme.json]

## Audit de l'ancien site — problèmes à corriger
- Contraste couleurs insuffisant (correction : texte #222 sur fond #f8f5ed)
- Section témoignages manquante → ajouter avant le footer
- Section CTA manquante → ajouter après les services
- Images hero : remplacer par WebP avec lazy loading
- Header : simplifier, 4 liens max

## Structure finale souhaitée
Page accueil : Hero (fond plein) > Services (3 cartes) > About (split)
             > Témoignages (grille) > CTA > Contact (split)
Page disciplines > Page calendrier > Page contact

## Design system
[coller design-system.json]
```

---

## 10. Export vers Claude Code

### Fichiers à fournir à Claude Code

| Fichier | Où le trouver | Quoi en faire |
|---|---|---|
| `theme.json` | `output/[site]/mockup/theme.json` | Coller en entier |
| `design-system.json` | `output/[site]/analysis/design-system.json` | Coller la section colors + typography |
| `content.json` | `output/[site]/analysis/content.json` | Extraire les textes pertinents |
| `sections.json` | `output/[site]/analysis/sections.json` | Lister les sections et leurs variantes choisies |
| `audit.json` | `output/[site]/analysis/audit.json` | Lister les recommandations à implémenter |
| Screenshots | `output/[site]/screenshots/` | Joindre comme référence visuelle |

### Template de prompt Claude Code

```markdown
# Génération site [Nom du client]

## Contexte
[Description du client et de son activité en 2-3 phrases]

## Tech stack cible
- Framework : Next.js 14 App Router
- Styling : Tailwind CSS
- Déploiement : Vercel

## Design System (validé par le client)
[Coller theme.json]

## Structure des pages
1. Page d'accueil
   - Section Hero : variante [centré/split/fond plein]
   - Section Services : [3 cartes] avec [titres extraits de content.json]
   - Section About : [split-left]
   - Section Contact : [centré]

2. [Autres pages...]

## Contenu clé extrait
[Coller les H1, H2, CTAs de content.json]

## Améliorations UX à intégrer (depuis audit.json)
- [Liste des recommandations pertinentes]

## Contraintes
- Mobile-first obligatoire
- Accessibilité WCAG AA
- Images : format WebP avec lazy loading
- Performance : Core Web Vitals vert
```

### Après Claude Code

Claude Code va générer le code. Vous pouvez ensuite :
1. **Tester localement** (`npm run dev`)
2. **Comparer visuellement** avec le mockup (deux onglets côte à côte)
3. **Itérer** : corriger les détails avec Claude Code
4. **Déployer** sur Vercel en un `git push`

---

## 11. Référence technique

### Commandes

```bash
# Démarrer le serveur
npm run server

# Scraper un site en CLI (sans interface)
npm run scrape -- --url https://mon-site.com --depth 2

# Générer le mockup d'un site déjà scrapé
npm run mockup -- --domain mon-site.com

# Régénérer tous les mockups
npm run mockup:all
```

### API REST (pour intégrations)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/scrape` | Lance un scraping (`{ url, options }`) |
| `GET` | `/api/status/:jobId` | Statut d'un job en cours |
| `GET` | `/api/domains` | Liste des sites scrapés |
| `POST` | `/api/mockup` | Génère/régénère le mockup (`{ domain }`) |
| `GET` | `/api/theme/:domain` | Récupère le theme.json sauvegardé |
| `POST` | `/api/theme/:domain` | Sauvegarde un theme.json |
| `GET` | `/api/compare-data/:ref/:client` | Données pour le Design Studio |

### Logs en temps réel (SSE)

Les logs de scraping sont streamés en temps réel via Server-Sent Events :
```
GET /api/logs/:jobId   → EventStream
```

Chaque événement : `{ level: 'info'|'done'|'warn'|'error', message: '...' }`

### Ports utilisés

| Port | Usage |
|---|---|
| 3000 | Serveur principal (Express) |
| 3001 | Fallback si 3000 occupé |

### Dossiers importants

```
Script Scrapper App/
├── src/
│   ├── server.js              ← Serveur Express + routes API
│   ├── index.js               ← Pipeline de scraping
│   ├── mockup.js              ← Générateur de mockup HTML
│   └── modules/
│       ├── sections.js        ← Détection et scoring des sections
│       ├── mockup-editor.js   ← JS du panneau éditeur (embarqué dans les mockups)
│       └── extractor.js       ← Extraction couleurs/typo/contenu
├── src/public/
│   ├── index.html             ← Interface principale
│   ├── compare-studio.html    ← Design Studio Comparatif
│   └── studio.html            ← Studio simple (legacy)
├── output/                    ← Tous les sites scrapés
└── GUIDE_UTILISATEUR.md       ← Ce fichier
```

### Variables de thème CSS disponibles

Dans les mockups, ces custom properties sont disponibles pour les overrides :

```css
:root {
  --color-primary: #1a3a6b;
  --color-secondary: #c8a951;
  --color-background: #f8f5ed;
  --color-text: #333333;
  --color-accent: #e85d26;
  --base-font-size: 16px;
  --border-radius: 8px;
  --container-width: 1200px;
  --section-spacing: 80px;
  --font-heading: 'Raleway', sans-serif;
  --font-body: 'Open Sans', sans-serif;
}
```

---

## Résumé du workflow en 5 étapes

```
1. SCRAPER ──────────── Collecter l'ADN visuel des sites
        ↓
2. ANALYSER ─────────── Lire les rapports + identifier les forces/faiblesses
        ↓
3. COMPARER ─────────── Design Studio pour transférer les meilleurs éléments
        ↓
4. MAQUETTER ────────── Mockup Editor pour affiner section par section
        ↓
5. EXPORTER ─────────── Fournir theme.json + content.json à Claude Code
```

---

*Guide rédigé pour Script Scrapper App v2.0 — Mockup Editor + Design Studio Comparatif*
*Dernière mise à jour : mai 2026*
