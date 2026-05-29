export function genererClaudeMd(domain, { audit = {}, design = {}, content = {}, sitemap = [], sections = [] } = {}) {
  const home = Array.isArray(content)
    ? (content[0] || {})
    : (content.home || content[Object.keys(content)[0]] || {});

  const colors = design.colors || {};
  const typo   = design.typography || {};

  const primaryColor = colors.primary || colors.brand || '#6c8ef5';
  const headingFont  = typo.h1?.fontFamily || typo.h2?.fontFamily || 'Non détecté';
  const bodyFont     = typo.p?.fontFamily  || typo.body?.fontFamily || 'Non détecté';

  const stack = [
    audit.framework && audit.framework !== 'Unknown' ? `Framework : ${audit.framework}` : null,
    audit.cms                          ? `CMS : ${audit.cms}` : null,
    (audit.libraries || []).length     ? `Librairies : ${audit.libraries.join(', ')}` : null,
    (audit.thirdPartyServices || []).length ? `Services tiers : ${audit.thirdPartyServices.join(', ')}` : null,
  ].filter(Boolean);

  const sitemapLines = (Array.isArray(sitemap) ? sitemap : [])
    .slice(0, 20)
    .map(p => `- ${p.url}${p.title ? ` — ${p.title}` : ''}`);

  const sectionLines = (Array.isArray(sections) ? sections : [])
    .map(s => `- **${s.label || s.id}** (confiance : ${Math.round((s.confidence || 0) * 100)}%)`);

  const reco = (audit.recommendations || []).map(r => `- ${r}`);

  return [
    `# CLAUDE.md — ${domain}`,
    '',
    '> Ce fichier fournit le contexte technique du projet pour Claude Code.',
    '',
    '## Stack détectée',
    '',
    stack.length ? stack.join('\n') : '_Stack inconnue_',
    `Complexité : **${audit.complexity || 'MOYEN'}** (score ${audit.complexityScore ?? '?'}/10)`,
    `Fonctionnalités : ${(audit.features || []).join(', ') || '_aucune détectée_'}`,
    '',
    '## Design System',
    '',
    `- Couleur primaire : \`${primaryColor}\``,
    Object.entries(colors).slice(0, 6).map(([k, v]) => `- ${k} : \`${v}\``).join('\n'),
    `- Police titres : ${headingFont}`,
    `- Police corps : ${bodyFont}`,
    '',
    '## Architecture des pages',
    '',
    sitemapLines.length ? sitemapLines.join('\n') : '_Aucune page crawlée_',
    '',
    '## Sections identifiées',
    '',
    sectionLines.length ? sectionLines.join('\n') : '_Aucune section détectée_',
    '',
    '## Recommandations techniques',
    '',
    reco.length ? reco.join('\n') : '_Aucune recommandation_',
    '',
  ].join('\n');
}

export function genererMissionMd(domain, client, { audit = {}, design = {}, content = {}, scores = {} } = {}) {
  const home = Array.isArray(content)
    ? (content[0] || {})
    : (content.home || content[Object.keys(content)[0]] || {});

  const h1 = home.headings?.h1?.[0] || home.title || '';

  const scoresTable = [
    '| Critère | Score |',
    '|---|---|',
    `| SEO | ${scores.score_seo ?? '—'}/100 |`,
    `| Mobile | ${scores.score_mobile ?? '—'}/100 |`,
    `| Performance | ${scores.score_performance ?? '—'}/100 |`,
    `| UX | ${scores.score_ux ?? '—'}/100 |`,
    `| Conversion | ${scores.score_conversion ?? '—'}/100 |`,
    `| **Global** | **${scores.score_global ?? '—'}/100** |`,
  ].join('\n');

  const pointsForts = [
    scores.score_seo >= 80         ? 'Structure SEO solide' : null,
    scores.score_mobile >= 75      ? 'Bonne adaptabilité mobile' : null,
    scores.score_ux >= 75          ? 'Navigation claire' : null,
    scores.score_conversion >= 70  ? 'Éléments de conversion en place' : null,
    (audit.features || []).includes('Témoignages') ? 'Preuves sociales existantes' : null,
  ].filter(Boolean);

  const pointsFaibles = [
    scores.score_seo < 60          ? 'SEO à structurer (méta, H1, titres)' : null,
    scores.score_mobile < 75       ? 'Expérience mobile à améliorer' : null,
    scores.score_performance < 60  ? 'Performances de chargement à optimiser' : null,
    scores.score_conversion < 40   ? 'Pas assez d\'incitations à l\'action' : null,
    audit.framework === 'Unknown'  ? 'Stack difficile à identifier' : null,
  ].filter(Boolean);

  const stack = [audit.framework, audit.cms].filter(Boolean).join(' + ') || 'Inconnu';

  return [
    `# MISSION — ${client} (${domain})`,
    '',
    '## Contexte',
    '',
    `- **Site analysé** : https://${domain}`,
    h1 ? `- **Accroche principale** : "${h1}"` : '',
    `- **Stack actuelle** : ${stack}`,
    `- **Complexité** : ${audit.complexity || 'MOYEN'}`,
    '',
    '## Scores actuels',
    '',
    scoresTable,
    '',
    '## Points forts à conserver',
    '',
    pointsForts.length ? pointsForts.map(p => `- ${p}`).join('\n') : '- À évaluer lors de la phase de discovery',
    '',
    '## Points à améliorer',
    '',
    pointsFaibles.length ? pointsFaibles.map(p => `- ${p}`).join('\n') : '- Aucun point critique identifié',
    '',
    '## Objectif de la refonte',
    '',
    `Moderniser le site de **${client}** avec une stack Next.js 14, en conservant`,
    'l\'identité visuelle existante tout en améliorant les scores ci-dessus.',
    `Score global cible : **80/100**.`,
    '',
  ].join('\n');
}
