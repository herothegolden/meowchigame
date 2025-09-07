// ===== STEP 1: CREATE src/utils/performance.js =====
// New file for performance monitoring

export class PerformanceMonitor {
  static timers = new Map();
  static metrics = [];

  static startTimer(label) {
    this.timers.set(label, {
      startTime: performance.now(),
      startMemory: performance.memory ? performance.memory.usedJSHeapSize : 0
    });
    console.log(`🚀 Started: ${label}`);
  }

  static endTimer(label) {
    const timer = this.timers.get(label);
    if (!timer) {
      console.warn(`⚠️ Timer '${label}' not found`);
      return;
    }

    const duration = performance.now() - timer.startTime;
    const memoryUsed = performance.memory ? 
      (performance.memory.usedJSHeapSize - timer.startMemory) / 1024 / 1024 : 0;

    const metric = {
      label,
      duration: Math.round(duration),
      memoryUsed: Math.round(memoryUsed * 100) / 100,
      timestamp: new Date().toISOString()
    };

    this.metrics.push(metric);
    this.timers.delete(label);

    console.log(`✅ ${label}: ${metric.duration}ms (${metric.memoryUsed}MB)`);
    
    // Send to Telegram for debugging
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(
        `${label}: ${metric.duration}ms`
      );
    }

    return metric;
  }

  static getReport() {
    const report = {
      totalMetrics: this.metrics.length,
      averageLoadTime: this.getAverageLoadTime(),
      slowestOperations: this.getSlowestOperations(),
      memoryUsage: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };

    console.table(this.metrics);
    return report;
  }

  static getAverageLoadTime() {
    const loadTimes = this.metrics
      .filter(m => m.label.includes('Load') || m.label.includes('Fetch'))
      .map(m => m.duration);
    
    return loadTimes.length > 0 
      ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
      : 0;
  }

  static getSlowestOperations() {
    return this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
  }

  static getMemoryUsage() {
    return this.metrics
      .filter(m => m.memoryUsed > 0)
      .reduce((total, m) => total + m.memoryUsed, 0);
  }

  static async testNetworkLatency() {
    const start = performance.now();
    
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/health`, {
        method: 'GET',
        cache: 'no-cache'
      });
      
      const latency = performance.now() - start;
      console.log(`🌐 Network latency: ${Math.round(latency)}ms`);
      return latency;
    } catch (error) {
      console.error('❌ Network test failed:', error);
      return -1;
    }
  }
}

// ===== STEP 2: UPDATE src/pages/HomePage.jsx =====
// Add this to your existing HomePage.jsx

import { PerformanceMonitor } from '../utils/performance';

// Replace existing fetchUserData function with this instrumented version:
const fetchUserData = async () => {
  try {
    PerformanceMonitor.startTimer('HomePage_TotalLoad');
    
    if (!tg || !tg.initData || !BACKEND_URL) {
      console.log('Running in browser mode. Using mock data.');
      setConnectionStatus('Demo mode - using mock data');
      setUser(MOCK_USER_DATA);
      setIsConnected(false);
      setLoading(false);
      PerformanceMonitor.endTimer('HomePage_TotalLoad');
      return;
    }
    
    console.log('Fetching user data from backend...');
    setConnectionStatus('Fetching user data...');
    
    // Test network latency first
    await PerformanceMonitor.testNetworkLatency();
    
    PerformanceMonitor.startTimer('HomePage_APICall');
    tg.ready();
    
    const res = await fetch(`${BACKEND_URL}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData }),
    });
    
    PerformanceMonitor.endTimer('HomePage_APICall');

    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }

    PerformanceMonitor.startTimer('HomePage_DataProcessing');
    const userData = await res.json();
    console.log('User data received:', userData);
    
    setUser(userData);
    setConnectionStatus('Connected to server');
    setIsConnected(true);
    PerformanceMonitor.endTimer('HomePage_DataProcessing');

    // Check for and display the daily bonus
    if (userData.dailyBonus) {
      showBonusPopup(userData.dailyBonus);
    }

  } catch (err) {
    console.error('Error fetching user data:', err);
    setError(`Failed to fetch user data: ${err.message}`);
    setConnectionStatus(`Error: ${err.message} - Using demo mode`);
    
    // Fallback to mock data
    setUser(MOCK_USER_DATA);
    setIsConnected(false);
  } finally {
    setLoading(false);
    PerformanceMonitor.endTimer('HomePage_TotalLoad');
    
    // Show performance report in console
    setTimeout(() => {
      const report = PerformanceMonitor.getReport();
      console.log('📊 HomePage Performance Report:', report);
    }, 1000);
  }
};

// ===== STEP 3: UPDATE src/pages/ProfilePage.jsx =====
// Add this to your existing ProfilePage.jsx

import { PerformanceMonitor } from '../utils/performance';

// Replace existing fetchProfileData function:
const fetchProfileData = useCallback(async () => {
  try {
    PerformanceMonitor.startTimer('ProfilePage_TotalLoad');
    
    if (!tg?.initData || !BACKEND_URL) {
      console.log('Demo mode: Using mock profile data');
      PerformanceMonitor.startTimer('ProfilePage_MockData');
      setProfileData({
        stats: MOCK_STATS,
        inventory: [],
        allItems: MOCK_ITEMS,
        boosterActive: false,
        ownedBadges: []
      });
      setIsConnected(false);
      setLoading(false);
      PerformanceMonitor.endTimer('ProfilePage_MockData');
      PerformanceMonitor.endTimer('ProfilePage_TotalLoad');
      return;
    }

    console.log('Fetching real profile data...');
    
    // Test network latency
    await PerformanceMonitor.testNetworkLatency();

    PerformanceMonitor.startTimer('ProfilePage_ParallelAPICalls');
    
    // Fetch both user stats and shop/inventory data in parallel
    const [statsRes, shopDataRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/user-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      }),
      fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      })
    ]);
    
    PerformanceMonitor.endTimer('ProfilePage_ParallelAPICalls');

    if (!statsRes.ok || !shopDataRes.ok) {
      throw new Error('Failed to fetch profile data.');
    }

    PerformanceMonitor.startTimer('ProfilePage_DataProcessing');
    const stats = await statsRes.json();
    const shopData = await shopDataRes.json();
    
    console.log('Profile data loaded:', { stats, shopData });
    
    setProfileData({
      stats,
      inventory: shopData.inventory,
      allItems: shopData.items,
      boosterActive: shopData.boosterActive,
      ownedBadges: shopData.ownedBadges || []
    });
    
    setIsConnected(true);
    PerformanceMonitor.endTimer('ProfilePage_DataProcessing');

  } catch (err) {
    console.error('Profile fetch error:', err);
    setError(err.message);
    
    // Fallback to demo data
    setProfileData({
      stats: MOCK_STATS,
      inventory: [],
      allItems: MOCK_ITEMS,
      boosterActive: false,
      ownedBadges: []
    });
    setIsConnected(false);
  } finally {
    setLoading(false);
    PerformanceMonitor.endTimer('ProfilePage_TotalLoad');
    
    // Show performance report
    setTimeout(() => {
      const report = PerformanceMonitor.getReport();
      console.log('📊 ProfilePage Performance Report:', report);
    }, 1000);
  }
}, [tg]);

// ===== STEP 4: UPDATE backend/index.js =====
// Add performance monitoring to backend

// Add this middleware after existing middleware:
const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  const originalJson = res.json;
  
  res.json = function(data) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    console.log(`⏱️ ${req.method} ${req.path}: ${Math.round(duration)}ms`);
    
    // Add performance header
    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Apply to all routes
app.use(performanceMiddleware);

// Add database query performance monitoring
const monitoredQuery = async (client, query, params = []) => {
  const start = process.hrtime.bigint();
  
  try {
    const result = await client.query(query, params);
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    
    console.log(`🗄️ DB Query: ${Math.round(duration)}ms - ${query.substring(0, 50)}...`);
    
    if (duration > 1000) {
      console.warn(`⚠️ SLOW QUERY (${Math.round(duration)}ms): ${query}`);
    }
    
    return result;
  } catch (error) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    console.error(`❌ DB Query failed (${Math.round(duration)}ms): ${error.message}`);
    throw error;
  }
};

// ===== STEP 5: CREATE PERFORMANCE TEST ENDPOINT =====
// Add this endpoint to backend/index.js

app.get('/api/performance-test', async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    server: {
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    database: {},
    network: {}
  };
  
  try {
    // Test database performance
    const dbStart = process.hrtime.bigint();
    const client = await pool.connect();
    
    try {
      await client.query('SELECT 1');
      const dbEnd = process.hrtime.bigint();
      metrics.database.connectionTime = Number(dbEnd - dbStart) / 1000000;
      
      // Test simple query
      const queryStart = process.hrtime.bigint();
      await client.query('SELECT COUNT(*) FROM users');
      const queryEnd = process.hrtime.bigint();
      metrics.database.queryTime = Number(queryEnd - queryStart) / 1000000;
      
    } finally {
      client.release();
    }
    
    res.json(metrics);
    
  } catch (error) {
    console.error('Performance test error:', error);
    res.status(500).json({ error: 'Performance test failed' });
  }
});

// ===== STEP 6: ADD BUNDLE SIZE MONITORING =====
// Add to package.json scripts:
{
  "scripts": {
    "build:analyze": "npm run build && npx vite-bundle-analyzer dist",
    "perf:test": "npm run build && npm run preview"
  }
}

// ===== USAGE INSTRUCTIONS =====
/*
1. Deploy these changes to Railway
2. Test in production TMA environment
3. Open browser console to see performance logs
4. Visit /api/performance-test endpoint to check server metrics
5. Run `npm run build:analyze` to check bundle size

Expected console output:
🚀 Started: HomePage_TotalLoad
🌐 Network latency: 150ms
🚀 Started: HomePage_APICall
✅ HomePage_APICall: 300ms (0.5MB)
✅ HomePage_TotalLoad: 450ms (1.2MB)
📊 HomePage Performance Report: { averageLoadTime: 375ms, ... }
*/
