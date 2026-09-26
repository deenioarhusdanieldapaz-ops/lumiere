// ============================================================
// Firebase Cloud Messaging
// ============================================================
importScripts('./firebase-config-sw.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp(self.LUMIERE_FIREBASE_CONFIG);
const fcmMessaging = firebase.messaging();

fcmMessaging.onBackgroundMessage((payload) => {
  console.log('[SW] FCM background message:', payload);
  const title = (payload.notification && payload.notification.title) || 'Lumiere';
  const options = {
    body: (payload.notification && payload.notification.body) || 'Nova notificacao',
    icon: './public/icons/android-chrome-192x192.png',
    badge: './public/icons/android-chrome-192x192.png'
  };
  self.registration.showNotification(title, options);
});

// ============================================================
// Cache / Offline
// ============================================================
const CACHE_NAME = 'lumiere-cache-v182';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './CSS/fonts.css',
  './CSS/main.css',
  './CSS/splash.css',
  './CSS/onboarding.css',
  './CSS/layout/app-shell.css',
  './CSS/themes/index.css',
  './CSS/themes/auto.css',
  './CSS/themes/lumiere.css',
  './CSS/themes/noir.css',
  './js/app.js',
  './js/splash.js',
  './js/icons.js',
  './js/i18n.js',
  './js/navigation.js',
  './js/notifications.js',
  './js/notifications-local.js',
  './js/onboarding.js',
  './core/index.js',
  './core/core.js',
  './core/dataManager.js',
  './core/stateManager.js',
  './core/eventBus.js',
  './core/storageManager.js',
  './core/calculationsManager.js',
  './core/intelligence/insights.js',
  './core/intelligence/lumiereIndex.js',
  './core/intelligence/priorities.js',
  './core/intelligence/recommendations.js',
  './data/contracts/index.js',
  './components/index.js',
  './components/floating-action/floatingAction.js',
  './components/floating-action/floatingAction.css',
  './pages/tasks/tasks.js',
  './pages/tasks/tasks.css',
  './pages/habits/habits.js',
  './pages/habits/habits.css',
  './pages/goals/goals.js',
  './pages/goals/goals.css',
  './pages/studies/studies.js',
  './pages/studies/studies.css',
  './pages/finances/finances.js',
  './pages/finances/finances.css',
  './pages/notes/notes.js',
  './pages/notes/notes.css',
  './pages/calendar/calendar.js',
  './pages/calendar/calendar.css',
  './pages/lumiere/lumiere.js',
  './pages/lumiere/lumiere.css',
  './pages/settings/settings.js',
  './pages/settings/settings.css',
  './pages/profile/profile.js',
  './pages/profile/profile.css',
  './pages/cards/overview/overview.js',
  './pages/cards/overview/overview.css',
  './pages/cards/progress/progress.js',
  './pages/cards/progress/progress.css',
  './pages/cards/mainGoal/mainGoal.js',
  './pages/cards/mainGoal/mainGoal.css',
  './pages/cards/lumiere/lumiere.js',
  './pages/cards/lumiere/lumiere.css',
  './pages/cards/finances/finances.js',
  './pages/cards/finances/finances.css',
  './pages/cards/today/today.js',
  './pages/cards/today/today.css',
  './pages/cards/weeklyProgress/weeklyProgress.js',
  './pages/cards/weeklyProgress/weeklyProgress.css',
  './pages/cards/insights/insights.js',
  './pages/cards/insights/insights.css',
  './pages/cards/reports/reports.js',
  './pages/cards/reports/reports.css',
  './components/cards/card.js',
  './components/cards/card.css',
  './components/menu/menu.js',
  './components/menu/menu.css',
  './components/sheet/sheet.js',
  './components/sheet/sheet.css',
  './components/empty-state/emptyState.js',
  './components/empty-state/emptyState.css',
  './components/progress/progress.js',
  './components/progress/progress.css',
  './components/progress-ring/progressRing.js',
  './components/progress-ring/progressRing.css',
  './components/stat-row/statRow.js',
  './components/stat-row/statRow.css',
  './components/context-line/contextLine.js',
  './components/context-line/contextLine.css',
  './components/bar-chart/barChart.js',
  './components/bar-chart/barChart.css',
  './components/line-chart/lineChart.js',
  './components/line-chart/lineChart.css',
  './components/mini-card/miniCard.js',
  './components/mini-card/miniCard.css',
  './firebase-config-sw.js',
  './vendor/dexie.mjs',
  './public/icons/android-chrome-192x192.png',
  './public/icons/android-chrome-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of OFFLINE_URLS) {
        try { await cache.add(url); }
        catch (e) { console.warn('[SW] Falhou cache:', url); }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Handler de Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Lumiere', body: 'Nova notificacao' };
  try { payload = event.data.json(); } catch (e) { payload.body = event.data.text(); }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './public/icons/android-chrome-192x192.png',
      badge: './public/icons/android-chrome-192x192.png',
      data: payload.data || {}
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('./');
    })
  );
});
