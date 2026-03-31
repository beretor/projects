const CACHE = 'drydays-v1';
const ASSETS = [
    '/alcohol-tracker/',
    '/alcohol-tracker/index.html',
    '/alcohol-tracker/styles.css',
    '/alcohol-tracker/app.js',
    '/alcohol-tracker/manifest.json',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Only cache GET requests for our own assets
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});

// Push notification received
self.addEventListener('push', event => {
    const data = event.data?.json() || {
        title: 'Dry Days',
        body: 'As-tu saisi ta conso d\'aujourd\'hui ?',
    };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/alcohol-tracker/icon-192.png',
            badge: '/alcohol-tracker/icon-192.png',
            vibrate: [100, 50, 100],
            data: { url: '/alcohol-tracker/' },
        })
    );
});

// Tap on notification → open app
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || '/alcohol-tracker/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes('alcohol-tracker') && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
