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

const CACHE_NAME = 'lumiere-cache-v177';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './CSS/main.css',
  './CSS/splash.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of OFFLINE_URLS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Falhou cache:', url, e.message);
        }
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
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Handler de Push Notifications (preparado para o futuro)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Lumière', body: 'Nova notificação' };
  try {
    payload = event.data.json();
  } catch (e) {
    payload.body = event.data.text();
  }
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
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});
