/**
 * Notificacoes Locais - Lumiere Life Manager
 * Mostra notificacoes contextuais quando a app e aberta.
 */
import { dataManager } from '../core/dataManager.js';
import { showToast } from '../components/toast/toast.js';

const KEY_LAST_NOTIF = 'lumiereLastNotification';
const MIN_INTERVAL_MS = 90 * 60 * 1000; // 1.5 horas

function todayYMD() {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(fromYmd, toYmd) {
  const a = new Date(fromYmd);
  const b = new Date(toYmd);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
}

function shouldNotify() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
  const last = localStorage.getItem(KEY_LAST_NOTIF);
  if (!last) return true;
  return (Date.now() - parseInt(last, 10)) > MIN_INTERVAL_MS;
}

function markNotified() {
  localStorage.setItem(KEY_LAST_NOTIF, String(Date.now()));
}

async function showNotification(title, body) {
  // Toast in-app (funciona mesmo sem permissao)
  try { showToast({ type: 'info', title: title, body: body, duration: 4000 }); } catch (e) {}

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body: body,
        icon: './public/icons/android-chrome-192x192.png',
        badge: './public/icons/android-chrome-192x192.png',
        tag: 'lumiere-ctx',
        silent: false,
        vibrate: [200, 100, 200]
      });
      markNotified();
      console.log('[NotifLocal] Mostrada:', title);
      return;
    }
  } catch (e) { /* fallback */ }
  try {
    new Notification(title, {
      body: body,
      icon: './public/icons/android-chrome-192x192.png',
      tag: 'lumiere-ctx'
    });
    markNotified();
    console.log('[NotifLocal] Mostrada (fallback):', title);
  } catch (e) {
    console.warn('[NotifLocal] Erro ao mostrar:', e);
  }
}

function calcularProgressoObjetivo(goal, milestones, tasks) {
  const msTotal = milestones.length;
  const msDone = milestones.filter(m => m.status === 'completed').length;
  const tTotal = tasks.length;
  const tDone = tasks.filter(t => t.status === 'completed').length;
  let pct = 0;
  if (msTotal > 0 && tTotal > 0) {
    pct = (msDone / msTotal) * 60 + (tDone / tTotal) * 40;
  } else if (msTotal > 0) {
    pct = (msDone / msTotal) * 100;
  } else if (tTotal > 0) {
    pct = (tDone / tTotal) * 100;
  } else {
    pct = Number(goal.progress) || 0;
  }
  return Math.round(Math.max(0, Math.min(100, pct)));
}

function objetivoMaisUrgente(goals, milestones, tasks) {
  const today = todayYMD();
  const ativos = (goals || []).filter(g =>
    g.status !== 'archived' && g.status !== 'completed' && g.targetDate
  );
  if (ativos.length === 0) return null;

  const candidatos = ativos.map(g => {
    const gMilestones = (milestones || []).filter(m => m.goalId === g.id);
    const gTasks = (tasks || []).filter(t => t.goalId === g.id);
    const pct = calcularProgressoObjetivo(g, gMilestones, gTasks);
    const dias = daysBetween(today, g.targetDate);
    return { goal: g, pct: pct, dias: dias };
  }).filter(c => c.dias > 0 && c.pct < 80);

  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => a.dias - b.dias);
  return candidatos[0];
}

async const STREAK_THRESHOLDS = [30, 10, 5];
const KEY_LAST_STREAK = 'lumiereLastStreakNotif';

function calcStreakSimple(habit, logs) {
  const dowMap = ['sun','mon','tue','wed','thu','fri','sat'];
  const daysOfWeek = Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek : [];
  const isApplicable = (d) => daysOfWeek.length === 0 || daysOfWeek.includes(dowMap[d.getDay()]);
  const doneDates = new Set((logs || []).filter(l => l.completed).map(l => l.date));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let isFirst = true;
  for (let i = 0; i < 365; i++) {
    const ymd = cursor.getFullYear() + '-' + String(cursor.getMonth()+1).padStart(2,'0') + '-' + String(cursor.getDate()).padStart(2,'0');
    if (isApplicable(cursor)) {
      if (doneDates.has(ymd)) streak++;
      else if (isFirst) { /* hoje ainda nao marcado, nao quebra */ }
      else break;
    }
    isFirst = false;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getLastStreakNotif() {
  try {
    const raw = localStorage.getItem(KEY_LAST_STREAK);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function setLastStreakNotif(obj) {
  try { localStorage.setItem(KEY_LAST_STREAK, JSON.stringify(obj)); } catch (e) { /* noop */ }
}

async function buildStreakNotification() {
  try {
    const habits = await dataManager.list('habits');
    const logs = await dataManager.list('habitLogs');
    const memory = getLastStreakNotif();

    for (const h of (habits || [])) {
      if (h.status !== 'active') continue;
      const streak = calcStreakSimple(h, logs);
      if (streak < 5) continue;

      // Encontrar o maior threshold atingido
      const threshold = STREAK_THRESHOLDS.find(t => streak >= t);
      if (!threshold) continue;

      // Ja notificamos este threshold para este habito?
      if (memory[h.id] === threshold) continue;

      memory[h.id] = threshold;
      setLastStreakNotif(memory);
      return {
        title: '\uD83D\uDD25 ' + streak + ' dias seguidos!',
        body: h.name + ' \u2022 Continua assim'
      };
    }
  } catch (e) { /* noop */ }
  return null;
}

function buildPriorityNotification() {
  const today = todayYMD();

  // 1. Tarefas com prazo hoje
  try {
    const tasks = await dataManager.list('tasks');
    const pendentes = (tasks || []).filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' &&
      t.dueDate && t.dueDate <= today
    );
    if (pendentes.length > 0) {
      const extra = pendentes.length > 1 ? ' (+' + (pendentes.length - 1) + ' mais)' : '';
      return {
        title: 'Tens ' + pendentes.length + ' tarefa' + (pendentes.length > 1 ? 's' : '') + ' para hoje',
        body: pendentes[0].name + extra
      };
    }
  } catch (e) { /* noop */ }

  // 2. Habitos nao marcados
  try {
    const habits = await dataManager.list('habits');
    const logs = await dataManager.list('habitLogs');
    const dow = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const done = new Set(
      (logs || []).filter(l => l.date === today && l.completed).map(l => l.habitId)
    );
    const pendentes = (habits || []).filter(h => {
      if (h.status !== 'active') return false;
      const days = Array.isArray(h.daysOfWeek) ? h.daysOfWeek : [];
      if (days.length > 0 && !days.includes(dow)) return false;
      return !done.has(h.id);
    });
    if (pendentes.length > 0) {
      return {
        title: pendentes.length + ' habito' + (pendentes.length > 1 ? 's' : '') + ' para hoje',
        body: pendentes.slice(0, 3).map(h => h.name).join(' \u2022 ')
      };
    }
  } catch (e) { /* noop */ }

  // 3. Objetivo a precisar de atencao
  try {
    const goals = await dataManager.list('goals');
    const milestones = await dataManager.list('goalMilestones');
    const tasks = await dataManager.list('tasks');
    const urgente = objetivoMaisUrgente(goals, milestones, tasks);
    if (urgente) {
      const meses = Math.round(urgente.dias / 30);
      const prazo = meses > 1 ? 'Faltam ' + meses + ' meses' : 'Faltam ' + urgente.dias + ' dias';
      return {
        title: 'Objetivo: ' + urgente.goal.name,
        body: urgente.pct + '% \u2022 ' + prazo
      };
    }
  } catch (e) { /* noop */ }

  // 4. Prazos proximos (2-3 dias)
  try {
    const tasks = await dataManager.list('tasks');
    const proximas = (tasks || []).filter(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (!t.dueDate || t.dueDate <= today) return false;
      return daysBetween(today, t.dueDate) <= 3;
    });
    if (proximas.length > 0) {
      const dias = daysBetween(today, proximas[0].dueDate);
      return {
        title: 'Prazo em ' + dias + ' dia' + (dias > 1 ? 's' : ''),
        body: proximas[0].name
      };
    }
  } catch (e) { /* noop */ }

  // 5. Streak atingido (5/10/30)
  const streakNotif = await buildStreakNotification();
  if (streakNotif) return streakNotif;

  // 6. 7 dias sem registar notas
  try {
    const notes = await dataManager.list('notes');
    if (!notes || notes.length === 0) {
      // Sem notas nunca — primeira nota
      return {
        title: 'Ainda nao tens notas',
        body: 'Regista a primeira ideia ou reflexao'
      };
    }
    const latest = notes.reduce((max, n) => {
      const d = n.updatedAt || n.createdAt || '';
      return d > max ? d : max;
    }, '');
    if (latest) {
      const days = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
      if (days >= 7) {
        return {
          title: 'Faz ' + days + ' dias sem notas',
          body: 'Uma reflexao diaria ajuda a clarear'
        };
      }
    }
  } catch (e) { /* noop */ }

  return null;
}

export async function initLocalNotifications() {
  if (typeof Notification === 'undefined') {
    console.log('[NotifLocal] API nao disponivel');
    return;
  }
  if (Notification.permission !== 'granted') {
    console.log('[NotifLocal] Sem permissao');
    return;
  }
  if (!shouldNotify()) {
    console.log('[NotifLocal] Intervalo minimo nao atingido');
    return;
  }
  setTimeout(async () => {
    try {
      const notif = await buildPriorityNotification();
      if (notif) {
        await showNotification(notif.title, notif.body);
      } else {
        console.log('[NotifLocal] Nada para notificar');
      }
    } catch (e) {
      console.warn('[NotifLocal] Erro:', e);
    }
  }, 3000);
}

export default { initLocalNotifications };
