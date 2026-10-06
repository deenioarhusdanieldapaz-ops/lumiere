// audit.js v2 — Descoberta + navegação exaustiva
const { chromium } = require('playwright');
const fs = require('fs');

const TARGET = 'https://lumiere-83s.pages.dev';
const OUT = 'audit-output';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(`${OUT}/screenshots`)) fs.mkdirSync(`${OUT}/screenshots`, { recursive: true });

// ===== helpers =====
const stamp = () => new Date().toISOString();
const safeName = (s) => String(s).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60);

async function snapshotDOM(page) {
  return await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.01;
    };

    const all = (sel) => Array.from(document.querySelectorAll(sel));

    const textOf = (el, max = 120) =>
      (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, max);

    return {
      url: location.href,
      readyState: document.readyState,
      bodyChildren: document.body.children.length,

      // contagens gerais
      counts: {
        buttons: all('button').length,
        buttonsVisible: all('button').filter(visible).length,
        inputs: all('input').length,
        inputsVisible: all('input').filter(visible).length,
        cards: all('[class*="card"]').length,
        cardsVisible: all('[class*="card"]').filter(visible).length,
        navItems: all('[data-page]').length,
        navItemsVisible: all('[data-page]').filter(visible).length,
        images: all('img').length,
        svgs: all('svg').length,
        links: all('a').length
      },

      // inventário de cards (nome da classe + visibilidade + texto)
      cards: all('[class*="card"]').map(el => ({
        cls: String(el.className).split(/\s+/).filter(c => c.includes('card')).slice(0, 3).join(' '),
        visible: visible(el),
        text: textOf(el, 80)
      })).slice(0, 100),

      // inventário de botões
      buttons: all('button').map(el => ({
        text: textOf(el, 60),
        aria: el.getAttribute('aria-label') || '',
        cls: String(el.className).split(/\s+/).slice(0, 2).join(' '),
        page: el.getAttribute('data-page') || '',
        visible: visible(el),
        disabled: el.disabled
      })).slice(0, 200),

      // inventário de inputs
      inputs: all('input').map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        visible: visible(el)
      })).slice(0, 100),

      // texto visível global (para detetar página em branco)
      visibleTextSample: Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,div'))
        .filter(visible)
        .map(el => textOf(el, 100))
        .filter(t => t.length > 3)
        .slice(0, 60),

      // splash ainda visível?
      splash: (() => {
        const s = document.querySelector('.splash, #splash, [data-splash]');
        if (!s) return null;
        const st = getComputedStyle(s);
        return { display: st.display, opacity: st.opacity, visibility: st.visibility };
      })(),

      // onboarding visível?
      onboardingVisible: (() => {
        const o = document.querySelector('.onboarding, #onboarding');
        if (!o) return false;
        return getComputedStyle(o).display !== 'none';
      })()
    };
  });
}

async function runViewport(browser, viewport, tag) {
  const events = [];
  const t0 = Date.now();
  const ts = () => Date.now() - t0;

  const ctx = await browser.newContext({
    viewport,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    locale: 'pt-PT'
  });

  // Injeta utilizador antes de qualquer script correr
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('lumiereUserName', 'Playwright Test');
    } catch (_) {}
  });

  const page = await ctx.newPage();

  // Bloqueia eruda para não interferir
  await page.route('**/npm/eruda', route => route.abort());

  page.on('console', (msg) => {
    events.push({ ts: ts(), viewport: tag, kind: 'console', level: msg.type(), text: msg.text().slice(0, 500) });
  });
  page.on('pageerror', (err) => {
    events.push({ ts: ts(), viewport: tag, kind: 'pageerror', message: String(err.message || err).slice(0, 500), stack: String(err.stack || '').slice(0, 1500) });
  });
  page.on('requestfailed', (req) => {
    events.push({ ts: ts(), viewport: tag, kind: 'requestfailed', url: req.url(), failure: req.failure() ? req.failure().errorText : 'unknown' });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      events.push({ ts: ts(), viewport: tag, kind: 'badResponse', url: res.url(), status: res.status() });
    }
  });

  // 1. Carregar homepage
  try {
    await page.goto(TARGET + '?audit=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    events.push({ ts: ts(), viewport: tag, kind: 'navigationError', message: String(e.message) });
  }

  // 2. Esperar splash desaparecer
  let splashHidden = false;
  try {
    await page.waitForFunction(() => {
      const s = document.querySelector('.splash, #splash, [data-splash]');
      if (!s) return true;
      const st = getComputedStyle(s);
      return st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.01;
    }, { timeout: 20000 });
    splashHidden = true;
  } catch (_) {}

  // 3. Esperar estabilização (evita captura de estados intermédios)
  await page.waitForTimeout(2500);

  // 4. Screenshot inicial
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-00-home.png`, fullPage: false });

  // 5. DESCOBERTA — páginas disponíveis
  const discovery = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('[data-page]'));
    const pages = [...new Set(navs.map(el => el.getAttribute('data-page')).filter(Boolean))];
    return {
      pagesFromMenu: pages,
      bottomNav: Array.from(document.querySelectorAll('.app-bottom-nav__item')).map(el => ({
        page: el.getAttribute('data-page'),
        text: (el.textContent || '').trim().slice(0, 40)
      }))
    };
  });

  // 6. SNAPSHOT da homepage
  const homeSnapshot = await snapshotDOM(page);

  // 7. NAVEGAÇÃO — percorre cada página
  const pageResults = [];
  for (const pageName of discovery.pagesFromMenu) {
    const before = events.length;
    const result = {
      name: pageName,
      url: null,
      loaded: false,
      error: null,
      screenshot: null,
      snapshot: null,
      eventsDuringNav: []
    };

    try {
      const btn = page.locator(`[data-page="${pageName}"]`).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(2000);

      result.loaded = true;
      result.url = page.url();
      result.screenshot = `${tag}-nav-${safeName(pageName)}.png`;
      await page.screenshot({ path: `${OUT}/screenshots/${result.screenshot}`, fullPage: false });

      result.snapshot = await snapshotDOM(page);
    } catch (e) {
      result.error = String(e.message).slice(0, 300);
    }

    result.eventsDuringNav = events.slice(before);
    pageResults.push(result);
  }

  // 8. Tentar abrir "Mais" (settings/profile?) — clique no bottom nav
  const moreResult = { name: 'more-menu', loaded: false, error: null, screenshot: null };
  try {
    const moreBtn = page.locator('.app-bottom-nav__item').filter({ hasText: /mais/i }).first();
    await moreBtn.waitFor({ state: 'visible', timeout: 3000 });
    await moreBtn.click({ timeout: 3000 });
    await page.waitForTimeout(1500);
    moreResult.loaded = true;
    moreResult.screenshot = `${tag}-more.png`;
    await page.screenshot({ path: `${OUT}/screenshots/${moreResult.screenshot}`, fullPage: false });
    moreResult.snapshot = await snapshotDOM(page);
  } catch (e) {
    moreResult.error = String(e.message).slice(0, 200);
  }

  await ctx.close();

  return {
    viewport,
    tag,
    splashHidden,
    discovery,
    homeSnapshot,
    pageResults,
    moreResult,
    events
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const mobile = await runViewport(browser, { width: 414, height: 896 }, 'mobile');
  const desktop = await runViewport(browser, { width: 1280, height: 800 }, 'desktop');

  // Resumo
  const summarize = (r) => {
    const consoleErrors = r.events.filter(e => e.kind === 'console' && e.level === 'error');
    const pageErrors = r.events.filter(e => e.kind === 'pageerror');
    const requestFailed = r.events.filter(e => e.kind === 'requestfailed');
    const badResponses = r.events.filter(e => e.kind === 'badResponse');
    return {
      tag: r.tag,
      splashHidden: r.splashHidden,
      pagesDiscovered: r.discovery.pagesFromMenu.length,
      pagesLoaded: r.pageResults.filter(p => p.loaded).length,
      pagesFailed: r.pageResults.filter(p => !p.loaded).length,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      requestFailed: requestFailed.length,
      badResponses: badResponses.length,
      onboardingVisible: r.homeSnapshot.onboardingVisible,
      cardCount: r.homeSnapshot.counts.cards,
      buttonCount: r.homeSnapshot.counts.buttons,
      firstFatal: pageErrors[0] || consoleErrors[0] || null
    };
  };

  const report = {
    timestamp: stamp(),
    target: TARGET,
    summary: {
      mobile: summarize(mobile),
      desktop: summarize(desktop)
    },
    mobile,
    desktop
  };

  fs.writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(report.summary, null, 2));

  await browser.close();

  console.log('=== AUDIT v2 COMPLETE ===');
  console.log(JSON.stringify(report.summary, null, 2));
})();
