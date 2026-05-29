import express from 'express';
import { spawn, execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { buildAuditPrompt } from './modules/build-audit-prompt.js';
import { generateVariants, variantsExist, getVariantTheme } from './modules/variants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Résolution robuste du path Windows, quel que soit le shell ───────────────
// Git Bash / WSL donnent des paths Unix (/c/Users/…) que Playwright ne comprend pas.
// On interroge cmd.exe directement pour avoir le vrai chemin Windows.
function getWindowsLocalAppData() {
  // 1. LOCALAPPDATA déjà présent et valide (PowerShell, CMD)
  if (process.env.LOCALAPPDATA && /^[A-Za-z]:/.test(process.env.LOCALAPPDATA)) {
    return process.env.LOCALAPPDATA;
  }
  // 2. Demander à cmd.exe (fonctionne depuis Git Bash, WSL, VSCode terminal)
  try {
    const result = execSync('cmd /c echo %LOCALAPPDATA%', { encoding: 'utf8' }).trim();
    if (result && /^[A-Za-z]:/.test(result)) return result;
  } catch {}
  // 3. Fallback : reconstruire depuis USERPROFILE ou homedir
  const profile = process.env.USERPROFILE || os.homedir().replace(/^\/([a-z])\//i, '$1:\\').replace(/\//g, '\\');
  return path.win32.join(profile, 'AppData', 'Local');
}

const WINDOWS_LOCALAPPDATA   = getWindowsLocalAppData();
const PLAYWRIGHT_BROWSERS_PATH = path.win32.join(WINDOWS_LOCALAPPDATA, 'ms-playwright');
console.log(`[server] PLAYWRIGHT_BROWSERS_PATH → ${PLAYWRIGHT_BROWSERS_PATH}`);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(ROOT, 'output')));

const jobs = new Map();
let jobCounter = 0;

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
function stripAnsi(str) {
  return str.replace(ANSI_RE, '');
}

// POST /api/scrape — lance un job
app.post('/api/scrape', (req, res) => {
  const { url, depth = 1, screenshots = true, zip = true } = req.body;

  if (!url) return res.status(400).json({ error: 'URL requise' });

  const jobId = String(++jobCounter);
  const args = ['src/index.js', url, `--depth=${depth}`];
  if (!screenshots) args.push('--no-screenshots');
  if (!zip) args.push('--no-zip');

  const job = {
    id: jobId,
    url,
    depth,
    startedAt: new Date().toISOString(),
    status: 'running',
    lines: [],
    clients: new Set(),
  };
  jobs.set(jobId, job);

  const child = spawn('node', args, {
    cwd: ROOT,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH,
    },
  });

  const broadcast = (event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    job.clients.forEach(client => client.write(payload));
  };

  const handleLine = (line) => {
    const clean = stripAnsi(line);
    if (!clean.trim()) return;
    job.lines.push(clean);
    broadcast('log', { line: clean });
  };

  let stdoutBuf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    stdoutBuf += chunk;
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop();
    lines.forEach(handleLine);
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    const lines = stripAnsi(chunk).split('\n');
    lines
      .map(l => l.trim())
      .filter(l => l && !l.includes('DevTools') && !l.includes('--remote-debugging') && (l.includes('rror') || l.includes('FATAL') || l.includes('Erreur')))
      .forEach(l => handleLine(`✗ ${l}`));
  });

  child.on('close', code => {
    if (stdoutBuf.trim()) handleLine(stdoutBuf);
    job.status = code === 0 ? 'done' : 'error';
    job.exitCode = code;
    job.endedAt = new Date().toISOString();

    try {
      const domain = new URL(url).hostname;
      job.domain = domain;
    } catch {}

    if (code === 0 && job.domain) {
      // Auto-generate mockup after successful scrape
      broadcast('log', { line: '' });
      broadcast('log', { line: '⚡ Génération du mockup en cours…' });

      const mockupChild = spawn('node', ['src/mockup.js', job.domain], { cwd: ROOT });
      let mockupOut = '';

      mockupChild.stdout.setEncoding('utf8');
      mockupChild.stdout.on('data', chunk => {
        mockupOut += chunk;
        stripAnsi(chunk).split('\n').filter(l => l.trim()).forEach(l => broadcast('log', { line: l }));
      });

      mockupChild.on('close', mockupCode => {
        job.mockupReady = mockupCode === 0;
        broadcast('done', { status: job.status, exitCode: code, domain: job.domain, mockupReady: job.mockupReady });
        job.clients.forEach(client => client.end());
        job.clients.clear();
      });
    } else {
      broadcast('done', { status: job.status, exitCode: code, domain: job.domain, mockupReady: false });
      job.clients.forEach(client => client.end());
      job.clients.clear();
    }
  });

  res.json({ jobId });
});

// GET /api/stream/:jobId — SSE live stream
app.get('/api/stream/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job introuvable' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Replay existing lines
  for (const line of job.lines) {
    res.write(`event: log\ndata: ${JSON.stringify({ line })}\n\n`);
  }

  if (job.status !== 'running') {
    res.write(`event: done\ndata: ${JSON.stringify({ status: job.status, exitCode: job.exitCode, domain: job.domain })}\n\n`);
    res.end();
    return;
  }

  job.clients.add(res);
  req.on('close', () => job.clients.delete(res));
});

// GET /api/history — liste les dossiers output/
app.get('/api/history', async (_req, res) => {
  const outputDir = path.join(ROOT, 'output');
  if (!existsSync(outputDir)) return res.json([]);

  try {
    const entries = await readdir(outputDir);
    const results = await Promise.all(entries.map(async domain => {
      const domainPath = path.join(outputDir, domain);
      const s = await stat(domainPath).catch(() => null);
      if (!s?.isDirectory()) return null;
      const hasReport  = existsSync(path.join(domainPath, 'analysis', 'report.md'));
      const hasMockup  = existsSync(path.join(domainPath, 'mockup', 'index.html'));
      const hasZip     = (await readdir(path.join(ROOT, 'output')).catch(() => []))
        .some(f => f.startsWith(domain) && f.endsWith('.tar.gz'));
      const hasVariants = variantsExist(domainPath);
      return { domain, date: s.mtime.toISOString(), hasReport, hasMockup, hasZip, hasVariants };
    }));
    res.json(results.filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch {
    res.json([]);
  }
});

// GET /api/report/:domain — contenu de report.md
app.get('/api/report/:domain', async (req, res) => {
  const p = path.join(ROOT, 'output', req.params.domain, 'analysis', 'report.md');
  try {
    const content = await readFile(p, 'utf8');
    res.json({ content });
  } catch {
    res.status(404).json({ error: 'Rapport introuvable' });
  }
});

// GET /api/report/:domain/download — télécharge report.md
app.get('/api/report/:domain/download', async (req, res) => {
  const p = path.join(ROOT, 'output', req.params.domain, 'analysis', 'report.md');
  try {
    res.download(p, `report-${req.params.domain}.md`);
  } catch {
    res.status(404).json({ error: 'Rapport introuvable' });
  }
});

// GET /api/audit-prompt/:domain — génère le prompt synthétique d'audit
app.get('/api/audit-prompt/:domain', async (req, res) => {
  const analysisDir = path.join(ROOT, 'output', req.params.domain, 'analysis');
  try {
    const prompt = await buildAuditPrompt(req.params.domain, analysisDir, { readFile });
    res.json({ content: prompt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/theme/:domain — sauvegarde le theme.json dans le dossier mockup
app.post('/api/theme/:domain', async (req, res) => {
  const dir = path.join(ROOT, 'output', req.params.domain, 'mockup');
  try {
    await writeFile(path.join(dir, 'theme.json'), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Impossible de sauvegarder' });
  }
});

// GET /api/theme/:domain — charge le theme.json sauvegardé
app.get('/api/theme/:domain', async (req, res) => {
  const p = path.join(ROOT, 'output', req.params.domain, 'mockup', 'theme.json');
  try {
    const content = await readFile(p, 'utf8');
    res.json(JSON.parse(content));
  } catch {
    res.status(404).json({ error: 'Thème introuvable' });
  }
});

// GET /api/cross-theme/:domain — extrait thème depuis un domaine scrapé
app.get('/api/cross-theme/:domain', async (req, res) => {
  const domain = req.params.domain;

  // 1. Thème sauvegardé depuis le Studio
  try {
    const raw = await readFile(path.join(ROOT, 'output', domain, 'mockup', 'theme.json'), 'utf8');
    const theme = JSON.parse(raw);
    if (theme.colors || theme.typography) {
      return res.json({ source: 'saved', colors: theme.colors, typography: theme.typography });
    }
  } catch {}

  // 2. Synthèse depuis design-system.json extrait par le scraper
  try {
    const ds = JSON.parse(await readFile(path.join(ROOT, 'output', domain, 'analysis', 'design-system.json'), 'utf8'));
    const c = ds.colors || {};
    const t = ds.typography || {};
    const pick = (obj, ...keys) => { for (const k of keys) if (obj[k]) return obj[k]; return null; };
    const cleanFont = v => (v || 'Inter').replace(/['"]/g, '').trim();

    return res.json({
      source: 'analysis',
      colors: {
        primary:    pick(c,'primary','brand','accent')           || '#6c8ef5',
        secondary:  pick(c,'secondary')                          || '#1e293b',
        accent:     pick(c,'accent','cta','primary')             || '#f59e0b',
        background: pick(c,'background','bg')                    || '#ffffff',
        surface:    pick(c,'surface','card')                     || '#f9fafb',
        text:       pick(c,'text','foreground')                  || '#111111',
        muted:      pick(c,'muted','gray')                       || '#6b7280',
        border:     pick(c,'border','divider')                   || '#e5e7eb',
      },
      typography: {
        headingFont:   cleanFont(t.h1?.fontFamily || t.h2?.fontFamily),
        bodyFont:      cleanFont(t.p?.fontFamily  || t.body?.fontFamily),
        headingWeight: String(t.h1?.fontWeight || t.h2?.fontWeight || '700').replace(/\D/g,'') || '700',
        baseFontSize:  '16px',
      },
    });
  } catch {}

  res.status(404).json({ error: `Domaine "${domain}" introuvable — scrapez ce site d'abord.` });
});

// POST /api/variants/:domain — génère les 3 variantes
app.post('/api/variants/:domain', async (req, res) => {
  const domain = req.params.domain;
  const outputDir = path.join(ROOT, 'output', domain);
  if (!existsSync(path.join(outputDir, 'mockup', 'index.html'))) {
    return res.status(404).json({ error: 'Mockup introuvable — génère-le d\'abord.' });
  }
  try {
    await generateVariants(domain, outputDir);
    res.json({ ok: true, variants: ['a', 'b', 'c'] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/variants/:domain — liste les variantes existantes
app.get('/api/variants/:domain', (req, res) => {
  const outputDir = path.join(ROOT, 'output', req.params.domain);
  const exists = variantsExist(outputDir);
  res.json({ exists, variants: exists ? ['a', 'b', 'c'] : [] });
});

// GET /api/variant-theme/:domain/:id — thème JSON d'une variante
app.get('/api/variant-theme/:domain/:id', (req, res) => {
  const theme = getVariantTheme(req.params.id);
  if (!theme) return res.status(404).json({ error: 'Variante introuvable' });
  res.json(theme);
});

// GET /compare/:domain — page de comparaison variantes A/B/C
app.get('/compare/:domain', (_req, res) => {
  res.sendFile(path.join(ROOT, 'output', _req.params.domain, 'mockup', 'compare.html'));
});

// GET /studio/:domain — Mockup Designer Studio (single domain)
app.get('/studio/:domain', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'studio.html'));
});

// GET /compare-studio/:ref/:client — Design Studio Comparatif
app.get('/compare-studio/:ref/:client', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'compare-studio.html'));
});

// GET /api/compare-data/:ref/:client — données des deux domaines pour le studio comparatif
app.get('/api/compare-data/:ref/:client', async (req, res) => {
  const { ref, client } = req.params;
  const load = async (domain, file) => {
    try { return JSON.parse(await readFile(path.join(ROOT, 'output', domain, 'analysis', file), 'utf8')); }
    catch { return {}; }
  };
  const hasMockup = (domain) => existsSync(path.join(ROOT, 'output', domain, 'mockup', 'index.html'));

  const [refDesign, refSitemap, refSections, clientDesign, clientSitemap, clientSections, clientTheme] =
    await Promise.all([
      load(ref,    'design-system.json'),
      load(ref,    'sitemap.json'),
      load(ref,    'sections.json'),
      load(client, 'design-system.json'),
      load(client, 'sitemap.json'),
      load(client, 'sections.json'),
      load(client, path.join('..', 'mockup', 'theme.json')),  // saved theme if any
    ]);

  res.json({
    ref:    { domain: ref,    design: refDesign,    sitemap: Array.isArray(refSitemap)    ? refSitemap    : [], sections: refSections,    hasMockup: hasMockup(ref) },
    client: { domain: client, design: clientDesign, sitemap: Array.isArray(clientSitemap) ? clientSitemap : [], sections: clientSections, hasMockup: hasMockup(client), savedTheme: clientTheme },
  });
});

// GET /api/sitemap/:domain — retourne sitemap.json
app.get('/api/sitemap/:domain', async (req, res) => {
  const p = path.join(ROOT, 'output', req.params.domain, 'analysis', 'sitemap.json');
  try {
    const content = await readFile(p, 'utf8');
    res.json(JSON.parse(content));
  } catch {
    res.status(404).json({ error: 'Sitemap introuvable' });
  }
});

// POST /api/mockup — génère le mockup HTML pour un domaine déjà scrapé
app.post('/api/mockup', (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'Domain requis' });

  const child = spawn('node', ['src/mockup.js', domain], { cwd: ROOT });
  let out = '';
  child.stdout.on('data', d => { out += stripAnsi(d.toString()); });
  child.stderr.on('data', d => { out += stripAnsi(d.toString()); });
  child.on('close', code => {
    if (code === 0) {
      res.json({ ok: true, path: `output/${domain}/mockup/index.html` });
    } else {
      res.status(500).json({ error: out.slice(-300) });
    }
  });
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`\n  Site Scraper UI  →  http://localhost:${PORT}\n  Ctrl+C pour arreter\n`);
});
