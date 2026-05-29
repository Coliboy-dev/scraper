import path from 'path';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import { writeJSON, writeText } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

const SECTION_PATTERNS = {
  hero:         /hero|jumbotron|banner|intro|splash|landing/i,
  about:        /about|apropos|qui-sommes|team|equipe|story/i,
  services:     /services?|prestations?|offres?|solutions?/i,
  pricing:      /pricing|tarifs?|plans?|formules?/i,
  testimonials: /testimonial|avis|reviews?|temoignages?/i,
  faq:          /faq|questions?|accordion/i,
  cta:          /cta|call-to-action|contactez|get-started/i,
  contact:      /contact/i,
  footer:       /footer/i,
  header:       /header|navbar/i,
  blog:         /blog|articles?|posts?|actualites?|news/i,
  gallery:      /gallery|galerie|portfolio/i,
  features:     /features?|avantages?|benefits?/i,
};

export async function extractContent({ sitemap, outDir }) {
  const allContent = {};

  for (const pageData of sitemap) {
    const htmlPath = path.join(outDir, 'html', pageData.htmlFile);
    let html;
    try { html = await fs.readFile(htmlPath, 'utf-8'); } catch { continue; }

    const $ = cheerio.load(html);
    $('script, style, noscript').remove();

    const pageContent = {
      url:        pageData.url,
      slug:       pageData.slug,
      title:      pageData.title,
      meta:       { description: $('meta[name="description"]').attr('content') || '' },
      headings:   {},
      navigation: [],
      footer:     [],
      cta:        [],
      forms:      [],
      sections:   {},
    };

    // Headings
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      const texts = [];
      $(tag).each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 1) texts.push(t);
      });
      if (texts.length) pageContent.headings[tag] = texts;
    });

    // Navigation
    $('header nav a, nav a, [class*="nav"] a, [role="navigation"] a').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text && href) pageContent.navigation.push({ text, href });
    });
    pageContent.navigation = dedup(pageContent.navigation, 'text').slice(0, 30);

    // Footer
    $('footer').find('a, p, li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 2 && text.length < 200) pageContent.footer.push(text);
    });
    pageContent.footer = [...new Set(pageContent.footer)].slice(0, 30);

    // CTAs
    $('button, a[class*="btn"], a[class*="cta"], [class*="button"]').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text.length > 0 && text.length < 80) pageContent.cta.push({ text, href: href || '#' });
    });
    pageContent.cta = dedup(pageContent.cta, 'text').slice(0, 20);

    // Forms
    $('form').each((_, form) => {
      const fields = [];
      $(form).find('input, textarea, select').each((_, field) => {
        const type  = $(field).attr('type') || field.tagName.toLowerCase();
        const name  = $(field).attr('name') || $(field).attr('id') || '';
        const label = $(field).attr('placeholder') || $(field).attr('aria-label') || name;
        if (type !== 'hidden' && type !== 'submit' && type !== 'button') {
          fields.push({ type, name, label });
        }
      });
      const submit = $(form).find('[type="submit"], button').first().text().trim();
      if (fields.length) pageContent.forms.push({ fields, submit });
    });

    // Sections by class/id pattern
    $('section, [class*="section"], main > div, article').each((_, el) => {
      const classStr = ($(el).attr('class') || '') + ' ' + ($(el).attr('id') || '');
      for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
        if (pattern.test(classStr) && !pageContent.sections[sectionName]) {
          const texts = [];
          $(el).find('p, li, span, blockquote').each((_, child) => {
            const text = $(child).text().trim();
            if (text.length > 20 && text.length < 800) texts.push(text);
          });
          if (texts.length) {
            pageContent.sections[sectionName] = [...new Set(texts)].slice(0, 8);
          }
        }
      }
    });

    allContent[pageData.slug] = pageContent;
    logger.done(`Contenu : ${pageData.slug}`);
  }

  await writeJSON(path.join(outDir, 'analysis', 'content.json'), allContent);
  await writeText(path.join(outDir, 'analysis', 'content.md'), buildContentMarkdown(allContent));

  logger.done(`Contenu extrait : ${Object.keys(allContent).length} pages`);
  return allContent;
}

function dedup(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}

function buildContentMarkdown(content) {
  let md = '# Contenu extrait du site\n\n';

  for (const [slug, page] of Object.entries(content)) {
    md += `## Page : \`${slug}\`\n\n`;
    md += `**URL :** ${page.url}  \n`;
    md += `**Titre :** ${page.title}  \n`;
    if (page.meta.description) md += `**Meta :** ${page.meta.description}  \n`;
    md += '\n';

    if (Object.keys(page.headings).length) {
      md += '### Titres\n\n';
      for (const [tag, texts] of Object.entries(page.headings)) {
        texts.forEach(t => { md += `- **${tag.toUpperCase()}** : ${t}\n`; });
      }
      md += '\n';
    }

    if (page.navigation.length) {
      md += '### Navigation\n\n';
      page.navigation.forEach(n => { md += `- [${n.text}](${n.href})\n`; });
      md += '\n';
    }

    if (page.cta.length) {
      md += '### Call-to-action\n\n';
      page.cta.forEach(c => { md += `- **${c.text}** → \`${c.href}\`\n`; });
      md += '\n';
    }

    for (const [section, texts] of Object.entries(page.sections)) {
      if (texts.length) {
        md += `### Section : ${section}\n\n`;
        texts.forEach(t => { md += `> ${t}\n\n`; });
      }
    }

    if (page.forms.length) {
      md += '### Formulaires\n\n';
      page.forms.forEach((form, i) => {
        md += `**Formulaire ${i + 1}**${form.submit ? ` — bouton : "${form.submit}"` : ''}\n`;
        form.fields.forEach(f => { md += `- ${f.type}: \`${f.name}\` (${f.label})\n`; });
        md += '\n';
      });
    }

    md += '---\n\n';
  }

  return md;
}
