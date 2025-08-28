// public/sw.js - Service Worker for instant loading
const CACHE_NAME = 'meowchi-v1.2'; // Incremented version

// Assets to pre-cache for an instant, offline-first experience
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/splash.jpg',
  // NOTE: Vite generates hashed assets. These are placeholders.
  // In a real build pipeline, you'd inject the actual filenames here.
  '/assets/index.js', 
  '/assets/index.css',
  '/sfx/coin.wav',
  '/sfx/match_pop.wav',
  '/sfx/finish_win.wav',
  '/sfx/swap.wav'
];

// Install event: pre-cache core assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching core assets');
        // Use addAll for atomic caching. If one fails, none are cached.
        // We use individual add calls with catch to prevent one bad asset from failing the whole cache.
        const cachePromises = CORE_ASSETS.map(asset => {
          return cache.add(asset).catch(err => {
            console.warn(`Failed to cache ${asset}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
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
      .then(() => self.clients.claim())
  );
});

// Fetch event: cache-first for core assets, network-first for others
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache hit: return cached response immediately
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache: go to network
        return fetch(event.request).then((networkResponse) => {
          // If we got a valid response, clone it and cache it
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Offline fallback for documents
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});
