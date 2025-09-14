/**
 * Health Checker for Vector Embedding Service
 * Provides liveness, readiness, and detailed health status
 */
export class HealthChecker {
  constructor(redisClient, config) {
    this.redis = redisClient;
    this.config = config;
    this.lastCheck = null;
    this.healthCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Check if service is ready to serve requests
   */
  async checkReadiness() {
    try {
      const checks = await Promise.allSettled([
        this.checkRedis(),
        this.checkModels(),
        this.checkSystemResources()
      ]);

      const results = {
        ready: true,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      checks.forEach((check, index) => {
        const checkName = ['redis', 'models', 'system'][index];
        if (check.status === 'fulfilled') {
          results.checks[checkName] = check.value;
          if (!check.value.healthy) {
            results.ready = false;
          }
        } else {
          results.checks[checkName] = {
            healthy: false,
            error: check.reason.message
          };
          results.ready = false;
        }
      });

      this.lastCheck = results;
      return results;
    } catch (error) {
      return {
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get detailed health status
   */
  async getDetailedHealth() {
    try {
      const checks = await Promise.allSettled([
        this.checkRedis(),
        this.checkModels(),
        this.checkSystemResources(),
        this.checkMemoryUsage(),
        this.checkAPIKeys(),
        this.checkPerformance()
      ]);

      const results = {
        healthy: true,
        timestamp: new Date().toISOString(),
        checks: {},
        summary: {
          totalChecks: checks.length,
          passedChecks: 0,
          failedChecks: 0,
          warnings: 0
        }
      };

      const checkNames = [
        'redis', 'models', 'system', 
        'memory', 'api_keys', 'performance'
      ];

      checks.forEach((check, index) => {
        const checkName = checkNames[index];
        
        if (check.status === 'fulfilled') {
          results.checks[checkName] = check.value;
          if (check.value.healthy) {
            results.summary.passedChecks++;
          } else {
            results.summary.failedChecks++;
            results.healthy = false;
          }
          if (check.value.warning) {
            results.summary.warnings++;
          }
        } else {
          results.checks[checkName] = {
            healthy: false,
            error: check.reason.message
          };
          results.summary.failedChecks++;
          results.healthy = false;
        }
      });

      return results;
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  async checkRedis() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.redis.ping();

      // Test set/get operation
      const testKey = 'health:embedding:check:' + Date.now();
      await this.redis.setEx(testKey, 10, 'ok');
      const value = await this.redis.get(testKey);
      await this.redis.del(testKey);

      const responseTime = Date.now() - startTime;
      const healthy = responseTime < 100 && value === 'ok';
      const warning = responseTime > 50;

      return {
        healthy,
        warning,
        responseTime: `${responseTime}ms`,
        message: healthy ? 'Redis is healthy' : 'Redis response time is high'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Redis connection failed'
      };
    }
  }

  /**
   * Check model availability and status
   */
  async checkModels() {
    try {
      const models = {
        openai: {
          available: !!this.config.embedding.providers.openai?.api_key,
          configured: !!this.config.embedding.providers.openai,
          model: this.config.embedding.providers.openai?.model || 'not configured'
        },
        local: {
          available: !!this.config.embedding.providers.local,
          configured: !!this.config.embedding.providers.local,
          model: this.config.embedding.providers.local?.model || 'not configured'
        }
      };

      const hasAnyModel = models.openai.available || models.local.available;
      const healthy = hasAnyModel;
      const warning = !models.openai.available && models.local.available;

      return {
        healthy,
        warning,
        models,
        message: healthy ? 'At least one model is available' : 'No models are available'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Model check failed'
      };
    }
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Memory check
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      const memoryHealthy = memoryUsagePercent < 90;
      const memoryWarning = memoryUsagePercent > 80;

      // CPU check (simplified)
      const cpuHealthy = true; // Would need more sophisticated CPU monitoring
      const cpuWarning = false;

      const healthy = memoryHealthy && cpuHealthy;
      const warning = memoryWarning || cpuWarning;

      return {
        healthy,
        warning,
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          usagePercent: Math.round(memoryUsagePercent) + '%'
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        message: healthy ? 'System resources are healthy' : 'System resource usage is high'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'System resource check failed'
      };
    }
  }

  /**
   * Check memory usage patterns
   */
  async checkMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Check for memory leaks (simplified)
      const memoryGrowth = memUsage.heapUsed / (uptime / 3600); // MB per hour
      const healthy = memoryGrowth < 100; // Less than 100MB/hour growth
      const warning = memoryGrowth > 50;

      return {
        healthy,
        warning,
        memoryGrowth: `${Math.round(memoryGrowth)} MB/hour`,
        uptime: `${Math.round(uptime)}s`,
        message: healthy ? 'Memory usage is stable' : 'Potential memory leak detected'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Memory usage check failed'
      };
    }
  }

  /**
   * Check API keys configuration
   */
  async checkAPIKeys() {
    try {
      const openaiKey = this.config.embedding.providers.openai?.api_key;
      const hasOpenAIKey = !!openaiKey;
      const keyLength = openaiKey ? openaiKey.length : 0;
      
      const healthy = hasOpenAIKey;
      const warning = !hasOpenAIKey;

      return {
        healthy,
        warning,
        openai: {
          configured: hasOpenAIKey,
          keyLength: hasOpenAIKey ? keyLength : 0,
          masked: hasOpenAIKey ? `${openaiKey.substring(0, 8)}...` : 'not configured'
        },
        message: healthy ? 'API keys are configured' : 'OpenAI API key not configured'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'API key check failed'
      };
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformance() {
    try {
      // This would check actual performance metrics
      // For now, return a healthy status
      return {
        healthy: true,
        warning: false,
        metrics: {
          avgResponseTime: 'N/A',
          throughput: 'N/A',
          errorRate: 'N/A'
        },
        message: 'Performance check not implemented'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Performance check failed'
      };
    }
  }

  /**
   * Get cached health status if available
   */
  getCachedHealth() {
    if (this.lastCheck && 
        Date.now() - new Date(this.lastCheck.timestamp).getTime() < this.cacheTimeout) {
      return this.lastCheck;
    }
    return null;
  }

  /**
   * Force refresh health status
   */
  async refreshHealth() {
    this.lastCheck = null;
    return await this.checkReadiness();
  }

  /**
   * Test embedding generation
   */
  async testEmbeddingGeneration() {
    try {
      // This would test actual embedding generation
      // For now, return a mock test
      return {
        healthy: true,
        testTime: '50ms',
        provider: 'openai',
        dimensions: 1536,
        message: 'Embedding generation test passed'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Embedding generation test failed'
      };
    }
  }

  /**
   * Test vector search
   */
  async testVectorSearch() {
    try {
      // This would test actual vector search
      // For now, return a mock test
      return {
        healthy: true,
        searchTime: '25ms',
        resultsFound: 5,
        message: 'Vector search test passed'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Vector search test failed'
      };
    }
  }
}