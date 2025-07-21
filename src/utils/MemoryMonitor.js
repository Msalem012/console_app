class MemoryMonitor {
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: this.formatBytes(usage.rss),
      heapTotal: this.formatBytes(usage.heapTotal),
      heapUsed: this.formatBytes(usage.heapUsed),
      external: this.formatBytes(usage.external),
      arrayBuffers: this.formatBytes(usage.arrayBuffers || 0)
    };
  }
  static logMemoryUsage(context = '') {
    const usage = this.getMemoryUsage();
    console.log(`📊 Memory Usage ${context ? `[${context}]` : ''}:`);
    console.log(`  RSS: ${usage.rss}`);
    console.log(`  Heap Used: ${usage.heapUsed} / ${usage.heapTotal}`);
    console.log(`  External: ${usage.external}`);
    const heapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (heapUsedMB > 100) {
      console.log(`⚠️  High memory usage detected: ${usage.heapUsed}`);
    }
  }
  static checkMemoryLimit(limitMB = 512) {
    const heapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
    const limitReached = heapUsedMB > limitMB;
    if (limitReached) {
      console.warn(`🚨 Memory limit exceeded: ${heapUsedMB.toFixed(2)}MB > ${limitMB}MB`);
      console.warn('Consider enabling MEMORY_SAFE_MODE or reducing batch sizes');
    }
    return {
      current: heapUsedMB,
      limit: limitMB,
      exceeded: limitReached,
      usage: this.getMemoryUsage()
    };
  }
  static async monitorOperation(operationName, operation) {
    console.log(`🔍 Starting memory monitoring for: ${operationName}`);
    this.logMemoryUsage('Before');
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    try {
      const result = await operation();
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = endMemory - startMemory;
      console.log(`✅ Operation completed: ${operationName}`);
      console.log(`⏱️  Duration: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📈 Memory delta: ${this.formatBytes(memoryDelta)}`);
      this.logMemoryUsage('After');
      return result;
    } catch (error) {
      console.error(`❌ Operation failed: ${operationName}`);
      this.logMemoryUsage('After Error');
      throw error;
    }
  }
  static startPeriodicMonitoring(intervalMs = 30000) {
    console.log(`🔄 Starting periodic memory monitoring (every ${intervalMs/1000}s)`);
    const interval = setInterval(() => {
      const check = this.checkMemoryLimit();
      if (check.exceeded) {
        console.warn('🚨 Periodic check: Memory limit exceeded!');
      }
    }, intervalMs);
    return () => {
      clearInterval(interval);
      console.log('⏹️  Periodic memory monitoring stopped');
    };
  }
  static forceGarbageCollection() {
    if (global.gc) {
      console.log('🧹 Forcing garbage collection...');
      const beforeMemory = process.memoryUsage().heapUsed;
      global.gc();
      const afterMemory = process.memoryUsage().heapUsed;
      const freed = beforeMemory - afterMemory;
      console.log(`🧹 GC completed: freed ${this.formatBytes(freed)}`);
    } else {
      console.log('ℹ️  Garbage collection not available (run with --expose-gc to enable)');
    }
  }
}
module.exports = MemoryMonitor;
