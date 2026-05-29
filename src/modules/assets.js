import path from 'path';
import fs from 'fs/promises';
import { writeJSON, ensureDir, downloadFile } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SKIP_TRACKING = [
  'google-analytics', 'googletagmanager', 'facebook.com/tr',
  'hotjar.com', 'doubleclick', 'googlesyndication',
];

const IMG_EXT   = /\.(jpg|jpeg|png|gif|svg|webp|ico|avif)(\?.*)?$/i;
const FONT_EXT  = /\.(woff2?|ttf|eot|otf)(\?.*)?$/i;
const CSS_EXT   = /\.css(\?.*)?$/i;
const JS_EXT    = /\.js(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg)(\?.*)?$/i;

export async function extractAssets({ sitemap, browser, outDir }) {
  const dirs = {
    images: path.join(outDir, 'assets', 'images'),
    fonts:  path.join(outDir, 'assets', 'fonts'),
    icons:  path.join(outDir, 'assets', 'icons'),
    videos: path.join(outDir, 'assets', 'videos'),
    css:    path.join(outDir, 'css'),
    js:     path.join(outDir, 'js'),
  };
  await Promise.all(Object.values(dirs).map(d => ensureDir(d)));

  const manifest = { images: [], fonts: [], icons: [], videos: [], css: [], js: [], googleFonts: [] };
  const seen = new Set();

  for (const pageData of sitemap) {
    const htmlPath = path.join(outDir, 'html', pageData.htmlFile);
    let html;
    try { html = await fs.readFile(htmlPath, 'utf-8'); } catch { continue; }

    const page = await browser.newPage();
    try {
      await page.setContent(html, { baseURL: pageData.url });

      const rawAssets = await page.evaluate((pageUrl) => {
        const resolve = src => { try { return new URL(src, pageUrl).href; } catch { return null; } };
        const assets = [];

        document.querySelectorAll('img[src], img[data-src]').forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src) assets.push({ type: 'image', url: resolve(src), alt: img.alt || '' });
        });

        document.querySelectorAll('[style*="background"]').forEach(el => {
          const m = el.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
          if (m) assets.push({ type: 'image', url: resolve(m[1]), alt: '' });
        });

        document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
          if (l.href) assets.push({ type: 'css', url: l.href });
        });

        document.querySelectorAll('script[src]').forEach(s => {
          if (s.src) assets.push({ type: 'js', url: s.src });
        });

        document.querySelectorAll('link[rel*="preload"][as="font"], link[href*=".woff"]').forEach(l => {
          if (l.href) assets.push({ type: 'font', url: l.href });
        });

        document.querySelectorAll('video source[src], video[src]').forEach(el => {
          const src = el.src;
          if (src) assets.push({ type: 'video', url: resolve(src) });
        });

        return assets.filter(a => a.url);
      }, pageData.url);

      for (const asset of rawAssets) {
        if (!asset.url || seen.has(asset.url)) continue;
        if (SKIP_TRACKING.some(t => asset.url.includes(t))) continue;
        seen.add(asset.url);

        // Google Fonts — reference only, do not download
        if (asset.url.includes('fonts.googleapis.com') || asset.url.includes('fonts.gstatic.com')) {
          const name = extractGoogleFontName(asset.url);
          if (name && !manifest.googleFonts.find(f => f.name === name)) {
            manifest.googleFonts.push({ name, url: asset.url, note: 'À importer via next/font/google' });
            logger.asset('FONT', `[Google Fonts] ${name}`);
          }
          continue;
        }

        try {
          const fname = toKebabFilename(asset.url);

          if (IMG_EXT.test(asset.url) || asset.type === 'image') {
            const isIcon = /icon|favicon|logo/.test(asset.url);
            const ext  = getExt(asset.url) || 'jpg';
            const dest = `${fname}.${ext}`;
            const dir  = isIcon ? dirs.icons : dirs.images;
            await downloadFile(asset.url, path.join(dir, dest), USER_AGENT);
            manifest[isIcon ? 'icons' : 'images'].push({ url: asset.url, file: dest, alt: asset.alt || '' });
            logger.asset('IMAGE', dest);
          } else if (FONT_EXT.test(asset.url)) {
            const ext  = getExt(asset.url);
            const dest = `${fname}.${ext}`;
            await downloadFile(asset.url, path.join(dirs.fonts, dest), USER_AGENT);
            manifest.fonts.push({ url: asset.url, file: dest });
            logger.asset('FONT', dest);
          } else if (CSS_EXT.test(asset.url)) {
            const dest = `${fname}.css`;
            await downloadFile(asset.url, path.join(dirs.css, dest), USER_AGENT);
            manifest.css.push({ url: asset.url, file: dest });
          } else if (JS_EXT.test(asset.url)) {
            const dest = `${fname}.js`;
            await downloadFile(asset.url, path.join(dirs.js, dest), USER_AGENT);
            manifest.js.push({ url: asset.url, file: dest });
          } else if (VIDEO_EXT.test(asset.url)) {
            const ext  = getExt(asset.url) || 'mp4';
            const dest = `${fname}.${ext}`;
            await downloadFile(asset.url, path.join(dirs.videos, dest), USER_AGENT);
            manifest.videos.push({ url: asset.url, file: dest });
            logger.asset('VIDEO', dest);
          }
        } catch (err) {
          logger.warn(`Asset ignoré (${asset.url.slice(0, 60)}): ${err.message}`);
        }
      }
    } finally {
      await page.close();
    }
  }

  await writeJSON(path.join(outDir, 'analysis', 'assets-manifest.json'), manifest);
  return manifest;
}

function toKebabFilename(url) {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').filter(Boolean).pop() || 'asset';
    return base
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'asset';
  } catch {
    return 'asset';
  }
}

function getExt(url) {
  const m = url.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return m ? m[1].toLowerCase() : null;
}

function extractGoogleFontName(url) {
  const m = url.match(/family=([^&:]+)/);
  if (m) return decodeURIComponent(m[1].replace(/\+/g, ' ')).split(':')[0];
  return null;
}
