// src/utils/apiService.js - SIMPLIFIED & FAST for TMA
// Removed complex caching that was causing slowdowns

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// SIMPLE IN-MEMORY CACHE - Only for stable data
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, data, duration = 30000) { // 30s default
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + duration);
  }

  get(key) {
    const expiry = this.ttl.get(key);
    if (expiry && expiry > Date.now()) {
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

const cache = new SimpleCache();

export class OptimizedAPIService {
  static timeout = 8000; // Reduced from 10s to 8s
  
  // SIMPLIFIED: Basic request function without complex caching
  static async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const defaultOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, defaultOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: ${endpoint}`);
      }
      
      throw error;
    }
  }

  // FAST: User validation with minimal caching
  static async validateUser(initData) {
    const cacheKey = `user_${initData.slice(-8)}`;
    
    // Only cache for 30 seconds
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('🎯 Using cached user data');
      return cached;
    }
    
    const result = await this.request('/api/validate', {
      body: JSON.stringify({ initData })
    });
    
    cache.set(cacheKey, result, 30000); // 30s cache
    return result;
  }

  // SIMPLIFIED: Profile data without complex parallel optimization
  static async getProfileData(initData) {
    // Try new optimized endpoint first
    try {
      return await this.request('/api/profile-complete', {
        body: JSON.stringify({ initData })
      });
    } catch (error) {
      // Fallback to old endpoints if new one doesn't exist
      console.log('Using fallback profile loading...');
      
      const [statsRes, shopDataRes] = await Promise.all([
        this.request('/api/user-stats', {
          body: JSON.stringify({ initData })
        }),
        this.request('/api/get-shop-data', {
          body: JSON.stringify({ initData })
        })
      ]);
      
      return {
        stats: statsRes,
        inventory: shopDataRes.inventory || [],
        shop_items: shopDataRes.items || [],
        boosterActive: shopDataRes.boosterActive || false,
        owned_badges: shopDataRes.ownedBadges || []
      };
    }
  }

  // FAST: Shop data with light caching
  static async getShopData(initData) {
    const cacheKey = `shop_${initData.slice(-8)}`;
    
    // Cache shop data for 2 minutes (changes rarely)
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('🎯 Using cached shop data');
      return cached;
    }
    
    const result = await this.request('/api/get-shop-data', {
      body: JSON.stringify({ initData })
    });
    
    cache.set(cacheKey, result, 120000); // 2 min cache
    return result;
  }

  // FAST: Leaderboard with minimal caching
  static async getLeaderboard(initData, type = 'global') {
    const cacheKey = `leaderboard_${type}`;
    
    // Cache leaderboard for 1 minute
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('🎯 Using cached leaderboard');
      return cached;
    }
    
    const result = await this.request('/api/get-leaderboard', {
      body: JSON.stringify({ initData, type })
    });
    
    cache.set(cacheKey, result, 60000); // 1 min cache
    return result;
  }

  // NO CACHE: Real-time operations
  static async updateScore(initData, score, duration, itemsUsed) {
    // Clear relevant caches after score update
    const userHash = initData.slice(-8);
    cache.cache.delete(`user_${userHash}`);
    cache.cache.delete(`shop_${userHash}`);
    
    return this.request('/api/update-score', {
      body: JSON.stringify({ initData, score, duration, itemsUsed })
    });
  }

  static async buyItem(initData, itemId) {
    // Clear relevant caches after purchase
    const userHash = initData.slice(-8);
    cache.cache.delete(`user_${userHash}`);
    cache.cache.delete(`shop_${userHash}`);
    
    return this.request('/api/buy-item', {
      body: JSON.stringify({ initData, itemId })
    });
  }

  static async activateItem(initData, itemId) {
    // Clear relevant caches after activation
    const userHash = initData.slice(-8);
    cache.cache.delete(`user_${userHash}`);
    cache.cache.delete(`shop_${userHash}`);
    
    return this.request('/api/activate-item', {
      body: JSON.stringify({ initData, itemId })
    });
  }

  // REMOVED: Complex prefetch that was slowing down initial load
  
  // SIMPLE: Cache management
  static clearCache() {
    cache.clear();
    console.log('🧹 Cache cleared');
  }
}

// Export for backward compatibility
export default OptimizedAPIService;
