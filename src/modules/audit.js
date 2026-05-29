import path from 'path';
import { writeJSON } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

const TRACKING_DOMAINS = [
  'google-analytics', 'googletagmanager', 'facebook.com/tr',
  'hotjar.com', 'doubleclick', 'googlesyndication', 'adservice',
];

export async function audit({ url, browser, outDir, sitemap }) {
  const page = await browser.newPage();
  const thirdParty = new Set();

  page.on('request', req => {
    const u = req.url();
    if (u.includes('google-analytics') || u.includes('googletagmanager')) thirdParty.add('Google Analytics / GTM');
    if (u.includes('stripe.com'))    thirdParty.add('Stripe');
    if (u.includes('intercom.io'))   thirdParty.add('Intercom');
    if (u.includes('hotjar.com'))    thirdParty.add('Hotjar');
    if (u.includes('crisp.chat'))    thirdParty.add('Crisp');
    if (u.includes('hubspot.com'))   thirdParty.add('HubSpot');
    if (u.includes('facebook.com/tr') || u.includes('connect.facebook')) thirdParty.add('Facebook Pixel');
    if (u.includes('clarity.ms'))    thirdParty.add('Microsoft Clarity');
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const detected = await page.evaluate(() => {
      const r = { framework: 'Unknown', cms: null, libraries: [], features: [] };

      // Framework
      if (window.__NEXT_DATA__)            r.framework = 'Next.js';
      else if (window.__nuxt__)            r.framework = 'Nuxt.js';
      else if (window.angular)             r.framework = 'Angular';
      else if (window.React)               r.framework = 'React';
      else if (window.Vue)                 r.framework = 'Vue.js';

      // CMS
      if (window.wp || document.querySelector('meta[name="generator"][content*="WordPress"]')) r.cms = 'WordPress';
      if (window.Shopify)                                                                       r.cms = 'Shopify';
      if (document.querySelector('meta[name="generator"][content*="Webflow"]'))                r.cms = 'Webflow';
      if (document.querySelector('meta[name="generator"][content*="Wix"]'))                    r.cms = 'Wix';
      if (document.querySelector('meta[name="generator"][content*="Squarespace"]'))            r.cms = 'Squarespace';
      if (document.querySelector('meta[name="generator"][content*="Drupal"]'))                 r.cms = 'Drupal';

      // Libraries
      if (window.jQuery || window.$?.fn?.jquery) r.libraries.push(`jQuery ${window.jQuery?.fn?.jquery || ''}`.trim());
      if (window.gsap)   r.libraries.push('GSAP');
      if (window.Swiper) r.libraries.push('Swiper');
      if (window.AOS)    r.libraries.push('AOS');
      if (window.Lenis)  r.libraries.push('Lenis');
      if (window.Alpine) r.libraries.push('Alpine.js');
      if (document.querySelector('script[src*="bootstrap"]')) r.libraries.push('Bootstrap');
      if (document.querySelector('script[src*="tailwind"]'))  r.libraries.push('Tailwind (CDN)');

      // Features
      if (document.querySelector('form'))                                                         r.features.push('Formulaires');
      if (document.querySelector('input[type="search"], [class*="search"]'))                     r.features.push('Barre de recherche');
      if (document.querySelector('[class*="slider"], [class*="swiper"], [class*="carousel"]'))   r.features.push('Slider / Carousel');
      if (document.querySelector('[class*="modal"], [class*="popup"], [class*="lightbox"]'))     r.features.push('Modal / Lightbox');
      if (document.querySelector('[data-aos], [data-gsap], [class*="parallax"]'))               r.features.push('Animations au scroll');
      if (document.querySelector('video, [class*="video"]'))                                     r.features.push('Vidéo');
      if (document.querySelector('[class*="map"], #map, .leaflet-container'))                    r.features.push('Carte interactive');
      if (document.querySelector('[class*="cart"], [class*="shop"], [class*="product"]'))        r.features.push('E-commerce');
      if (document.querySelector('[class*="blog"], [class*="article"], [class*="post"]'))        r.features.push('Blog / Articles');
      if (document.querySelector('[class*="accordion"], [class*="faq"]'))                       r.features.push('Accordéon / FAQ');
      if (document.querySelector('[class*="tab"][role], [role="tablist"]'))                      r.features.push('Tabs');
      if (document.querySelector('[class*="cookie"], [id*="cookie"]'))                           r.features.push('Bandeau cookies');
      if (document.querySelector('[class*="chat"], [id*="crisp"], [id*="intercom"]'))            r.features.push('Chat / Support');
      if (document.querySelectorAll('[hreflang]').length > 0)                                    r.features.push('Multilingue');
      if (document.querySelector('[class*="testimonial"], [class*="review"], [class*="avis"]')) r.features.push('Témoignages');
      if (document.querySelector('[class*="pricing"], [class*="tarif"], [class*="plan"]'))       r.features.push('Tarifs / Pricing');

      return r;
    });

    let score = 0;
    if (detected.cms) score += 1;
    if (['Next.js', 'Nuxt.js', 'Angular'].includes(detected.framework)) score += 1;
    score += Math.min(detected.libraries.length, 2);
    score += Math.min(detected.features.length, 4);

    const complexity = score <= 2 ? 'SIMPLE' : score <= 5 ? 'MOYEN' : 'COMPLEXE';

    const recommendations = [];
    if (detected.cms === 'WordPress')                     recommendations.push('Envisager un CMS headless (Sanity, Strapi) ou génération statique');
    if (detected.features.includes('E-commerce'))        recommendations.push('Shopify Storefront API ou Stripe + Server Actions');
    if (detected.features.includes('Animations au scroll')) recommendations.push('Framer Motion avec useInView ou GSAP ScrollTrigger');
    if (detected.features.includes('Multilingue'))       recommendations.push('next-intl pour l\'internationalisation');
    if (detected.features.includes('Blog / Articles'))   recommendations.push('MDX ou CMS headless pour la gestion de contenu');
    if (detected.features.includes('Formulaires'))       recommendations.push('React Hook Form + Zod + Resend (emails)');
    if (detected.features.includes('Carte interactive')) recommendations.push('Leaflet ou react-map-gl avec next/dynamic');
    if (detected.features.includes('Slider / Carousel')) recommendations.push('Embla Carousel ou Swiper React');

    const result = {
      url,
      framework:         detected.framework,
      cms:               detected.cms,
      libraries:         [...new Set(detected.libraries)],
      thirdPartyServices: [...thirdParty],
      features:          [...new Set(detected.features)],
      complexity,
      complexityScore:   score,
      pages:             sitemap.length,
      recommendations,
    };

    await writeJSON(path.join(outDir, 'analysis', 'audit.json'), result);

    logger.done(`Stack détecté : ${[result.framework, result.cms].filter(Boolean).join(', ') || 'Inconnu'}`);
    logger.done(`Complexité : ${complexity} (score: ${score})`);
    logger.done(`${result.features.length} fonctionnalité(s) identifiée(s)`);

    return result;
  } finally {
    await page.close();
  }
}
