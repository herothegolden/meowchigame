// src/utils/apiService.js - Optimized API service for TMA
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

class APICache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, data, duration = 30000) { // 30s default TTL
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + duration);
  }

  get(key) {
    if (this.ttl.get(key) > Date.now()) {
      console.log(`🎯 Cache HIT: ${key}`);
      return this.cache.get(key);
    }
    this.cache.delete(key);
    this.ttl.delete(key);
    return null;
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}

const apiCache = new APICache();

export class OptimizedAPIService {
  static timeout = 5000; // 5s timeout for TMA
  
  // Optimized fetch with timeout, retry, and caching
  static async request(endpoint, options = {}, cacheKey = null, cacheDuration = 30000) {
    const start = performance.now();
    
    // Check cache first
    if (cacheKey) {
      const cached = apiCache.get(cacheKey);
      if (cached) {
        console.log(`⚡ Cached response: ${Math.round(performance.now() - start)}ms`);
        return cached;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const defaultOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options
    };

    try {
      console.log(`🚀 API Request: ${endpoint}`);
      
      const response = await fetch(`${BACKEND_URL}${endpoint}`, defaultOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Math.round(performance.now() - start);
      
      console.log(`✅ API Response: ${endpoint} - ${duration}ms`);
      
      // Cache successful responses
      if (cacheKey && response.ok) {
        apiCache.set(cacheKey, data, cacheDuration);
      }

      // Performance warning for TMA
      if (duration > 300) {
        console.warn(`⚠️ SLOW API: ${endpoint} took ${duration}ms (TMA target: <200ms)`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: ${endpoint} (>${this.timeout}ms)`);
      }
      
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // Fast user validation with aggressive caching
  static async validateUser(initData) {
    const cacheKey = `user_${initData.slice(-10)}`;
    
    return this.request('/api/validate', {
      body: JSON.stringify({ initData })
    }, cacheKey, 60000); // 1min cache for user data
  }

  // Combined profile data fetch (reduces API calls)
  static async getProfileData(initData) {
    const cacheKey = `profile_${initData.slice(-10)}`;
    
    // NEW: Single endpoint for all profile data
    return this.request('/api/profile-complete', {
      body: JSON.stringify({ initData })
    }, cacheKey, 45000); // 45s cache
  }

  // Shop data with longer cache (rarely changes)
  static async getShopData(initData) {
    const cacheKey = `shop_${initData.slice(-10)}`;
    
    return this.request('/api/get-shop-data', {
      body: JSON.stringify({ initData })
    }, cacheKey, 120000); // 2min cache for shop items
  }

  // Leaderboard with moderate caching
  static async getLeaderboard(initData, type = 'global') {
    const cacheKey = `leaderboard_${type}_${initData.slice(-10)}`;
    
    return this.request('/api/get-leaderboard', {
      body: JSON.stringify({ initData, type })
    }, cacheKey, 30000); // 30s cache
  }

  // Non-cached operations (real-time)
  static async updateScore(initData, score, duration, itemsUsed) {
    apiCache.clear(); // Clear cache after score update
    
    return this.request('/api/update-score', {
      body: JSON.stringify({ initData, score, duration, itemsUsed })
    });
  }

  static async buyItem(initData, itemId) {
    apiCache.clear(); // Clear cache after purchase
    
    return this.request('/api/buy-item', {
      body: JSON.stringify({ initData, itemId })
    });
  }

  // Prefetch critical data
  static async prefetchCriticalData(initData) {
    console.log('🚀 Prefetching critical TMA data...');
    
    const promises = [
      this.validateUser(initData),
      this.getShopData(initData)
    ];

    try {
      await Promise.allSettled(promises);
      console.log('✅ Critical data prefetched');
    } catch (error) {
      console.warn('⚠️ Prefetch partial failure:', error);
    }
  }
}
