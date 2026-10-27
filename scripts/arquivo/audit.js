// audit.js v4.1 — Fase 3 expandida + Fase 4 (tasks, habits, notes)
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
    try { await page.waitForSelector(sel, { state: 'hidden', timeout: 800 }); return true; }
    catch { return false; }
  }
}

async function navigateTo(page, pageName) {
  const matches = page.locator(`[data-page="${pageName}"]`);
  const count = await matches.count();
  for (let i = 0; i < count; i++) {
    const el = matches.nth(i);
    try {
      if (!await el.isVisible({ timeout: 300 })) continue;
      await el.click({ timeout: 3000 });
      return { ok: true };
    } catch (_) {}
  }
  return { ok: false, error: 'sem elemento visível' };
}

async function ensureSidebarOpen(page) {
  try {
    const toggle = page.locator('.app-topbar__toggle').first();
    if (await toggle.isVisible({ timeout: 800 })) {
      await toggle.click({ timeout: 1500 });
      await page.waitForTimeout(600);
    }
  } catch (_) {}
}

async function openFormBy(page, newBtnSel, formSel) {
  const btn = page.locator(newBtnSel).first();
  if (!await btn.isVisible({ timeout: 2500 }).catch(() => false)) return { ok: false, skip: true, error: 'sem botão new' };
  try { await btn.click({ timeout: 3000 }); } catch (e) { return { ok: false, error: 'click: ' + e.message.slice(0, 100) }; }
  const appeared = await waitFor(page, formSel, 4000);
  if (!appeared) return { ok: false, skip: true, error: 'form não apareceu (outro UI?)' };
  return { ok: true };
}

async function closeFormBy(page, formSel) {
  const cancel = page.locator(`${formSel} button[type="button"]`).first();
  if (!await cancel.isVisible({ timeout: 2000 }).catch(() => false)) return { ok: false, error: 'sem botão cancelar' };
  try { await cancel.click({ timeout: 2000 }); } catch (e) { return { ok: false, error: e.message.slice(0, 100) }; }
  const gone = await waitGone(page, formSel, 3000);
  return { ok: gone, error: gone ? null : 'form não fechou' };
}

async function runFase3(page, tag) {
  const entities = [
    { name: 'tasks',     newBtn: '.tasks-btn--primary',     form: '.tasks-form' },
    { name: 'habits',    newBtn: '.habits-btn--primary',    form: '.habits-form' },
    { name: 'notes',     newBtn: '.notes-btn--primary',     form: '.notes-form' },
    { name: 'goals',     newBtn: '.goals-btn--primary',     form: '.goals-form' },
    { name: 'calendar',  newBtn: '.calendar-btn--primary',  form: '.calendar-form' },
    { name: 'finances',  newBtn: '.finances-btn--primary',  form: '.finances-form' },
    { name: 'lumiere',   newBtn: '.lumiere-btn--primary',   form: '.lumiere-form' },
    { name: 'templates', newBtn: '.templates-btn--primary', form: '.templates-form' }
  ];
  const results = [];

  for (const e of entities) {
    await ensureSidebarOpen(page);
    const nav = await navigateTo(page, e.name);
    if (!nav.ok) {
      results.push({ entity: e.name, status: 'FAIL', step: 'navigate', error: nav.error });
      continue;
    }
    await page.waitForTimeout(900);

    const opened = await openFormBy(page, e.newBtn, e.form);
    if (!opened.ok && opened.skip) {
      results.push({ entity: e.name, status: 'SKIP', step: 'open', error: opened.error });
      continue;
    }
    if (!opened.ok) {
      results.push({ entity: e.name, status: 'FAIL', step: 'open', error: opened.error });
      continue;
    }
    await page.screenshot({ path: `${OUT}/screenshots/${tag}-p3-${safeName(e.name)}-open.png`, fullPage: false });

    const closed = await closeFormBy(page, e.form);
    results.push({ entity: e.name, status: closed.ok ? 'OK' : 'FAIL', step: 'open+close', error: closed.error });
    if (closed.ok) await page.screenshot({ path: `${OUT}/screenshots/${tag}-p3-${safeName(e.name)}-closed.png`, fullPage: false });
    await page.waitForTimeout(400);
  }
  return results;
}

const CRUD_CONFIG = {
  tasks: {
    newBtn: '.tasks-btn--primary',
    form: '.tasks-form',
    submit: '.tasks-form button[type="submit"]',
    fields: [{ sel: '#task-name', value: '[audit] Tarefa de teste' }],
    itemSel: 'article.task-item',
    nameText: '[audit] Tarefa de teste'
  },
  habits: {
    newBtn: '.habits-btn--primary',
    form: '.habits-form',
    submit: '.habits-form button[type="submit"]',
    fields: [{ sel: '#habit-name', value: '[audit] Hábito de teste' }],
    itemSel: 'article.habit-item',
    nameText: '[audit] Hábito de teste'
  },
  notes: {
    newBtn: '.notes-btn--primary',
    form: '.notes-form',
    submit: '.notes-form button[type="submit"]',
    fields: [
      { sel: '#note-title',   value: '[audit] Nota de teste' },
      { sel: '#note-content', value: 'Conteúdo automático de teste.' }
    ],
    itemSel: 'article.note-item',
    nameText: '[audit] Nota de teste'
  }
};

async function runFase4Entity(page, tag, entity, cfg) {
  const results = [];

  await ensureSidebarOpen(page);
  const nav = await navigateTo(page, entity);
  if (!nav.ok) return [{ step: 'navigate', ok: false, error: nav.error }];
  await page.waitForTimeout(900);

  const beforeCount = await page.locator(cfg.itemSel).count();
  results.push({ step: 'initial-count', ok: true, count: beforeCount });

  const opened = await openFormBy(page, cfg.newBtn, cfg.form);
  if (!opened.ok) return [...results, { step: 'open', ok: false, error: opened.error }];
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-p4-${safeName(entity)}-form.png`, fullPage: false });

  for (const f of cfg.fields) {
    try { await page.fill(f.sel, f.value, { timeout: 3000 }); }
    catch (e) { return [...results, { step: 'fill:' + f.sel, ok: false, error: String(e.message).slice(0, 150) }]; }
  }

  try { await page.locator(cfg.submit).first().click({ timeout: 3000 }); }
  catch (e) { return [...results, { step: 'submit', ok: false, error: String(e.message).slice(0, 150) }]; }

  const formGone = await waitGone(page, cfg.form, 4000);
  results.push({ step: 'form-closed-after-submit', ok: formGone });

  let itemAppeared = false;
  try {
    await page.waitForFunction(
      (a) => Array.from(document.querySelectorAll(a.sel)).some(el => (el.textContent || '').includes(a.text)),
      { sel: cfg.itemSel, text: cfg.nameText },
      { timeout: 5000 }
    );
    itemAppeared = true;
  } catch (_) {}
  results.push({ step: 'item-appeared', ok: itemAppeared });
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-p4-${safeName(entity)}-created.png`, fullPage: false });
  if (!itemAppeared) return results;

  const testItem = page.locator(cfg.itemSel).filter({ hasText: cfg.nameText }).first();
  const visible = await testItem.isVisible({ timeout: 2000 }).catch(() => false);
  results.push({ step: 'find-test-item', ok: visible });
  if (!visible) return results;

  let deleted = false;
  try {
    let btn = testItem.locator('button[aria-label*="pagar" i], button[aria-label*="delete" i]').first();
    if (await btn.count() === 0) btn = testItem.locator('button').last();
    await btn.click({ timeout: 3000 });
    deleted = true;
  } catch (e) {
    results.push({ step: 'click-delete', ok: false, error: String(e.message).slice(0, 150) });
  }
  results.push({ step: 'click-delete', ok: deleted });
  if (!deleted) return results;

  let gone = false;
  try {
    await page.waitForFunction(
      (a) => !Array.from(document.querySelectorAll(a.sel)).some(el => (el.textContent || '').includes(a.text)),
      { sel: cfg.itemSel, text: cfg.nameText },
      { timeout: 5000 }
    );
    gone = true;
  } catch (_) {}
  results.push({ step: 'item-gone-after-delete', ok: gone });
  await page.screenshot({ path: `${OUT}/screenshots/${tag}-p4-${safeName(entity)}-deleted.png`, fullPage: false });
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
      localStorage.setItem('lumierePreferences', JSON.stringify({ theme: 'noir', goldIntensity: 'balanced', interfaceSize: 'balanced' }));
    } catch (_) {}
  });

  const page = await ctx.newPage();

  page.on('dialog', async (dialog) => {
    events.push({ ts: ts(), tag, kind: 'dialog', type: dialog.type(), message: dialog.message().slice(0, 200) });
    try { await dialog.accept(); } catch (_) {}
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.startsWith('[FAB]') || text.startsWith('[NotifLocal]')) return;
    events.push({ ts: ts(), tag, kind: 'console', level: msg.type(), text: text.slice(0, 300) });
  });
  page.on('pageerror', (err) => {
    events.push({ ts: ts(), tag, kind: 'pageerror', message: String(err.message || err).slice(0, 400) });
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('eruda')) return;
    events.push({ ts: ts(), tag, kind: 'requestfailed', url: req.url(), failure: req.failure()?.errorText || 'unknown' });
  });

  try { await page.goto(TARGET + '?audit=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 }); }
  catch (e) { events.push({ ts: ts(), tag, kind: 'navigationError', message: String(e.message) }); }

  try { await page.addStyleTag({ content: '.eruda-container, .eruda, #eruda { display: none !important; }' }); } catch (_) {}

  try {
    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      return shell && !shell.hidden;
    }, { timeout: 10000 });
  } catch (_) {}
  await page.waitForTimeout(2000);

  const fase3 = await runFase3(page, tag);

  const fase4 = {};
  for (const entity of ['tasks', 'habits', 'notes']) {
    fase4[entity] = await runFase4Entity(page, tag, entity, CRUD_CONFIG[entity]);
    await page.waitForTimeout(600);
  }

  await ctx.close();
  return { viewport, tag, fase3, fase4, events };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const mobile = await runViewport(browser, { width: 414, height: 896 }, 'mobile');
  const desktop = await runViewport(browser, { width: 1280, height: 800 }, 'desktop');

  const summarise = (r) => {
    const f3 = r.fase3.reduce((acc, x) => { acc[x.status] = (acc[x.status] || 0) + 1; return acc; }, {});
    const f4 = {};
    for (const k of Object.keys(r.fase4)) {
      const steps = r.fase4[k];
      const failures = steps.filter(s => !s.ok);
      f4[k] = failures.length === 0 ? 'OK' : 'FAIL(' + failures.map(s => s.step).join(',') + ')';
    }
    return {
      tag: r.tag,
      fase3: f3,
      fase4: f4,
      pageErrors: r.events.filter(e => e.kind === 'pageerror').length,
      consoleErrors: r.events.filter(e => e.kind === 'console' && e.level === 'error').length,
      dialogs: r.events.filter(e => e.kind === 'dialog').length
    };
  };

  const report = {
    timestamp: new Date().toISOString(),
    target: TARGET,
    summary: { mobile: summarise(mobile), desktop: summarise(desktop) },
    mobile, desktop
  };

  fs.writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(report.summary, null, 2));

  await browser.close();
  console.log('=== AUDIT v4.1 COMPLETE ===');
  console.log(JSON.stringify(report.summary, null, 2));
})();
