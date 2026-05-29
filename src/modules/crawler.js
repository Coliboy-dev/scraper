import path from 'path';
import { writeText, writeJSON, ensureDir } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

const SKIP_EXT = /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|tar|gz|mp4|mp3|woff|woff2|ttf|eot|css|js)(\?.*)?$/i;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function crawl({ url, depth, outDir, browser }) {
  const htmlDir = path.join(outDir, 'html');
  await ensureDir(htmlDir);

  const visited = new Set();
  const sitemap  = [];
  const origin   = new URL(url).origin;

  async function crawlPage(pageUrl, currentDepth) {
    const normalized = normalizeUrl(pageUrl);
    if (!normalized || visited.has(normalized)) return;
    if (!normalized.startsWith(origin)) return;
    if (SKIP_EXT.test(normalized)) return;
    visited.add(normalized);

    const page = await browser.newPage();
    try {
      await page.setExtraHTTPHeaders({ 'User-Agent': USER_AGENT });
      logger.sub(`[L${currentDepth}] ${normalized}`);

      await page.goto(normalized, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      const html = await page.content();
      const slug = urlToSlug(normalized, origin);
      const htmlFile = slug + '.html';
      await writeText(path.join(htmlDir, htmlFile), html);

      const meta = await page.evaluate(() => ({
        title:     document.title || '',
        description: document.querySelector('meta[name="description"]')?.content || '',
        h1:        document.querySelector('h1')?.innerText?.trim() || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || location.href,
      }));

      sitemap.push({ url: normalized, slug, htmlFile, depth: currentDepth, ...meta });
      logger.asset('HTML', `${htmlFile} (${Math.round(html.length / 1024)}KB)`);

      if (currentDepth < depth) {
        const links = await page.evaluate((orig) =>
          Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(h => h.startsWith(orig)),
          origin
        );
        const unique = [...new Set(links.map(normalizeUrl).filter(Boolean))];
        for (const link of unique) {
          if (!visited.has(link) && !SKIP_EXT.test(link)) {
            await crawlPage(link, currentDepth + 1);
          }
        }
      }
    } catch (err) {
      logger.warn(`Échec ${normalized} : ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await crawlPage(url, 0);
  await writeJSON(path.join(outDir, 'analysis', 'sitemap.json'), sitemap);
  return sitemap;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    let href = u.href;
    if (href.endsWith('/') && href !== u.origin + '/') href = href.slice(0, -1);
    return href;
  } catch {
    return null;
  }
}

function urlToSlug(url, origin) {
  const p = url.replace(origin, '') || '/';
  if (p === '/') return 'index';
  return p
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '--')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-') || 'index';
}
