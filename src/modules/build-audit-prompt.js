export async function buildAuditPrompt(domain, analysisDir, fs) {
  const read = async (file) => {
    try { return JSON.parse(await fs.readFile(`${analysisDir}/${file}`, 'utf8')); }
    catch { return null; }
  };

  const [audit, design, content, sitemap] = await Promise.all([
    read('audit.json'),
    read('design-system.json'),
    read('content.json'),
    read('sitemap.json'),
  ]);

  const pages = Array.isArray(sitemap) ? sitemap : [];
  const c = design?.colors || {};
  const t = design?.typography || {};
  const nav = content?.[pages[0]?.slug]?.navigation || [];
  const allCtas = pages.flatMap(p => content?.[p.slug]?.cta || []);
  const ctaTexts = [...new Set(allCtas.map(c => c.text))].slice(0, 8);
  const allForms = pages.flatMap(p => content?.[p.slug]?.forms || []);
  const allSections = pages.flatMap(p => Object.keys(content?.[p.slug]?.sections || {}));
  const uniqueSections = [...new Set(allSections)];
  const allH1s = pages.map(p => content?.[p.slug]?.headings?.h1?.[0]).filter(Boolean);

  const colorList = Object.entries(c).map(([k,v]) => `  - ${k} : ${v}`).join('\n');
  const typoList  = Object.entries(t).slice(0, 6).map(([k,v]) =>
    `  - ${k} : ${v.fontFamily || ''} ${v.fontSize || ''} ${v.fontWeight ? `(weight ${v.fontWeight})` : ''}`.trim()
  ).join('\n');

  const libs = (audit?.libraries || []).join(', ') || 'non détectées';
  const features = (audit?.features || []).join(', ') || 'non détectées';
  const framework = audit?.framework || 'non détecté';
  const complexity = audit?.complexity || '?';

  const pageList = pages.map(p => `  - ${p.title || p.slug} (${p.url})`).join('\n');
  const navList  = nav.slice(0, 10).map(n => `  - ${n.text}`).join('\n');

  return `# Prompt d'audit de refonte — ${domain}

Tu es un expert en refonte web, UX et SEO local pour petites entreprises et indépendants.
Voici les données extraites automatiquement du site **${domain}**.
Génère un rapport d'audit professionnel en Markdown, lisible par le client.

## Le rapport doit contenir :
1. **Résumé exécutif** — 3 à 5 phrases + un score global /10
2. **Points forts à conserver** — ce qui fonctionne et doit être gardé
3. **Problèmes UX** — frictions, navigation, lisibilité, mobile
4. **Problèmes SEO** — balisage, vitesse, structure, local
5. **Freins à la conversion** — ce qui empêche les visiteurs de passer à l'action
6. **Recommandations prioritaires** — classées en 3 niveaux (quick wins / refonte / long terme)
7. **Estimation de la refonte** — fourchette en jours et en budget approximatif

---

## Données extraites du site

### Informations générales
- Domaine : ${domain}
- Pages analysées : ${pages.length}
- Score de complexité technique : ${complexity}/10
- Framework détecté : ${framework}
- Bibliothèques : ${libs}
- Fonctionnalités détectées : ${features}

### Navigation principale
${navList || '  (non détectée)'}

### Pages du site
${pageList || '  (aucune page)'}

### H1 par page
${allH1s.map(h => `  - "${h}"`).join('\n') || '  (non détectés)'}

### CTAs détectés
${ctaTexts.map(c => `  - "${c}"`).join('\n') || '  (aucun CTA détecté)'}

### Formulaires
${allForms.length
  ? allForms.map(f => `  - ${f.fields?.length || 0} champs : ${f.fields?.map(x => x.label || x.name).join(', ')}`).join('\n')
  : '  (aucun formulaire détecté)'}

### Sections de contenu détectées
${uniqueSections.length ? uniqueSections.map(s => `  - ${s}`).join('\n') : '  (non détectées)'}

### Système de design — Couleurs
${colorList || '  (non extrait)'}

### Système de design — Typographie
${typoList || '  (non extrait)'}

---

## Instructions de format

- Rédige en français, ton professionnel mais accessible
- Utilise des émojis comme indicateurs visuels (✅ ⚠️ ❌ 🎯 📈)
- Chaque problème doit avoir une recommandation concrète associée
- Les recommandations "quick wins" doivent être applicables sans refonte complète
- L'estimation doit être honnête et réaliste pour un freelance solo
- Le rapport doit pouvoir être envoyé directement au client tel quel
`;
}
