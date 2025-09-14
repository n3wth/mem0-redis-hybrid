import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createLogger } from './logger.js';
import { CONFIG } from '../config/config.js';

const logger = createLogger('RateLimiter');

/**
 * Advanced rate limiting system for WebSocket connections
 * Supports per-connection, per-user, and global rate limiting with different strategies
 */
export class RateLimitManager {
  constructor(redisClient, config = CONFIG.rateLimit) {
    this.redis = redisClient;
    this.config = config;
    this.limiters = new Map();
    this.whitelist = new Set();
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      whitelistHits: 0,
      limiterTypes: {
        connection: 0,
        user: 0,
        global: 0,
        pattern: 0
      }
    };

    this.initializeLimiters();
  }

  /**
   * Initialize default rate limiters
   */
  initializeLimiters() {
    const redisOptions = {
      storeClient: this.redis,
      keyGenerator: (key) => `ratelimit:${key}`,
      points: this.config.points,
      duration: this.config.duration,
      blockDuration: this.config.blockDuration,
      execEvenly: this.config.execEvenly
    };

    // Global rate limiter (all connections)
    this.limiters.set('global', new RateLimiterRedis({
      ...redisOptions,
      keyGenerator: () => 'ratelimit:global',
      points: this.config.points * 10, // Higher limit for global
      duration: this.config.duration
    }));

    // Per-connection rate limiter
    this.limiters.set('connection', new RateLimiterRedis({
      ...redisOptions,
      keyGenerator: (connectionId) => `ratelimit:conn:${connectionId}`,
      points: this.config.points,
      duration: this.config.duration
    }));

    // Per-user rate limiter (across all connections)
    this.limiters.set('user', new RateLimiterRedis({
      ...redisOptions,
      keyGenerator: (userId) => `ratelimit:user:${userId}`,
      points: this.config.points * 3, // Allow more per user across connections
      duration: this.config.duration
    }));

    // Message type rate limiter
    this.limiters.set('message-type', new RateLimiterRedis({
      ...redisOptions,
      keyGenerator: (key) => `ratelimit:msgtype:${key}`,
      points: Math.floor(this.config.points / 2), // Stricter for certain message types
      duration: this.config.duration
    }));

    // Subscription rate limiter (prevent subscription spam)
    this.limiters.set('subscription', new RateLimiterRedis({
      ...redisOptions,
      keyGenerator: (key) => `ratelimit:sub:${key}`,
      points: 20, // Max 20 subscription operations per duration
      duration: this.config.duration,
      blockDuration: this.config.blockDuration * 2 // Longer block for subscription spam
    }));

    logger.info('Rate limiters initialized', {
      limiters: Array.from(this.limiters.keys()),
      config: this.config
    });
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(connectionId, userId, messageType, options = {}) {
    this.metrics.totalRequests++;

    // Check whitelist first
    if (this.isWhitelisted(connectionId, userId)) {
      this.metrics.whitelistHits++;
      return { allowed: true, reason: 'whitelisted' };
    }

    const checks = [];

    // Global rate limit check
    if (options.checkGlobal !== false) {
      checks.push(this.checkLimiter('global', 'global', 1));
    }

    // Connection rate limit check
    if (connectionId && options.checkConnection !== false) {
      checks.push(this.checkLimiter('connection', connectionId, 1));
    }

    // User rate limit check
    if (userId && options.checkUser !== false) {
      checks.push(this.checkLimiter('user', userId, 1));
    }

    // Message type rate limit check
    if (messageType && options.checkMessageType !== false) {
      const cost = this.getMessageTypeCost(messageType);
      checks.push(this.checkLimiter('message-type', `${userId}:${messageType}`, cost));
    }

    // Subscription rate limit check
    if (messageType && (messageType === 'subscribe' || messageType === 'unsubscribe')) {
      checks.push(this.checkLimiter('subscription', userId || connectionId, 1));
    }

    try {
      const results = await Promise.all(checks);
      const blocked = results.find(result => !result.allowed);

      if (blocked) {
        this.metrics.blockedRequests++;
        this.metrics.limiterTypes[blocked.type]++;

        logger.warn('Rate limit exceeded', {
          connectionId,
          userId,
          messageType,
          reason: blocked.reason,
          type: blocked.type,
          resetTime: blocked.resetTime
        });

        return {
          allowed: false,
          reason: blocked.reason,
          type: blocked.type,
          resetTime: blocked.resetTime,
          retryAfter: blocked.msBeforeNext
        };
      }

      return {
        allowed: true,
        remaining: Math.min(...results.map(r => r.totalHits || 0)),
        resetTime: Math.max(...results.map(r => r.resetTime || 0))
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail open - allow the request if rate limiting fails
      return { allowed: true, reason: 'error', error: error.message };
    }
  }

  /**
   * Check a specific rate limiter
   */
  async checkLimiter(limiterName, key, points = 1) {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      return { allowed: true, reason: 'no-limiter' };
    }

    try {
      const result = await limiter.consume(key, points);
      return {
        allowed: true,
        type: limiterName,
        totalHits: result.totalHits,
        remainingPoints: result.remainingPoints,
        resetTime: new Date(Date.now() + result.msBeforeNext)
      };
    } catch (rejRes) {
      return {
        allowed: false,
        type: limiterName,
        reason: 'rate-limit-exceeded',
        totalHits: rejRes.totalHits,
        resetTime: new Date(Date.now() + rejRes.msBeforeNext),
        msBeforeNext: rejRes.msBeforeNext
      };
    }
  }

  /**
   * Get cost for different message types
   */
  getMessageTypeCost(messageType) {
    const costs = {
      'ping': 0.1,
      'pong': 0,
      'subscribe': 2,
      'unsubscribe': 1,
      'broadcast': 5,
      'sync': 3,
      'query': 4,
      'message': 1
    };

    return costs[messageType] || 1;
  }

  /**
   * Add connection/user to whitelist
   */
  addToWhitelist(identifier, type = 'connection') {
    const key = `${type}:${identifier}`;
    this.whitelist.add(key);
    logger.info('Added to whitelist:', { identifier, type });
  }

  /**
   * Remove from whitelist
   */
  removeFromWhitelist(identifier, type = 'connection') {
    const key = `${type}:${identifier}`;
    this.whitelist.delete(key);
    logger.info('Removed from whitelist:', { identifier, type });
  }

  /**
   * Check if connection/user is whitelisted
   */
  isWhitelisted(connectionId, userId) {
    return this.whitelist.has(`connection:${connectionId}`) ||
           this.whitelist.has(`user:${userId}`);
  }

  /**
   * Create dynamic rate limiter for specific patterns
   */
  createPatternLimiter(name, options) {
    const limiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (key) => `ratelimit:pattern:${name}:${key}`,
      points: options.points || this.config.points,
      duration: options.duration || this.config.duration,
      blockDuration: options.blockDuration || this.config.blockDuration,
      execEvenly: options.execEvenly !== false
    });

    this.limiters.set(`pattern:${name}`, limiter);

    logger.info('Created pattern rate limiter:', {
      name,
      options
    });

    return limiter;
  }

  /**
   * Apply temporary rate limit boost/reduction
   */
  async applyTemporaryLimit(identifier, type, multiplier, durationMs) {
    const key = `temp:${type}:${identifier}`;
    const limiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: () => key,
      points: Math.floor(this.config.points * multiplier),
      duration: Math.floor(durationMs / 1000),
      blockDuration: this.config.blockDuration
    });

    this.limiters.set(key, limiter);

    // Auto-remove after duration
    setTimeout(() => {
      this.limiters.delete(key);
      logger.debug('Removed temporary rate limiter:', { identifier, type, multiplier });
    }, durationMs);

    logger.info('Applied temporary rate limit:', {
      identifier,
      type,
      multiplier,
      durationMs
    });
  }

  /**
   * Get rate limit status for a key
   */
  async getStatus(limiterName, key) {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      throw new Error(`Limiter '${limiterName}' not found`);
    }

    try {
      const result = await limiter.get(key);
      if (!result) {
        return {
          exists: false,
          points: this.config.points,
          remaining: this.config.points
        };
      }

      return {
        exists: true,
        totalHits: result.totalHits,
        remainingPoints: result.remainingPoints,
        resetTime: new Date(Date.now() + result.msBeforeNext)
      };
    } catch (error) {
      logger.error('Failed to get rate limit status:', error);
      throw error;
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(limiterName, key) {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      throw new Error(`Limiter '${limiterName}' not found`);
    }

    try {
      await limiter.delete(key);
      logger.info('Rate limit reset:', { limiterName, key });
      return true;
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
      return false;
    }
  }

  /**
   * Block a connection/user temporarily
   */
  async blockTemporarily(identifier, type, durationMs, reason = 'manual') {
    const key = `block:${type}:${identifier}`;
    const limiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: () => key,
      points: 1,
      duration: 1,
      blockDuration: Math.floor(durationMs / 1000)
    });

    try {
      // Consume all points to trigger block
      await limiter.consume(key, 2);
    } catch (rejRes) {
      // This is expected - the block is now active
      logger.warn('Temporarily blocked:', {
        identifier,
        type,
        durationMs,
        reason,
        unblockTime: new Date(Date.now() + rejRes.msBeforeNext)
      });

      return {
        blocked: true,
        unblockTime: new Date(Date.now() + rejRes.msBeforeNext),
        reason
      };
    }
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      limiters: Array.from(this.limiters.keys()),
      whitelistSize: this.whitelist.size,
      blockRate: this.metrics.totalRequests > 0 ?
        (this.metrics.blockedRequests / this.metrics.totalRequests) * 100 : 0
    };
  }

  /**
   * Get detailed limiter status
   */
  async getLimiterStats() {
    const stats = {};

    for (const [name, limiter] of this.limiters.entries()) {
      // Get some sample keys to understand usage
      const keys = await this.redis.keys(`ratelimit:*${name}*`);
      stats[name] = {
        activeKeys: keys.length,
        sampleKeys: keys.slice(0, 5)
      };
    }

    return stats;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down rate limiters...');

    // Clear all limiters
    this.limiters.clear();
    this.whitelist.clear();

    logger.info('Rate limiters shut down');
  }
}