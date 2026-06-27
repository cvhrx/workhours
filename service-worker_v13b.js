const CACHE='workhours-v13b';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('workhours-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
