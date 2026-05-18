const CACHE_NAME='workhours-v7';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
