// public/sw.js - Service Worker for instant loading
const CACHE_NAME = 'meowchi-v1.1';

// Install event - skip waiting for immediate activation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - network-first with cache fallback for optimal performance
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - let them go to network
  if (event.request.url.includes('/api/')) return;

  // Skip external requests (fonts, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Offline or network failed → try cache
        const cached = await caches.match(event.request);
        if (cached) {
          console.log('📦 Served from cache:', event.request.url);
          return cached;
        }

        // Fallback shell for navigations
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }

        // Return a generic offline response for other requests
        return new Response('Offline', { 
          status: 503, 
          statusText: 'Service Unavailable' 
        });
      })
  );
});
