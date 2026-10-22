// src/custom-sw.js
// 2026-08-20 ZYPPAR-STYLE SERVICE WORKER — the app's ONE service worker.
// It exists so Chrome/Safari/Edge treat LoopKeeper as installable (a
// registered SW + manifest + icons; a fetch handler is NOT part of the
// criteria and never was required). It does NOT cache or intercept
// responses; the UpdatesService clears caches and unregisters it during an
// update, so the user always gets the fresh bundle.
// 2026-10-22 BUILD 373: the no-op fetch handler is GONE (founder directive;
// Chrome warned "No-op fetch handler may bring overhead during navigation").
// No fetch listener at all = zero navigation overhead, same installability.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
