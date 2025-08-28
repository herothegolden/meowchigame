// public/sw.js - Service Worker for instant loading
const CACHE_NAME = 'meowchi-v1.2';

// Critical assets to pre-cache for instant loading
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/splash.jpg',
  // Sound effects for game
  '/sfx/cascade_tick.wav',
  '/sfx/coin.wav',
  '/sfx/combo_x1.wav',
  '/sfx/combo_x2.wav',
  '/sfx/combo_x3.wav',
  '/sfx/combo_x4.wav',
  '/sfx/finish_lose.wav',
  '/sfx/finish_win.wav',
  '/sfx/match_pop.wav',
  '/sfx/powerup_spawn.wav',
  '/sfx/swap.wav',
  '/sfx/swap_invalid.wav',
  '/sfx/timer_hurry.wav',
  '/sfx/timer_tick.wav'
];

// Install event - pre-cache critical assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Pre-caching core assets...');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ Core assets pre-cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.warn('⚠️ Pre-caching failed for some assets:', error);
        return self.skipWaiting(); // Continue even if some assets fail
      })
  );
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

// Fetch event - cache-first for static assets, network-first for dynamic content
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - let them go to network (always fresh data)
  if (event.request.url.includes('/api/')) return;

  // Skip external requests (fonts, CDN, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache-first strategy for static assets
        if (cachedResponse) {
          console.log('⚡ Served from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses for future use
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed and not in cache
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }

            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});
