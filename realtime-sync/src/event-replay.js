import { createLogger } from './logger.js';
import { CONFIG } from '../config/config.js';
import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';

const logger = createLogger('EventReplay');

/**
 * Event replay system for handling missed events and user reconnections
 * Supports event storage, retrieval, compression, and cleanup
 */
export class EventReplayManager {
  constructor(redisClient, rabbitmqManager, config = CONFIG.eventReplay) {
    this.redis = redisClient;
    this.rabbitmq = rabbitmqManager;
    this.config = config;
    this.keyPrefix = `${CONFIG.redis.keyPrefix}replay:`;
    this.userEventKey = (userId) => `${this.keyPrefix}user:${userId}`;
    this.eventMetaKey = (eventId) => `${this.keyPrefix}meta:${eventId}`;
    this.replayStatsKey = `${this.keyPrefix}stats`;
    this.compressionLevel = config.compressionLevel || 6;

    this.metrics = {
      eventsStored: 0,
      eventsReplayed: 0,
      bytesStored: 0,
      compressionRatio: 0,
      cleanupRuns: 0
    };

    // Start cleanup process if enabled
    if (this.config.enabled) {
      this.startCleanupProcess();
    }
  }

  /**
   * Store event for replay with compression and metadata
   */
  async storeEvent(userId, event, options = {}) {
    if (!this.config.enabled) return false;

    try {
      const eventId = event.id || this.generateEventId(event);
      const timestamp = event.timestamp || Date.now();
      const userKey = this.userEventKey(userId);
      const metaKey = this.eventMetaKey(eventId);

      // Prepare event data
      const eventData = {
        ...event,
        id: eventId,
        timestamp,
        userId,
        replayMetadata: {
          storedAt: Date.now(),
          retentionUntil: Date.now() + (this.config.retentionDays * 24 * 60 * 60 * 1000),
          priority: options.priority || 'normal',
          category: options.category || 'default',
          source: options.source || 'unknown'
        }
      };

      // Compress event data if it's large enough
      const serializedEvent = JSON.stringify(eventData);
      let finalData;
      let isCompressed = false;

      if (serializedEvent.length > 1024) { // Compress if larger than 1KB
        finalData = gzipSync(Buffer.from(serializedEvent), {
          level: this.compressionLevel
        }).toString('base64');
        isCompressed = true;

        // Update compression metrics
        this.metrics.compressionRatio =
          (this.metrics.compressionRatio + (finalData.length / serializedEvent.length)) / 2;
      } else {
        finalData = serializedEvent;
      }

      // Create pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Store event in user's sorted set (scored by timestamp)
      pipeline.zadd(userKey, timestamp, JSON.stringify({
        eventId,
        timestamp,
        category: eventData.replayMetadata.category,
        priority: eventData.replayMetadata.priority,
        compressed: isCompressed,
        size: finalData.length
      }));

      // Store event metadata and data
      pipeline.hset(metaKey, {
        data: finalData,
        compressed: isCompressed ? '1' : '0',
        originalSize: serializedEvent.length,
        compressedSize: finalData.length,
        timestamp: timestamp.toString(),
        userId,
        category: eventData.replayMetadata.category,
        retentionUntil: eventData.replayMetadata.retentionUntil.toString()
      });

      // Set expiration on metadata
      pipeline.expire(metaKey, this.config.retentionDays * 24 * 60 * 60);

      // Update user event count and statistics
      pipeline.hincrby(this.replayStatsKey, `user:${userId}:count`, 1);
      pipeline.hincrby(this.replayStatsKey, 'totalEvents', 1);
      pipeline.hincrby(this.replayStatsKey, 'totalBytes', finalData.length);

      // Execute pipeline
      await pipeline.exec();

      // Limit the number of events per user
      await this.limitUserEvents(userId);

      this.metrics.eventsStored++;
      this.metrics.bytesStored += finalData.length;

      logger.debug('Event stored for replay:', {
        userId,
        eventId,
        size: finalData.length,
        compressed: isCompressed,
        originalSize: serializedEvent.length
      });

      // Also store in RabbitMQ for distributed replay if available
      if (this.rabbitmq && this.rabbitmq.isConnected) {
        await this.rabbitmq.publishForReplay(userId, eventData, this.config.retentionDays);
      }

      return eventId;
    } catch (error) {
      logger.error('Failed to store event for replay:', error);
      throw error;
    }
  }

  /**
   * Replay events for a user since a specific timestamp
   */
  async replayEvents(userId, since = 0, options = {}) {
    if (!this.config.enabled) return [];

    try {
      const userKey = this.userEventKey(userId);
      const limit = Math.min(options.limit || this.config.batchSize, this.config.maxEventsPerReplay);
      const categories = options.categories || [];
      const priority = options.priority;

      // Get events since timestamp
      const eventEntries = await this.redis.zrangebyscore(
        userKey,
        since,
        '+inf',
        'WITHSCORES',
        'LIMIT',
        0,
        limit
      );

      if (eventEntries.length === 0) {
        logger.debug('No events to replay:', { userId, since });
        return [];
      }

      const events = [];
      const pipeline = this.redis.pipeline();

      // Process events in batches
      for (let i = 0; i < eventEntries.length; i += 2) {
        const eventInfo = JSON.parse(eventEntries[i]);
        const eventId = eventInfo.eventId;
        const metaKey = this.eventMetaKey(eventId);

        // Filter by category if specified
        if (categories.length > 0 && !categories.includes(eventInfo.category)) {
          continue;
        }

        // Filter by priority if specified
        if (priority && eventInfo.priority !== priority) {
          continue;
        }

        pipeline.hgetall(metaKey);
      }

      const results = await pipeline.exec();

      for (const [error, eventMeta] of results) {
        if (error || !eventMeta || !eventMeta.data) continue;

        try {
          // Decompress if necessary
          let eventData;
          if (eventMeta.compressed === '1') {
            const decompressed = gunzipSync(Buffer.from(eventMeta.data, 'base64'));
            eventData = JSON.parse(decompressed.toString());
          } else {
            eventData = JSON.parse(eventMeta.data);
          }

          events.push({
            ...eventData,
            replayInfo: {
              originalTimestamp: parseInt(eventMeta.timestamp),
              replayedAt: Date.now(),
              originalSize: parseInt(eventMeta.originalSize),
              compressedSize: parseInt(eventMeta.compressedSize),
              wasCompressed: eventMeta.compressed === '1'
            }
          });
        } catch (parseError) {
          logger.error('Failed to parse replayed event:', parseError);
        }
      }

      // Sort events by original timestamp
      events.sort((a, b) => a.replayInfo.originalTimestamp - b.replayInfo.originalTimestamp);

      this.metrics.eventsReplayed += events.length;

      logger.info('Events replayed:', {
        userId,
        since,
        eventCount: events.length,
        totalSize: events.reduce((sum, e) => sum + e.replayInfo.originalSize, 0)
      });

      // Update replay statistics
      await this.redis.hincrby(this.replayStatsKey, `user:${userId}:replayed`, events.length);
      await this.redis.hincrby(this.replayStatsKey, 'totalReplayed', events.length);

      return events;
    } catch (error) {
      logger.error('Failed to replay events:', error);
      throw error;
    }
  }

  /**
   * Get replay summary for a user
   */
  async getReplaySummary(userId, since = 0) {
    try {
      const userKey = this.userEventKey(userId);

      // Get total count and date range
      const totalCount = await this.redis.zcard(userKey);
      const countSince = await this.redis.zcount(userKey, since, '+inf');

      let oldestEvent = null;
      let newestEvent = null;

      if (totalCount > 0) {
        const [oldest] = await this.redis.zrange(userKey, 0, 0, 'WITHSCORES');
        const [newest] = await this.redis.zrange(userKey, -1, -1, 'WITHSCORES');

        if (oldest) oldestEvent = JSON.parse(oldest);
        if (newest) newestEvent = JSON.parse(newest);
      }

      // Get categories and priorities breakdown
      const events = await this.redis.zrangebyscore(userKey, since, '+inf');
      const categories = {};
      const priorities = {};
      let totalSize = 0;

      for (const eventStr of events) {
        const eventInfo = JSON.parse(eventStr);
        categories[eventInfo.category] = (categories[eventInfo.category] || 0) + 1;
        priorities[eventInfo.priority] = (priorities[eventInfo.priority] || 0) + 1;
        totalSize += eventInfo.size || 0;
      }

      return {
        userId,
        since,
        totalEvents: totalCount,
        availableEvents: countSince,
        estimatedSize: totalSize,
        categories,
        priorities,
        dateRange: {
          oldest: oldestEvent ? oldestEvent.timestamp : null,
          newest: newestEvent ? newestEvent.timestamp : null
        }
      };
    } catch (error) {
      logger.error('Failed to get replay summary:', error);
      throw error;
    }
  }

  /**
   * Clean up expired events
   */
  async cleanupExpiredEvents() {
    try {
      const now = Date.now();
      const expirationTime = now - (this.config.retentionDays * 24 * 60 * 60 * 1000);

      logger.info('Starting cleanup of expired events', { expirationTime });

      // Get all user keys
      const userKeys = await this.redis.keys(`${this.keyPrefix}user:*`);
      let totalCleaned = 0;
      let totalBytesFreed = 0;

      for (const userKey of userKeys) {
        try {
          // Get expired events
          const expiredEvents = await this.redis.zrangebyscore(
            userKey,
            '-inf',
            expirationTime,
            'WITHSCORES'
          );

          if (expiredEvents.length === 0) continue;

          const pipeline = this.redis.pipeline();
          let cleanedCount = 0;
          let bytesFreed = 0;

          // Remove expired events and their metadata
          for (let i = 0; i < expiredEvents.length; i += 2) {
            const eventInfo = JSON.parse(expiredEvents[i]);
            const eventId = eventInfo.eventId;
            const metaKey = this.eventMetaKey(eventId);

            // Get size before deletion
            const eventMeta = await this.redis.hget(metaKey, 'compressedSize');
            if (eventMeta) {
              bytesFreed += parseInt(eventMeta);
            }

            pipeline.zrem(userKey, expiredEvents[i]);
            pipeline.del(metaKey);
            cleanedCount++;
          }

          await pipeline.exec();
          totalCleaned += cleanedCount;
          totalBytesFreed += bytesFreed;

          logger.debug('Cleaned expired events for user:', {
            userKey,
            cleaned: cleanedCount,
            bytesFreed
          });
        } catch (error) {
          logger.error('Failed to cleanup events for user:', { userKey, error });
        }
      }

      // Update cleanup statistics
      await this.redis.hmset(this.replayStatsKey, {
        lastCleanup: now.toString(),
        totalCleaned: totalCleaned.toString(),
        bytesFreed: totalBytesFreed.toString()
      });

      this.metrics.cleanupRuns++;

      logger.info('Cleanup completed:', {
        totalCleaned,
        totalBytesFreed,
        usersProcessed: userKeys.length
      });

      return { totalCleaned, totalBytesFreed };
    } catch (error) {
      logger.error('Failed to cleanup expired events:', error);
      throw error;
    }
  }

  /**
   * Limit the number of events stored per user
   */
  async limitUserEvents(userId) {
    const userKey = this.userEventKey(userId);
    const currentCount = await this.redis.zcard(userKey);

    if (currentCount > this.config.maxEventsPerReplay) {
      const removeCount = currentCount - this.config.maxEventsPerReplay;

      // Remove oldest events
      const removedEvents = await this.redis.zrange(userKey, 0, removeCount - 1);
      const pipeline = this.redis.pipeline();

      // Remove from sorted set and delete metadata
      for (const eventStr of removedEvents) {
        const eventInfo = JSON.parse(eventStr);
        pipeline.zrem(userKey, eventStr);
        pipeline.del(this.eventMetaKey(eventInfo.eventId));
      }

      await pipeline.exec();

      logger.debug('Limited user events:', {
        userId,
        removed: removeCount,
        remaining: this.config.maxEventsPerReplay
      });
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId(event) {
    const hash = createHash('sha256');
    hash.update(JSON.stringify({
      timestamp: event.timestamp || Date.now(),
      type: event.type,
      data: event.data,
      userId: event.userId
    }));
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Start background cleanup process
   */
  startCleanupProcess() {
    const cleanupInterval = 60 * 60 * 1000; // 1 hour

    const cleanup = async () => {
      try {
        await this.cleanupExpiredEvents();
      } catch (error) {
        logger.error('Scheduled cleanup failed:', error);
      }
    };

    // Initial cleanup
    setTimeout(cleanup, 30000); // Wait 30 seconds after startup

    // Regular cleanup
    setInterval(cleanup, cleanupInterval);

    logger.info('Event replay cleanup process started', {
      interval: cleanupInterval,
      retentionDays: this.config.retentionDays
    });
  }

  /**
   * Get replay metrics and statistics
   */
  async getMetrics() {
    try {
      const stats = await this.redis.hgetall(this.replayStatsKey);
      const userKeys = await this.redis.keys(`${this.keyPrefix}user:*`);

      return {
        ...this.metrics,
        activeUsers: userKeys.length,
        totalStoredEvents: parseInt(stats.totalEvents) || 0,
        totalStoredBytes: parseInt(stats.totalBytes) || 0,
        totalReplayedEvents: parseInt(stats.totalReplayed) || 0,
        lastCleanup: parseInt(stats.lastCleanup) || null,
        compressionEnabled: this.compressionLevel > 0,
        retentionDays: this.config.retentionDays,
        maxEventsPerUser: this.config.maxEventsPerReplay
      };
    } catch (error) {
      logger.error('Failed to get replay metrics:', error);
      return this.metrics;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down event replay manager...');

    try {
      // Run final cleanup
      await this.cleanupExpiredEvents();
      logger.info('Event replay manager shutdown complete');
    } catch (error) {
      logger.error('Error during event replay shutdown:', error);
    }
  }
}