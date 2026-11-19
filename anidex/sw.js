// Anidex was renamed to Animore. This worker replaces the old one on installed apps:
// it clears the old caches, unregisters itself and sends open windows to the new address.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  const wins = await self.clients.matchAll({ type: 'window' });
  wins.forEach(c => c.navigate('/animore/'));
})()));
