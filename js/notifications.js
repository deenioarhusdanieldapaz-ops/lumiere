/**
 * Painel de notificações — sino do topbar.
 * Lê lembretes (reminders) e eventos (calendarEvents) do IndexedDB.
 *
 * Uso:
 *   import { notifications } from './notifications.js';
 *   await notifications.init();
 */

import { dataManager } from '../core/dataManager.js';

let isOpen = false;

function formatRelative(isoString) {
  if (!isoString) return '';
  const now = Date.now();
  const date = new Date(isoString).getTime();
  if (Number.isNaN(date)) return '';

  const diffMs = date - now;
  const diffMin = Math.round(diffMs / 60000);
  const diffH   = Math.round(diffMs / 3600000);
  const diffD   = Math.round(diffMs / 86400000);

  const absMin = Math.abs(diffMin);
  if (absMin < 1)  return 'agora';
  if (absMin < 60) return diffMin > 0 ? `em ${diffMin} min` : `há ${absMin} min`;

  const absH = Math.abs(diffH);
  if (absH < 24) return diffH > 0 ? `em ${diffH}h` : `há ${absH}h`;

  const absD = Math.abs(diffD);
  if (absD === 1)  return diffD > 0 ? 'amanhã' : 'ontem';
  if (absD < 7)    return diffD > 0 ? `em ${absD} dias` : `há ${absD} dias`;

  const d = new Date(isoString);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

export const notifications = {
  async init() {
    const btn   = document.getElementById('btn-bell');
    const panel = document.getElementById('notif-panel');
    if (!btn || !panel) {
      console.warn('[Notif] Elementos nao encontrados no DOM');
      return;
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen) this.close();
      else this.open();
    });

    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      const p = document.getElementById('notif-panel');
      const b = document.getElementById('btn-bell');
      if (!p || !b) return;
      if (p.contains(e.target) || b.contains(e.target)) return;
      this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) this.close();
    });

    console.log('[Notif] Painel inicializado');
  },

  async open() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.hidden = false;
    isOpen = true;
    await this.populate();
  },

  close() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.hidden = true;
    isOpen = false;
  },

  async populate() {
    const list  = document.getElementById('notif-list');
    const empty = document.getElementById('notif-empty');
    const badge = document.querySelector('.app-topbar__badge');
    if (!list) return;

    // Ler as duas coleções
    let reminders = [];
    let events = [];
    try { reminders = await dataManager.list('reminders'); } catch (err) { reminders = []; }
    try { events = await dataManager.list('calendarEvents'); } catch (err) { events = []; }

    // Início do dia de hoje (para filtrar eventos)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Lembretes pendentes
    const pendingReminders = (Array.isArray(reminders) ? reminders : [])
      .filter(r => r && !r.done && r.datetime)
      .map(r => ({ type: 'reminder', title: r.title, datetime: r.datetime }));

    // Eventos de hoje para a frente (inclusive já passados hoje)
    const upcomingEvents = (Array.isArray(events) ? events : [])
      .filter(e => e && e.start && e.start >= startOfToday)
      .map(e => ({ type: 'event', title: e.title, datetime: e.start }));

    // Juntar, ordenar por data, limitar a 5
    const all = [...pendingReminders, ...upcomingEvents]
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .slice(0, 5);

    // Badge só se houver itens
    if (badge) badge.hidden = all.length === 0;

    list.innerHTML = '';

    if (all.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    for (const item of all) {
      const li = document.createElement('li');
      li.className = 'app-notif__item';

      const t = document.createElement('div');
      t.className = 'app-notif__title';
      t.textContent = item.title || '(sem título)';
      li.appendChild(t);

      const m = document.createElement('div');
      m.className = 'app-notif__meta';
      const typeLabel = item.type === 'event' ? 'Evento' : 'Lembrete';
      m.textContent = typeLabel + ' · ' + formatRelative(item.datetime);
      li.appendChild(m);

      list.appendChild(li);
    }
  }
};

export default notifications;
