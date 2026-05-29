import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const VARIANTS = [
  {
    id: 'a',
    label: 'Professionnel',
    emoji: '🏢',
    colors: {
      primary: '#1a56db',
      secondary: '#1e429f',
      accent: '#3f83f8',
      background: '#ffffff',
      surface: '#f8faff',
      text: '#111827',
      muted: '#6b7280',
      border: '#e5e7eb',
    },
    fonts: { title: 'Plus Jakarta Sans', body: 'Open Sans', weight: '700' },
    googleFonts: 'Plus+Jakarta+Sans:wght@400;600;700&family=Open+Sans:wght@400;600',
    shape: { radius: '6px', radiusLg: '10px', radiusBtn: '6px' },
    spacing: { section: '4rem', container: '1200px' },
  },
  {
    id: 'b',
    label: 'Premium',
    emoji: '👑',
    colors: {
      primary: '#c9a227',
      secondary: '#a07c1c',
      accent: '#e8c14a',
      background: '#0f1420',
      surface: '#161c2d',
      text: '#f0e6cc',
      muted: '#8a7a5a',
      border: '#2a3050',
    },
    fonts: { title: 'Cormorant', body: 'Inter', weight: '600' },
    googleFonts: 'Cormorant:wght@300;400;600&family=Inter:wght@300;400',
    shape: { radius: '4px', radiusLg: '6px', radiusBtn: '4px' },
    spacing: { section: '6rem', container: '1100px' },
  },
  {
    id: 'c',
    label: 'Chaleureux local',
    emoji: '🏡',
    colors: {
      primary: '#c0622d',
      secondary: '#9a4d22',
      accent: '#e07b3c',
      background: '#fdf6ee',
      surface: '#fff9f2',
      text: '#2c1810',
      muted: '#8a6a5a',
      border: '#e8d5c4',
    },
    fonts: { title: 'Playfair Display', body: 'Lato', weight: '700' },
    googleFonts: 'Playfair+Display:wght@400;700&family=Lato:wght@400;700',
    shape: { radius: '12px', radiusLg: '20px', radiusBtn: '12px' },
    spacing: { section: '4rem', container: '1100px' },
  },
];

function buildCssOverride(v) {
  const c = v.colors;
  return `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${v.googleFonts}&display=swap">
  <style id="variant-override">
    :root {
      --color-primary:    ${c.primary};
      --color-secondary:  ${c.secondary};
      --color-accent:     ${c.accent};
      --color-background: ${c.background};
      --color-surface:    ${c.surface};
      --color-text:       ${c.text};
      --color-muted:      ${c.muted};
      --color-border:     ${c.border};
      --radius:           ${v.shape.radius};
      --radius-lg:        ${v.shape.radiusLg};
      --section-padding:  ${v.spacing.section};
      --container-width:  ${v.spacing.container};
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${v.fonts.title}', serif;
      font-weight: ${v.fonts.weight};
    }
    body {
      font-family: '${v.fonts.body}', sans-serif;
      background-color: ${c.background};
      color: ${c.text};
    }
  </style>
  </head>`;
}

function buildCompareHtml(domain) {
  const rows = VARIANTS.map(v => `
    <div class="variant-col">
      <div class="variant-header">
        <span class="variant-emoji">${v.emoji}</span>
        <span class="variant-name">${v.label}</span>
        <button class="choose-btn" onclick="chooseVariant('${v.id}')">✓ Choisir</button>
      </div>
      <iframe src="/output/${domain}/mockup/variant-${v.id}.html" class="variant-frame" title="${v.label}"></iframe>
    </div>`).join('');

  const themes = VARIANTS.map(v => `'${v.id}': ${JSON.stringify({
    colors: {
      primary: v.colors.primary,
      secondary: v.colors.secondary,
      accent: v.colors.accent,
      background: v.colors.background,
      surface: v.colors.surface,
      text: v.colors.text,
      muted: v.colors.muted,
      border: v.colors.border,
    },
    typography: {
      headingFont: v.fonts.title,
      bodyFont: v.fonts.body,
      headingWeight: v.fonts.weight,
      googleFonts: [v.googleFonts],
    },
    layout: {
      borderRadius: v.shape.radius,
      borderRadiusLg: v.shape.radiusLg,
      borderRadiusBtn: v.shape.radiusBtn,
      sectionSpacing: v.spacing.section,
      maxWidth: v.spacing.container,
    },
  })}`).join(',\n  ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comparaison variantes — ${domain}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0b0d14;
      color: #e2e8f0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid #2a2e42;
      flex-shrink: 0;
    }
    header h1 { font-size: 14px; font-weight: 600; }
    header p { font-size: 12px; color: #94a3b8; }
    .domain-badge {
      background: #1a1d2a;
      border: 1px solid #2a2e42;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 12px;
      color: #6c8ef5;
      font-weight: 600;
    }
    .back-btn {
      margin-left: auto;
      text-decoration: none;
      color: #94a3b8;
      font-size: 12px;
      border: 1px solid #2a2e42;
      border-radius: 6px;
      padding: 5px 12px;
      transition: all .15s;
    }
    .back-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
      flex: 1;
      overflow: hidden;
    }
    .variant-col {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #2a2e42;
      overflow: hidden;
    }
    .variant-col:last-child { border-right: none; }
    .variant-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid #2a2e42;
      background: #13161f;
      flex-shrink: 0;
    }
    .variant-emoji { font-size: 16px; }
    .variant-name { font-size: 13px; font-weight: 600; flex: 1; }
    .choose-btn {
      background: #6c8ef5;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      padding: 5px 12px;
      cursor: pointer;
      transition: background .15s, transform .1s;
    }
    .choose-btn:hover { background: #5b75d9; transform: translateY(-1px); }
    .choose-btn.chosen { background: #4ade80; color: #0f1117; }
    .variant-frame {
      flex: 1;
      border: none;
      width: 100%;
    }
    .chosen-banner {
      display: none;
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #4ade80;
      color: #0f1117;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 8px 32px rgba(74,222,128,.3);
      gap: 12px;
      align-items: center;
      z-index: 999;
    }
    .chosen-banner.visible { display: flex; }
    .chosen-banner a {
      color: #0f1117;
      text-decoration: none;
      border-bottom: 1.5px solid rgba(0,0,0,.3);
      font-weight: 700;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Comparaison des 3 variantes</h1>
      <p>Choisissez le style qui correspond le mieux au projet</p>
    </div>
    <span class="domain-badge">${domain}</span>
    <a class="back-btn" href="/studio/${domain}" target="_blank">🎨 Ouvrir Studio</a>
  </header>
  <div class="grid">
    ${rows}
  </div>
  <div class="chosen-banner" id="chosen-banner">
    <span id="chosen-label">✓ Variante choisie</span>
    <a href="/studio/${domain}" target="_blank">→ Ouvrir le Studio</a>
  </div>
  <script>
    const DOMAIN = '${domain}';
    const THEMES = {
  ${themes}
    };
    function chooseVariant(id) {
      const theme = THEMES[id];
      if (!theme) return;
      localStorage.setItem('mockup-theme-' + DOMAIN, JSON.stringify(theme));
      document.querySelectorAll('.choose-btn').forEach(b => b.classList.remove('chosen'));
      const btn = document.querySelector(\`.choose-btn[onclick="chooseVariant('\${id}')"]\`);
      if (btn) btn.classList.add('chosen');
      const variant = {a:'Professionnel 🏢',b:'Premium 👑',c:'Chaleureux local 🏡'}[id];
      document.getElementById('chosen-label').textContent = '✓ ' + variant + ' — thème appliqué au Studio';
      document.getElementById('chosen-banner').classList.add('visible');
    }
  <\/script>
</body>
</html>`;
}

export async function generateVariants(domain, outputDir) {
  const mockupPath = path.join(outputDir, 'mockup', 'index.html');
  const baseHtml = await readFile(mockupPath, 'utf8');

  for (const v of VARIANTS) {
    const cssBlock = buildCssOverride(v);
    const variantHtml = baseHtml.replace('</head>', cssBlock);
    await writeFile(path.join(outputDir, 'mockup', `variant-${v.id}.html`), variantHtml, 'utf8');
  }

  const compareHtml = buildCompareHtml(domain);
  await writeFile(path.join(outputDir, 'mockup', 'compare.html'), compareHtml, 'utf8');
}

export function variantsExist(outputDir) {
  return VARIANTS.every(v => existsSync(path.join(outputDir, 'mockup', `variant-${v.id}.html`)));
}

export function getVariantTheme(id) {
  const v = VARIANTS.find(x => x.id === id);
  if (!v) return null;
  return {
    colors: { ...v.colors },
    typography: {
      headingFont: v.fonts.title,
      bodyFont: v.fonts.body,
      headingWeight: v.fonts.weight,
      googleFonts: [v.googleFonts],
    },
    layout: {
      borderRadius: v.shape.radius,
      borderRadiusLg: v.shape.radiusLg,
      borderRadiusBtn: v.shape.radiusBtn,
      sectionSpacing: v.spacing.section,
      maxWidth: v.spacing.container,
    },
  };
}
