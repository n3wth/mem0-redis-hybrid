/**
 * Health Checker for service monitoring
 * Provides liveness, readiness, and detailed health status
 */
export class HealthChecker {
  constructor(redisClient, dbPool) {
    this.redis = redisClient;
    this.db = dbPool;
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
        this.checkDatabase(),
        this.checkRedis(),
        this.checkSystemResources()
      ]);

      const results = {
        ready: true,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      checks.forEach((check, index) => {
        const checkName = ['database', 'redis', 'system'][index];
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
        this.checkDatabase(),
        this.checkRedis(),
        this.checkSystemResources(),
        this.checkMemoryUsage(),
        this.checkDiskSpace(),
        this.checkNetworkConnectivity()
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
        'database', 'redis', 'system', 
        'memory', 'disk', 'network'
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
   * Check database connectivity and performance
   */
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const client = await this.db.connect();
      await client.query('SELECT 1');
      client.release();

      // Check connection pool status
      const poolStats = {
        totalCount: this.db.totalCount,
        idleCount: this.db.idleCount,
        waitingCount: this.db.waitingCount
      };

      const responseTime = Date.now() - startTime;
      const healthy = responseTime < 1000; // Less than 1 second
      const warning = responseTime > 500; // Warning if over 500ms

      return {
        healthy,
        warning,
        responseTime: `${responseTime}ms`,
        poolStats,
        message: healthy ? 'Database is healthy' : 'Database response time is high'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Database connection failed'
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
      const testKey = 'health:check:' + Date.now();
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
   * Check disk space (placeholder)
   */
  async checkDiskSpace() {
    try {
      // In a real implementation, you would check disk space
      // For now, return a healthy status
      return {
        healthy: true,
        warning: false,
        available: 'N/A',
        used: 'N/A',
        message: 'Disk space check not implemented'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Disk space check failed'
      };
    }
  }

  /**
   * Check network connectivity (placeholder)
   */
  async checkNetworkConnectivity() {
    try {
      // In a real implementation, you would test network connectivity
      // For now, return a healthy status
      return {
        healthy: true,
        warning: false,
        latency: 'N/A',
        message: 'Network connectivity check not implemented'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Network connectivity check failed'
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
}