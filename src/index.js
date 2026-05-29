import { chromium } from 'playwright';
import path from 'path';
import { execSync } from 'child_process';
import { parseArgs }        from './utils/args.js';
import { logger }           from './utils/logger.js';
import { ensureDir }        from './utils/fs.js';
import { crawl }            from './modules/crawler.js';
import { audit }            from './modules/audit.js';
import { takeScreenshots }  from './modules/screenshots.js';
import { extractAssets }    from './modules/assets.js';
import { extractDesign }    from './modules/design.js';
import { extractContent }   from './modules/content.js';
import { generateReport }   from './modules/report.js';
import { createZip }        from './modules/zip.js';
import { buildSectionsJson } from './modules/sections.js';

// ── Garantir que PLAYWRIGHT_BROWSERS_PATH est un vrai chemin Windows ─────────
// Quand lancé depuis Git Bash, PLAYWRIGHT_BROWSERS_PATH peut être un path Unix.
// On le revalide ici pour s'assurer que Playwright trouve le binaire.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH || !/^[A-Za-z]:/.test(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
  try {
    const localAppData = execSync('cmd /c echo %LOCALAPPDATA%', { encoding: 'utf8' }).trim();
    if (/^[A-Za-z]:/.test(localAppData)) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = localAppData + '\\ms-playwright';
    }
  } catch {}
}

// ── Auto-install si le navigateur est absent ──────────────────────────────────
try {
  const exePath = chromium.executablePath();
  if (!exePath) throw new Error('path vide');
} catch {
  console.log('⚙  Navigateur Playwright manquant — installation en cours...');
  execSync('npx playwright install chromium', { stdio: 'inherit', cwd: path.join(import.meta.dirname, '..') });
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.url) {
    console.error('Usage: node src/index.js <URL> [--depth=N] [--output=PATH] [--no-screenshots] [--no-zip]');
    process.exit(1);
  }

  logger.banner();

  const domain = new URL(args.url).hostname;
  const outDir = args.output || path.join(process.cwd(), 'output', domain);

  logger.info(`URL cible   : ${args.url}`);
  logger.info(`Profondeur  : ${args.depth}`);
  logger.info(`Sortie      : ${outDir}`);
  console.log();

  await ensureDir(path.join(outDir, 'analysis'));

  const browser = await chromium.launch({ headless: true });

  try {
    // [1/6] Crawl
    logger.step(1, 6, 'Crawl des pages du site');
    const sitemap = await crawl({ url: args.url, depth: args.depth, outDir, browser });

    // [2/6] Audit
    logger.step(2, 6, 'Audit technique du site');
    const auditResult = await audit({ url: args.url, browser, outDir, sitemap });

    // [3/6] Screenshots
    if (args.screenshots) {
      logger.step(3, 6, 'Capture des screenshots');
      await takeScreenshots({ sitemap, browser, outDir });
    } else {
      logger.step(3, 6, 'Screenshots désactivés');
      logger.done('Étape ignorée (--no-screenshots)');
    }

    // [4/6] Assets
    logger.step(4, 6, 'Extraction des assets');
    const manifest = await extractAssets({ sitemap, browser, outDir });

    // [5/6] Design
    logger.step(5, 6, 'Analyse du design system');
    const designSystem = await extractDesign({ url: args.url, browser, outDir });

    // [6/6] Content + Report + Sections detection
    logger.step(6, 6, 'Extraction des contenus textuels');
    const content = await extractContent({ sitemap, outDir });

    // Sections detection (confidence scores + layout variants)
    const sectionsData = buildSectionsJson(content, sitemap);
    const { writeFile } = await import('fs/promises');
    await writeFile(
      path.join(outDir, 'analysis', 'sections.json'),
      JSON.stringify(sectionsData, null, 2),
      'utf-8'
    );
    logger.done(`sections.json — ${sitemap.length} pages analysées`);

    await generateReport({ outDir, audit: auditResult, designSystem, sitemap, manifest, content });

    // ZIP
    if (args.zip) {
      await createZip({ outDir, domain });
    }

    const uniqueFonts = designSystem.typography
      ? [...new Set(Object.values(designSystem.typography).map(t => t.fontFamily))].filter(Boolean)
      : [];

    logger.footer({
      'Pages crawlées   ': sitemap.length,
      'Images trouvées  ': manifest.images.length,
      'Polices détectées': uniqueFonts.length,
      'Couleurs extraites': Object.keys(designSystem.colors).length,
      'Sections de texte': Object.keys(content).length,
    });

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  logger.error(`Erreur fatale : ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
