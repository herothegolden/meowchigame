// 🚀 INSTANT LOADING - What makes popular apps feel so fast
// All top Telegram apps load instantly because of aggressive caching

// 1. CREATE public/sw.js (Service Worker)
const CACHE_NAME = 'meowchi-v1.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/splash.jpg',
  '/sfx/swap.wav',
  '/sfx/match_pop.wav', 
  '/sfx/coin.wav',
  '/sfx/combo_x1.wav',
  '/sfx/combo_x2.wav',
  '/sfx/combo_x3.wav',
  '/sfx/combo_x4.wav',
  // Avatar images
  'https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png',
  'https://i.postimg.cc/3rDn1Ztt/Zizi.png',
  'https://i.postimg.cc/N0MxH8y7/Chacha.png',
  'https://i.postimg.cc/fLSjHwfV/Tofu.png',
  'https://i.postimg.cc/yYHXPCgN/Boba.png',
  'https://i.postimg.cc/YCX6M4X4/Oreo.png',
  'https://i.postimg.cc/XNw9X1H6/Ginger.png'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ All assets cached');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
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

// Fetch event - serve from cache first (like all popular apps)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls - let them go to network
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('📦 Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network and cache it
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response (can only be consumed once)
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('📦 Caching new asset:', event.request.url);
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 2. UPDATE your main.jsx to register service worker
// Add this at the top of main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Register Service Worker for instant loading (like popular apps)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration);
      })
      .catch((error) => {
        console.log('❌ SW registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// 3. ADD PRELOADING - Update your App.jsx
// Add this hook to preload critical assets while user is on splash screen
const useAssetPreloading = () => {
  useEffect(() => {
    // Preload critical images while splash is showing
    const criticalImages = [
      'https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png',
      'https://i.postimg.cc/3rDn1Ztt/Zizi.png',
      'https://i.postimg.cc/N0MxH8y7/Chacha.png'
    ];
    
    criticalImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
    
    // Preload critical sounds
    if (settings?.sound) {
      const criticalSounds = ['/sfx/match_pop.wav', '/sfx/coin.wav'];
      criticalSounds.forEach(src => {
        const audio = new Audio(src);
        audio.preload = 'auto';
      });
    }
  }, []);
};

// 4. ADD PROGRESSIVE LOADING - Update your vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    host: true,
    port: 3000
  },
  build: { 
    outDir: 'dist',
    sourcemap: false,
    // Code splitting for faster initial loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate game engine from main bundle
          'game': ['./src/GameView.jsx'],
          // Separate UI components  
          'components': ['./src/Home.jsx', './src/Leaderboard.jsx', './src/EnhancedProfileModal.jsx'],
          // Separate audio system
          'audio': ['./src/audio.js']
        }
      }
    },
    // Enable compression
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    }
  }
})

// 5. ADD LOADING STATES - Update your components to show immediate feedback
// Replace loading spinners with skeleton screens (like popular apps)

const LeaderboardSkeleton = () => (
  <div className="leaderboard-list">
    {Array(10).fill().map((_, i) => (
      <div key={i} className="leaderboard-item skeleton">
        <div className="skeleton-rank"></div>
        <div className="skeleton-info">
          <div className="skeleton-name"></div>
          <div className="skeleton-stats"></div>
        </div>
        <div className="skeleton-score"></div>
      </div>
    ))}
  </div>
);

const GameSkeleton = () => (
  <div className="board skeleton-board">
    <div className="skeleton-stats-row"></div>
    <div className="skeleton-grid">
      {Array(36).fill().map((_, i) => (
        <div key={i} className="skeleton-tile"></div>
      ))}
    </div>
    <div className="skeleton-controls"></div>
  </div>
);

// Add these skeleton styles to your index.css
const skeletonStyles = `
/* Skeleton loading animations - makes app feel instant */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-rank {
  width: 40px;
  height: 20px;
  border-radius: 4px;
  background: #f0f0f0;
}

.skeleton-name {
  width: 120px;
  height: 16px;
  border-radius: 4px;
  background: #f0f0f0;
  margin-bottom: 4px;
}

.skeleton-stats {
  width: 80px;
  height: 12px;
  border-radius: 4px;
  background: #f0f0f0;
}

.skeleton-score {
  width: 60px;
  height: 20px;
  border-radius: 4px;
  background: #f0f0f0;
}

.skeleton-tile {
  aspect-ratio: 1;
  border-radius: 8px;
  background: #f0f0f0;
}
`;

// 6. INSTANT FEEDBACK - Add optimistic updates
// When user performs actions, update UI immediately before server response
const optimisticGameComplete = (gameResult) => {
  // Update coins immediately (before server confirmation)
  setCoins(prev => prev + gameResult.coins);
  
  // Update user stats optimistically
  setUserStats(prev => ({
    ...prev,
    games_played: (prev?.games_played || 0) + 1,
    total_coins_earned: (prev?.total_coins_earned || 0) + gameResult.coins,
    best_score: Math.max(prev?.best_score || 0, gameResult.score),
    best_combo: Math.max(prev?.best_combo || 0, gameResult.max_combo)
  }));
  
  // Then sync with server
  submitGameScore(gameResult);
};
