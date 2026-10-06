const { chromium } = require('playwright');
const fs = require('fs');

const TARGET = 'https://lumiere-83s.pages.dev';
const OUT_DIR = 'screenshots';

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const events = [];
  const t0 = Date.now();
  const ts = () => Date.now() - t0;

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    locale: 'pt-PT'
  });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    events.push({
      ts: ts(), kind: 'console', level: msg.type(),
      text: msg.text().slice(0, 500)
    });
  });

  page.on('pageerror', (err) => {
    events.push({
      ts: ts(), kind: 'pageerror',
      message: String(err.message || err).slice(0, 500),
      stack: String(err.stack || '').slice(0, 1500)
    });
  });

  page.on('requestfailed', (req) => {
    events.push({
      ts: ts(), kind: 'requestfailed',
      url: req.url(),
      failure: req.failure() ? req.failure().errorText : 'unknown'
    });
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      events.push({
        ts: ts(), kind: 'badResponse',
        url: res.url(), status: res.status()
      });
    }
  });

  try {
    await page.goto(TARGET + '?audit=' + Date.now(), {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
  } catch (e) {
    events.push({ ts: ts(), kind: 'navigationError', message: String(e.message) });
  }

  let splashHidden = false;
  try {
    await page.waitForFunction(() => {
      const s = document.querySelector('.splash, #splash, [data-splash]');
      if (!s) return true;
      const st = getComputedStyle(s);
      return st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0';
    }, { timeout: 15000 });
    splashHidden = true;
  } catch (_) {}

  await page.screenshot({ path: `${OUT_DIR}/01-initial.png`, fullPage: false });

  const interactions = [];

  async function tryInteract(label, selector, opts = {}) {
    const result = { label, selector, ok: false, error: null };
    try {
      const loc = page.locator(selector).first();
      await loc.waitFor({ state: 'visible', timeout: 3000 });
      await loc.click({ timeout: 3000, force: !!opts.force });
      result.ok = true;
      await page.waitForTimeout(opts.wait || 1200);
      await page.screenshot({ path: `${OUT_DIR}/${opts.shot || label}.png`, fullPage: false });
    } catch (e) {
      result.error = String(e.message).slice(0, 200);
    }
    interactions.push(result);
  }

  await tryInteract('tab-inicio',    'text=Início',     { shot: '02-tab-inicio' });
  await tryInteract('tab-habitos',   'text=Hábitos',    { shot: '03-tab-habitos' });
  await tryInteract('tab-progresso', 'text=Progresso',  { shot: '04-tab-progresso' });
  await tryInteract('tab-hoje',      'text=Hoje',       { shot: '05-tab-hoje' });
  await tryInteract('tab-mais',      'text=Mais',       { shot: '06-tab-mais' });

  await tryInteract('menu-hamburger', '[aria-label*="menu" i], button:has-text("☰"), .menu-btn, #menu-btn',
    { shot: '07-menu', force: true });

  await tryInteract('notif-bell',    '[aria-label*="notif" i], .notif-btn, #notif-btn',
    { shot: '08-notif', force: true });

  await tryInteract('profile',       '[aria-label*="perfil" i], .profile-btn, .avatar, [data-profile]',
    { shot: '09-profile', force: true });

  await tryInteract('fab-plus',      '.fab, .floating-action, [aria-label*="adicionar" i], [aria-label*="novo" i]',
    { shot: '10-fab', force: true });

  await tryInteract('back-home',     'text=Início', { shot: '11-back' });

  const domState = await page.evaluate(() => ({
    readyState: document.readyState,
    url: location.href,
    splash: (() => {
      const s = document.querySelector('.splash, #splash, [data-splash]');
      if (!s) return null;
      const st = getComputedStyle(s);
      return { display: st.display, opacity: st.opacity, visibility: st.visibility };
    })(),
    appVisible: (() => {
      const a = document.querySelector('#app, .app, .app-shell');
      if (!a) return null;
      const st = getComputedStyle(a);
      return { display: st.display, opacity: st.opacity };
    })(),
    hasLumiereGlobal: typeof window.lumiere !== 'undefined' || typeof window.Lumiere !== 'undefined',
    swController: navigator.serviceWorker?.controller?.scriptURL || null,
    bodyChildren: document.body.children.length
  }));

  const consoleEvents = events.filter(e => e.kind === 'console');
  const consoleErrors = consoleEvents.filter(e => e.level === 'error');
  const pageErrors = events.filter(e => e.kind === 'pageerror');
  const requestFailed = events.filter(e => e.kind === 'requestfailed');
  const badResponses = events.filter(e => e.kind === 'badResponse');

  const firstFatal = pageErrors[0] || consoleErrors[0] || null;

  const report = {
    timestamp: new Date().toISOString(),
    url: TARGET,
    summary: {
      appLoaded: domState.appVisible && domState.appVisible.display !== 'none',
      splashHidden,
      consoleTotal: consoleEvents.length,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      requestFailed: requestFailed.length,
      badResponses: badResponses.length,
      interactions: `${interactions.filter(i => i.ok).length}/${interactions.length}`,
      firstFatal
    },
    domState,
    interactions,
    events,
    domFinalHTMLHead: (await page.content()).slice(0, 3000)
  };

  fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2));

  await browser.close();

  console.log('=== AUDIT COMPLETE ===');
  console.log('Report: audit-report.json');
  console.log('Interactions OK:', interactions.filter(i => i.ok).length, '/', interactions.length);
  console.log('Console errors:', consoleErrors.length);
  console.log('Page errors:', pageErrors.length);
  console.log('Request failed:', requestFailed.length);
})();
