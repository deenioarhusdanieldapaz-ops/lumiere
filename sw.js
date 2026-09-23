const CACHE_NAME = 'lumiere-cache-v171';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './CSS/main.css',
  './CSS/splash.css',
  './js/app.js',
  './js/splash.js',
  './js/icons.js',
  './js/notifications.js',
  './public/brand/master/lumiere-mark-v1-raw.svg',
  './public/icons/favicon.ico',
  './public/icons/favicon-16x16.png',
  './public/icons/favicon-32x32.png',
  './public/icons/favicon-48x48.png',
  './public/icons/apple-touch-icon.png',
  './public/icons/android-chrome-192x192.png',
  './public/icons/android-chrome-512x512.png',
  './components/stat-row/statRow.css',
  './components/stat-row/statRow.js',
  './pages/cards/overview/overview.css',
  './pages/cards/overview/overview.js',
  './pages/cards/progress/progress.css',
  './pages/cards/progress/progress.js',
  './pages/cards/mainGoal/mainGoal.css',
  './pages/cards/mainGoal/mainGoal.js',
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
  './components/context-line/contextLine.js',
  './components/context-line/contextLine.css',
  './pages/cards/reports/reports.js',
  './pages/cards/reports/reports.css',
  './public/brand/master/splash-bg.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
