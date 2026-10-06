/**
 * Daily Review — Sheet de 3 passos
 * Ouve 'dailyReview:shouldOpen' e apresenta:
 *   1. Como correu o dia? (humor 1-5 + nota opcional)
 *   2. O que concluíste hoje? (checklist auto-preenchido)
 *   3. Adiar para amanhã? (tarefas pendentes)
 */
import { eventBus } from '../../core/eventBus.js';
import { dataManager } from '../../core/dataManager.js';
import { dailyReviewTrigger } from '../../js/dailyReviewTrigger.js';

let _isOpen = false;
let _root = null;

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function tomorrowYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function ymdOf(iso) { return iso ? String(iso).split('T')[0] : ''; }

async function collectToday() {
  const [tasks, habits, habitLogs] = await Promise.all([
    dataManager.list('tasks'),
    dataManager.list('habits'),
    dataManager.list('habitLogs')
  ]);
  const today = todayYMD();

  const completedTasks = tasks.filter(t => {
    const d = ymdOf(t.dueDate) || ymdOf(t.startDate);
    return d === today && t.status === 'completed';
  });
  const pendingTasks = tasks.filter(t => {
    const d = ymdOf(t.dueDate) || ymdOf(t.startDate);
    return d === today && t.status !== 'completed' && t.status !== 'cancelled';
  });

  const doneLogs = habitLogs.filter(l => l.date === today && l.completed);
  const doneHabitIds = new Set(doneLogs.map(l => l.habitId));
  const completedHabits = habits.filter(h => doneHabitIds.has(h.id));

  return { completedTasks, pendingTasks, completedHabits };
}

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function buildModal() {
  const backdrop = el('div', 'dr-backdrop');
  const modal = el('div', 'dr-modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  // Header
  const header = el('div', 'dr-header');
  const title = el('h2', 'dr-title', 'Fechar o dia');
  const closeBtn = el('button', 'dr-close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Fechar');
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Steps indicator
  const indicator = el('div', 'dr-indicator');
  for (let i = 1; i <= 3; i++) {
    const dot = el('div', 'dr-indicator__dot');
    dot.dataset.step = String(i);
    indicator.appendChild(dot);
  }
  modal.appendChild(indicator);

  // Body
  const body = el('div', 'dr-body');

  // Step 1
  const step1 = el('section', 'dr-step');
  step1.dataset.step = '1';
  const s1title = el('h3', 'dr-step__title', 'Como correu o dia?');
  const moodRow = el('div', 'dr-mood');
  const moodEmojis = ['😞', '😕', '😐', '🙂', '😄'];
  const moodButtons = [];
  for (let i = 0; i < 5; i++) {
    const b = el('button', 'dr-mood__btn', moodEmojis[i]);
    b.type = 'button';
    b.dataset.mood = String(i + 1);
    moodRow.appendChild(b);
    moodButtons.push(b);
  }
  const noteArea = document.createElement('textarea');
  noteArea.className = 'dr-note';
  noteArea.placeholder = 'Nota rápida (opcional)';
  noteArea.rows = 3;
  step1.appendChild(s1title);
  step1.appendChild(moodRow);
  step1.appendChild(noteArea);
  body.appendChild(step1);

  // Step 2
  const step2 = el('section', 'dr-step');
  step2.dataset.step = '2';
  const s2title = el('h3', 'dr-step__title', 'O que concluíste hoje?');
  const s2list = el('div', 'dr-list');
  s2list.id = 'dr-completed-list';
  step2.appendChild(s2title);
  step2.appendChild(s2list);
  body.appendChild(step2);

  // Step 3
  const step3 = el('section', 'dr-step');
  step3.dataset.step = '3';
  const s3title = el('h3', 'dr-step__title', 'Adiar para amanhã?');
  const s3list = el('div', 'dr-list');
  s3list.id = 'dr-pending-list';
  step3.appendChild(s3title);
  step3.appendChild(s3list);
  body.appendChild(step3);

  modal.appendChild(body);

  // Footer
  const footer = el('div', 'dr-footer');
  const btnPrev = el('button', 'dr-btn dr-btn--ghost', 'Anterior');
  btnPrev.type = 'button';
  btnPrev.dataset.action = 'prev';
  const btnDismiss = el('button', 'dr-btn dr-btn--ghost', 'Adiar');
  btnDismiss.type = 'button';
  btnDismiss.dataset.action = 'dismiss';
  const btnNext = el('button', 'dr-btn dr-btn--primary', 'Continuar');
  btnNext.type = 'button';
  btnNext.dataset.action = 'next';
  footer.appendChild(btnPrev);
  footer.appendChild(btnDismiss);
  footer.appendChild(btnNext);
  modal.appendChild(footer);

  backdrop.appendChild(modal);
  return { backdrop, modal, closeBtn, moodButtons, noteArea, s2list, s3list, indicator, btnPrev, btnDismiss, btnNext };
}

function renderChecklist(container, items, kind) {
  container.innerHTML = '';
  if (!items.length) {
    const empty = el('p', 'dr-empty', kind === 'task' ? 'Nenhuma tarefa concluída hoje.' : 'Nenhum hábito marcado hoje.');
    container.appendChild(empty);
    return;
  }
  for (const it of items) {
    const row = el('label', 'dr-item');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.id = it.id;
    cb.dataset.kind = kind;
    const name = el('span', 'dr-item__name', it.name || it.title || '(sem nome)');
    row.appendChild(cb);
    row.appendChild(name);
    container.appendChild(row);
  }
}

function renderPending(container, tasks) {
  container.innerHTML = '';
  if (!tasks.length) {
    container.appendChild(el('p', 'dr-empty', 'Nada pendente para hoje. 👌'));
    return;
  }
  for (const t of tasks) {
    const row = el('label', 'dr-item');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = false;
    cb.dataset.id = t.id;
    cb.dataset.kind = 'defer';
    const name = el('span', 'dr-item__name', t.name || '(sem nome)');
    row.appendChild(cb);
    row.appendChild(name);
    container.appendChild(row);
  }
}

async function openReview(reason) {
  if (_isOpen) return;
  _isOpen = true;

  const refs = buildModal();
  _root = refs.backdrop;
  document.body.appendChild(refs.backdrop);
  requestAnimationFrame(() => refs.backdrop.classList.add('is-open'));

  const state = {
    step: 1,
    mood: null,
    note: '',
    data: await collectToday()
  };

  // Preencher listas
  const combinedCompleted = [
    ...state.data.completedTasks.map(t => ({ ...t, _kind: 'task' })),
    ...state.data.completedHabits.map(h => ({ ...h, _kind: 'habit' }))
  ];
  renderChecklist(refs.s2list, combinedCompleted, 'task');
  renderPending(refs.s3list, state.data.pendingTasks);

  const updateUI = () => {
    refs.modal.querySelectorAll('.dr-step').forEach(s => {
      s.classList.toggle('is-active', Number(s.dataset.step) === state.step);
    });
    refs.indicator.querySelectorAll('.dr-indicator__dot').forEach(d => {
      const n = Number(d.dataset.step);
      d.classList.toggle('is-done', n < state.step);
      d.classList.toggle('is-active', n === state.step);
    });
    refs.btnPrev.style.visibility = state.step > 1 ? 'visible' : 'hidden';
    refs.btnNext.textContent = state.step === 3 ? 'Guardar' : 'Continuar';
  };

  // Mood buttons
  refs.moodButtons.forEach(b => {
    b.addEventListener('click', () => {
      refs.moodButtons.forEach(x => x.classList.remove('is-selected'));
      b.classList.add('is-selected');
      state.mood = Number(b.dataset.mood);
    });
  });

  // Note
  refs.noteArea.addEventListener('input', () => { state.note = refs.noteArea.value; });

  // Navigation
  const closeAll = (dismissed) => {
    refs.backdrop.classList.remove('is-open');
    setTimeout(() => {
      if (refs.backdrop.parentNode) refs.backdrop.parentNode.removeChild(refs.backdrop);
      _root = null;
      _isOpen = false;
    }, 250);
    if (dismissed) dailyReviewTrigger.markDismissed();
  };

  refs.closeBtn.addEventListener('click', () => closeAll(true));
  refs.btnDismiss.addEventListener('click', () => closeAll(true));

  refs.btnPrev.addEventListener('click', () => {
    if (state.step > 1) { state.step--; updateUI(); }
  });

  refs.btnNext.addEventListener('click', async () => {
    if (state.step < 3) {
      // Validar step 1
      if (state.step === 1 && !state.mood) {
        // Shake visual
        refs.modal.querySelector('.dr-mood').classList.add('dr-shake');
        setTimeout(() => refs.modal.querySelector('.dr-mood').classList.remove('dr-shake'), 400);
        return;
      }
      state.step++;
      updateUI();
      return;
    }
    // Step 3 → Guardar
    try {
      const completedIds = Array.from(refs.s2list.querySelectorAll('input:checked')).map(i => i.dataset.id);
      const deferredIds = Array.from(refs.s3list.querySelectorAll('input:checked')).map(i => i.dataset.id);

      const payload = {
        date: todayYMD(),
        mood: state.mood || 3,
        completedTaskIds: state.data.completedTasks.filter(t => completedIds.includes(t.id)).map(t => t.id),
        completedHabitIds: state.data.completedHabits.filter(h => completedIds.includes(h.id)).map(h => h.id),
        deferredTaskIds: deferredIds,
        note: state.note || ''
      };

      await dataManager.create('dailyReviews', payload);

      // Adiar tarefas selecionadas
      const tomorrow = tomorrowYMD();
      for (const id of deferredIds) {
        try { await dataManager.update('tasks', id, { dueDate: tomorrow }); } catch (e) { console.warn('[DailyReview] Falha ao adiar', id, e); }
      }

      dailyReviewTrigger.markCompleted();
      eventBus.emit('dailyReview:completed', payload);
      closeAll(false);
      eventBus.emit('toast:show', { type: 'success', text: 'Revisão guardada. Bom descanso!' });
    } catch (e) {
      console.error('[DailyReview] Erro ao guardar:', e);
      eventBus.emit('toast:show', { type: 'error', text: 'Não foi possível guardar a revisão.' });
    }
  });

  updateUI();
}

export function initDailyReview() {
  eventBus.on('dailyReview:shouldOpen', (payload) => {
    openReview(payload && payload.reason ? payload.reason : 'janela');
  });
}

export default { initDailyReview };
