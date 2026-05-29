import path from 'path';
import fs from 'fs/promises';
import { ensureDir, writeText } from './utils/fs.js';
import { logger } from './utils/logger.js';
import { buildEditorPanel } from './modules/mockup-editor.js';
import { detectSections } from './modules/sections.js';

// Usage: node src/mockup.js <domain>
// Example: node src/mockup.js www.creativequantic.be

async function main() {
  const domain = process.argv[2];
  if (!domain) {
    console.error('Usage: node src/mockup.js <domain>');
    console.error('Ex:    node src/mockup.js www.creativequantic.be');
    process.exit(1);
  }

  const outDir    = path.join(process.cwd(), 'output', domain);
  const mockupDir = path.join(outDir, 'mockup');
  await ensureDir(mockupDir);

  logger.banner();
  logger.info(`Domaine   : ${domain}`);
  logger.info(`Source    : ${outDir}/analysis`);
  logger.info(`Sortie    : ${mockupDir}`);
  console.log();

  // Load analysis data + saved theme (theme.json may not exist yet — that's fine)
  const [design, content, sitemap, manifest, sectionsJson, savedTheme] = await Promise.all([
    readJSON(path.join(outDir, 'analysis', 'design-system.json')),
    readJSON(path.join(outDir, 'analysis', 'content.json')),
    readJSON(path.join(outDir, 'analysis', 'sitemap.json')),
    readJSON(path.join(outDir, 'analysis', 'assets-manifest.json')),
    readJSON(path.join(outDir, 'analysis', 'sections.json')),
    readJSON(path.join(outDir, 'mockup',   'theme.json')),   // user's saved settings
  ]);

  const hasTheme = Object.keys(savedTheme).length > 0;
  if (hasTheme) {
    logger.done(`theme.json trouvé — application des réglages sauvegardés`);
  }

  const nav        = buildNav(content, sitemap);
  const logo       = findLogo(manifest);
  const cssVars    = buildCssVars(design, savedTheme);          // merge theme colors
  const fontImport = buildFontImport(design, manifest, savedTheme);
  const editorPanel = buildEditorPanel(design);

  logger.step(1, 2, 'Génération des pages HTML');

  for (const pageData of sitemap) {
    const page = content[pageData.slug];
    if (!page) continue;

    // Get sections for this page, then apply any saved variant/visibility overrides
    const baseSections = sectionsJson[pageData.slug] || detectSections(page);
    const pageSections = applyThemeToSections(baseSections, savedTheme);

    const html = renderPage({
      page, pageData, nav, logo, cssVars, fontImport, editorPanel,
      design, manifest, outDir, mockupDir, pageSections, savedTheme,
    });
    const file = path.join(mockupDir, `${pageData.slug}.html`);
    await writeText(file, html);
    logger.asset('PAGE', `${pageData.slug}.html`);
  }

  logger.step(2, 2, 'Génération de la galerie de navigation');
  const indexHtml = renderIndex({ sitemap, content, domain, logo, cssVars, fontImport, design, manifest, outDir, mockupDir, editorPanel });
  await writeText(path.join(mockupDir, '_apercu.html'), indexHtml);
  logger.asset('APERCU', '_apercu.html');

  // Homepage = first slug → copy as index.html
  const homeSlug = sitemap[0]?.slug || 'index';
  const homeFile = path.join(mockupDir, `${homeSlug}.html`);
  const homeHtml = await fs.readFile(homeFile, 'utf-8');
  await writeText(path.join(mockupDir, 'index.html'), homeHtml);
  logger.asset('INDEX', `index.html → (copie de ${homeSlug}.html)`);

  logger.footer({
    'Pages générées': sitemap.length + 1,
    'Point d\'entrée': path.join(mockupDir, 'index.html'),
    'Galerie complète': path.join(mockupDir, '_apercu.html'),
  });

  console.log(`\n  → Ouvre ce fichier dans ton navigateur :`);
  console.log(`    ${path.join(mockupDir, 'index.html')}`);
  console.log(`\n  → Galerie de toutes les pages :`);
  console.log(`    ${path.join(mockupDir, '_apercu.html')}\n`);
}

// ─── Page renderer ────────────────────────────────────────────────────────────

function renderPage({ page, pageData, nav, logo, cssVars, fontImport, editorPanel, design, manifest, outDir, mockupDir, pageSections, savedTheme = {} }) {
  const assetsRelPath = path.relative(mockupDir, path.join(outDir, 'assets', 'images')).replace(/\\/g, '/');
  const h1   = page.headings?.h1?.[0]  || pageData.title || pageData.slug;
  const h2s  = page.headings?.h2 || [];
  const ctas = page.cta || [];

  const sectionsHtml    = buildSectionsWithVariants({ page, h1, h2s, ctas, manifest, assetsRelPath, pageSections });
  const sectionsDataJson = JSON.stringify(pageSections);
  const themeDataJson    = JSON.stringify(savedTheme);

  // Apply header style from saved theme at build-time (no JS flash)
  const headerStyle = savedTheme?.layout?.headerStyle || 'light';
  const headerInitCss = buildHeaderInitCss(headerStyle);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageData.title || h1}</title>
  ${fontImport}
  <style>
    ${cssVars}
    ${baseStyles()}
    ${variantStyles()}
    ${headerInitCss}
  </style>
</head>
<body>
  ${renderTopbar({ current: pageData.slug })}
  ${renderHeader({ nav, logo, assetsRelPath, current: pageData.slug })}
  <main id="main-content">
    ${sectionsHtml}
  </main>
  ${renderFooter({ page, design })}
  <script id="me-sections-data" type="application/json">${sectionsDataJson}</script>
  <script id="me-theme-data"    type="application/json">${themeDataJson}</script>
  ${editorPanel}
</body>
</html>`;
}

// ─── Gallery (apercu) renderer ────────────────────────────────────────────────

function renderIndex({ sitemap, content, domain, logo, cssVars, fontImport, design, manifest, outDir, mockupDir, editorPanel }) {
  const screenshotsRelPath = path.relative(mockupDir, path.join(outDir, 'screenshots')).replace(/\\/g, '/');

  const cards = sitemap.map(p => {
    const page = content[p.slug];
    const h1   = page?.headings?.h1?.[0] || p.title || p.slug;
    const desc = page?.meta?.description || page?.headings?.h2?.[0] || '';
    const thumb = `${screenshotsRelPath}/${p.slug}--mobile.png`;

    return `
    <a href="${p.slug}.html" class="page-card">
      <div class="page-card__thumb">
        <img src="${thumb}" alt="${p.slug}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="page-card__placeholder" style="display:none">${p.slug}</div>
      </div>
      <div class="page-card__info">
        <h3>${h1}</h3>
        <p>${desc.slice(0, 90)}${desc.length > 90 ? '…' : ''}</p>
        <span class="page-card__url">${p.url.replace(/https?:\/\//, '')}</span>
      </div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mockup — ${domain}</title>
  ${fontImport}
  <style>
    ${cssVars}
    ${baseStyles()}
    .mockup-header { background: var(--color-primary); color: #fff; padding: 2rem; text-align: center; }
    .mockup-header h1 { color: #fff; margin: 0 0 .5rem; font-size: 1.6rem; }
    .mockup-header p  { margin: 0; opacity: .8; font-size: .9rem; }
    .pages-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; padding: 2.5rem; max-width: 1200px; margin: 0 auto; }
    .page-card { background: #fff; border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; transition: box-shadow .2s, transform .2s; display: block; }
    .page-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.12); transform: translateY(-2px); }
    .page-card__thumb { height: 180px; overflow: hidden; background: var(--color-surface, #f3f4f6); }
    .page-card__thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .page-card__placeholder { height: 100%; display: flex; align-items: center; justify-content: center; font-size: .8rem; color: var(--color-muted, #9ca3af); text-transform: uppercase; letter-spacing: .1em; }
    .page-card__info { padding: 1rem; }
    .page-card__info h3 { margin: 0 0 .4rem; font-size: 1rem; color: var(--color-text, #111); }
    .page-card__info p  { margin: 0 0 .6rem; font-size: .8rem; color: var(--color-muted, #6b7280); line-height: 1.5; }
    .page-card__url { font-size: .7rem; color: var(--color-primary); }
    .mockup-badge { display: inline-block; background: var(--color-accent, #f59e0b); color: #fff; font-size: .7rem; font-weight: 700; padding: .2rem .6rem; border-radius: 999px; letter-spacing: .05em; margin-bottom: .75rem; }
  </style>
</head>
<body>
  <div class="mockup-header">
    <span class="mockup-badge">MOCKUP PREVIEW</span>
    <h1>${domain}</h1>
    <p>${sitemap.length} pages générées · Clique sur une page pour la prévisualiser</p>
  </div>
  <div class="pages-grid">${cards}</div>
</body>
</html>`;
}

// ─── Section variant rendering ────────────────────────────────────────────────

function buildSectionsWithVariants({ page, h1, h2s, ctas, manifest, assetsRelPath, pageSections }) {
  if (!pageSections?.length) return '<p style="padding:2rem;color:#999">Aucune section détectée.</p>';

  const parts = [];
  for (const sectionDef of pageSections) {
    if (!sectionDef.visible) continue;
    const group = renderSectionGroup({ sectionDef, page, h1, h2s, ctas, manifest, assetsRelPath });
    if (group) parts.push(group);
  }
  return parts.join('\n');
}

function renderSectionGroup({ sectionDef, page, h1, h2s, ctas, manifest, assetsRelPath }) {
  const { id, type, variant: activeVariant, variants, label } = sectionDef;
  const ctx = buildSectionContext({ page, h1, h2s, ctas, manifest, assetsRelPath, sectionDef });

  const renderedVariants = variants.map(v => {
    const html = renderVariantContent(type, v, ctx);
    if (!html) return '';
    const isActive = v === activeVariant;
    return `<div class="sv${isActive ? ' sv--active' : ''}" data-variant="${v}"${isActive ? '' : ' hidden'}>${html}</div>`;
  }).filter(Boolean).join('');

  if (!renderedVariants) return '';

  return `
<div class="section-group" data-section-id="${id}" data-section-type="${type}" data-active-variant="${activeVariant}" tabindex="0" aria-label="${label}">
  ${renderedVariants}
</div>`;
}

/** Build a shared context object for all variant renderers of a section */
function buildSectionContext({ page, h1, h2s, ctas, manifest, assetsRelPath, sectionDef }) {
  const s = page.sections || {};
  const type = sectionDef.type;

  const heroBg    = findImg(manifest, assetsRelPath, ['haut','hero','banner','top','fond','cover','bg','background','hero']);
  const aboutImg  = findImg(manifest, assetsRelPath, ['about','team','equipe','profil','portrait','staff','people','who']);
  const ctaImg    = findImg(manifest, assetsRelPath, ['action','cta','promo','feature']);
  const randomImg = findImg(manifest, assetsRelPath, []) || heroBg;

  const sectionItems = s.services || s.features || [];
  const aboutTexts   = (s.about || []).slice(0, 3);
  const testimonials = (s.testimonials || []).slice(0, 3);
  const pricingItems = (s.pricing || []).slice(0, 3);
  const faqItems     = (s.faq || []).slice(0, 6);
  const forms        = page.forms || [];

  // Use relevant H2s depending on section type
  const sectionH2s = {
    hero:         h2s.slice(0, 2),
    services:     h2s.slice(0, 6),
    about:        h2s.slice(0, 3),
    testimonials: h2s.slice(0, 2),
    pricing:      h2s.slice(0, 2),
    faq:          h2s.slice(0, 2),
    contact:      h2s.slice(0, 2),
    cta:          h2s.slice(-2),
    gallery:      h2s.slice(0, 1),
  };

  return {
    type, h1, h2s: sectionH2s[type] || h2s.slice(0, 4), allH2s: h2s,
    ctas, heroBg, aboutImg, ctaImg, randomImg,
    sectionItems, aboutTexts, testimonials, pricingItems, faqItems, forms,
    manifest, assetsRelPath,
  };
}

/** Dispatch to the right variant renderer */
function renderVariantContent(type, variant, ctx) {
  switch (type) {
    case 'hero':         return renderHero(variant, ctx);
    case 'services':     return renderServices(variant, ctx);
    case 'about':        return renderAbout(variant, ctx);
    case 'testimonials': return renderTestimonials(variant, ctx);
    case 'pricing':      return renderPricing(variant, ctx);
    case 'faq':          return renderFAQ(variant, ctx);
    case 'contact':      return renderContact(variant, ctx);
    case 'cta':          return renderCTA(variant, ctx);
    case 'gallery':      return renderGallery(variant, ctx);
    default: return null;
  }
}

// ─── Section variant renderers ────────────────────────────────────────────────

function renderHero(variant, { h1, h2s, ctas, heroBg }) {
  const title = h1;
  const sub   = h2s[0] || '';
  const cta1  = ctas[0];
  const cta2  = ctas[1];
  const bgStyle = heroBg
    ? `background-image:linear-gradient(rgba(0,0,0,.50),rgba(0,0,0,.45)),url(${heroBg});background-size:cover;background-position:center`
    : '';

  if (variant === 'centered') {
    return `
<section class="hero hero--centered" style="${bgStyle}">
  <div class="container">
    <h1>${title}</h1>
    ${sub ? `<p class="hero__sub">${sub}</p>` : ''}
    <div class="hero__ctas">
      ${cta1 ? `<a href="#" class="btn btn--primary">${cta1.text}</a>` : ''}
      ${cta2 ? `<a href="#" class="btn btn--outline-white">${cta2.text}</a>` : ''}
    </div>
  </div>
</section>`;
  }

  if (variant === 'split-left') {
    return `
<section class="hero hero--split" style="background:var(--color-primary)">
  <div class="container hero__split-inner">
    <div class="hero__split-text">
      <p class="hero__eyebrow">Bienvenue</p>
      <h1>${title}</h1>
      ${sub ? `<p class="hero__sub">${sub}</p>` : ''}
      <div class="hero__ctas">
        ${cta1 ? `<a href="#" class="btn btn--white">${cta1.text}</a>` : ''}
        ${cta2 ? `<a href="#" class="btn btn--outline-white">${cta2.text}</a>` : ''}
      </div>
    </div>
    <div class="hero__split-img">
      ${heroBg ? `<img src="${heroBg}" alt="">` : '<div class="hero__img-placeholder"></div>'}
    </div>
  </div>
</section>`;
  }

  if (variant === 'full-background') {
    return `
<section class="hero hero--fullbg" style="${bgStyle || 'background:var(--color-primary)'}">
  <div class="hero__fullbg-overlay"></div>
  <div class="container hero__fullbg-content">
    <p class="hero__eyebrow">Bienvenue</p>
    <h1>${title}</h1>
    ${sub ? `<p class="hero__sub hero__sub--lg">${sub}</p>` : ''}
    <div class="hero__ctas">
      ${cta1 ? `<a href="#" class="btn btn--primary btn--lg">${cta1.text}</a>` : ''}
      ${cta2 ? `<a href="#" class="btn btn--outline-white btn--lg">${cta2.text}</a>` : ''}
    </div>
  </div>
  <div class="hero__scroll-hint"><span class="hero__scroll-arrow">↓</span></div>
</section>`;
  }
  return null;
}

function renderServices(variant, { h2s, sectionItems, ctas }) {
  const title = h2s[0] || 'Nos services';
  const items = sectionItems.length ? sectionItems.slice(0, 6) : h2s.slice(0, 6);
  const icons = ['✦', '◈', '⬡', '⊞', '◉', '⬣'];

  if (variant === 'cards-3') {
    const cards = items.slice(0, 6).map((t, i) => `
      <div class="card">
        <div class="card__icon">${icons[i % icons.length]}</div>
        <h3 class="card__title">${typeof t === 'string' ? t.slice(0, 60) : 'Service ' + (i+1)}</h3>
        <p class="card__desc">Description de ce service ou fonctionnalité.</p>
      </div>`).join('');
    return `
<section class="section section--light">
  <div class="container">
    <div class="section__header">
      <p class="section__eyebrow">Ce que nous proposons</p>
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="grid grid--3">${cards}</div>
  </div>
</section>`;
  }

  if (variant === 'cards-2') {
    const cards = items.slice(0, 4).map((t, i) => `
      <div class="card card--wide">
        <div class="card__icon card__icon--lg">${icons[i % icons.length]}</div>
        <div class="card__content">
          <h3 class="card__title">${typeof t === 'string' ? t.slice(0, 60) : 'Service ' + (i+1)}</h3>
          <p class="card__desc">Description plus détaillée de ce service ou fonctionnalité clé.</p>
          ${ctas[0] ? `<a href="#" class="card__link">En savoir plus →</a>` : ''}
        </div>
      </div>`).join('');
    return `
<section class="section section--light">
  <div class="container">
    <div class="section__header">
      <p class="section__eyebrow">Ce que nous proposons</p>
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="grid grid--2">${cards}</div>
  </div>
</section>`;
  }

  if (variant === 'list-icons') {
    const rows = items.slice(0, 6).map((t, i) => `
      <div class="list-item">
        <div class="list-item__icon">${icons[i % icons.length]}</div>
        <div class="list-item__body">
          <h3>${typeof t === 'string' ? t.slice(0, 60) : 'Service ' + (i+1)}</h3>
          <p>Description de ce service ou avantage.</p>
        </div>
      </div>`).join('');
    return `
<section class="section section--light">
  <div class="container container--narrow-lg">
    <div class="section__header">
      <p class="section__eyebrow">Ce que nous proposons</p>
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="list-icons">${rows}</div>
  </div>
</section>`;
  }
  return null;
}

function renderAbout(variant, { h2s, aboutTexts, aboutImg, ctas }) {
  const title = h2s[0] || 'À propos de nous';
  const texts = aboutTexts.length ? aboutTexts : ['Nous sommes passionnés par notre métier et mettons tout en œuvre pour vous offrir la meilleure expérience possible.', 'Notre équipe est à votre disposition pour répondre à toutes vos questions.'];
  const cta   = ctas[2] || ctas[0];
  const imgHtml = aboutImg
    ? `<img src="${aboutImg}" alt="${title}" class="about__img">`
    : `<div class="about__img about__img--placeholder"></div>`;

  const textBlock = `
    <div class="about__text">
      <p class="section__eyebrow">${h2s[1] || 'Notre histoire'}</p>
      <h2>${title}</h2>
      ${texts.map(t => `<p>${t}</p>`).join('')}
      ${cta ? `<a href="#" class="btn btn--primary">${cta.text}</a>` : ''}
    </div>`;
  const imgBlock = `<div class="about__media">${imgHtml}</div>`;

  if (variant === 'split-left') {
    return `
<section class="section">
  <div class="container">
    <div class="about__split">
      ${imgBlock}
      ${textBlock}
    </div>
  </div>
</section>`;
  }
  if (variant === 'split-right') {
    return `
<section class="section">
  <div class="container">
    <div class="about__split">
      ${textBlock}
      ${imgBlock}
    </div>
  </div>
</section>`;
  }
  if (variant === 'centered') {
    return `
<section class="section section--light">
  <div class="container container--narrow">
    <div class="about__centered">
      <div class="about__media about__media--centered">${imgHtml}</div>
      <p class="section__eyebrow" style="text-align:center">${h2s[1] || 'Notre histoire'}</p>
      <h2 style="text-align:center">${title}</h2>
      ${texts.map(t => `<p>${t}</p>`).join('')}
      ${cta ? `<div style="text-align:center;margin-top:1.5rem"><a href="#" class="btn btn--primary">${cta.text}</a></div>` : ''}
    </div>
  </div>
</section>`;
  }
  return null;
}

function renderTestimonials(variant, { h2s, testimonials }) {
  const title = h2s[0] || 'Ils nous font confiance';
  const items = testimonials.length ? testimonials : [
    'Excellent service, je recommande vivement !',
    'Équipe professionnelle et à l\'écoute. Très satisfait.',
    'Résultats au-delà de mes attentes. Bravo !',
  ];

  if (variant === 'grid-3') {
    const cards = items.slice(0, 3).map(t => `
      <div class="testimonial">
        <div class="testimonial__stars">★★★★★</div>
        <p>"${typeof t === 'string' ? t : 'Excellent témoignage client.'}"</p>
        <div class="testimonial__author">
          <div class="testimonial__avatar"></div>
          <span>Client satisfait</span>
        </div>
      </div>`).join('');
    return `
<section class="section section--accent">
  <div class="container">
    <div class="section__header">
      <h2 class="section__title" style="color:#fff">${title}</h2>
    </div>
    <div class="grid grid--3">${cards}</div>
  </div>
</section>`;
  }

  if (variant === 'quote-simple') {
    const t = typeof items[0] === 'string' ? items[0] : 'Excellent service, je recommande vivement !';
    return `
<section class="section section--accent">
  <div class="container container--narrow">
    <div class="quote-simple">
      <div class="quote-simple__icon">"</div>
      <blockquote class="quote-simple__text">${t}</blockquote>
      <cite class="quote-simple__author">— Client satisfait</cite>
    </div>
  </div>
</section>`;
  }
  return null;
}

function renderPricing(variant, { h2s, pricingItems, ctas }) {
  const title = h2s[0] || 'Nos formules';
  const items = pricingItems.length ? pricingItems : ['Formule Starter', 'Formule Pro', 'Formule Enterprise'];
  const count = variant === 'cards-2' ? 2 : 3;

  const cards = items.slice(0, count).map((t, i) => {
    const isFeatured = i === Math.floor(count / 2);
    return `
    <div class="pricing-card ${isFeatured ? 'pricing-card--featured' : ''}">
      ${isFeatured ? '<div class="pricing-card__badge">Populaire</div>' : ''}
      <h3>${typeof t === 'string' ? t.slice(0, 40) : 'Formule ' + (i+1)}</h3>
      <div class="pricing-card__price">
        <span class="pricing-card__amount">—</span>
        <span class="pricing-card__period">/mois</span>
      </div>
      <ul class="pricing-card__features">
        <li>✓ Fonctionnalité incluse</li>
        <li>✓ Accès complet</li>
        <li>✓ Support dédié</li>
      </ul>
      <a href="#" class="btn ${isFeatured ? 'btn--primary' : 'btn--outline'} btn--full">Choisir cette formule</a>
    </div>`;
  }).join('');

  return `
<section class="section section--light">
  <div class="container">
    <div class="section__header">
      <p class="section__eyebrow">Tarifs</p>
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="grid grid--${count} pricing-grid">${cards}</div>
  </div>
</section>`;
}

function renderFAQ(variant, { h2s, faqItems }) {
  const title = h2s[0] || 'Questions fréquentes';
  const items = faqItems.length ? faqItems : [
    'Comment nous contacter ?',
    'Quels sont vos délais ?',
    'Quels modes de paiement acceptez-vous ?',
    'Proposez-vous des garanties ?',
  ];

  if (variant === 'accordion') {
    const faqs = items.slice(0, 6).map((q, i) => `
      <details class="faq__item" ${i === 0 ? 'open' : ''}>
        <summary class="faq__q">${typeof q === 'string' ? q.slice(0, 100) : 'Question ' + (i+1)}</summary>
        <div class="faq__a">Réponse à cette question fréquemment posée. Nous nous efforçons d'être le plus clair et complet possible.</div>
      </details>`).join('');
    return `
<section class="section">
  <div class="container container--narrow-lg">
    <div class="section__header">
      <p class="section__eyebrow">FAQ</p>
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="faq">${faqs}</div>
  </div>
</section>`;
  }

  if (variant === 'two-col') {
    const half = Math.ceil(items.length / 2);
    const col1 = items.slice(0, half);
    const col2 = items.slice(half, half * 2);
    const renderCol = col => col.map((q, i) => `
      <div class="faq__item-simple">
        <div class="faq__q-simple">Q — ${typeof q === 'string' ? q.slice(0, 100) : 'Question ' + (i+1)}</div>
        <div class="faq__a-simple">Réponse à cette question fréquemment posée.</div>
      </div>`).join('');
    return `
<section class="section">
  <div class="container">
    <div class="section__header">
      <p class="section__eyebrow">FAQ</p>
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="faq-two-col">
      <div class="faq-two-col__col">${renderCol(col1)}</div>
      <div class="faq-two-col__col">${renderCol(col2)}</div>
    </div>
  </div>
</section>`;
  }
  return null;
}

function renderContact(variant, { h2s, forms, allH2s }) {
  const title = allH2s.find(h => /contact|message|nous écrire|formulaire|rdv/i.test(h)) || 'Contactez-nous';
  const form  = forms[0];
  const fields = form?.fields || [
    { type: 'text',  label: 'Nom complet' },
    { type: 'email', label: 'Adresse e-mail' },
    { type: 'text',  label: 'Sujet' },
    { type: 'textarea', label: 'Message' },
  ];
  const formHtml = `
    <form class="form">
      ${fields.map(f => `
      <div class="form__group">
        <label>${f.label || f.name || f.type}</label>
        ${f.type === 'textarea'
          ? `<textarea placeholder="${f.label || 'Votre message'}" rows="5"></textarea>`
          : `<input type="${f.type || 'text'}" placeholder="${f.label || ''}">`
        }
      </div>`).join('')}
      <button type="submit" class="btn btn--primary btn--full">${form?.submit || 'Envoyer le message'}</button>
    </form>`;

  if (variant === 'centered') {
    return `
<section class="section section--light" id="contact">
  <div class="container container--narrow">
    <div class="section__header">
      <p class="section__eyebrow">Contact</p>
      <h2 class="section__title">${title}</h2>
    </div>
    ${formHtml}
  </div>
</section>`;
  }

  if (variant === 'split') {
    return `
<section class="section" id="contact">
  <div class="container">
    <div class="contact__split">
      <div class="contact__info">
        <p class="section__eyebrow">Contact</p>
        <h2>${title}</h2>
        <p>Nous sommes disponibles pour répondre à toutes vos questions. N'hésitez pas à nous contacter.</p>
        <ul class="contact__details">
          <li>📧 contact@example.com</li>
          <li>📞 +32 00 000 00 00</li>
          <li>📍 Adresse, Ville</li>
        </ul>
      </div>
      <div class="contact__form">${formHtml}</div>
    </div>
  </div>
</section>`;
  }
  return null;
}

function renderCTA(variant, { h2s, ctas, heroBg, ctaImg }) {
  const title = h2s[h2s.length - 1] || 'Prêt à démarrer ?';
  const cta1  = ctas[0];
  const cta2  = ctas[1];
  const bg    = ctaImg || heroBg;

  if (variant === 'centered') {
    return `
<section class="cta-banner" style="${bg ? `background-image:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.50)),url(${bg});background-size:cover;background-position:center` : ''}">
  <div class="container">
    <h2>${title}</h2>
    <p class="cta-banner__sub">Rejoignez-nous et profitez de tous nos services dès aujourd'hui.</p>
    <div class="hero__ctas">
      ${cta1 ? `<a href="#" class="btn btn--white">${cta1.text}</a>` : ''}
      ${cta2 ? `<a href="#" class="btn btn--outline-white">${cta2.text}</a>` : ''}
    </div>
  </div>
</section>`;
  }

  if (variant === 'split') {
    return `
<section class="cta-banner cta-banner--split" style="${bg ? `background-image:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.50)),url(${bg});background-size:cover;background-position:center` : ''}">
  <div class="container cta-split__inner">
    <div class="cta-split__text">
      <h2>${title}</h2>
      <p>Rejoignez-nous et profitez de tous nos services dès aujourd'hui.</p>
    </div>
    <div class="cta-split__actions">
      ${cta1 ? `<a href="#" class="btn btn--white btn--lg">${cta1.text}</a>` : ''}
      ${cta2 ? `<a href="#" class="btn btn--outline-white btn--lg">${cta2.text}</a>` : ''}
    </div>
  </div>
</section>`;
  }
  return null;
}

function renderGallery(variant, { h2s, manifest, assetsRelPath }) {
  const title = h2s[0] || 'Galerie';
  const images = (manifest.images || []).slice(0, 9).filter(i => /\.(jpe?g|png|webp)$/i.test(i.file));

  if (!images.length) return null;

  if (variant === 'grid-3') {
    const imgs = images.slice(0, 9).map(i =>
      `<div class="gallery__item"><img src="${assetsRelPath}/${i.file}" alt="" loading="lazy"></div>`
    ).join('');
    return `
<section class="section section--light">
  <div class="container">
    <div class="section__header">
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="gallery-grid">${imgs}</div>
  </div>
</section>`;
  }

  if (variant === 'masonry') {
    const imgs = images.slice(0, 9).map(i =>
      `<div class="masonry__item"><img src="${assetsRelPath}/${i.file}" alt="" loading="lazy"></div>`
    ).join('');
    return `
<section class="section">
  <div class="container">
    <div class="section__header">
      <h2 class="section__title">${title}</h2>
    </div>
    <div class="masonry-grid">${imgs}</div>
  </div>
</section>`;
  }
  return null;
}

// ─── Header / Footer / Topbar ─────────────────────────────────────────────────

function renderTopbar({ current }) {
  return `
<div class="mockup-topbar">
  <span class="mockup-topbar__badge">MOCKUP</span>
  <span class="mockup-topbar__page">Page : <strong>${current}</strong></span>
  <a class="mockup-topbar__link" href="_apercu.html">☰ Toutes les pages</a>
</div>`;
}

function renderHeader({ nav, logo, assetsRelPath, current }) {
  const logoImg = logo
    ? `<img src="${assetsRelPath}/${logo}" alt="Logo" class="header__logo-img">`
    : `<span class="header__logo-text">Logo</span>`;

  const links = nav.slice(0, 8).map(n => {
    const slug   = n.href.replace(/.*\//, '').replace(/\/$/, '') || 'index';
    const active = slug === current ? ' class="active"' : '';
    return `<a href="${slug}.html"${active}>${n.text}</a>`;
  }).join('');

  return `
<header class="header">
  <div class="header__inner container">
    <a href="index.html" class="header__logo">${logoImg}</a>
    <nav class="header__nav">${links}</nav>
    <button class="header__burger" onclick="this.closest('.header').classList.toggle('open')" aria-label="Menu">☰</button>
  </div>
  <nav class="header__mobile-nav">${links}</nav>
</header>`;
}

function renderFooter({ page, design }) {
  const footerItems = (page.footer || []).slice(0, 12);
  return `
<footer class="footer">
  <div class="container footer__inner">
    <div class="footer__copy">
      ${footerItems.slice(0, 6).map(t => `<p>${t}</p>`).join('')}
    </div>
    <div class="footer__links">
      ${footerItems.slice(6).map(t => `<span>${t}</span>`).join(' · ')}
    </div>
  </div>
</footer>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

function variantStyles() {
  return `
/* ── Variant system ───────────────────────────────────────────────────────── */
.sv            { display: none; }
.sv.sv--active { display: block; }

/* Section group hover / focus outline (editor highlight) */
.section-group {
  position: relative;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline-color .15s;
}
.section-group.sg--hover   { outline-color: rgba(108,142,245,.35); cursor: pointer; }
.section-group.sg--selected { outline: 2px solid #6c8ef5; }

/* ── Hero variants ────────────────────────────────────────────────────────── */
.hero { min-height: 520px; display: flex; align-items: center; color: #fff; padding: 5rem 1.5rem; }
.hero--centered { background: var(--color-primary); text-align: center; }
.hero--centered .container { max-width: 800px; margin: 0 auto; }
.hero--split    { background: var(--color-primary); }
.hero--fullbg   { position: relative; min-height: 620px; background: var(--color-primary); }

.hero h1 { font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 800; line-height: 1.15; margin-bottom: 1.25rem; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.25); }
.hero__sub { font-size: 1.15rem; opacity: .9; margin-bottom: 2rem; max-width: 600px; }
.hero--centered .hero__sub { margin-left: auto; margin-right: auto; }
.hero__sub--lg { font-size: 1.3rem; }
.hero__eyebrow { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; opacity: .75; margin-bottom: 1rem; }
.hero__ctas { display: flex; gap: 1rem; flex-wrap: wrap; }
.hero--centered .hero__ctas { justify-content: center; }

/* Hero split */
.hero__split-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; width: 100%; }
.hero__split-text .hero__ctas { margin-top: .5rem; }
.hero__split-img img { width: 100%; height: 420px; object-fit: cover; border-radius: 16px; opacity: .9; }
.hero__img-placeholder { height: 420px; background: rgba(255,255,255,.1); border-radius: 16px; }

/* Hero full-background */
.hero__fullbg-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.4) 100%); pointer-events: none; }
.hero__fullbg-content { position: relative; z-index: 1; max-width: 760px; }
.hero__scroll-hint { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); z-index:1; }
.hero__scroll-arrow { color: rgba(255,255,255,.7); font-size: 1.5rem; animation: bounce 2s ease-in-out infinite; display: block; }
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }

/* ── Cards & grid ─────────────────────────────────────────────────────────── */
.section__header { text-align: center; margin-bottom: 3rem; }
.section__eyebrow { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: var(--color-primary); margin-bottom: .5rem; }
.section__title { font-size: clamp(1.4rem, 2.5vw, 2rem); font-weight: 700; color: var(--color-text, #111); margin: 0; }

.grid { display: grid; gap: 1.5rem; }
.grid--2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.grid--3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.grid--4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

.card { background: var(--color-background, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 1.75rem 1.5rem; text-align: center; transition: box-shadow .2s, transform .2s; }
.card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.08); transform: translateY(-2px); }
.card__icon { font-size: 2rem; margin-bottom: 1rem; color: var(--color-primary); }
.card__icon--lg { font-size: 2.5rem; }
.card--wide { text-align: left; display: flex; gap: 1.25rem; align-items: flex-start; }
.card--wide .card__icon { flex-shrink: 0; margin-bottom: 0; }
.card__title { font-size: 1.05rem; font-weight: 700; margin-bottom: .5rem; }
.card__desc { font-size: .9rem; color: var(--color-muted, #6b7280); line-height: 1.6; }
.card__link { display: inline-block; margin-top: .75rem; font-size: .875rem; font-weight: 600; color: var(--color-primary); text-decoration: none; }
.card__link:hover { text-decoration: underline; }

/* ── List icons ────────────────────────────────────────────────────────────── */
.list-icons { display: flex; flex-direction: column; gap: 1.25rem; }
.list-item { display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.5rem; background: var(--color-background, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; }
.list-item__icon { font-size: 1.75rem; color: var(--color-primary); flex-shrink: 0; width: 48px; text-align: center; }
.list-item__body h3 { font-size: 1rem; font-weight: 700; margin-bottom: .4rem; }
.list-item__body p  { font-size: .9rem; color: var(--color-muted, #6b7280); }

/* ── About ────────────────────────────────────────────────────────────────── */
.about__split { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
.about__text h2 { font-size: clamp(1.4rem, 2.5vw, 2rem); margin-bottom: 1rem; }
.about__text p  { color: var(--color-muted, #6b7280); margin-bottom: 1rem; line-height: 1.7; }
.about__text .btn { margin-top: .5rem; }
.about__media img, .about__img { width: 100%; height: 380px; object-fit: cover; border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,.12); }
.about__img--placeholder, .about__media .about__img--placeholder { background: var(--color-surface, #f3f4f6); }
.about__centered { text-align: center; }
.about__media--centered { display: block; width: 240px; height: 240px; border-radius: 50%; margin: 0 auto 2rem; overflow: hidden; }
.about__media--centered img, .about__media--centered .about__img { border-radius: 50%; height: 100%; }

/* ── Testimonials ──────────────────────────────────────────────────────────── */
.testimonial { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: 12px; padding: 1.5rem; }
.testimonial__stars { color: var(--color-accent, #f59e0b); font-size: 1.1rem; margin-bottom: .75rem; }
.testimonial p { font-style: italic; font-size: .95rem; line-height: 1.6; opacity: .9; }
.testimonial__author { display: flex; align-items: center; gap: .75rem; margin-top: 1rem; }
.testimonial__avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.2); }
.testimonial__author span { font-size: .85rem; opacity: .7; }

.quote-simple { text-align: center; padding: 3rem 0; }
.quote-simple__icon { font-size: 5rem; color: rgba(255,255,255,.3); line-height: 1; margin-bottom: 1rem; }
.quote-simple__text { font-size: clamp(1.1rem, 2.5vw, 1.5rem); font-style: italic; line-height: 1.6; color: #fff; margin-bottom: 1.5rem; }
.quote-simple__author { font-size: .9rem; color: rgba(255,255,255,.7); font-weight: 600; }

/* ── Pricing ────────────────────────────────────────────────────────────────── */
.pricing-grid { align-items: start; }
.pricing-card { position: relative; background: var(--color-background, #fff); border: 2px solid var(--color-border, #e5e7eb); border-radius: 16px; padding: 2rem; text-align: center; }
.pricing-card--featured { border-color: var(--color-primary); box-shadow: 0 8px 24px rgba(0,0,0,.10); transform: scale(1.03); }
.pricing-card__badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--color-primary); color: #fff; font-size: .7rem; font-weight: 700; padding: .25rem .75rem; border-radius: 999px; text-transform: uppercase; letter-spacing: .06em; }
.pricing-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; }
.pricing-card__price { margin-bottom: 1.5rem; }
.pricing-card__amount { font-size: 2.5rem; font-weight: 800; color: var(--color-primary); }
.pricing-card__period { font-size: .9rem; color: var(--color-muted, #6b7280); }
.pricing-card__features { list-style: none; text-align: left; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .5rem; }
.pricing-card__features li { font-size: .9rem; color: var(--color-muted, #6b7280); }

/* ── FAQ ─────────────────────────────────────────────────────────────────── */
.faq { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: .75rem; }
.faq__item { background: var(--color-surface, #f9fafb); border-radius: 8px; overflow: hidden; }
.faq__item summary { padding: 1rem 1.25rem; font-weight: 600; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
.faq__item summary::after { content: '+'; font-size: 1.2rem; color: var(--color-primary); }
.faq__item[open] summary::after { content: '−'; }
.faq__a { padding: .75rem 1.25rem 1.25rem; color: var(--color-muted, #6b7280); font-size: .95rem; line-height: 1.6; }

.faq-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.faq__item-simple { padding: 1.25rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 8px; margin-bottom: .75rem; }
.faq__q-simple { font-weight: 600; margin-bottom: .5rem; }
.faq__a-simple { font-size: .9rem; color: var(--color-muted, #6b7280); }

/* ── Contact ──────────────────────────────────────────────────────────────── */
.contact__split { display: grid; grid-template-columns: 1fr 1.4fr; gap: 4rem; align-items: start; }
.contact__info h2 { font-size: 1.6rem; margin-bottom: 1rem; }
.contact__info p  { color: var(--color-muted, #6b7280); line-height: 1.7; margin-bottom: 1.5rem; }
.contact__details { list-style: none; display: flex; flex-direction: column; gap: .6rem; }
.contact__details li { font-size: .95rem; color: var(--color-muted, #6b7280); }

/* ── CTA Banner ────────────────────────────────────────────────────────────── */
.cta-banner { background: var(--color-primary); color: #fff; padding: 5rem 1.5rem; text-align: center; }
.cta-banner h2 { font-size: clamp(1.4rem, 3vw, 2.2rem); color: #fff; margin-bottom: 1rem; }
.cta-banner__sub { opacity: .85; margin-bottom: 2rem; font-size: 1rem; }
.cta-banner--split { text-align: left; }
.cta-split__inner { display: flex; align-items: center; justify-content: space-between; gap: 3rem; flex-wrap: wrap; }
.cta-split__text h2 { margin-bottom: .5rem; }
.cta-split__text p  { opacity: .85; }
.cta-split__actions { display: flex; gap: 1rem; flex-shrink: 0; }

/* ── Gallery ──────────────────────────────────────────────────────────────── */
.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.gallery__item img { width: 100%; height: 220px; object-fit: cover; border-radius: 8px; transition: transform .3s; }
.gallery__item img:hover { transform: scale(1.03); }
.masonry-grid { columns: 3; gap: 1rem; }
.masonry__item { break-inside: avoid; margin-bottom: 1rem; }
.masonry__item img { width: 100%; border-radius: 8px; }

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; justify-content: center; padding: .75rem 1.75rem; border-radius: 8px; font-weight: 600; font-size: .95rem; text-decoration: none; cursor: pointer; border: 2px solid transparent; transition: all .2s; }
.btn--lg  { padding: .9rem 2.2rem; font-size: 1rem; }
.btn--primary  { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.btn--primary:hover { filter: brightness(1.1); }
.btn--outline  { background: transparent; color: var(--color-primary); border-color: var(--color-primary); }
.btn--outline:hover { background: var(--color-primary); color: #fff; }
.btn--white    { background: #fff; color: var(--color-primary); border-color: #fff; }
.btn--white:hover { background: var(--color-surface, #f3f4f6); }
.btn--outline-white { background: transparent; color: #fff; border-color: rgba(255,255,255,.7); }
.btn--outline-white:hover { background: rgba(255,255,255,.15); }
.btn--full { width: 100%; }

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .hero__split-inner { grid-template-columns: 1fr; gap: 2rem; }
  .hero__split-img img { height: 280px; }
  .about__split { grid-template-columns: 1fr; gap: 2rem; }
  .about__text { order: 1; }
  .about__media { order: 0; }
  .contact__split { grid-template-columns: 1fr; gap: 2rem; }
  .faq-two-col { grid-template-columns: 1fr; }
  .gallery-grid, .masonry-grid { columns: 2; grid-template-columns: 1fr 1fr; }
  .cta-split__inner { flex-direction: column; gap: 2rem; }
  .pricing-card--featured { transform: none; }
}
@media (max-width: 480px) {
  .hero { padding: 3.5rem 1.5rem; min-height: 400px; }
  .gallery-grid { grid-template-columns: 1fr; }
  .masonry-grid { columns: 1; }
  .hero__ctas { flex-direction: column; align-items: stretch; }
}`;
}

function baseStyles() {
  return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body, system-ui, sans-serif);
  color: var(--color-text, #111);
  background: var(--color-background, #fff);
  line-height: 1.6; font-size: 16px;
}
img { max-width: 100%; height: auto; display: block; }
a   { color: inherit; }

.container          { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
.container--narrow  { max-width: 640px; margin: 0 auto; }
.container--narrow-lg { max-width: 800px; margin: 0 auto; }

/* ── Topbar ──────────────────────────────────────────────────────────────── */
.mockup-topbar {
  position: sticky; top: 0; z-index: 200;
  display: flex; align-items: center; gap: 1rem;
  padding: 0 1.5rem; height: 32px;
  background: #1a1d27; color: #94a3b8;
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 11px; font-weight: 500;
  border-bottom: 1px solid #2e3347;
}
.mockup-topbar__badge {
  background: #6c8ef5; color: #fff;
  padding: 1px 7px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: .05em; flex-shrink: 0;
}
.mockup-topbar__page { color: #cbd5e1; }
.mockup-topbar__page strong { color: #e2e8f0; }
.mockup-topbar__link { margin-left: auto; color: #6c8ef5; text-decoration: none; font-weight: 600; white-space: nowrap; }
.mockup-topbar__link:hover { text-decoration: underline; }

/* ── Header ──────────────────────────────────────────────────────────────── */
.header { position: sticky; top: 32px; z-index: 100; background: var(--color-background, #fff); border-bottom: 1px solid var(--color-border, #e5e7eb); box-shadow: 0 1px 6px rgba(0,0,0,.06); }
.header__inner  { display: flex; align-items: center; gap: 2rem; height: 70px; }
.header__logo   { text-decoration: none; flex-shrink: 0; }
.header__logo-img  { height: 44px; width: auto; object-fit: contain; }
.header__logo-text { font-weight: 700; font-size: 1.2rem; color: var(--color-primary); }
.header__nav    { display: flex; gap: 1.5rem; margin-left: auto; flex-wrap: wrap; }
.header__nav a  { text-decoration: none; font-size: .9rem; font-weight: 500; color: var(--color-text, #111); padding: .25rem 0; border-bottom: 2px solid transparent; transition: color .2s, border-color .2s; }
.header__nav a:hover, .header__nav a.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
.header__burger { display: none; background: none; border: none; font-size: 1.4rem; cursor: pointer; margin-left: auto; padding: .5rem; }
.header__mobile-nav { display: none; flex-direction: column; padding: 1rem 1.5rem; border-top: 1px solid var(--color-border, #e5e7eb); }
.header__mobile-nav a { padding: .7rem 0; font-size: 1rem; font-weight: 500; text-decoration: none; border-bottom: 1px solid var(--color-border, #f3f4f6); }
.header.open .header__mobile-nav { display: flex; }

/* ── Sections ────────────────────────────────────────────────────────────── */
.section       { padding: 5rem 0; }
.section--light  { background: var(--color-surface, #f9fafb); }
.section--accent { background: var(--color-secondary, #1e293b); color: #fff; }

/* ── Form ────────────────────────────────────────────────────────────────── */
.form { display: flex; flex-direction: column; gap: 1.25rem; }
.form__group { display: flex; flex-direction: column; gap: .4rem; }
.form__group label { font-size: .85rem; font-weight: 600; color: var(--color-text, #111); }
.form__group input, .form__group textarea, .form__group select {
  padding: .75rem 1rem; border: 1.5px solid var(--color-border, #d1d5db);
  border-radius: 8px; font-size: .95rem; font-family: inherit;
  background: var(--color-background, #fff); color: var(--color-text, #111);
  transition: border-color .2s;
}
.form__group input:focus, .form__group textarea:focus { border-color: var(--color-primary); outline: none; }

/* ── Footer ──────────────────────────────────────────────────────────────── */
.footer { background: var(--color-dark, #111827); color: rgba(255,255,255,.7); padding: 3rem 0 2rem; }
.footer__inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2rem; }
.footer__copy p { font-size: .85rem; margin-bottom: .4rem; }
.footer__links  { font-size: .8rem; display: flex; gap: .75rem; flex-wrap: wrap; align-items: flex-start; }
.footer__links span { opacity: .6; }

/* ── Header responsive ───────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .header__nav { display: none; }
  .header__burger { display: block; }
  .section { padding: 3.5rem 0; }
  .footer__inner { flex-direction: column; }
}`;
}

// ─── CSS vars + Font import ───────────────────────────────────────────────────

function buildCssVars(design, savedTheme = {}) {
  const c = design.colors     || {};
  const t = design.typography || {};

  // Theme colors override design-system colors
  const mergedColors = { ...c, ...(savedTheme.colors || {}) };

  const bodyFont = (
    savedTheme.typography?.bodyFont ||
    t.p?.fontFamily || t.body?.fontFamily || 'system-ui'
  ).replace(/['"]/g, '');
  const headFont = (
    savedTheme.typography?.headingFont ||
    t.h1?.fontFamily || bodyFont
  ).replace(/['"]/g, '');

  const colorVars = Object.entries(mergedColors)
    .map(([k, v]) => `  --color-${k}: ${v};`)
    .join('\n');

  // Typography overrides from theme
  const headWeight  = savedTheme.typography?.headingWeight || '700';
  const baseFontSize = savedTheme.typography?.baseFontSize || '16px';
  const borderRadius = savedTheme.layout?.borderRadius || '8px';

  return `
:root {
${colorVars}
  --font-body: '${bodyFont}', system-ui, sans-serif;
  --font-head: '${headFont}', system-ui, sans-serif;
  --base-font-size: ${baseFontSize};
  --border-radius: ${borderRadius};
}
body { font-size: var(--base-font-size); }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-head); font-weight: ${headWeight}; }
.btn, .card, .pricing-card, .testimonial, .faq__item,
input, textarea, select { border-radius: ${borderRadius}; }`;
}

function buildFontImport(design, manifest, savedTheme = {}) {
  const gFonts  = manifest.googleFonts || [];
  const t       = design.typography   || {};
  const families = new Set();

  gFonts.forEach(f => families.add(f.name));
  Object.values(t).forEach(v => {
    if (v.fontFamily && !v.fontFamily.includes('system') && !v.fontFamily.includes('sans-serif') && !v.fontFamily.includes('serif')) {
      families.add(v.fontFamily.replace(/['"]/g, ''));
    }
  });
  // Add theme font overrides
  if (savedTheme.typography?.headingFont) families.add(savedTheme.typography.headingFont);
  if (savedTheme.typography?.bodyFont)    families.add(savedTheme.typography.bodyFont);

  if (!families.size) return '';
  const query = [...families].map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800`).join('&');
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?${query}&display=swap" rel="stylesheet">`;
}

// ─── Theme helpers ────────────────────────────────────────────────────────────

/** Apply saved variant/visibility choices to the sections array */
function applyThemeToSections(sections, savedTheme = {}) {
  const saved = savedTheme?.sections || {};
  if (!Object.keys(saved).length) return sections;

  return sections.map(s => {
    const override = saved[s.id];
    if (!override) return s;
    return {
      ...s,
      variant: override.variant ?? s.variant,
      visible: override.visible !== undefined ? override.visible : s.visible,
    };
  });
}

/** Generate CSS that applies header style at build-time (no flash-of-wrong-style) */
function buildHeaderInitCss(headerStyle) {
  switch (headerStyle) {
    case 'primary':
      return `.header { background: var(--color-primary) !important; }
.header__nav a, .header__logo-text { color: #fff !important; }
.header__logo-img { filter: brightness(10) !important; }`;
    case 'dark':
      return `.header { background: #111 !important; }
.header__nav a, .header__logo-text { color: #fff !important; }`;
    case 'transparent':
      return `.header { background: transparent !important; border-bottom: none !important; box-shadow: none !important; }`;
    default:
      return ''; // light — default, no override needed
  }
}

// ─── Navigation helpers ────────────────────────────────────────────────────────

function buildNav(content, sitemap) {
  const first = content[sitemap[0]?.slug];
  return first?.navigation || sitemap.slice(0, 8).map(p => ({ text: p.slug.replace(/-/g, ' '), href: p.url }));
}

function findLogo(manifest) {
  const all = [...(manifest.icons || []), ...(manifest.images || [])];
  return all.find(i => /logo|brand|marque/.test(i.file))?.file || null;
}

function findImg(manifest, assetsRelPath, keywords) {
  const images = manifest.images || [];
  const match  = keywords.length
    ? images.find(i => keywords.some(k => i.file.toLowerCase().includes(k)))
    : images[0];
  return match ? `${assetsRelPath}/${match.file}` : null;
}

async function readJSON(filepath) {
  try {
    const raw = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

main().catch(err => {
  logger.error(`Erreur fatale : ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
