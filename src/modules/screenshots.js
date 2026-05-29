import path from 'path';
import { ensureDir } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900,  fullPage: true  },
  { name: 'tablet',  width: 768,  height: 1024, fullPage: false },
  { name: 'mobile',  width: 390,  height: 844,  fullPage: false },
];

const COOKIE_SELECTORS = [
  '[class*="cookie"]', '[id*="cookie"]', '[class*="gdpr"]', '[id*="gdpr"]',
  '[class*="consent"]', '#onetrust-banner-sdk', '.cc-banner', '[class*="notice"]',
];

export async function takeScreenshots({ sitemap, browser, outDir, maxPages = 6 }) {
  const screenshotDir = path.join(outDir, 'screenshots');
  await ensureDir(screenshotDir);

  const pages = sitemap.slice(0, maxPages);

  for (const pageData of pages) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      try {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageData.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);

        for (const sel of COOKIE_SELECTORS) {
          await page.evaluate(s => {
            document.querySelectorAll(s).forEach(el => { el.style.display = 'none'; });
          }, sel).catch(() => {});
        }

        const filename = `${pageData.slug}--${vp.name}.png`;
        await page.screenshot({
          path: path.join(screenshotDir, filename),
          fullPage: vp.fullPage,
        });
        logger.asset('SCREEN', filename);
      } catch (err) {
        logger.warn(`Screenshot échoué (${pageData.slug}/${vp.name}): ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }
}
