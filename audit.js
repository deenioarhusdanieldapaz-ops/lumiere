// audit.js v3 — Interação real com layouts responsivos
const { chromium } = require('playwright');
const fs = require('fs');

const TARGET = 'https://lumiere-83s.pages.dev';
const OUT = 'audit-output';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(`${OUT}/screenshots`)) fs.mkdirSync(`${OUT}/screenshots`, { recursive: true });

const safeName = (s) => String(s).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60);
const stamp = () => new Date().toISOString();

async function snapshotDOM(page) {
  return await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const st = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden'
        && parseFloat(st.opacity) > 0.01 && rect.width > 0 && rect.height > 0;
    };
    const textOf = (el, max = 120) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, max);
    const all = (sel) => Array.from(document.querySelectorAll(sel));

    return {
      url: location.href,
      readyState: document.readyState,
      appShellHidden: document.getElementById('app-shell')?.hidden ?? null,
      appHidden: document.getElementById('app')?.hidden ?? null,
      splash: (() => {
        const s = document.querySelector('.splash, #splash, [data-splash]');
        if (!s) return null;
        const st = getComputedStyle(s);
        return { display: st.display, opacity: st.opacity, visibility: st.visibility };
      })(),
      counts: {
        buttons: all('button').length,
        buttonsVisible: all('button').filter(visible).length,
        inputs: all('input').length,
        inputsVisible: all('input').filter(visible).length,
        cardsVisible: all('[class*="card"]').filter(visible).length,
        navItemsVisible: all('[data-page]').filter(visible).length,
        svgs: all('svg').length
      },
      // Texto visível (para detetar página vazia)
      visibleText: all('h1,h2,h3,h4,p')
        .filter(visible)
        .map(el => textOf(el, 80))
        .filter(t => t.length > 3)
        .slice(0, 25),
      // Botões visíveis com texto
      visibleButtons: all('button')
        .filter(visible)
        .map(el => textOf(el, 40))
        .filter(t => t.length > 0)
        .slice(0, 40)
    };
  });
}

async function findVisibleElement(page, selector) {
  const matches = page.locator(selector);
  const count = await matches.count();
  for (let i = 0; i < count; i++) {
    const el = matches.nth(i);
    try {
      if (await el.isVisible({ timeout: 500 })) return el;
    } catch (_) {}
  }
  return null;
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

  // Injetar user existente (evita onboarding completo)
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('lumiereUserName', 'Playwright Test');
      localStorage.setItem('lumierePreferences', JSON.stringify({
        theme: 'noir', goldIntensity: 'balanced', interfaceSize: 'balanced'
      }));
    } catch (_) {}
  });

  const page = await ctx.newPage();

  // NÃO bloquear eruda — esconder via CSS após load
  page.on('console', (msg) => {
    events.push({ ts: ts(), viewport: tag, kind: 'console', level: msg.type(), text: msg.text().slice(0, 400) });
  });
  page.on('pageerror', (err) => {
    events.push({ ts: ts(), viewport: tag, kind: 'pageerror', message: String(err.message || err).slice(0, 400), stack: String(err.stack || '').slice(0, 800) });
  });
  page.on('requestfailed', (req) => {
    // Ignorar falhas do eruda (não são da app)
    if (req.url().includes('eruda')) return;
    events.push({ ts: ts(), viewport: tag, kind: 'requestfailed', url: req.url(), failure: req.failure()?.errorText || 'unknown' });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      events.push({ ts: ts(), viewport: tag, kind: 'badResponse', url: res.url(), status: res.status() });
    }
  });

  try {
    await page.goto(TARGET + '?audit=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    events.push({ ts: ts(), viewport: tag, kind: 'navigationError', message: String(e.message) });
  }

  // Esconder eruda via CSS
  try {
    await page.addStyleTag({ content: '.eruda-container, .eruda, #eruda { display: none !important; }' });
  } catch (_) {}

  // Esperar splash desaparecer
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

  // Esperar app-shell visível
  let appReady = false;
  try {
    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      return shell && !shell.hidden;
    }, { timeout: 10000 });
    appReady = true;
  } catch (_) {}

  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-00-home.png`, fullPage: false });

  const discovery = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('[data-page]'));
    const pages = [...new Set(navs.map(el => el.getAttribute('data-page')).filter(Boolean))];
    return { pagesFromMenu: pages };
  });

  const homeSnapshot = await snapshotDOM(page);

  // Abrir sidebar se estiver escondida (mobile)
  let sidebarOpened = false;
  try {
    const toggle = page.locator('.app-topbar__toggle, [aria-label*="sidebar"], [aria-label*="menu"]').first();
    if (await toggle.isVisible({ timeout: 1000 })) {
      await toggle.click({ timeout: 2000 });
      await page.waitForTimeout(800);
      sidebarOpened = true;
    }
  } catch (_) {}

  const pageResults = [];
  for (const pageName of discovery.pagesFromMenu) {
    const before = events.length;
    const result = {
      name: pageName,
      loaded: false,
      error: null,
      screenshot: null,
      snapshot: null,
      eventsDuringNav: []
    };

    try {
      // Tentar primeiro encontrar um elemento VISÍVEL com este data-page
      const selector = `[data-page="${pageName}"]`;
      const matches = page.locator(selector);
      const count = await matches.count();
      let clicked = false;
      let lastError = null;

      for (let i = 0; i < count; i++) {
        const el = matches.nth(i);
        try {
          if (!await el.isVisible({ timeout: 300 })) continue;
          await el.click({ timeout: 3000, force: false });
          clicked = true;
          break;
        } catch (e) {
          lastError = e.message;
        }
      }

      if (!clicked) {
        // Se sidebar não estava aberta, abrir e tentar de novo
        if (!sidebarOpened) {
          try {
            const toggle = page.locator('.app-topbar__toggle').first();
            await toggle.click({ timeout: 2000 });
            await page.waitForTimeout(800);
            sidebarOpened = true;
            const el2 = page.locator(selector).first();
            await el2.click({ timeout: 3000 });
            clicked = true;
          } catch (e) {
            lastError = e.message;
          }
        }
      }

      if (!clicked) {
        result.error = lastError || `Não encontrou elemento visível para ${pageName}`;
      } else {
        await page.waitForTimeout(1800);
        result.loaded = true;
        result.screenshot = `${tag}-nav-${safeName(pageName)}.png`;
        await page.screenshot({ path: `${OUT}/screenshots/${result.screenshot}`, fullPage: false });
        result.snapshot = await snapshotDOM(page);

        // Fechar sidebar se a abrimos
        if (sidebarOpened) {
          try {
            await page.locator('.app-topbar__toggle').first().click({ timeout: 1500 });
            await page.waitForTimeout(500);
            sidebarOpened = false;
          } catch (_) {}
        }
      }
    } catch (e) {
      result.error = String(e.message).slice(0, 300);
    }

    result.eventsDuringNav = events.slice(before);
    pageResults.push(result);
  }

  await ctx.close();

  return { viewport, tag, splashHidden, appReady, sidebarOpened, discovery, homeSnapshot, pageResults, events };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const mobile = await runViewport(browser, { width: 414, height: 896 }, 'mobile');
  const desktop = await runViewport(browser, { width: 1280, height: 800 }, 'desktop');

  const summarize = (r) => {
    const consoleErrors = r.events.filter(e => e.kind === 'console' && e.level === 'error');
    const pageErrors = r.events.filter(e => e.kind === 'pageerror');
    const requestFailed = r.events.filter(e => e.kind === 'requestfailed');
    const badResponses = r.events.filter(e => e.kind === 'badResponse');
    return {
      tag: r.tag,
      splashHidden: r.splashHidden,
      appReady: r.appReady,
      pagesDiscovered: r.discovery.pagesFromMenu.length,
      pagesLoaded: r.pageResults.filter(p => p.loaded).length,
      pagesFailed: r.pageResults.filter(p => !p.loaded).length,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      requestFailed: requestFailed.length,
      badResponses: badResponses.length,
      appShellHidden: r.homeSnapshot.appShellHidden,
      firstFatal: pageErrors[0] || consoleErrors[0] || null
    };
  };

  const report = {
    timestamp: stamp(),
    target: TARGET,
    summary: { mobile: summarize(mobile), desktop: summarize(desktop) },
    mobile, desktop
  };

  fs.writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(report.summary, null, 2));

  await browser.close();
  console.log('=== AUDIT v3 COMPLETE ===');
  console.log(JSON.stringify(report.summary, null, 2));
})();
