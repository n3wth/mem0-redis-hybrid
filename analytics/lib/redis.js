const { createClient } = require('redis');
const { trackRedisOperation } = require('./prometheus');
const logger = require('./logger').getLogger();

let redisClient = null;

async function setupRedis() {
  const config = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      connectTimeout: 10000,
    },
    database: process.env.REDIS_DB || 0,
  };

  try {
    redisClient = createClient(config);

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
    await redisClient.ping();

    logger.info('Redis connection established');

  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

async function trackOperation(operation, fn) {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = (Date.now() - start) / 1000;
    trackRedisOperation(operation, duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    trackRedisOperation(operation + '_ERROR', duration);
    throw error;
  }
}

// Real-time event counters
async function incrementEventCounter(eventType, source = 'unknown', window = '1h') {
  const key = `events:${eventType}:${source}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('INCR', async () => {
    const result = await redisClient.incr(key);
    await redisClient.expire(key, getWindowTTL(window));
    return result;
  });
}

async function getEventCount(eventType, source = 'unknown', window = '1h') {
  const key = `events:${eventType}:${source}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('GET', async () => {
    const count = await redisClient.get(key);
    return parseInt(count || '0', 10);
  });
}

// Real-time user tracking
async function trackUniqueUser(eventType, userId, window = '1h') {
  const key = `unique_users:${eventType}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('SADD', async () => {
    const result = await redisClient.sAdd(key, userId);
    await redisClient.expire(key, getWindowTTL(window));
    return result;
  });
}

async function getUniqueUserCount(eventType, window = '1h') {
  const key = `unique_users:${eventType}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('SCARD', async () => {
    return await redisClient.sCard(key);
  });
}

// Session tracking
async function updateSessionData(sessionId, data) {
  const key = `session:${sessionId}`;
  const sessionData = {
    ...data,
    last_updated: Date.now(),
  };

  return await trackOperation('HSET', async () => {
    await redisClient.hSet(key, sessionData);
    await redisClient.expire(key, 86400); // 24 hours
    return sessionData;
  });
}

async function getSessionData(sessionId) {
  const key = `session:${sessionId}`;

  return await trackOperation('HGETALL', async () => {
    return await redisClient.hGetAll(key);
  });
}

// Real-time aggregations
async function storeAggregation(metric, value, timestamp = Date.now()) {
  const key = `aggregation:${metric}:${Math.floor(timestamp / 60000) * 60000}`;

  return await trackOperation('SET', async () => {
    await redisClient.set(key, JSON.stringify(value), { EX: 3600 }); // 1 hour TTL
    return value;
  });
}

async function getAggregation(metric, timestamp) {
  const key = `aggregation:${metric}:${Math.floor(timestamp / 60000) * 60000}`;

  return await trackOperation('GET', async () => {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  });
}

async function getAggregationRange(metric, startTime, endTime) {
  const keys = [];
  const startMinute = Math.floor(startTime / 60000) * 60000;
  const endMinute = Math.floor(endTime / 60000) * 60000;

  for (let time = startMinute; time <= endMinute; time += 60000) {
    keys.push(`aggregation:${metric}:${time}`);
  }

  return await trackOperation('MGET', async () => {
    const results = await redisClient.mGet(keys);
    return results.map((data, index) => ({
      timestamp: startMinute + (index * 60000),
      value: data ? JSON.parse(data) : null,
    }));
  });
}

// Real-time alerts and thresholds
async function checkThreshold(metric, value, threshold, window = '5m') {
  const key = `threshold:${metric}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('THRESHOLD_CHECK', async () => {
    // Add value to a sorted set with timestamp as score
    const timestamp = Date.now();
    await redisClient.zAdd(key, { score: timestamp, value: value.toString() });
    await redisClient.expire(key, getWindowTTL(window));

    // Remove old values outside the window
    const cutoff = timestamp - getWindowMs(window);
    await redisClient.zRemRangeByScore(key, '-inf', cutoff);

    // Get all values in the current window
    const values = await redisClient.zRange(key, 0, -1, { BY: 'SCORE' });
    const numericValues = values.map(v => parseFloat(v));

    // Calculate statistics
    const count = numericValues.length;
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const avg = count > 0 ? sum / count : 0;

    const isThresholdExceeded = avg > threshold;

    return {
      current_value: value,
      window_average: avg,
      threshold,
      exceeded: isThresholdExceeded,
      sample_count: count,
      window,
    };
  });
}

// Leaderboards
async function updateLeaderboard(type, id, score, window = '24h') {
  const key = `leaderboard:${type}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('ZINCRBY', async () => {
    const result = await redisClient.zIncrBy(key, score, id);
    await redisClient.expire(key, getWindowTTL(window));
    return result;
  });
}

async function getLeaderboard(type, limit = 10, window = '24h') {
  const key = `leaderboard:${type}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('ZREVRANGE', async () => {
    return await redisClient.zRangeWithScores(key, 0, limit - 1, { REV: true });
  });
}

// Rate limiting
async function checkRateLimit(identifier, limit, window = '1h') {
  const key = `rate_limit:${identifier}:${window}:${getCurrentWindow(window)}`;

  return await trackOperation('RATE_LIMIT', async () => {
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, getWindowTTL(window));
    }

    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      reset_time: getCurrentWindow(window) + getWindowMs(window),
      allowed: current <= limit,
    };
  });
}

// Caching
async function cache(key, value, ttl = 3600) {
  return await trackOperation('CACHE_SET', async () => {
    await redisClient.set(`cache:${key}`, JSON.stringify(value), { EX: ttl });
    return value;
  });
}

async function getCache(key) {
  return await trackOperation('CACHE_GET', async () => {
    const data = await redisClient.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  });
}

async function invalidateCache(pattern) {
  return await trackOperation('CACHE_DEL', async () => {
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      return await redisClient.del(keys);
    }
    return 0;
  });
}

// Utility functions
function getCurrentWindow(window) {
  const now = Date.now();
  const windowMs = getWindowMs(window);
  return Math.floor(now / windowMs) * windowMs;
}

function getWindowMs(window) {
  const units = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
  };

  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}`);
  }

  const [, amount, unit] = match;
  return parseInt(amount, 10) * units[unit];
}

function getWindowTTL(window) {
  return Math.ceil(getWindowMs(window) / 1000) * 2; // Double the window for safety
}

async function closeConnection() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

module.exports = {
  setupRedis,
  incrementEventCounter,
  getEventCount,
  trackUniqueUser,
  getUniqueUserCount,
  updateSessionData,
  getSessionData,
  storeAggregation,
  getAggregation,
  getAggregationRange,
  checkThreshold,
  updateLeaderboard,
  getLeaderboard,
  checkRateLimit,
  cache,
  getCache,
  invalidateCache,
  closeConnection,
  getClient: () => redisClient
};