/**
 * Daily Review Trigger
 *
 * Decide se a Revisão Diária deve abrir nesta sessão.
 * Não desenha UI — emite evento 'dailyReview:shouldOpen' quando aplicável.
 *
 * Regras (definidas pelo utilizador):
 *  - Hora mínima: 18h por defeito (configurável em localStorage)
 *  - Janela: hora mínima até à meia-noite
 *  - Uma vez por dia: após guardar, não reaparece
 *  - Reaparece se fechou sem guardar
 *  - Acumula até 3 dias
 *  - Trigger em qualquer página
 */

const KEY_LAST_DATE = 'lumiereLastDailyReviewDate';
const KEY_PENDING = 'lumiereDailyReviewPending';
const KEY_HOUR = 'lumiereDailyReviewHour';
const DEFAULT_HOUR = 18;
const MAX_DAYS_LOOKBACK = 3;

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getConfiguredHour() {
  try {
    const raw = localStorage.getItem(KEY_HOUR);
    if (raw === null) return DEFAULT_HOUR;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0 || n > 23) return DEFAULT_HOUR;
    return n;
  } catch (_) {
    return DEFAULT_HOUR;
  }
}

function setConfiguredHour(hour) {
  const n = parseInt(hour, 10);
  if (isNaN(n) || n < 0 || n > 23) return false;
  try {
    localStorage.setItem(KEY_HOUR, String(n));
    return true;
  } catch (_) {
    return false;
  }
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

function getLastReviewDate() {
  try {
    return localStorage.getItem(KEY_LAST_DATE) || null;
  } catch (_) {
    return null;
  }
}

function isPending() {
  try {
    return localStorage.getItem(KEY_PENDING) === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Decide se deve abrir agora.
 * @returns {{open: boolean, reason: string, pendingDays: number}}
 */
function shouldOpen() {
  const now = new Date();
  const hour = now.getHours();
  const configuredHour = getConfiguredHour();
  const today = todayYMD();
  const last = getLastReviewDate();

  // Já fez hoje? Não abre.
  if (last === today) {
    return { open: false, reason: 'ja-feito-hoje', pendingDays: 0 };
  }

  // Fora da janela? Não abre.
  if (hour < configuredHour) {
    return { open: false, reason: 'antes-da-hora', pendingDays: 0 };
  }

  // Calcular dias pendentes (desde a última revisão feita)
  let pendingDays = 1;
  if (last) {
    const diff = daysBetween(last, today);
    pendingDays = Math.max(1, Math.min(diff, MAX_DAYS_LOOKBACK));
  }

  // Se estávamos pendentes (fechou sem guardar), reabrir mesmo que ainda não seja hora
  if (isPending()) {
    return { open: true, reason: 'pendente', pendingDays };
  }

  return { open: true, reason: 'janela-aberta', pendingDays };
}

function markShown() {
  try { localStorage.setItem(KEY_LAST_DATE, todayYMD()); } catch (_) {}
}

function markCompleted() {
  try {
    localStorage.setItem(KEY_LAST_DATE, todayYMD());
    localStorage.setItem(KEY_PENDING, 'false');
  } catch (_) {}
}

function markDismissed() {
  // Fechou sem guardar → fica pendente, reaparece na próxima navegação
  try { localStorage.setItem(KEY_PENDING, 'true'); } catch (_) {}
}

function clearPending() {
  try { localStorage.setItem(KEY_PENDING, 'false'); } catch (_) {}
}

/**
 * Agenda uma verificação após o bootstrap.
 * Emite 'dailyReview:shouldOpen' se aplicável.
 * A UI (Bloco 3) ouve este evento.
 */
function scheduleCheck(eventBus) {
  if (!eventBus) {
    console.warn('[DailyReview] eventBus não fornecido');
    return;
  }
  // Aguarda 1.5s para não competir com o splash/carregamento inicial
  setTimeout(() => {
    const decision = shouldOpen();
    if (decision.open) {
      try {
        eventBus.emit('dailyReview:shouldOpen', {
          reason: decision.reason,
          pendingDays: decision.pendingDays,
          date: todayYMD()
        });
      } catch (e) {
        console.warn('[DailyReview] Falha ao emitir evento:', e);
      }
    } else {
      console.log('[DailyReview] Não abre:', decision.reason);
    }
  }, 1500);
}

export const dailyReviewTrigger = {
  shouldOpen,
  markShown,
  markCompleted,
  markDismissed,
  clearPending,
  getConfiguredHour,
  setConfiguredHour,
  scheduleCheck,
  todayYMD,
  _keys: { KEY_LAST_DATE, KEY_PENDING, KEY_HOUR, DEFAULT_HOUR }
};

export default dailyReviewTrigger;
