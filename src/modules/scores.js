export function calculerScores({ audit = {}, content = {}, design = {}, sitemap = [] }) {
  const features  = audit.features  || [];
  const libraries = audit.libraries || [];

  // ── score_seo (100) ───────────────────────────────────────────────────────
  const home = Array.isArray(content) ? (content[0] || {}) : (content.home || content[Object.keys(content)[0]] || {});
  let score_seo = 0;
  if (home.meta?.description || home.metaDescription)               score_seo += 20;
  if (home.headings?.h1?.length === 1)                               score_seo += 20;
  if (sitemap.length > 0 && sitemap.every(p => p.title))            score_seo += 20;
  if (sitemap.length >= 3)                                           score_seo += 20;
  if (audit.framework && audit.framework !== 'Unknown')             score_seo += 20;

  // ── score_mobile (100) ────────────────────────────────────────────────────
  let score_mobile = 50;
  if (features.includes('Formulaires'))                              score_mobile += 25;
  if (!features.includes('Slider / Carousel'))                       score_mobile += 25;

  // ── score_performance (100) ───────────────────────────────────────────────
  let score_performance = 80;
  const assetCount = Array.isArray(design?.assets) ? design.assets.length : 0;
  score_performance -= Math.min(4, Math.floor(assetCount / 50)) * 10;
  if (features.includes('Vidéo'))                                   score_performance -= 10;
  if (libraries.length > 3)                                         score_performance -= 10;
  score_performance = Math.max(0, score_performance);

  // ── score_ux (100) ────────────────────────────────────────────────────────
  let score_ux = 0;
  if ((home.navigation || home.nav || []).length > 0)               score_ux += 25;
  if ((home.cta || home.ctaButtons || []).length > 0)               score_ux += 25;
  if (home.footer && Object.keys(home.footer).length > 0)           score_ux += 25;
  if ((home.sections || []).length >= 3 || sitemap.length >= 3)     score_ux += 25;

  // ── score_conversion (100) ────────────────────────────────────────────────
  let score_conversion = 0;
  if (features.includes('Formulaires'))                              score_conversion += 30;
  if ((home.cta || home.ctaButtons || []).length > 0)               score_conversion += 25;
  if (features.includes('Témoignages'))                             score_conversion += 25;
  if (features.includes('Tarifs / Pricing'))                        score_conversion += 20;

  // ── score_global (weighted avg) ───────────────────────────────────────────
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  const score_global = clamp(
    score_seo         * 0.25 +
    score_mobile      * 0.20 +
    score_performance * 0.20 +
    score_ux          * 0.20 +
    score_conversion  * 0.15
  );

  return {
    score_global,
    score_seo:         clamp(score_seo),
    score_mobile:      clamp(score_mobile),
    score_performance: clamp(score_performance),
    score_ux:          clamp(score_ux),
    score_conversion:  clamp(score_conversion),
  };
}

export function extrairePointsForts(scores, audit = {}) {
  const forts = [];
  const features = audit.features || [];

  if (scores.score_seo >= 80)         forts.push('Bonne structure SEO (H1 unique, méta, sitemap)');
  if (scores.score_mobile >= 75)      forts.push('Site adapté mobile (pas de slider cassant)');
  if (scores.score_performance >= 70) forts.push('Performances satisfaisantes');
  if (scores.score_ux >= 75)          forts.push('Navigation et UX bien structurées');
  if (scores.score_conversion >= 70)  forts.push('Éléments de conversion présents (CTA, formulaires)');

  if (audit.framework && audit.framework !== 'Unknown') forts.push(`Technologie identifiable : ${audit.framework}`);
  if (audit.cms)                        forts.push(`CMS en place : ${audit.cms}`);
  if (features.includes('Témoignages')) forts.push('Preuves sociales (témoignages) présentes');
  if (features.includes('Tarifs / Pricing')) forts.push('Grille tarifaire visible');

  return forts.slice(0, 5);
}

export function extrairePointsFaibles(scores, audit = {}) {
  const faibles = [];
  const features = audit.features || [];

  if (scores.score_seo < 60)          faibles.push('Structure SEO insuffisante (méta, H1, titres manquants)');
  if (scores.score_mobile < 75)       faibles.push('Optimisation mobile à améliorer');
  if (scores.score_performance < 60)  faibles.push('Performances à optimiser (trop d\'assets ou librairies)');
  if (scores.score_ux < 50)           faibles.push('Navigation ou contenu UX insuffisant');
  if (scores.score_conversion < 40)   faibles.push('Peu d\'éléments incitatifs à la conversion');

  if (features.includes('Slider / Carousel')) faibles.push('Slider / Carousel souvent problématique sur mobile');
  if (features.includes('Vidéo'))             faibles.push('Vidéo alourdit les performances de chargement');
  if (audit.framework === 'Unknown')          faibles.push('Stack technique difficile à identifier — migration complexe');
  if ((audit.libraries || []).length > 4)    faibles.push('Trop de librairies JS — bundle à optimiser');

  return faibles.slice(0, 5);
}

export function extraireRecommandations(audit = {}) {
  return (audit.recommendations || []).slice(0, 8);
}
