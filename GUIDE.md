# Web Refactor Studio — Guide complet

> **Version 1.0** · Start'OnLab · Mai 2026

---

## Présentation

**Web Refactor Studio** est un outil interne pour freelances et agences web qui permet de partir d'une URL client, d'analyser automatiquement le site existant, de générer un mockup HTML redesigné, de le modifier visuellement dans un studio de design intégré, puis d'exporter un brief structuré vers Claude Code pour la production.

### Ce que l'outil fait concrètement

1. **Scrape** un site existant (contenu, couleurs, typographies, structure)
2. **Génère** un mockup HTML statique redesigné automatiquement
3. **Ouvre** un Studio de design pour modifier le thème visuellement
4. **Exporte** un prompt structuré prêt à coller dans Claude Code

### À qui s'adresse-t-il

- Freelances web qui font de la refonte
- Petites agences qui veulent accélérer la phase d'avant-vente
- Tout professionnel qui part d'un site existant pour proposer un redesign

---

## Installation

### Prérequis

- Node.js 18 ou supérieur
- npm

### Démarrage

```bash
# Installation des dépendances (première fois)
npm run setup

# Lancer le serveur
npm run server
```

L'interface s'ouvre sur **http://localhost:3456**

---

## Interface principale

### Formulaire de scraping

| Champ | Description |
|-------|-------------|
| **URL** | URL complète du site à analyser (`https://www.exemple.com`) |
| **Profondeur** | Nombre de niveaux de pages à crawler (1 = page d'accueil seulement, 2 = accueil + liens directs) |
| **Screenshots** | Capture d'écran de chaque page crawlée |
| **Créer ZIP** | Archive `.tar.gz` de tout le dossier de sortie |

### Journal en temps réel

Pendant le scraping, un terminal affiche les étapes en direct :

- `⬢ Étape X` — phase en cours
- `✓` — succès
- `✗` — erreur
- `→` — sous-tâche

À la fin du scraping, le mockup est **généré automatiquement** sans action supplémentaire.

### Historique des analyses

Chaque domaine analysé apparaît dans la grille d'historique avec :

| Bouton | Action |
|--------|--------|
| `report.md` | Voir le rapport d'audit généré |
| `📋 Prompt audit` | Générer un prompt d'audit complet pour Claude |
| `⚡ Mockup` | Regénérer le mockup si nécessaire |
| `✦ 3 variantes` | Générer 3 variantes de style automatiques |
| `⚖ Comparer` | Ouvrir le comparateur côte à côte |
| `🎨 Studio` | Ouvrir le Mockup Designer Studio |
| `Dossier` | Accéder aux fichiers bruts dans `output/` |

---

## Mockup Designer Studio

Le Studio s'ouvre à l'adresse `/studio/[domaine]` et propose 8 onglets.

### Onglet STYLE — Presets et import de référence

**Section "Site de référence"**  
Permet d'importer la palette et les typographies d'un autre domaine déjà scrapé. Utile pour aligner le mockup sur un site de référence ou concurrent.

**Presets (20 styles en 6 familles)**

| Famille | Presets |
|---------|---------|
| PROFESSIONNEL | Corporate, Juridique, Immobilier, ONG/Asso |
| CRÉATIF | Photographe, Studio créatif, Éditorial, Sportif, Minimaliste |
| COMMERCE | Restaurant gastro, E-commerce, Artisan |
| TECH | Tech moderne, SaaS/B2B, Formation |
| PREMIUM | Premium expert, Luxe discret |
| BIEN-ÊTRE | Santé & bien-être, Chaleureux local, Artisanal |

Chaque famille est repliable (clic sur le label). Un preset s'applique instantanément à l'aperçu.

### Onglet COULEURS

Édition directe des 8 tokens de couleur du mockup :
- `primary` · `secondary` · `accent`
- `background` · `surface`
- `text` · `muted` · `border`

### Onglet TYPO

- Police des titres et du corps de texte (liste de 30+ Google Fonts)
- Graisses, taille de base, hauteur de ligne, espacement des lettres

### Onglet LAYOUT

- Espacement des sections
- Largeur maximale du conteneur
- Rayon des bordures (cartes, boutons)

### Onglet SECTIONS

Active ou désactive chaque section du mockup (hero, services, about, testimonials, contact, footer, FAQ…).

### Onglet MOBILE

Prévisualisation sur mobile avec basculement rapide Desktop / Tablette / Mobile depuis la barre supérieure.

### Onglet BRIEF

Décrit le contexte du projet pour enrichir le prompt final :
- Secteur d'activité
- Cible principale
- Ton éditorial
- Stack technique souhaitée

### Actions du panneau bas

| Bouton | Rôle |
|--------|------|
| 💾 **Sauvegarder** | Enregistre le thème (localStorage + `theme.json` serveur) |
| 📂 **Charger** | Importe un fichier `theme.json` exporté |
| ⬇ **Export JSON** | Télécharge le thème actuel en JSON |
| ✨ **Générer Prompt** | Génère le prompt structuré pour Claude Code |

### Variantes automatiques

Le bouton **⚡ 3 variantes** (barre de pages) génère automatiquement 3 déclinaisons de style :

| Variante | Style |
|----------|-------|
| 🏢 Pro | Corporate bleu, typographie structurée |
| 👑 Premium | Dark gold, typographie éditoriale |
| 🏡 Local | Terre cuite/crème, typographie chaleureuse |

Le bouton **⚖ Comparer** ouvre une page côte à côte. Un clic sur "✓ Choisir" applique le thème de la variante au Studio.

---

## Cas concret 1 — Analyse client et proposition de mockup

### Contexte

Un client vous contacte avec son site actuel. Il veut un devis de refonte. Vous souhaitez lui présenter rapidement à quoi pourrait ressembler le nouveau site.

### Étapes complètes

**1. Scraper le site client**

- Ouvrez `http://localhost:3456`
- Collez l'URL du site client
- Réglez la profondeur sur `2` pour analyser accueil + pages principales
- Laissez Screenshots et ZIP activés
- Cliquez **Lancer l'analyse**
- Attendez la fin (3–5 min selon la taille du site)

**2. Consulter le rapport d'audit**

- Dans l'historique, cliquez `report.md`
- Vous obtenez : score global, points forts, problèmes UX/SEO, freins à la conversion, recommandations, estimation de budget
- Ce rapport est directement envoyable au client

**3. Ouvrir le Studio**

- Cliquez `🎨 Studio` sur la carte du domaine
- Le mockup HTML est chargé dans la preview à droite

**4. Choisir un preset cohérent**

- Onglet **STYLE** → parcourir les familles de presets
- Choisir le preset qui correspond au secteur client (ex: `Immobilier`, `Restaurant gastro`, `Corporate`…)
- Le thème s'applique instantanément à la preview

**5. Affiner couleurs et typographies**

- Onglet **COULEURS** → ajuster la couleur primaire pour correspondre à la charte du client
- Onglet **TYPO** → choisir les polices Google Fonts appropriées

**6. Générer les 3 variantes**

- Cliquer **⚡ 3 variantes** dans la barre de pages
- Cliquer **⚖ Comparer** pour voir les 3 options côte à côte
- Choisir la variante préférée → elle s'applique au Studio

**7. Exporter le prompt pour Claude Code**

- Remplir l'onglet **BRIEF** (secteur, cible, ton, stack)
- Cliquer **💾 Sauvegarder**
- Cliquer **✨ Générer Prompt**
- Copier le prompt → le coller dans Claude Code pour la production

### Livrables

| Livrable | Où le trouver |
|----------|---------------|
| Rapport d'audit (`report.md`) | Bouton `report.md` dans l'historique |
| Mockup HTML statique | `output/[domaine]/mockup/index.html` |
| 3 variantes HTML | `output/[domaine]/mockup/variant-a/b/c.html` |
| Comparateur | `output/[domaine]/mockup/compare.html` |
| Thème JSON | Export depuis le Studio |
| Prompt Claude Code | Bouton "Générer Prompt" dans le Studio |

---

## Cas concret 2 — Site de référence + site client → redesign inspiré

### Contexte

Vous avez trouvé un site de référence (concurrent haut de gamme, inspiration sectorielle) dont vous voulez vous inspirer pour le redesign du site client. L'objectif est de combiner le contenu/structure du client avec le style visuel de la référence.

### Étapes complètes

**1. Scraper le site de référence en premier**

- Ouvrez `http://localhost:3456`
- Collez l'URL du site de référence (ex: un concurrent premium du client)
- Profondeur `1` suffit généralement
- Lancez l'analyse → attendez la fin

**2. Scraper le site client**

- Retournez dans le formulaire
- Collez l'URL du site client
- Profondeur `2` pour capturer accueil + pages
- Lancez l'analyse

**3. Ouvrir le Studio du site client**

- Dans l'historique, sur la carte du **site client**, cliquez `🎨 Studio`
- Le mockup client est chargé dans la preview

**4. Importer le style du site de référence**

- Onglet **STYLE** → section "Site de référence" (tout en haut du panneau)
- Dans le champ texte, saisissez le domaine de référence (ex: `reference.com`)  
  OU sélectionnez-le dans la liste déroulante de l'historique
- Cliquez le bouton **→** (flèche bleue)
- Les swatches de couleur et les polices du site de référence s'affichent en aperçu
- Cliquez **Appliquer les couleurs** et/ou **Appliquer la typo**

**5. Ajuster et personnaliser**

- Le mockup client adopte maintenant le style de la référence
- Onglet **COULEURS** → affiner si certaines couleurs ne correspondent pas exactement
- Onglet **TYPO** → ajuster les polices si nécessaire
- Onglet **SECTIONS** → activer/désactiver les sections selon la structure client

**6. Valider avec les variantes**

- **⚡ 3 variantes** → génère 3 déclinaisons pour proposer des options
- **⚖ Comparer** → montrez les 3 options en visio avec le client
- Le client choisit → **✓ Choisir** applique le thème

**7. Enrichir le brief et exporter**

- Onglet **BRIEF** :
  - Secteur : ex. "Coach sportif indépendant"
  - Cible : ex. "Particuliers 25–45 ans, sportifs urbains"
  - Ton : ex. "Motivant, accessible, professionnel"
  - Stack : ex. "Next.js + Tailwind CSS"
- **💾 Sauvegarder**
- **✨ Générer Prompt** → prompt complet avec toutes les données extraites

**8. Livrables finaux**

| Livrable | Description | Destinataire |
|----------|-------------|--------------|
| `compare.html` | Comparatif 3 variantes | Présentation client (visio, PDF) |
| `report.md` | Audit du site actuel | Argumentaire commercial |
| Mockup HTML | Aperçu du futur site | Démonstration client |
| Prompt Claude Code | Brief technique complet | Production (vous) |
| `theme.json` | Thème exporté | Sauvegarde / itérations futures |

---

## Structure des fichiers générés

```
output/
└── domaine.com/
    ├── analysis/
    │   ├── audit.json          ← audit technique (framework, libs, complexité)
    │   ├── content.json        ← contenu extrait (H1, CTAs, formulaires, nav)
    │   ├── design-system.json  ← couleurs et typographies détectées
    │   ├── report.md           ← rapport d'audit complet
    │   └── sitemap.json        ← structure des pages
    ├── mockup/
    │   ├── index.html          ← mockup principal
    │   ├── variant-a.html      ← variante Professionnel
    │   ├── variant-b.html      ← variante Premium
    │   ├── variant-c.html      ← variante Chaleureux local
    │   ├── compare.html        ← comparateur 3 variantes
    │   └── theme.json          ← thème sauvegardé depuis le Studio
    └── screenshots/            ← captures d'écran par page
```

---

## Raccourcis et astuces

| Situation | Astuce |
|-----------|--------|
| Preview lente à charger | Attendre que le spinner disparaisse — le mockup se charge en iframe |
| Preset non appliqué | Vérifier que le mockup est bien généré avant d'ouvrir le Studio |
| Style de référence introuvable | Scraper d'abord le site de référence, puis relancer l'import |
| Mockup à regénérer | Bouton `⚡ Mockup` dans l'historique, ou "Générer le mockup" dans le Studio |
| Présenter au client | Ouvrir `compare.html` directement dans le navigateur du client |
| Sauvegarder une version | Export JSON depuis le Studio → stocker le fichier |

---

## Serveur API — Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/scrape` | Lance un job de scraping |
| `GET` | `/api/stream/:jobId` | Stream SSE des logs en direct |
| `GET` | `/api/history` | Liste des domaines analysés |
| `GET` | `/api/report/:domain` | Contenu du rapport |
| `POST` | `/api/mockup` | Génère le mockup HTML |
| `POST` | `/api/variants/:domain` | Génère les 3 variantes |
| `GET` | `/api/variants/:domain` | Vérifie si les variantes existent |
| `GET` | `/api/cross-theme/:domain` | Extrait le thème d'un domaine |
| `POST` | `/api/theme/:domain` | Sauvegarde le thème actuel |
| `GET` | `/api/audit-prompt/:domain` | Génère le prompt d'audit |

---

*Web Refactor Studio · Start'OnLab · 2026*
