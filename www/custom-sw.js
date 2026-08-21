// src/custom-sw.js
// 2026-08-20 ZYPPAR-STYLE SERVICE WORKER — the app's ONE service worker.
// It exists so Chrome/Safari/Edge treat OpenLoop as installable (a SW with a
// fetch handler is part of the PWA install criteria). It does NOT cache or
// intercept responses itself; the UpdatesService clears caches and unregisters
// it during an update, so the user always gets the fresh bundle.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// No-op fetch handler — required for installability, deliberately passthrough
// so we never serve stale content.
self.addEventListener('fetch', (event) => {
  // pass through — no interception
});

self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
        .then(() => {
          const client = event.source;
          if (client && client.postMessage) {
            client.postMessage({ type: 'CACHES_CLEARED' });
          }
        })
        .catch(() => {})
    );
  }
});
