const CACHE_NAME='workhours-v11g';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
