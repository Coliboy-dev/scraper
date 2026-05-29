import path from 'path';
import { writeText } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

export async function generateReport({ outDir, audit, designSystem, sitemap, manifest, content }) {
  const now = new Date().toLocaleString('fr-FR');

  let md = `# RAPPORT D'ANALYSE — ${audit.url}
> Généré le ${now} par Site Scraper CLI
> **Utilisation :** Copie ce fichier entier dans Claude et demande la reconstruction en Next.js 14 App Router.

---

## 1. STACK TECHNIQUE

| Élément | Valeur |
|---|---|
| Framework | ${audit.framework} |
| CMS | ${audit.cms || 'Aucun détecté'} |
| Librairies JS | ${audit.libraries.join(', ') || 'Aucune'} |
| Services tiers | ${audit.thirdPartyServices.join(', ') || 'Aucun'} |
| Complexité estimée | **${audit.complexity}** (score ${audit.complexityScore}/10) |
| Pages crawlées | ${sitemap.length} |

## 2. FONCTIONNALITÉS DÉTECTÉES

${audit.features.map(f => `- ${f}`).join('\n') || '- Aucune fonctionnalité complexe détectée'}

## 3. SITEMAP

${sitemap.map(p =>
  `- **[${p.slug}]** \`${p.url}\`\n  - Titre : ${p.title || 'N/A'}\n  - H1 : ${p.h1 || 'N/A'}`
).join('\n')}

## 4. DESIGN SYSTEM

### Couleurs

${Object.entries(designSystem.colors).map(([n, hex]) => `- **${n}** : \`${hex}\``).join('\n')}

### Typographie

${Object.entries(designSystem.typography).map(([sel, t]) =>
  `- **${sel}** : ${t.fontFamily}, ${t.fontSize}, weight ${t.fontWeight}`
).join('\n')}

### Google Fonts

${manifest.googleFonts.map(f => `- ${f.name} → \`${f.note}\``).join('\n') || '- Aucune Google Font détectée'}

## 5. ASSETS

| Type | Nombre |
|---|---|
| Images | ${manifest.images.length} |
| Icônes | ${manifest.icons.length} |
| Fonts locales | ${manifest.fonts.length} |
| Vidéos | ${manifest.videos.length} |
| Fichiers CSS | ${manifest.css.length} |
| Fichiers JS | ${manifest.js.length} |

${manifest.images.length > 0
  ? '### Images principales\n\n' + manifest.images.slice(0, 10).map(i => `- \`${i.file}\` — ${i.alt || 'pas d\'alt'}`).join('\n')
  : ''}

## 6. CONTENU PAR PAGE

`;

  for (const [slug, page] of Object.entries(content)) {
    md += `### ${slug}\n\n`;
    md += `**URL :** ${page.url}\n\n`;

    if (page.headings.h1?.length)  md += `**H1 :** ${page.headings.h1.join(' | ')}\n\n`;
    if (page.headings.h2?.length)  md += `**H2 :** ${page.headings.h2.slice(0, 4).join(' · ')}\n\n`;
    if (page.cta.length)           md += `**CTAs :** ${page.cta.map(c => c.text).join(' · ')}\n\n`;
    if (Object.keys(page.sections).length) {
      md += `**Sections :** ${Object.keys(page.sections).join(', ')}\n\n`;
    }
    if (page.forms.length) {
      md += `**Formulaires :** ${page.forms.length} formulaire(s)\n\n`;
    }
  }

  md += `
## 7. NAVIGATION PRINCIPALE

${Object.values(content)[0]?.navigation?.map(n => `- [${n.text}](${n.href})`).join('\n') || '- Non extraite'}

## 8. RECOMMANDATIONS NEXT.JS 14

${audit.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') || '- Aucune recommandation spécifique'}

## 9. ESTIMATION

| Critère | Valeur |
|---|---|
| Pages à reconstruire | **${sitemap.length}** |
| Composants estimés | **${estimateComponents(audit)}** |
| Complexité globale | **${audit.complexity}** |
| Durée estimée | **${estimateDuration(audit, sitemap.length)}** |

## 10. FICHIERS DISPONIBLES

\`\`\`
analysis/
├── report.md             ← CE FICHIER (contexte pour Claude)
├── audit.json
├── design-system.json
├── design-system.md
├── tailwind.config.ts    ← Prêt à l'emploi dans Next.js
├── globals.css
├── content.json
├── content.md
├── assets-manifest.json
└── sitemap.json

screenshots/              ← desktop + tablet + mobile
assets/images/            ← Images téléchargées
assets/fonts/             ← Fonts téléchargées
html/                     ← HTML source de chaque page
\`\`\`
`;

  await writeText(path.join(outDir, 'analysis', 'report.md'), md);
  logger.done('report.md généré — prêt pour le méga-prompt Claude');

  return md;
}

function estimateComponents(audit) {
  let base = 8;
  if (audit.features.includes('Formulaires'))       base += 3;
  if (audit.features.includes('Slider / Carousel')) base += 2;
  if (audit.features.includes('Modal / Lightbox'))  base += 2;
  if (audit.features.includes('Blog / Articles'))   base += 3;
  if (audit.features.includes('E-commerce'))        base += 5;
  if (audit.features.includes('Carte interactive')) base += 1;
  return `${base}–${base + 5}`;
}

function estimateDuration(audit, pages) {
  const base = { SIMPLE: 1, MOYEN: 3, COMPLEXE: 7 }[audit.complexity] || 3;
  const extra = Math.ceil(pages * 0.5);
  const total = base + extra;
  return total <= 2 ? `${total} jour(s)` : `${total}–${total + 2} jours`;
}
