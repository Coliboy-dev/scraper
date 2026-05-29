import path from 'path';
import { writeJSON, writeText } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

export async function extractDesign({ url, browser, outDir }) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const raw = await page.evaluate(() => {
      const rgbToHex = rgb => {
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return null;
        return '#' + [m[1], m[2], m[3]]
          .map(n => parseInt(n).toString(16).padStart(2, '0'))
          .join('').toUpperCase();
      };

      // Color extraction — count occurrences across elements
      const colorCount = new Map();
      document.querySelectorAll('*').forEach(el => {
        const s = window.getComputedStyle(el);
        [s.color, s.backgroundColor, s.borderColor, s.outlineColor].forEach(c => {
          if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return;
          const hex = rgbToHex(c);
          if (hex && hex !== '#000000' && hex !== '#FFFFFF') {
            colorCount.set(hex, (colorCount.get(hex) || 0) + 1);
          }
        });
      });

      const colors = [...colorCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([hex]) => hex);

      // Typography for key selectors
      const typo = {};
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'small', 'li'].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        const s = window.getComputedStyle(el);
        typo[sel] = {
          fontFamily:    s.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
          fontSize:      s.fontSize,
          fontWeight:    s.fontWeight,
          lineHeight:    s.lineHeight,
          letterSpacing: s.letterSpacing,
          color:         rgbToHex(s.color),
        };
      });

      // CSS custom properties from :root
      const cssVars = {};
      try {
        Array.from(document.styleSheets).forEach(sheet => {
          try {
            Array.from(sheet.cssRules).forEach(rule => {
              if (rule.selectorText === ':root') {
                Array.from(rule.style).filter(p => p.startsWith('--')).forEach(prop => {
                  cssVars[prop] = rule.style.getPropertyValue(prop).trim();
                });
              }
            });
          } catch {}
        });
      } catch {}

      return { colors, typo, cssVars };
    });

    const semanticColors = buildSemanticColors(raw.colors);
    const designSystem = {
      colors:      semanticColors,
      rawColors:   raw.colors,
      typography:  raw.typo,
      cssVariables: raw.cssVars,
    };

    await writeJSON(path.join(outDir, 'analysis', 'design-system.json'), designSystem);
    await writeText(path.join(outDir, 'analysis', 'tailwind.config.ts'), buildTailwindConfig(semanticColors, raw.typo));
    await writeText(path.join(outDir, 'analysis', 'globals.css'), buildGlobalsCss(raw.cssVars, semanticColors, raw.typo));
    await writeText(path.join(outDir, 'analysis', 'design-system.md'), buildDesignDoc(designSystem));

    const fonts = [...new Set(Object.values(raw.typo).map(t => t.fontFamily))].filter(Boolean);
    logger.done(`Couleurs : ${raw.colors.length} extraites`);
    logger.done(`Polices : ${fonts.join(', ')}`);

    return designSystem;
  } finally {
    await page.close();
  }
}

const SEMANTIC_NAMES = [
  'primary', 'secondary', 'accent', 'background', 'surface',
  'text', 'border', 'muted', 'success', 'warning',
  'error', 'info', 'dark', 'light', 'highlight', 'neutral',
  'foreground', 'card', 'ring', 'input',
];

function buildSemanticColors(colors) {
  return colors.slice(0, SEMANTIC_NAMES.length).reduce((acc, hex, i) => {
    acc[SEMANTIC_NAMES[i]] = hex;
    return acc;
  }, {});
}

function buildTailwindConfig(colors, typo) {
  const fonts = [...new Set(Object.values(typo).map(t => t.fontFamily))].filter(Boolean);
  const fontLines = fonts
    .slice(0, 3)
    .map((f, i) => `      ${ ['sans', 'serif', 'mono'][i] || `font${i}` }: ['${f}', 'system-ui', 'sans-serif'],`)
    .join('\n');
  const colorLines = Object.entries(colors)
    .map(([k, v]) => `      ${k}: '${v}',`)
    .join('\n');

  return `import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
${colorLines}
      },
      fontFamily: {
${fontLines}
      },
    },
  },
  plugins: [],
}

export default config
`;
}

function buildGlobalsCss(cssVars, colors, typo) {
  const colorVarLines = Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`).join('\n');
  const cssVarLines   = Object.entries(cssVars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  const bodyFont = typo.p?.fontFamily || 'system-ui';
  const headFont = typo.h1?.fontFamily || bodyFont;

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
${colorVarLines}
${cssVarLines ? '\n  /* Variables CSS issues du site original */\n' + cssVarLines : ''}
}

@layer base {
  body {
    font-family: '${bodyFont}', system-ui, sans-serif;
    font-size: ${typo.p?.fontSize || '16px'};
    line-height: ${typo.p?.lineHeight || '1.6'};
    color: var(--color-text, #111111);
    background-color: var(--color-background, #ffffff);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: '${headFont}', system-ui, sans-serif;
    font-weight: ${typo.h1?.fontWeight || '700'};
    line-height: ${typo.h1?.lineHeight || '1.2'};
  }

  h1 { font-size: ${typo.h1?.fontSize || '2.5rem'}; }
  h2 { font-size: ${typo.h2?.fontSize || '2rem'}; }
  h3 { font-size: ${typo.h3?.fontSize || '1.5rem'}; }
  h4 { font-size: ${typo.h4?.fontSize || '1.25rem'}; }
}
`;
}

function buildDesignDoc(ds) {
  const colorRows = Object.entries(ds.colors)
    .map(([name, hex]) => `| \`${name}\` | \`${hex}\` |`)
    .join('\n');
  const typoRows = Object.entries(ds.typography)
    .map(([sel, t]) => `| \`${sel}\` | ${t.fontFamily} | ${t.fontSize} | ${t.fontWeight} |`)
    .join('\n');
  const cssVarLines = Object.entries(ds.cssVariables)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n');

  return `# Design System

## Couleurs

| Nom sémantique | HEX |
|---|---|
${colorRows}

## Typographie

| Élément | Font Family | Taille | Poids |
|---|---|---|---|
${typoRows}

## Variables CSS

\`\`\`css
${cssVarLines || '/* Aucune variable CSS détectée */'}
\`\`\`
`;
}
