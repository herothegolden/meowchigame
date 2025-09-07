// src/utils/apiService.js - FRONTEND-ONLY OPTIMIZATION
// Works with your existing backend without any backend changes

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

class APICache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, data, duration = 60000) { // 1 minute default
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + duration);
    console.log(`💾 Cache SET: ${key} (TTL: ${duration/1000}s)`);
  }

  get(key) {
    const expiry = this.ttl.get(key);
    if (expiry && expiry > Date.now()) {
      console.log(`🎯 Cache HIT: ${key}`);
      return this.cache.get(key);
    }
    // Expired - remove from cache
    this.cache.delete(key);
    this.ttl.delete(key);
    console.log(`⏰ Cache MISS/EXPIRED: ${key}`);
    return null;
  }

  clear() {
    console.log(`🧹 Cache CLEARED: ${this.cache.size} items`);
    this.cache.clear();
    this.ttl.clear();
  }

  stats() {
    const valid = Array.from(this.ttl.entries()).filter(([key, expiry]) => expiry > Date.now());
    console.log(`📊 Cache Stats: ${valid.length}/${this.cache.size} valid items`);
    return { total: this.cache.size, valid: valid.length };
  }
}

const apiCache = new APICache();

export class OptimizedAPIService {
  static timeout = 10000; // 10s timeout for Railway cold starts
  
  static async request(endpoint, options = {}, cacheKey = null, cacheDuration = 60000) {
    const start = performance.now();
    
    // ⚡ AGGRESSIVE CACHING - Check cache first
    if (cacheKey) {
      const cached = apiCache.get(cacheKey);
      if (cached) {
        const duration = Math.round(performance.now() - start);
        console.log(`⚡ CACHE HIT: ${endpoint} - ${duration}ms`);
        return cached;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const defaultOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache' // Prevent browser caching conflicts
      },
      signal: controller.signal,
      ...options
    };

    try {
      console.log(`🚀 API REQUEST: ${endpoint}`);
      
      const response = await fetch(`${BACKEND_URL}${endpoint}`, defaultOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Math.round(performance.now() - start);
      
      console.log(`✅ API SUCCESS: ${endpoint} - ${duration}ms`);
      
      // 🚀 CACHE SUCCESSFUL RESPONSES AGGRESSIVELY
      if (cacheKey && response.ok && duration < 5000) { // Only cache if not too slow
        apiCache.set(cacheKey, data, cacheDuration);
      }

      // Performance warnings for TMA
      if (duration > 800) {
        console.warn(`⚠️ SLOW API: ${endpoint} took ${duration}ms`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Math.round(performance.now() - start);
      
      if (error.name === 'AbortError') {
        console.error(`⏰ TIMEOUT: ${endpoint} after ${this.timeout}ms`);
        throw new Error(`Request timeout: ${endpoint}`);
      }
      
      console.error(`❌ API ERROR: ${endpoint} - ${duration}ms`, error.message);
      throw error;
    }
  }

  // 🚀 OPTIMIZED: User validation with 2-minute cache
  static async validateUser(initData) {
    const userHash = initData.slice(-8); // Short hash for cache key
    const cacheKey = `user_${userHash}`;
    
    return this.request('/api/validate', {
      body: JSON.stringify({ initData })
    }, cacheKey, 120000); // 2 minute cache
  }

  // 🚀 OPTIMIZED: Profile data with smart caching
  static async getProfileData(initData) {
    const userHash = initData.slice(-8);
    
    // Use existing endpoints but with aggressive caching
    const [statsKey, shopKey] = [`stats_${userHash}`, `shop_${userHash}`];
    
    try {
      console.log('🚀 Loading profile with cached parallel calls...');
      
      // Parallel cached calls - much faster than sequential
      const [statsRes, shopDataRes] = await Promise.all([
        this.request('/api/user-stats', {
          body: JSON.stringify({ initData })
        }, statsKey, 90000), // 1.5 min cache
        
        this.request('/api/get-shop-data', {
          body: JSON.stringify({ initData })
        }, shopKey, 180000) // 3 min cache (shop data changes rarely)
      ]);
      
      return {
        stats: statsRes,
        inventory: shopDataRes.inventory || [],
        shop_items: shopDataRes.items || [],
        boosterActive: shopDataRes.boosterActive || false,
        owned_badges: shopDataRes.ownedBadges || []
      };
      
    } catch (error) {
      console.error('Profile data loading failed:', error);
      throw error;
    }
  }

  // 🚀 OPTIMIZED: Shop data with 5-minute cache
  static async getShopData(initData) {
    const userHash = initData.slice(-8);
    const cacheKey = `shop_${userHash}`;
    
    return this.request('/api/get-shop-data', {
      body: JSON.stringify({ initData })
    }, cacheKey, 300000); // 5 minute cache
  }

  // 🚀 OPTIMIZED: Leaderboard with 1-minute cache
  static async getLeaderboard(initData, type = 'global') {
    const userHash = initData.slice(-8);
    const cacheKey = `leaderboard_${type}_${userHash}`;
    
    return this.request('/api/get-leaderboard', {
      body: JSON.stringify({ initData, type })
    }, cacheKey, 60000); // 1 minute cache
  }

  // 🚀 NO CACHE: Real-time operations
  static async updateScore(initData, score, duration, itemsUsed) {
    // Clear user-specific cache after score update
    const userHash = initData.slice(-8);
    const keysToRemove = [`user_${userHash}`, `stats_${userHash}`, `shop_${userHash}`];
    keysToRemove.forEach(key => {
      apiCache.cache.delete(key);
      apiCache.ttl.delete(key);
    });
    
    console.log('🧹 Cleared user cache after score update');
    
    return this.request('/api/update-score', {
      body: JSON.stringify({ initData, score, duration, itemsUsed })
    });
  }

  static async buyItem(initData, itemId) {
    // Clear user-specific cache after purchase
    const userHash = initData.slice(-8);
    const keysToRemove = [`user_${userHash}`, `stats_${userHash}`, `shop_${userHash}`];
    keysToRemove.forEach(key => {
      apiCache.cache.delete(key);
      apiCache.ttl.delete(key);
    });
    
    console.log('🧹 Cleared user cache after purchase');
    
    return this.request('/api/buy-item', {
      body: JSON.stringify({ initData, itemId })
    });
  }

  // 🚀 SMART PREFETCH: Load critical data in background
  static async prefetchCriticalData(initData) {
    console.log('🚀 Background prefetch started...');
    
    try {
      // Prefetch shop data (most stable and cacheable)
      await this.getShopData(initData);
      console.log('✅ Shop data prefetched');
    } catch (error) {
      console.warn('⚠️ Prefetch failed (non-critical):', error.message);
    }
  }

  // 🚀 CACHE MANAGEMENT
  static getCacheStats() {
    return apiCache.stats();
  }

  static clearCache() {
    apiCache.clear();
  }
}
