const GOOGLE_FONTS = [
  'Inter','Plus Jakarta Sans','Manrope','DM Sans','Nunito',
  'Poppins','Raleway','Montserrat','Lato','Open Sans',
  'Quicksand','Josefin Sans','Sora','Outfit','Space Grotesk',
  'Jost','Syne','Lexend','Source Sans 3',
  'Playfair Display','Merriweather','Lora','EB Garamond','Cormorant',
  'Cormorant Garamond','Libre Baskerville','Fraunces','Bodoni Moda',
  'Abril Fatface','Oswald','Bebas Neue','Anton','Righteous',
];

export function buildEditorPanel(designSystem) {
  const c = designSystem?.colors || {};
  const t = designSystem?.typography || {};
  const headFont = (t.h1?.fontFamily || t.h2?.fontFamily || 'Inter').replace(/['"]/g, '').trim();
  const bodyFont = (t.p?.fontFamily  || t.body?.fontFamily || 'Inter').replace(/['"]/g, '').trim();

  const fontOpts     = GOOGLE_FONTS.map(f => `<option value="${f}"${f === headFont ? ' selected' : ''}>${f}</option>`).join('');
  const bodyFontOpts = GOOGLE_FONTS.map(f => `<option value="${f}"${f === bodyFont ? ' selected' : ''}>${f}</option>`).join('');

  const colorRow = (label, varName, fallback) =>
    `<div class="me-row">
      <label>${label}</label>
      <input type="color" data-var="${varName}" value="${c[varName.replace('--color-','')] || fallback}">
    </div>`;

  return `
<!-- ═══ MOCKUP EDITOR ═══ -->
<button id="me-toggle" aria-label="Personnaliser le thème" title="Personnaliser">✏️</button>

<div id="me-panel" role="dialog" aria-label="Éditeur de thème" aria-hidden="true">

  <div id="me-header">
    <div id="me-header-global">
      <span>✏️ Mockup Studio</span>
      <button id="me-close" aria-label="Fermer">✕</button>
    </div>
    <div id="me-header-ctx" hidden>
      <button id="me-ctx-back" aria-label="Retour">← Retour</button>
      <span id="me-ctx-title">Section</span>
      <button id="me-close-ctx" aria-label="Fermer">✕</button>
    </div>
  </div>

  <div id="me-tabs" role="tablist">
    <button class="me-tab active" role="tab" aria-selected="true"  data-tab="colors">🎨</button>
    <button class="me-tab"        role="tab" aria-selected="false" data-tab="typo">✍️</button>
    <button class="me-tab"        role="tab" aria-selected="false" data-tab="layout">📐</button>
    <button class="me-tab"        role="tab" aria-selected="false" data-tab="sections">🗂</button>
  </div>
  <div id="me-tabs-tooltip">
    <span data-for="colors">Couleurs</span>
    <span data-for="typo">Typographie</span>
    <span data-for="layout">Mise en page</span>
    <span data-for="sections">Sections</span>
  </div>

  <div id="me-body">

    <!-- COULEURS -->
    <div class="me-tab-content active" id="tab-colors">
      ${colorRow('Couleur primaire',  '--color-primary',    '#6c8ef5')}
      ${colorRow('Couleur secondaire','--color-secondary',  '#1e293b')}
      ${colorRow('Accent / CTA',      '--color-accent',     '#f59e0b')}
      ${colorRow('Fond de page',      '--color-background', '#ffffff')}
      ${colorRow('Fond des cards',    '--color-surface',    '#f9fafb')}
      ${colorRow('Texte principal',   '--color-text',       '#111111')}
      ${colorRow('Texte secondaire',  '--color-muted',      '#6b7280')}
      ${colorRow('Bordures',          '--color-border',     '#e5e7eb')}
    </div>

    <!-- TYPOGRAPHIE -->
    <div class="me-tab-content" id="tab-typo">
      <div class="me-group">
        <label class="me-label">Police des titres</label>
        <select data-font="head">${fontOpts}</select>
      </div>
      <div class="me-group">
        <label class="me-label">Police du corps</label>
        <select data-font="body">${bodyFontOpts}</select>
      </div>
      <div class="me-group">
        <label class="me-label">Taille de base <span class="me-val" id="disp-fsize">16px</span></label>
        <input type="range" min="13" max="20" value="16" step="1" id="rng-fsize">
      </div>
      <div class="me-group">
        <label class="me-label">Graisse des titres</label>
        <select id="sel-weight">
          <option value="400">Regular (400)</option>
          <option value="500">Medium (500)</option>
          <option value="600">Semi-Bold (600)</option>
          <option value="700" selected>Bold (700)</option>
          <option value="800">Extra-Bold (800)</option>
          <option value="900">Black (900)</option>
        </select>
      </div>
    </div>

    <!-- MISE EN PAGE -->
    <div class="me-tab-content" id="tab-layout">
      <div class="me-group">
        <label class="me-label">Arrondi des coins <span class="me-val" id="disp-radius">8px</span></label>
        <input type="range" min="0" max="32" value="8" step="2" id="rng-radius">
      </div>
      <div class="me-group">
        <label class="me-label">Espacement sections <span class="me-val" id="disp-spacing">5rem</span></label>
        <input type="range" min="2" max="10" value="5" step="1" id="rng-spacing">
      </div>
      <div class="me-group">
        <label class="me-label">Largeur max <span class="me-val" id="disp-width">1200px</span></label>
        <input type="range" min="800" max="1600" value="1200" step="100" id="rng-width">
      </div>
      <div class="me-group">
        <label class="me-label">Style des boutons</label>
        <div class="me-btn-styles">
          <button class="me-sty active" data-r="8px">Arrondi</button>
          <button class="me-sty"        data-r="4px">Carré</button>
          <button class="me-sty"        data-r="999px">Pill</button>
        </div>
      </div>
      <div class="me-group">
        <label class="me-label">Style du header</label>
        <select id="sel-header">
          <option value="light">Clair (fond blanc)</option>
          <option value="primary">Couleur primaire</option>
          <option value="dark">Foncé (#111)</option>
          <option value="transparent">Transparent</option>
        </select>
      </div>
    </div>

    <!-- SECTIONS -->
    <div class="me-tab-content" id="tab-sections">
      <p class="me-hint" id="sections-hint">Clique sur une section dans la page pour la modifier, ou utilise les contrôles ci-dessous.</p>
      <div id="me-sections-list">
        <!-- built dynamically by JS -->
        <p class="me-empty" id="me-sections-empty">Chargement des sections…</p>
      </div>
    </div>

    <!-- CONTEXTUAL PANEL (section-specific) -->
    <div class="me-tab-content" id="tab-ctx" hidden>
      <div id="me-ctx-confidence"></div>
      <div class="me-group" id="me-ctx-variants">
        <label class="me-label">Mise en page</label>
        <div id="me-ctx-variant-btns" class="me-variant-btns"></div>
      </div>
      <div class="me-group" id="me-ctx-visibility">
        <label class="me-label">Visibilité</label>
        <label class="me-toggle-label">
          <input type="checkbox" id="me-ctx-visible-chk" checked>
          <span>Afficher cette section</span>
        </label>
      </div>
    </div>

  </div><!-- /me-body -->

  <div id="me-footer">
    <button id="me-btn-reset">↺ Réinit.</button>
    <button id="me-btn-export">⬇ Exporter</button>
  </div>
  <div id="me-save-status"></div>

</div><!-- /me-panel -->

<style>
/* ── Toggle button ─────────────────────────────────────────────────────── */
#me-toggle {
  position:fixed; bottom:24px; right:24px; z-index:9999;
  width:52px; height:52px; border-radius:50%;
  background:#6c8ef5; color:#fff; border:none;
  display:flex; align-items:center; justify-content:center;
  font-size:22px; cursor:pointer;
  box-shadow:0 4px 20px rgba(108,142,245,.5);
  transition:transform .2s, box-shadow .2s;
}
#me-toggle:hover { transform:scale(1.1); box-shadow:0 6px 24px rgba(108,142,245,.65); }

/* ── Panel shell ───────────────────────────────────────────────────────── */
#me-panel {
  position:fixed; top:0; right:-340px; z-index:9998;
  width:320px; height:100dvh;
  background:#1a1d27; border-left:1px solid #2e3347;
  display:flex; flex-direction:column;
  box-shadow:-8px 0 32px rgba(0,0,0,.4);
  transition:right .3s cubic-bezier(.4,0,.2,1);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:13px; color:#e2e8f0;
}
#me-panel.open { right:0; }

/* ── Header ────────────────────────────────────────────────────────────── */
#me-header { border-bottom:1px solid #2e3347; flex-shrink:0; }
#me-header-global, #me-header-ctx {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px; font-weight:600; font-size:13px;
}
#me-header-ctx { background:#1e2236; }
#me-ctx-back {
  background:none; border:none; color:#6c8ef5; font-size:12px; font-weight:600;
  cursor:pointer; padding:4px 8px; border-radius:4px; flex-shrink:0;
}
#me-ctx-back:hover { background:#2e3347; }
#me-ctx-title { flex:1; text-align:center; font-size:13px; color:#e2e8f0; }
#me-close, #me-close-ctx {
  background:none; border:none; color:#94a3b8;
  font-size:18px; cursor:pointer; padding:4px 8px; border-radius:4px; line-height:1;
}
#me-close:hover, #me-close-ctx:hover { background:#2e3347; color:#e2e8f0; }

/* ── Tabs ──────────────────────────────────────────────────────────────── */
#me-tabs { display:flex; border-bottom:1px solid #2e3347; flex-shrink:0; }
.me-tab {
  flex:1; padding:10px 4px; background:none; border:none;
  color:#94a3b8; font-size:16px; cursor:pointer;
  border-bottom:2px solid transparent;
  transition:color .15s, border-color .15s;
}
.me-tab.active { color:#6c8ef5; border-bottom-color:#6c8ef5; }
.me-tab:hover:not(.active) { color:#e2e8f0; }

#me-tabs-tooltip { display:flex; padding:4px 0 0; flex-shrink:0; }
#me-tabs-tooltip span { flex:1; text-align:center; font-size:9px; color:#4a5568; text-transform:uppercase; letter-spacing:.04em; }

/* ── Body ──────────────────────────────────────────────────────────────── */
#me-body { flex:1; overflow-y:auto; padding:16px 20px; }
#me-body::-webkit-scrollbar { width:4px; }
#me-body::-webkit-scrollbar-thumb { background:#2e3347; border-radius:2px; }

.me-tab-content { display:none; }
.me-tab-content.active { display:block; }

/* ── Color rows ────────────────────────────────────────────────────────── */
.me-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:12px; }
.me-row label { color:#b0bec5; font-size:13px; flex:1; }
.me-row input[type="color"] { width:44px; height:32px; border:1px solid #2e3347; border-radius:6px; cursor:pointer; padding:2px 3px; background:#222534; flex-shrink:0; }

/* ── Groups ────────────────────────────────────────────────────────────── */
.me-group { margin-bottom:18px; }
.me-label { display:flex; justify-content:space-between; align-items:center; color:#b0bec5; margin-bottom:8px; font-size:13px; }
.me-val { color:#6c8ef5; font-weight:600; font-size:12px; }

.me-group select {
  width:100%; background:#222534; border:1px solid #2e3347;
  border-radius:6px; padding:8px 10px; color:#e2e8f0;
  font-size:13px; cursor:pointer; outline:none; transition:border-color .15s;
}
.me-group select:focus { border-color:#6c8ef5; }
.me-group input[type="range"] { width:100%; accent-color:#6c8ef5; cursor:pointer; }

/* ── Button style picks ────────────────────────────────────────────────── */
.me-btn-styles { display:flex; gap:8px; }
.me-sty {
  flex:1; padding:8px 4px; background:#222534; border:1px solid #2e3347;
  border-radius:6px; color:#94a3b8; font-size:12px; cursor:pointer;
  transition:all .15s; font-weight:500;
}
.me-sty.active { background:rgba(108,142,245,.15); border-color:#6c8ef5; color:#6c8ef5; }
.me-sty:hover:not(.active) { border-color:#6c8ef5; color:#e2e8f0; }

/* ── Sections list ─────────────────────────────────────────────────────── */
.me-hint { font-size:11px; color:#4a5568; line-height:1.5; margin-bottom:14px; padding:10px; background:#111520; border-radius:6px; border:1px solid #2e3347; }
.me-empty { color:#4a5568; font-size:12px; text-align:center; padding:2rem 0; }

.me-section-row {
  display:flex; align-items:center; gap:8px; margin-bottom:6px;
  padding:10px 12px; border-radius:8px; border:1px solid #2e3347;
  background:#111520; cursor:pointer; transition:border-color .15s, background .15s;
  position:relative;
}
.me-section-row:hover { border-color:#6c8ef5; background:#1a1f30; }
.me-section-row.me-selected { border-color:#6c8ef5; background:#1a1f30; }
.me-section-row__icon { font-size:14px; flex-shrink:0; width:20px; text-align:center; }
.me-section-row__label { flex:1; font-size:12px; font-weight:600; color:#e2e8f0; }
.me-section-row__conf { font-size:10px; color:#4a5568; flex-shrink:0; }
.me-section-row__eye {
  background:none; border:none; cursor:pointer; padding:2px 6px;
  font-size:14px; opacity:.5; transition:opacity .15s; line-height:1;
  flex-shrink:0;
}
.me-section-row__eye:hover { opacity:1; }
.me-section-row--hidden { opacity:.45; }
.me-section-row--hidden .me-section-row__label { text-decoration:line-through; color:#6b7280; }

/* ── Variant buttons ───────────────────────────────────────────────────── */
.me-variant-btns { display:flex; flex-direction:column; gap:6px; }
.me-variant-btn {
  width:100%; padding:9px 12px; background:#222534; border:1px solid #2e3347;
  border-radius:6px; color:#94a3b8; font-size:12px; font-weight:600; cursor:pointer;
  transition:all .15s; text-align:left; display:flex; align-items:center; justify-content:space-between;
}
.me-variant-btn.active { background:rgba(108,142,245,.15); border-color:#6c8ef5; color:#e2e8f0; }
.me-variant-btn.active::after { content:'✓'; color:#6c8ef5; font-weight:700; }
.me-variant-btn:hover:not(.active) { border-color:#4a5568; color:#e2e8f0; }

/* ── Contextual panel ──────────────────────────────────────────────────── */
#me-ctx-confidence { font-size:11px; color:#4a5568; margin-bottom:14px; padding:8px 10px; background:#111520; border-radius:6px; border:1px solid #2e3347; }
#me-ctx-confidence strong { color:#6c8ef5; }

.me-toggle-label { display:flex; align-items:center; gap:8px; cursor:pointer; color:#b0bec5; }
.me-toggle-label input[type="checkbox"] { accent-color:#6c8ef5; width:16px; height:16px; cursor:pointer; }

/* ── Confidence bar ────────────────────────────────────────────────────── */
.me-conf-bar { width:100%; height:4px; background:#2e3347; border-radius:2px; margin-top:6px; overflow:hidden; }
.me-conf-bar__fill { height:100%; border-radius:2px; background:#6c8ef5; transition:width .3s; }
.me-conf-bar__fill.high { background:#22c55e; }
.me-conf-bar__fill.med  { background:#f59e0b; }
.me-conf-bar__fill.low  { background:#ef4444; }

/* ── Footer ────────────────────────────────────────────────────────────── */
#me-save-status {
  padding:4px 20px 8px; font-size:10px; text-align:right; color:#4a5568;
  min-height:18px; flex-shrink:0; font-family:-apple-system,sans-serif;
  transition:color .3s;
}
#me-save-status.saving { color:#f59e0b; }
#me-save-status.saved  { color:#22c55e; }
#me-save-status.error  { color:#ef4444; }
#me-footer { display:flex; gap:8px; padding:14px 20px 10px; border-top:1px solid #2e3347; flex-shrink:0; }
#me-btn-reset {
  flex:1; padding:9px; background:#222534; border:1px solid #2e3347;
  border-radius:6px; color:#94a3b8; font-size:12px; font-weight:600;
  cursor:pointer; transition:all .15s;
}
#me-btn-reset:hover { background:#2e3347; color:#e2e8f0; }
#me-btn-export {
  flex:2; padding:9px; background:#6c8ef5; border:none;
  border-radius:6px; color:#fff; font-size:12px; font-weight:600;
  cursor:pointer; transition:background .15s;
}
#me-btn-export:hover { background:#5b75d9; }

@media (max-width: 400px) { #me-panel { width:100vw; } }
</style>

<script>
(function() {
  var root = document.documentElement;
  var loadedFonts = new Set();
  var snapshot = {};
  var selectedSectionId = null;
  var saveTimer = null;

  var VARS = ['--color-primary','--color-secondary','--color-accent',
    '--color-background','--color-surface','--color-text','--color-muted','--color-border'];
  var cs = getComputedStyle(root);
  VARS.forEach(function(v) { snapshot[v] = cs.getPropertyValue(v).trim(); });

  // ── Domain detection (needed for server sync) ────────────────────────────
  function getDomain() {
    var parts = location.pathname.split('/');
    var idx = parts.indexOf('output');
    return idx >= 0 ? parts[idx + 1] : null;
  }

  // ── Save status indicator ────────────────────────────────────────────────
  var statusEl = document.getElementById('me-save-status');
  function setSaveStatus(state, msg) {
    if (!statusEl) return;
    statusEl.className = state;
    statusEl.textContent = msg;
    if (state === 'saved') {
      setTimeout(function() {
        statusEl.textContent = '';
        statusEl.className = '';
      }, 3000);
    }
  }

  // ── Collect current theme as a plain object ──────────────────────────────
  function buildThemeObject() {
    var live = getComputedStyle(root);
    return {
      colors: Object.fromEntries(
        VARS.map(function(v) { return [v.replace('--color-',''), live.getPropertyValue(v).trim()]; })
      ),
      typography: {
        headingFont:   (document.querySelector('[data-font="head"]') || {}).value || '',
        bodyFont:      (document.querySelector('[data-font="body"]') || {}).value || '',
        baseFontSize:  ((document.getElementById('rng-fsize')  || {}).value  || '16')   + 'px',
        headingWeight: (document.getElementById('sel-weight')  || {}).value  || '700',
      },
      layout: {
        borderRadius:   ((document.getElementById('rng-radius')  || {}).value || '8')    + 'px',
        sectionSpacing: ((document.getElementById('rng-spacing') || {}).value || '5')    + 'rem',
        maxWidth:       ((document.getElementById('rng-width')   || {}).value || '1200') + 'px',
        buttonStyle:    (document.querySelector('.me-sty.active') || {}).textContent || 'Arrondi',
        headerStyle:    (document.getElementById('sel-header') || {}).value || 'light',
      },
      sections: collectSectionsState(),
      savedAt: new Date().toISOString(),
    };
  }

  // ── Auto-save to server (debounced 1.5s) ────────────────────────────────
  function scheduleSave() {
    clearTimeout(saveTimer);
    setSaveStatus('saving', '⏳ Sauvegarde…');
    saveTimer = setTimeout(saveToServer, 1500);
  }

  function saveToServer() {
    var domain = getDomain();
    if (!domain) return;
    var theme = buildThemeObject();
    setSaveStatus('saving', '⏳ Sauvegarde…');
    fetch('/api/theme/' + domain, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme),
    })
    .then(function(r) {
      if (r.ok) setSaveStatus('saved', '✓ Sauvegardé');
      else      setSaveStatus('error', '✗ Erreur serveur');
    })
    .catch(function() {
      // Silently ignore if not running through server (direct file open)
      setSaveStatus('', '');
    });
  }

  // ── Load from server on init ─────────────────────────────────────────────
  function loadFromServer() {
    // First try the theme embedded at build-time (fastest, no flash)
    var embedded = null;
    try {
      var el = document.getElementById('me-theme-data');
      if (el) {
        var parsed = JSON.parse(el.textContent);
        if (parsed && parsed.savedAt) embedded = parsed;
      }
    } catch(e) {}

    if (embedded) {
      applyTheme(embedded);
      setSaveStatus('saved', '✓ Thème chargé');
      return;
    }

    // Fallback: fetch from server (when opened directly without regeneration)
    var domain = getDomain();
    if (!domain) return;
    fetch('/api/theme/' + domain)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(theme) {
        if (!theme || theme.error) return;
        applyTheme(theme);
        setSaveStatus('saved', '✓ Thème restauré');
      })
      .catch(function() {});
  }

  // ── Apply a full theme object ────────────────────────────────────────────
  function applyTheme(theme) {
    if (theme.colors)     studioColors(theme.colors);
    if (theme.typography) studioTypo(theme.typography);
    if (theme.layout)     studioLayout(theme.layout);
    if (theme.sections)   studioSections(theme.sections);

    // Sync sliders to saved values
    if (theme.layout) {
      syncSlider('rng-radius',  'disp-radius',  theme.layout.borderRadius,   'px');
      syncSlider('rng-spacing', 'disp-spacing', theme.layout.sectionSpacing, 'rem');
      syncSlider('rng-width',   'disp-width',   theme.layout.maxWidth,       'px');
    }
    if (theme.typography) {
      syncSlider('rng-fsize', 'disp-fsize', theme.typography.baseFontSize, 'px');
    }
  }

  function syncSlider(id, dispId, val, unit) {
    if (!val) return;
    var el   = document.getElementById(id);
    var disp = document.getElementById(dispId);
    if (!el) return;
    var num = parseFloat(val);
    if (isNaN(num)) return;
    el.value = num;
    if (disp) disp.textContent = val;
  }

  // ── Load sections data ───────────────────────────────────────────────────
  var sectionsData = [];
  try {
    var el = document.getElementById('me-sections-data');
    if (el) sectionsData = JSON.parse(el.textContent);
  } catch(e) {}

  // ── Sync color pickers ───────────────────────────────────────────────────
  document.querySelectorAll('input[type="color"][data-var]').forEach(function(inp) {
    var cur = cs.getPropertyValue(inp.dataset.var).trim();
    if (cur) inp.value = hexOrKeep(cur);
    inp.addEventListener('input', function() {
      root.style.setProperty(inp.dataset.var, inp.value);
      scheduleSave();
    });
  });

  // ── Panel open / close ───────────────────────────────────────────────────
  document.getElementById('me-toggle').addEventListener('click', openPanel);
  document.getElementById('me-close').addEventListener('click', closePanel);
  document.getElementById('me-close-ctx')?.addEventListener('click', closePanel);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePanel(); });

  function openPanel(tabId) {
    var panel = document.getElementById('me-panel');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (typeof tabId === 'string') switchTab(tabId);
  }
  function closePanel() {
    var panel = document.getElementById('me-panel');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    exitContextual();
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────
  document.querySelectorAll('.me-tab').forEach(function(tab) {
    tab.addEventListener('click', function() { switchTab(tab.dataset.tab); });
  });

  function switchTab(tabId) {
    document.querySelectorAll('.me-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tabId);
      t.setAttribute('aria-selected', String(t.dataset.tab === tabId));
    });
    document.querySelectorAll('.me-tab-content').forEach(function(c) {
      c.classList.toggle('active', c.id === 'tab-' + tabId);
    });
  }

  // ── Sliders ──────────────────────────────────────────────────────────────
  setupRange('rng-radius', 'disp-radius', 'px', function(val) {
    document.querySelectorAll('.btn,.card,.pricing-card,.testimonial,.faq__item,input,textarea,select').forEach(function(el) {
      if (!el.closest('#me-panel')) el.style.borderRadius = val;
    });
  });
  setupRange('rng-spacing', 'disp-spacing', 'rem', function(val) {
    document.querySelectorAll('.section').forEach(function(s) { s.style.padding = val + ' 0'; });
  });
  setupRange('rng-width', 'disp-width', 'px', function(val) {
    document.querySelectorAll('.container').forEach(function(c) { c.style.maxWidth = val; });
  });
  setupRange('rng-fsize', 'disp-fsize', 'px', function(val) {
    document.body.style.fontSize = val;
  });

  function setupRange(id, dispId, unit, apply) {
    var el = document.getElementById(id);
    var disp = document.getElementById(dispId);
    if (!el) return;
    el.addEventListener('input', function() {
      var val = el.value + unit;
      if (disp) disp.textContent = val;
      apply(el.value + unit);
      scheduleSave();
    });
  }

  // ── Font selectors ────────────────────────────────────────────────────────
  document.querySelector('[data-font="head"]')?.addEventListener('change', function() {
    loadFont(this.value);
    var fam = "'" + this.value + "', system-ui, sans-serif";
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el) { el.style.fontFamily = fam; });
    scheduleSave();
  });
  document.querySelector('[data-font="body"]')?.addEventListener('change', function() {
    loadFont(this.value);
    document.body.style.fontFamily = "'" + this.value + "', system-ui, sans-serif";
    scheduleSave();
  });

  // ── Heading weight ────────────────────────────────────────────────────────
  document.getElementById('sel-weight')?.addEventListener('change', function() {
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el) { el.style.fontWeight = this.value; }, this);
    scheduleSave();
  });

  // ── Header style ─────────────────────────────────────────────────────────
  document.getElementById('sel-header')?.addEventListener('change', function() {
    applyHeaderStyle(this.value);
    scheduleSave();
  });

  function applyHeaderStyle(val) {
    var header = document.querySelector('header,.header');
    if (!header) return;
    var primary = getComputedStyle(root).getPropertyValue('--color-primary').trim();
    header.style.transition = 'background .3s, color .3s';
    switch(val) {
      case 'primary':
        header.style.background = primary; header.style.color = '#fff';
        header.querySelectorAll('a,.header__nav a').forEach(function(a) { a.style.color = '#fff'; });
        break;
      case 'dark':
        header.style.background = '#111'; header.style.color = '#fff';
        header.querySelectorAll('a,.header__nav a').forEach(function(a) { a.style.color = '#fff'; });
        break;
      case 'transparent':
        header.style.background = 'transparent'; header.style.borderBottom = 'none'; header.style.boxShadow = 'none';
        header.querySelectorAll('a').forEach(function(a) { a.style.color = ''; });
        break;
      default:
        header.style.background = ''; header.style.color = '';
        header.style.borderBottom = ''; header.style.boxShadow = '';
        header.querySelectorAll('a').forEach(function(a) { a.style.color = ''; });
    }
  }

  // ── Button style ──────────────────────────────────────────────────────────
  document.querySelectorAll('.me-sty').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.me-sty').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.btn').forEach(function(el) { el.style.borderRadius = btn.dataset.r; });
      scheduleSave();
    });
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  document.getElementById('me-btn-reset').addEventListener('click', function() {
    VARS.forEach(function(v) { root.style.setProperty(v, snapshot[v]); });
    document.querySelectorAll('.section').forEach(function(s) { s.style.padding = ''; });
    document.querySelectorAll('.container').forEach(function(c) { c.style.maxWidth = ''; });
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el) { el.style.fontFamily=''; el.style.fontWeight=''; });
    document.querySelectorAll('.btn').forEach(function(el) { el.style.borderRadius = ''; });
    document.body.style.cssText = '';
    var header = document.querySelector('header,.header');
    if (header) { header.style.cssText=''; header.querySelectorAll('a').forEach(function(a){ a.style.color=''; }); }
    document.querySelectorAll('input[type="color"][data-var]').forEach(function(inp) {
      var cur = snapshot[inp.dataset.var];
      if (cur) inp.value = hexOrKeep(cur);
    });
    // Reset sections
    document.querySelectorAll('.section-group').forEach(function(sg) {
      sg.classList.remove('sg--selected', 'sg--hover');
    });
    exitContextual();
    buildSectionsList();
  });

  // ── Export JSON (download + save to server) ───────────────────────────────
  document.getElementById('me-btn-export').addEventListener('click', function() {
    var theme = buildThemeObject();
    // Download
    var blob = new Blob([JSON.stringify(theme, null, 2)], { type:'application/json' });
    var a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'theme.json'
    });
    a.click(); URL.revokeObjectURL(a.href);
    // Also save to server immediately (skip debounce)
    clearTimeout(saveTimer);
    saveToServer();
    var btn = document.getElementById('me-btn-export');
    btn.textContent = '✓ Exporté !';
    setTimeout(function() { btn.textContent = '⬇ Exporter'; }, 2000);
  });

  // ── SECTIONS SYSTEM ────────────────────────────────────────────────────────

  function buildSectionsList() {
    var list = document.getElementById('me-sections-list');
    var empty = document.getElementById('me-sections-empty');
    if (!sectionsData.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.remove();

    var escHtml = function(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    };
    list.innerHTML = sectionsData.map(function(sec) {
      var confPct  = Math.round(sec.confidence * 100);
      return '<div class="me-section-row' + (sec.visible ? '' : ' me-section-row--hidden') + '" data-section-id="' + escHtml(sec.id) + '">' +
        '<span class="me-section-row__icon">' + escHtml(sec.icon || '▪') + '</span>' +
        '<span class="me-section-row__label">' + escHtml(sec.label) + '</span>' +
        '<span class="me-section-row__conf">' + confPct + '%</span>' +
        '<button class="me-section-row__eye" title="' + (sec.visible ? 'Masquer' : 'Afficher') + '">' + (sec.visible ? '👁' : '🚫') + '</button>' +
      '</div>';
    }).join('');

    // Click on row → open contextual panel
    list.querySelectorAll('.me-section-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        if (e.target.classList.contains('me-section-row__eye')) return; // handled separately
        openContextual(row.dataset.sectionId);
      });

      // Eye button → toggle visibility
      var eyeBtn = row.querySelector('.me-section-row__eye');
      if (eyeBtn) {
        eyeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleSectionVisibility(row.dataset.sectionId);
          scheduleSave();
        });
      }
    });
  }

  function collectSectionsState() {
    var state = {};
    document.querySelectorAll('.section-group').forEach(function(sg) {
      var id  = sg.dataset.sectionId;
      var sv  = sg.querySelector('.sv.sv--active');
      state[id] = {
        visible: sg.style.display !== 'none',
        variant: sv ? sv.dataset.variant : null,
      };
    });
    return state;
  }

  // ── Section click handler (clicking in the page) ──────────────────────────
  function setupSectionClickHandlers() {
    document.querySelectorAll('.section-group').forEach(function(sg) {
      sg.addEventListener('mouseenter', function() { sg.classList.add('sg--hover'); });
      sg.addEventListener('mouseleave', function() { sg.classList.remove('sg--hover'); });
      sg.addEventListener('click', function(e) {
        // Don't trigger if clicking a link/button inside the section
        if (e.target.closest('a,button,input,textarea,select,form')) return;
        e.stopPropagation();
        openContextual(sg.dataset.sectionId);
        openPanel('sections'); // keep sections tab active but switch to contextual
      });
    });
  }

  // ── Contextual panel ──────────────────────────────────────────────────────
  function openContextual(sectionId) {
    var sec = sectionsData.find(function(s) { return s.id === sectionId; });
    if (!sec) return;

    selectedSectionId = sectionId;

    // Highlight section in page
    document.querySelectorAll('.section-group').forEach(function(sg) {
      sg.classList.toggle('sg--selected', sg.dataset.sectionId === sectionId);
    });

    // Highlight row in list
    document.querySelectorAll('.me-section-row').forEach(function(r) {
      r.classList.toggle('me-selected', r.dataset.sectionId === sectionId);
    });

    // Scroll section into view
    var sg = document.querySelector('.section-group[data-section-id="' + sectionId + '"]');
    if (sg) sg.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Build contextual panel
    var confPct   = Math.round(sec.confidence * 100);
    var confClass = confPct >= 80 ? 'high' : confPct >= 60 ? 'med' : 'low';

    var confEl = document.getElementById('me-ctx-confidence');
    if (confEl) confEl.innerHTML =
      'Détection : <strong>' + confPct + '%</strong> de confiance — ' + sec.label +
      '<div class="me-conf-bar"><div class="me-conf-bar__fill ' + confClass + '" style="width:' + confPct + '%"></div></div>';

    // Variant buttons
    var varBtns = document.getElementById('me-ctx-variant-btns');
    if (varBtns && sec.variants) {
      varBtns.innerHTML = sec.variants.map(function(v, i) {
        var label = (sec.variantLabels && sec.variantLabels[i]) ? sec.variantLabels[i] : v;
        var isActive = v === sec.variant;
        return '<button class="me-variant-btn' + (isActive ? ' active' : '') + '" data-variant="' + v + '">' + label + '</button>';
      }).join('');

      varBtns.querySelectorAll('.me-variant-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          applySectionVariant(sectionId, btn.dataset.variant);
          varBtns.querySelectorAll('.me-variant-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          scheduleSave();
        });
      });
    }

    // Visibility checkbox
    var visChk = document.getElementById('me-ctx-visible-chk');
    if (visChk) {
      visChk.checked = sec.visible !== false;
      visChk.onchange = function() {
        sec.visible = visChk.checked;
        setSectionVisibility(sectionId, visChk.checked);
        buildSectionsList();
        scheduleSave();
      };
    }

    // Show contextual header / body
    var hGlobal = document.getElementById('me-header-global');
    var hCtx    = document.getElementById('me-header-ctx');
    var ctxTitle = document.getElementById('me-ctx-title');
    if (hGlobal) hGlobal.hidden = true;
    if (hCtx)    hCtx.hidden    = false;
    if (ctxTitle) ctxTitle.textContent = sec.label;

    // Show contextual tab content
    document.querySelectorAll('.me-tab-content').forEach(function(c) { c.classList.remove('active'); });
    var tabCtx = document.getElementById('tab-ctx');
    if (tabCtx) { tabCtx.removeAttribute('hidden'); tabCtx.classList.add('active'); }

    // Hide tabs (optional — keeps it cleaner)
    var tabs    = document.getElementById('me-tabs');
    var tooltip = document.getElementById('me-tabs-tooltip');
    if (tabs)    tabs.style.display    = 'none';
    if (tooltip) tooltip.style.display = 'none';
  }

  function exitContextual() {
    selectedSectionId = null;

    document.querySelectorAll('.section-group').forEach(function(sg) {
      sg.classList.remove('sg--selected');
    });
    document.querySelectorAll('.me-section-row').forEach(function(r) {
      r.classList.remove('me-selected');
    });

    var hGlobal = document.getElementById('me-header-global');
    var hCtx    = document.getElementById('me-header-ctx');
    if (hGlobal) hGlobal.hidden = false;
    if (hCtx)    hCtx.hidden    = true;

    var tabCtx = document.getElementById('tab-ctx');
    if (tabCtx) { tabCtx.hidden = true; tabCtx.classList.remove('active'); }

    var tabs    = document.getElementById('me-tabs');
    var tooltip = document.getElementById('me-tabs-tooltip');
    if (tabs)    tabs.style.display    = '';
    if (tooltip) tooltip.style.display = '';

    switchTab('sections');
  }

  document.getElementById('me-ctx-back')?.addEventListener('click', exitContextual);

  // ── Section variant switching ─────────────────────────────────────────────
  function applySectionVariant(sectionId, variant) {
    // Update sections data
    var sec = sectionsData.find(function(s) { return s.id === sectionId; });
    if (sec) sec.variant = variant;

    // Toggle HTML
    var sg = document.querySelector('.section-group[data-section-id="' + sectionId + '"]');
    if (!sg) return;
    sg.dataset.activeVariant = variant;
    sg.querySelectorAll('.sv').forEach(function(sv) {
      var isActive = sv.dataset.variant === variant;
      sv.classList.toggle('sv--active', isActive);
      sv.hidden = !isActive;
    });
  }

  function toggleSectionVisibility(sectionId) {
    var sec = sectionsData.find(function(s) { return s.id === sectionId; });
    if (!sec) return;
    sec.visible = !sec.visible;
    setSectionVisibility(sectionId, sec.visible);
    buildSectionsList();
  }

  function setSectionVisibility(sectionId, visible) {
    var sg = document.querySelector('.section-group[data-section-id="' + sectionId + '"]');
    if (sg) sg.style.display = visible ? '' : 'none';
  }

  // ── Studio postMessage bridge ─────────────────────────────────────────────
  // (localStorage fallback kept for backward compat with external studio)
  (function() {
    try {
      var parts = location.pathname.split('/');
      var idx = parts.indexOf('output');
      if (idx < 0) return;
      var saved = localStorage.getItem('mockup-theme-' + parts[idx + 1]);
      if (!saved) return;
      var theme = JSON.parse(saved);
      if (theme.colors)     studioColors(theme.colors);
      if (theme.typography) studioTypo(theme.typography);
      if (theme.layout)     studioLayout(theme.layout);
      if (theme.sections)   studioSections(theme.sections);
    } catch(e) {}
  })();

  if (window.self !== window.top) {
    var _t = document.getElementById('me-toggle');
    var _p = document.getElementById('me-panel');
    if (_t) _t.style.display = 'none';
    if (_p) _p.style.display = 'none';
  }

  window.addEventListener('message', function(evt) {
    if (!evt.data || evt.data.source !== 'mockup-studio') return;
    var action = evt.data.action, payload = evt.data.payload;
    if      (action === 'applyPreset')   {
      if (payload.colors)     studioColors(payload.colors);
      if (payload.typography) studioTypo(payload.typography);
      if (payload.layout)     studioLayout(payload.layout);
      if (payload.sections)   studioSections(payload.sections);
    }
    else if (action === 'setColors')        studioColors(payload);
    else if (action === 'setTypography')    studioTypo(payload);
    else if (action === 'setLayout')        studioLayout(payload);
    else if (action === 'setSections')      studioSections(payload);
    else if (action === 'getTheme')         studioSendTheme();
    else if (action === 'setSectionVariant') applySectionVariant(payload.sectionId, payload.variant);
  });

  function studioColors(c) {
    var MAP = { primary:'--color-primary', secondary:'--color-secondary', accent:'--color-accent',
      background:'--color-background', surface:'--color-surface',
      text:'--color-text', muted:'--color-muted', textMuted:'--color-muted', border:'--color-border' };
    Object.entries(c).forEach(function(kv) {
      var varName = MAP[kv[0]] || kv[0];
      root.style.setProperty(varName, kv[1]);
      var inp = document.querySelector('input[type="color"][data-var="' + varName + '"]');
      if (inp) inp.value = hexOrKeep(kv[1]);
    });
  }

  function studioTypo(t) {
    if (t.googleFonts && t.googleFonts.length) {
      var gfKey = t.googleFonts.join('|');
      if (!document.querySelector('link[data-gf="' + gfKey + '"]')) {
        var gfUrl = 'https://fonts.googleapis.com/css2?' + t.googleFonts.map(function(f){ return 'family=' + f; }).join('&') + '&display=swap';
        var gfLink = document.createElement('link');
        gfLink.rel = 'stylesheet'; gfLink.href = gfUrl; gfLink.dataset.gf = gfKey;
        document.head.appendChild(gfLink);
      }
    }
    var headFont = t.headingFont || t.fontTitle;
    var bodyFont = t.bodyFont    || t.fontBody;
    if (headFont) {
      loadFont(headFont);
      var fam = "'" + headFont + "', system-ui, sans-serif";
      document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el){ el.style.fontFamily = fam; });
      var sh = document.querySelector('[data-font="head"]'); if (sh) sh.value = headFont;
    }
    if (bodyFont) {
      loadFont(bodyFont);
      document.body.style.fontFamily = "'" + bodyFont + "', system-ui, sans-serif";
      var sb = document.querySelector('[data-font="body"]'); if (sb) sb.value = bodyFont;
    }
    if (t.baseFontSize) document.body.style.fontSize = t.baseFontSize;
    var headWeight = t.headingWeight || t.titleWeight;
    if (headWeight) {
      document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el){ el.style.fontWeight = String(headWeight); });
      var sw = document.getElementById('sel-weight'); if (sw) sw.value = String(headWeight);
    }
    if (t.titleStyle)    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el){ el.style.fontStyle = t.titleStyle; });
    if (t.letterSpacing) document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el){ el.style.letterSpacing = t.letterSpacing; });
    if (t.lineHeight)    root.style.setProperty('--line-height', String(t.lineHeight));
    if (t.titleSize) {
      if (t.titleSize.h1) document.querySelectorAll('h1').forEach(function(el){ el.style.fontSize = t.titleSize.h1; });
      if (t.titleSize.h2) document.querySelectorAll('h2').forEach(function(el){ el.style.fontSize = t.titleSize.h2; });
      if (t.titleSize.h3) document.querySelectorAll('h3').forEach(function(el){ el.style.fontSize = t.titleSize.h3; });
    }
  }

  function studioLayout(l) {
    if (l.borderRadius !== undefined) {
      document.querySelectorAll('.card,.pricing-card,.testimonial,.faq__item,input,textarea,select').forEach(function(el) {
        if (!el.closest('#me-panel')) el.style.borderRadius = l.borderRadius;
      });
    }
    if (l.borderRadiusBtn !== undefined) {
      document.querySelectorAll('.btn').forEach(function(el){ if (!el.closest('#me-panel')) el.style.borderRadius = l.borderRadiusBtn; });
    } else if (l.borderRadius !== undefined) {
      document.querySelectorAll('.btn').forEach(function(el){ if (!el.closest('#me-panel')) el.style.borderRadius = l.borderRadius; });
    }
    if (l.sectionSpacing) document.querySelectorAll('.section').forEach(function(s){ s.style.padding = l.sectionSpacing + ' 0'; });
    if (l.maxWidth)        document.querySelectorAll('.container').forEach(function(c){ c.style.maxWidth = l.maxWidth; });
    if (l.gap)             root.style.setProperty('--gap', l.gap);
    if (l.headerStyle)     applyHeaderStyle(l.headerStyle);
  }

  function studioSections(payload) {
    if (!payload) return;
    Object.entries(payload).forEach(function(kv) {
      var sectionId = kv[0], state = kv[1];
      if (state && state.variant) applySectionVariant(sectionId, state.variant);
      if (state && typeof state.visible === 'boolean') {
        var sec = sectionsData.find(function(s){ return s.id === sectionId; });
        if (sec) sec.visible = state.visible;
        setSectionVisibility(sectionId, state.visible);
      }
    });
    buildSectionsList();
  }

  function studioSendTheme() {
    var live = getComputedStyle(root);
    var theme = {
      colors: {},
      typography: {
        headingFont:   (document.querySelector('[data-font="head"]') || {}).value || '',
        bodyFont:      (document.querySelector('[data-font="body"]') || {}).value || '',
        baseFontSize:  ((document.getElementById('rng-fsize') || {}).value || '16') + 'px',
        headingWeight: (document.getElementById('sel-weight') || {}).value || '700',
      },
      layout: {
        borderRadius:   ((document.getElementById('rng-radius')  || {}).value || '8')    + 'px',
        sectionSpacing: ((document.getElementById('rng-spacing') || {}).value || '5')    + 'rem',
        maxWidth:       ((document.getElementById('rng-width')   || {}).value || '1200') + 'px',
        headerStyle:    (document.getElementById('sel-header') || {}).value || 'light',
      },
      sections: collectSectionsState(),
    };
    VARS.forEach(function(v){ theme.colors[v.replace('--color-','')] = live.getPropertyValue(v).trim(); });
    window.parent.postMessage({ source: 'mockup-iframe', action: 'themeUpdate', payload: theme }, '*');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function loadFont(name) {
    if (loadedFonts.has(name)) return;
    loadedFonts.add(name);
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + name.replace(/ /g,'+') + ':wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function hexOrKeep(val) {
    if (!val) return '#000000';
    if (val.startsWith('#')) return val;
    var m = val.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/);
    if (!m) return '#000000';
    return '#' + [m[1],m[2],m[3]].map(function(n){ return parseInt(n).toString(16).padStart(2,'0'); }).join('');
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  buildSectionsList();
  setupSectionClickHandlers();
  loadFromServer(); // load & apply saved theme (build-time embed or server fetch)

})();
</script>
<!-- ═══ END MOCKUP EDITOR ═══ -->`;
}
