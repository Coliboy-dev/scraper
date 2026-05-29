/**
 * sections.js — Section detection with confidence scoring
 * Analyzes scraped content to identify which sections are present,
 * how confident we are, and which layout variants are available.
 *
 * Output format (sections.json):
 * {
 *   "pageSlug": [
 *     { id, type, label, icon, confidence, visible, variant, variants, variantLabels, itemCount }
 *   ]
 * }
 */

export const SECTION_DEFINITIONS = {
  hero: {
    label: 'Hero / Bannière',
    icon: '🖼',
    variants:       ['centered', 'split-left', 'full-background'],
    variantLabels:  ['Centré', 'Split gauche', 'Fond plein'],
  },
  services: {
    label: 'Services / Fonctionnalités',
    icon: '⚡',
    variants:       ['cards-3', 'cards-2', 'list-icons'],
    variantLabels:  ['3 cartes', '2 cartes', 'Liste icônes'],
  },
  about: {
    label: 'À propos',
    icon: '👤',
    variants:       ['split-left', 'split-right', 'centered'],
    variantLabels:  ['Image gauche', 'Image droite', 'Centré'],
  },
  testimonials: {
    label: 'Témoignages',
    icon: '💬',
    variants:       ['grid-3', 'quote-simple'],
    variantLabels:  ['Grille 3 cols', 'Citation simple'],
  },
  pricing: {
    label: 'Tarifs / Formules',
    icon: '💰',
    variants:       ['cards-3', 'cards-2'],
    variantLabels:  ['3 formules', '2 formules'],
  },
  faq: {
    label: 'FAQ',
    icon: '❓',
    variants:       ['accordion', 'two-col'],
    variantLabels:  ['Accordéon', '2 colonnes'],
  },
  contact: {
    label: 'Contact / Formulaire',
    icon: '✉️',
    variants:       ['split', 'centered'],
    variantLabels:  ['Split', 'Centré'],
  },
  cta: {
    label: 'Appel à l\'action',
    icon: '🎯',
    variants:       ['centered', 'split'],
    variantLabels:  ['Centré', 'Split'],
  },
  gallery: {
    label: 'Galerie / Portfolio',
    icon: '🖼',
    variants:       ['grid-3', 'masonry'],
    variantLabels:  ['Grille 3 cols', 'Masonry'],
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Detect sections for a single page.
 * Returns an ordered array of section definitions with confidence scores.
 */
export function detectSections(page) {
  const sections = [];
  const s    = page.sections   || {};
  const h2s  = page.headings?.h2 || [];
  const ctas = page.cta        || [];
  const forms = page.forms     || [];

  // ── Hero ─────────────────────────────────────────────────────────────────
  // Always present. Confidence drops if no H1 found.
  const heroConf = (page.headings?.h1?.length > 0) ? 0.95 : 0.72;
  sections.push(makeSection('hero', heroConf, { itemCount: 0 }));

  // ── Services / Features ───────────────────────────────────────────────────
  if (s.services || s.features) {
    const items = s.services || s.features;
    sections.push(makeSection('services', 0.90, { itemCount: items.length }));
  } else {
    const serviceH2s = h2s.filter(h =>
      /service|fonctionnalit|prestation|offre|solution|avantage|bénéfice|cours|disci|activit/i.test(h)
    );
    if (serviceH2s.length >= 2) {
      sections.push(makeSection('services', 0.72, { itemCount: serviceH2s.length }));
    } else if (h2s.length >= 4) {
      sections.push(makeSection('services', 0.52, { itemCount: Math.min(h2s.length, 4) }));
    }
  }

  // ── About ─────────────────────────────────────────────────────────────────
  if (s.about) {
    sections.push(makeSection('about', 0.88, { itemCount: s.about.length }));
  } else {
    const aboutH2 = h2s.find(h =>
      /propos|qui sommes|notre histoire|team|équipe|story|about|découvrez/i.test(h)
    );
    if (aboutH2) sections.push(makeSection('about', 0.62, { itemCount: 1 }));
  }

  // ── Testimonials ──────────────────────────────────────────────────────────
  if (s.testimonials) {
    sections.push(makeSection('testimonials', 0.93, { itemCount: s.testimonials.length }));
  } else {
    const testH2 = h2s.find(h =>
      /témoignage|avis|client|review|trust|confiance|ils nous/i.test(h)
    );
    if (testH2) sections.push(makeSection('testimonials', 0.60, { itemCount: 3 }));
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  if (s.pricing) {
    sections.push(makeSection('pricing', 0.93, { itemCount: s.pricing.length }));
  } else {
    const pricingH2 = h2s.find(h =>
      /tarif|prix|formule|pack|abonnement|adhésion|cotisation|pricing/i.test(h)
    );
    if (pricingH2) sections.push(makeSection('pricing', 0.68, { itemCount: 3 }));
  }

  // ── FAQ ───────────────────────────────────────────────────────────────────
  if (s.faq) {
    sections.push(makeSection('faq', 0.93, { itemCount: s.faq.length }));
  } else {
    const faqH2 = h2s.find(h =>
      /faq|question|réponse|help|aide|foire/i.test(h)
    );
    if (faqH2) sections.push(makeSection('faq', 0.62, { itemCount: 4 }));
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  if (forms.length > 0) {
    sections.push(makeSection('contact', 0.96, { itemCount: forms[0].fields?.length || 3 }));
  } else {
    const contactH2 = h2s.find(h =>
      /contact|message|nous écrire|formulaire|rdv|rendez-vous/i.test(h)
    );
    if (contactH2) sections.push(makeSection('contact', 0.68, { itemCount: 4 }));
  }

  // ── CTA Banner ────────────────────────────────────────────────────────────
  // Present if there are CTAs and at least 3 other sections
  if (ctas.length >= 1 && sections.length >= 3) {
    sections.push(makeSection('cta', 0.75, { itemCount: Math.min(ctas.length, 2) }));
  }

  // ── Gallery ───────────────────────────────────────────────────────────────
  if (s.gallery) {
    sections.push(makeSection('gallery', 0.88, { itemCount: Math.min(s.gallery.length, 9) }));
  }

  return sections;
}

/**
 * Build sections.json for all pages in the sitemap.
 */
export function buildSectionsJson(content, sitemap) {
  const result = {};
  for (const p of sitemap) {
    const page = content[p.slug];
    if (page) result[p.slug] = detectSections(page);
  }
  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeSection(type, confidence, extras = {}) {
  const def = SECTION_DEFINITIONS[type];
  if (!def) return null;
  return {
    id:            type,
    type,
    label:         def.label,
    icon:          def.icon,
    confidence:    Math.round(confidence * 100) / 100,
    visible:       true,
    variant:       def.variants[0],
    variants:      def.variants,
    variantLabels: def.variantLabels,
    itemCount:     0,
    ...extras,
  };
}
