// ============================================================
// SERVICE WORKER — HealthPro v7.0 (dev kill-switch)
// Self-unregisters and clears all caches. Re-enable after dev.
// ============================================================

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
  })());
});

self.addEventListener('fetch', () => { /* pass through to network */ });
