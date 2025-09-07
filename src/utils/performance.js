// Performance monitoring utility for Telegram Mini App
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
