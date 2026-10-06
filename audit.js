// audit.js v4 — Fase 3 (abrir/fechar forms) + Fase 4 (CRUD em tasks)
const { chromium } = require('playwright');
const fs = require('fs');

const TARGET = 'https://lumiere-83s.pages.dev';
const OUT = 'audit-output';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(`${OUT}/screenshots`)) fs.mkdirSync(`${OUT}/screenshots`, { recursive: true });

const safeName = (s) => String(s).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60);

async function waitFor(page, sel, timeout = 5000) {
  try { await page.waitForSelector(sel, { state: 'visible', timeout }); return true; }
  catch { return false; }
}
async function waitGone(page, sel, timeout = 5000) {
  try { await page.waitForSelector(sel, { state: 'detached', timeout }); return true; }
  catch {
    try { await page.waitForSelector(sel, { state: 'hidden', timeout: 1000 }); return true; }
    catch { return false; }
  }
}

async function openFormFor(page, entity) {
  // entity: 'tasks' | 'habits' | 'notes'
  const btn = page.locator(`.${entity}-btn--primary`).first();
  if (!await btn.isVisible({ timeout: 3000 })) return { ok: false, error: 'botão nova não visível' };
  await btn.click({ timeout: 3000 });
  const appeared = await waitFor(page, `.${entity}-form`, 4000);
  return { ok: appeared, error: appeared ? null : 'form não apareceu' };
}

async function closeFormFor(page, entity) {
  const cancel = page.locator(`.${entity}-form button[type="button"]`).first();
  if (!await cancel.isVisible({ timeout: 2000 })) return { ok: false, error: 'botão cancelar não visível' };
  await cancel.click({ timeout: 2000 });
  const gone = await waitGone(page, `.${entity}-form`, 3000);
  return { ok: gone, error: gone ? null : 'form não desapareceu' };
}

async function runFase3(page, tag) {
  const results = [];
  for (const entity of ['tasks', 'habits', 'notes']) {
    // Navegar
    try {
      await page.locator(`[data-page="${entity}"]`).first().click({ timeout: 4000 });
      await page.waitForTimeout(1200);
    } catch (e) {
      results.push({ entity, phase: 3, step: 'navigate', ok: false, error: String(e.message).slice(0, 200) });
      continue;
    }

    // Abrir
    const opened = await openFormFor(page, entity);
    if (!opened.ok) {
      results.push({ entity, phase: 3, step: 'open', ok: false, error: opened.error });
      continue;
    }
    await page.screenshot({ path: `${OUT}/screenshots/${tag}-p3-${entity}-form-open.png`, fullPage: false });

    // Fechar
    const closed = await closeFormFor(page, entity);
    results.push({ entity, phase: 3, step: 'open+close', ok: closed.ok, error: closed.error });
    if (closed.ok) {
      await page.screenshot({ path: `${OUT}/screenshots/${tag}-p3-${entity}-form-closed.png`, fullPage: false });
    }
    await page.waitForTimeout(600);
  }
  return results;
}

async function runFase4Tasks(page, tag) {
  const results = [];
  const TEST_NAME = '[audit] Tarefa de teste';
  const SELECTOR_TASK_ITEM = 'article.task-item';
  const SELECTOR_TASK_NAME = 'h3';

  // Navegar para tasks
  try {
    await page.locator('[data-page="tasks"]').first().click({ timeout: 4000 });
    await page.waitForTimeout(1000);
  } catch (e) {
    return [{ step: 'navigate', ok: false, error: String(e.message).slice(0, 200) }];
  }

  // Estado inicial
  const beforeCount = await page.locator(SELECTOR_TASK_ITEM).count();
  results.push({ step: 'initial-count', ok: true, count: beforeCount });

  // Abrir form
  const opened = await openFormFor(page, 'tasks');
  if (!opened.ok) return [...results, { step: 'open', ok: false, error: opened.error }];

  // Preencher
  try {
    await page.fill('#task-name', TEST_NAME, { timeout: 3000 });
  } catch (e) {
    return [...results, { step: 'fill-name', ok: false, error: String(e.message).slice(0, 200) }];
  }

  // Submeter
  try {
    await page.locator('.tasks-form button[type="submit"]').first().click({ timeout: 3000 });
  } catch (e) {
    return [...results, { step: 'submit', ok: false, error: String(e.message).slice(0, 200) }];
  }

  // Esperar form desaparecer
  const formGone = await waitGone(page, '.tasks-form', 4000);
  results.push({ step: 'form-closed-after-submit', ok: formGone });

  // Esperar item aparecer (por texto)
  let itemAppeared = false;
  try {
    await page.waitForFunction((name) => {
      return Array.from(document.querySelectorAll('article.task-item'))
        .some(el => (el.textContent || '').includes(name));
    }, TEST_NAME, { timeout: 5000 });
    itemAppeared = true;
  } catch (_) {}
  results.push({ step: 'item-appeared', ok: itemAppeared });
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-p4-tasks-created.png`, fullPage: false });

  if (!itemAppeared) return results;

  // Localizar o artigo específico da tarefa de teste
  const testItem = page.locator('article.task-item').filter({ hasText: TEST_NAME }).first();
  const itemVisible = await testItem.isVisible({ timeout: 2000 }).catch(() => false);
  results.push({ step: 'find-test-item', ok: itemVisible });
  if (!itemVisible) return results;

  // Clicar botão apagar dentro daquele artigo (o último button — padrão)
  // Estratégia: procurar botão com ícone "trash"/"delete" ou último botão
  let deleted = false;
  try {
    // Tentar por aria-label primeiro
    let btn = testItem.locator('button[aria-label*="pagar" i], button[aria-label*="delete" i]').first();
    if (await btn.count() === 0) {
      // Fallback: último button do artigo
      btn = testItem.locator('button').last();
    }
    await btn.click({ timeout: 3000 });
    deleted = true;
  } catch (e) {
    results.push({ step: 'click-delete', ok: false, error: String(e.message).slice(0, 200) });
  }
  results.push({ step: 'click-delete', ok: deleted });

  if (!deleted) return results;

  // Esperar item desaparecer
  let gone = false;
  try {
    await page.waitForFunction((name) => {
      return !Array.from(document.querySelectorAll('article.task-item'))
        .some(el => (el.textContent || '').includes(name));
    }, TEST_NAME, { timeout: 5000 });
    gone = true;
  } catch (_) {}
  results.push({ step: 'item-gone-after-delete', ok: gone });
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-p4-tasks-deleted.png`, fullPage: false });

  return results;
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

  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('lumiereUserName', 'Playwright Test');
      localStorage.setItem('lumierePreferences', JSON.stringify({
        theme: 'noir', goldIntensity: 'balanced', interfaceSize: 'balanced'
      }));
    } catch (_) {}
  });

  const page = await ctx.newPage();

  // Handler de dialog (para confirm() do delete)
  page.on('dialog', async (dialog) => {
    events.push({ ts: ts(), tag, kind: 'dialog', type: dialog.type(), message: dialog.message().slice(0, 200) });
    try { await dialog.accept(); } catch (_) {}
  });

  page.on('console', (msg) => {
    const lvl = msg.type();
    // Filtrar logs de FAB/NotifLocal para reduzir ruído
    const text = msg.text();
    if (text.startsWith('[FAB]') || text.startsWith('[NotifLocal]')) return;
    events.push({ ts: ts(), tag, kind: 'console', level: lvl, text: text.slice(0, 300) });
  });
  page.on('pageerror', (err) => {
    events.push({ ts: ts(), tag, kind: 'pageerror', message: String(err.message || err).slice(0, 400) });
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('eruda')) return;
    events.push({ ts: ts(), tag, kind: 'requestfailed', url: req.url(), failure: req.failure()?.errorText || 'unknown' });
  });

  try {
    await page.goto(TARGET + '?audit=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    events.push({ ts: ts(), tag, kind: 'navigationError', message: String(e.message) });
  }

  // Esconder eruda
  try { await page.addStyleTag({ content: '.eruda-container, .eruda, #eruda { display: none !important; }' }); } catch (_) {}

  // Esperar app-shell
  try {
    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      return shell && !shell.hidden;
    }, { timeout: 10000 });
  } catch (_) {}

  await page.waitForTimeout(2000);

  const fase3 = await runFase3(page, tag);
  const fase4 = await runFase4Tasks(page, tag);

  await ctx.close();

  return { viewport, tag, fase3, fase4, events };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const mobile = await runViewport(browser, { width: 414, height: 896 }, 'mobile');
  const desktop = await runViewport(browser, { width: 1280, height: 800 }, 'desktop');

  const summarize = (r) => ({
    tag: r.tag,
    fase3Ok: r.fase3.filter(x => x.ok).length + '/' + r.fase3.length,
    fase4Steps: r.fase4.map(s => `${s.step}:${s.ok ? 'OK' : 'FAIL'}`).join(' | '),
    pageErrors: r.events.filter(e => e.kind === 'pageerror').length,
    consoleErrors: r.events.filter(e => e.kind === 'console' && e.level === 'error').length,
    dialogs: r.events.filter(e => e.kind === 'dialog').length
  });

  const report = {
    timestamp: new Date().toISOString(),
    target: TARGET,
    summary: { mobile: summarize(mobile), desktop: summarize(desktop) },
    mobile, desktop
  };

  fs.writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(report.summary, null, 2));

  await browser.close();
  console.log('=== AUDIT v4 COMPLETE ===');
  console.log(JSON.stringify(report.summary, null, 2));
})();
