/**
 * Metrics Collector for Vector Embedding Service
 * Tracks embedding operations, search performance, and model usage
 */
export class MetricsCollector {
  constructor() {
    this.metrics = {
      operations: new Map(),
      requests: new Map(),
      errors: new Map(),
      models: new Map(),
      startTime: Date.now()
    };
    
    this.counters = {
      totalOperations: 0,
      totalRequests: 0,
      totalErrors: 0,
      embeddingsGenerated: 0,
      searchesPerformed: 0,
      clustersCreated: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Record embedding operation metrics
   */
  recordOperation(operation, duration, success) {
    this.counters.totalOperations++;
    
    if (!success) {
      this.counters.totalErrors++;
      this.recordError(operation, 'Operation failed');
    }

    // Update operation metrics
    if (!this.metrics.operations.has(operation)) {
      this.metrics.operations.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        avgDuration: 0
      });
    }

    const opMetrics = this.metrics.operations.get(operation);
    opMetrics.count++;
    opMetrics.totalDuration += duration;
    opMetrics.minDuration = Math.min(opMetrics.minDuration, duration);
    opMetrics.maxDuration = Math.max(opMetrics.maxDuration, duration);
    opMetrics.avgDuration = opMetrics.totalDuration / opMetrics.count;

    if (!success) {
      opMetrics.errors++;
    }

    // Track specific operations
    if (operation.includes('generate')) {
      this.counters.embeddingsGenerated++;
    }
    if (operation.includes('search')) {
      this.counters.searchesPerformed++;
    }
    if (operation.includes('cluster')) {
      this.counters.clustersCreated++;
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(method, path, statusCode, duration) {
    this.counters.totalRequests++;
    
    const requestKey = `${method} ${path}`;
    
    if (!this.metrics.requests.has(requestKey)) {
      this.metrics.requests.set(requestKey, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        statusCodes: new Map()
      });
    }

    const reqMetrics = this.metrics.requests.get(requestKey);
    reqMetrics.count++;
    reqMetrics.totalDuration += duration;
    reqMetrics.minDuration = Math.min(reqMetrics.minDuration, duration);
    reqMetrics.maxDuration = Math.max(reqMetrics.maxDuration, duration);
    reqMetrics.avgDuration = reqMetrics.totalDuration / reqMetrics.count;

    // Track status codes
    const statusCount = reqMetrics.statusCodes.get(statusCode) || 0;
    reqMetrics.statusCodes.set(statusCode, statusCount + 1);

    // Record error if status >= 400
    if (statusCode >= 400) {
      this.recordError(requestKey, `HTTP ${statusCode}`);
    }
  }

  /**
   * Record model usage
   */
  recordModelUsage(provider, model, tokens, cost = 0) {
    const modelKey = `${provider}:${model}`;
    
    if (!this.metrics.models.has(modelKey)) {
      this.metrics.models.set(modelKey, {
        provider,
        model,
        usageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        avgTokensPerRequest: 0
      });
    }

    const modelMetrics = this.metrics.models.get(modelKey);
    modelMetrics.usageCount++;
    modelMetrics.totalTokens += tokens;
    modelMetrics.totalCost += cost;
    modelMetrics.avgTokensPerRequest = modelMetrics.totalTokens / modelMetrics.usageCount;
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit() {
    this.counters.cacheHits++;
  }

  recordCacheMiss() {
    this.counters.cacheMisses++;
  }

  /**
   * Record error
   */
  recordError(operation, error) {
    this.counters.totalErrors++;
    
    if (!this.metrics.errors.has(operation)) {
      this.metrics.errors.set(operation, []);
    }

    const errors = this.metrics.errors.get(operation);
    errors.push({
      timestamp: Date.now(),
      error: error
    });

    // Keep only last 100 errors per operation
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      uptime: {
        seconds: Math.floor(uptime / 1000),
        human: this.formatUptime(uptime)
      },
      counters: {
        ...this.counters,
        cacheHitRate: this.calculateCacheHitRate(),
        embeddingsPerMinute: this.calculateEmbeddingsPerMinute(uptime),
        searchesPerMinute: this.calculateSearchesPerMinute(uptime)
      },
      operations: this.getOperationMetrics(),
      requests: this.getRequestMetrics(),
      models: this.getModelMetrics(),
      errors: this.getErrorMetrics(),
      system: this.getSystemMetrics()
    };
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics() {
    const operations = {};
    
    for (const [operation, metrics] of this.metrics.operations.entries()) {
      operations[operation] = {
        count: metrics.count,
        avgDuration: Math.round(metrics.avgDuration * 100) / 100,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count * 100).toFixed(2) + '%' : '0%',
        totalDuration: metrics.totalDuration
      };
    }
    
    return operations;
  }

  /**
   * Get request metrics
   */
  getRequestMetrics() {
    const requests = {};
    
    for (const [request, metrics] of this.metrics.requests.entries()) {
      requests[request] = {
        count: metrics.count,
        avgDuration: Math.round(metrics.avgDuration * 100) / 100,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        statusCodes: Object.fromEntries(metrics.statusCodes)
      };
    }
    
    return requests;
  }

  /**
   * Get model metrics
   */
  getModelMetrics() {
    const models = {};
    
    for (const [modelKey, metrics] of this.metrics.models.entries()) {
      models[modelKey] = {
        provider: metrics.provider,
        model: metrics.model,
        usageCount: metrics.usageCount,
        totalTokens: metrics.totalTokens,
        totalCost: metrics.totalCost,
        avgTokensPerRequest: Math.round(metrics.avgTokensPerRequest),
        costPerToken: metrics.totalTokens > 0 ? (metrics.totalCost / metrics.totalTokens).toFixed(6) : 0
      };
    }
    
    return models;
  }

  /**
   * Get error metrics
   */
  getErrorMetrics() {
    const errors = {};
    
    for (const [operation, errorList] of this.metrics.errors.entries()) {
      errors[operation] = {
        count: errorList.length,
        recent: errorList.slice(-10).map(err => ({
          timestamp: new Date(err.timestamp).toISOString(),
          error: err.error
        }))
      };
    }
    
    return errors;
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
      },
      cpu: {
        usage: process.cpuUsage(),
        uptime: process.uptime()
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    const total = this.counters.cacheHits + this.counters.cacheMisses;
    return total > 0 ? (this.counters.cacheHits / total * 100).toFixed(2) + '%' : '0%';
  }

  /**
   * Calculate embeddings per minute
   */
  calculateEmbeddingsPerMinute(uptime) {
    const minutes = uptime / (1000 * 60);
    return minutes > 0 ? (this.counters.embeddingsGenerated / minutes).toFixed(2) : 0;
  }

  /**
   * Calculate searches per minute
   */
  calculateSearchesPerMinute(uptime) {
    const minutes = uptime / (1000 * 60);
    return minutes > 0 ? (this.counters.searchesPerformed / minutes).toFixed(2) : 0;
  }

  /**
   * Format uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      operations: new Map(),
      requests: new Map(),
      errors: new Map(),
      models: new Map(),
      startTime: Date.now()
    };
    
    this.counters = {
      totalOperations: 0,
      totalRequests: 0,
      totalErrors: 0,
      embeddingsGenerated: 0,
      searchesPerformed: 0,
      clustersCreated: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Get metrics summary for health checks
   */
  getHealthSummary() {
    const uptime = Date.now() - this.metrics.startTime;
    const errorRate = this.counters.totalRequests > 0 
      ? (this.counters.totalErrors / this.counters.totalRequests * 100).toFixed(2)
      : 0;

    return {
      healthy: errorRate < 10, // Less than 10% error rate
      uptime: Math.floor(uptime / 1000),
      totalRequests: this.counters.totalRequests,
      totalErrors: this.counters.totalErrors,
      errorRate: errorRate + '%',
      cacheHitRate: this.calculateCacheHitRate(),
      embeddingsGenerated: this.counters.embeddingsGenerated,
      searchesPerformed: this.counters.searchesPerformed
    };
  }
}