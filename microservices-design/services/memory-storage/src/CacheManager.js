import crypto from 'crypto';

/**
 * Cache Manager for Redis operations
 * Handles intelligent caching, invalidation, and compression
 */
export class CacheManager {
  constructor(redisClient, config) {
    this.redis = redisClient;
    this.config = config;
    this.compressionEnabled = config.performance.compression;
    this.compressionThreshold = config.performance.compression_threshold;
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0
    };
  }

  /**
   * Set memory in cache
   */
  async setMemory(id, memory) {
    try {
      const key = this.getMemoryKey(id);
      const value = this.serializeValue(memory);
      const ttl = this.config.cache.redis.ttl.memory;
      
      await this.redis.setEx(key, ttl, value);
      this.stats.sets++;
      
      return true;
    } catch (error) {
      console.error(`Failed to cache memory ${id}:`, error);
      return false;
    }
  }

  /**
   * Get memory from cache
   */
  async getMemory(id) {
    try {
      const key = this.getMemoryKey(id);
      const value = await this.redis.get(key);
      
      if (value) {
        this.stats.hits++;
        return this.deserializeValue(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Failed to get cached memory ${id}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete memory from cache
   */
  async deleteMemory(id) {
    try {
      const key = this.getMemoryKey(id);
      await this.redis.del(key);
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error(`Failed to delete cached memory ${id}:`, error);
      return false;
    }
  }

  /**
   * Add memory ID to user's memory list cache
   */
  async addToUserList(userId, memoryId) {
    try {
      const key = this.getUserListKey(userId);
      await this.redis.sAdd(key, memoryId);
      await this.redis.expire(key, this.config.cache.redis.ttl.user_list);
      return true;
    } catch (error) {
      console.error(`Failed to add memory to user list cache:`, error);
      return false;
    }
  }

  /**
   * Remove memory ID from user's memory list cache
   */
  async removeFromUserList(userId, memoryId) {
    try {
      const key = this.getUserListKey(userId);
      await this.redis.sRem(key, memoryId);
      return true;
    } catch (error) {
      console.error(`Failed to remove memory from user list cache:`, error);
      return false;
    }
  }

  /**
   * Get user's memory list from cache
   */
  async getUserMemoryList(userId, page, limit) {
    try {
      const key = this.getUserListKey(userId);
      const cacheKey = `${key}:${page}:${limit}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.stats.hits++;
        return this.deserializeValue(cached);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Failed to get user memory list cache:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set user's memory list in cache
   */
  async setUserMemoryList(userId, page, limit, data) {
    try {
      const key = this.getUserListKey(userId);
      const cacheKey = `${key}:${page}:${limit}`;
      const value = this.serializeValue(data);
      
      await this.redis.setEx(cacheKey, this.config.cache.redis.ttl.user_list, value);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error(`Failed to set user memory list cache:`, error);
      return false;
    }
  }

  /**
   * Set search results in cache
   */
  async setSearchResults(cacheKey, results) {
    try {
      const key = this.getSearchKey(cacheKey);
      const value = this.serializeValue(results);
      
      await this.redis.setEx(key, this.config.cache.redis.ttl.search, value);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error(`Failed to cache search results:`, error);
      return false;
    }
  }

  /**
   * Get search results from cache
   */
  async getSearchResults(cacheKey) {
    try {
      const key = this.getSearchKey(cacheKey);
      const value = await this.redis.get(key);
      
      if (value) {
        this.stats.hits++;
        return this.deserializeValue(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Failed to get cached search results:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.invalidations += keys.length;
      }
      return keys.length;
    } catch (error) {
      console.error(`Failed to invalidate pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a user
   */
  async invalidateUserCache(userId) {
    try {
      const patterns = [
        this.getUserListKey(userId),
        `memory:*`, // This would need more specific pattern matching
        `search:*`
      ];
      
      let totalInvalidated = 0;
      for (const pattern of patterns) {
        totalInvalidated += await this.invalidatePattern(pattern);
      }
      
      return totalInvalidated;
    } catch (error) {
      console.error(`Failed to invalidate user cache for ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalOperations: total
    };
  }

  /**
   * Clear all cache entries
   */
  async clearAll() {
    try {
      await this.redis.flushAll();
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        invalidations: 0
      };
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Shutdown cache manager
   */
  async shutdown() {
    try {
      await this.redis.quit();
      console.log('CacheManager shutdown complete');
    } catch (error) {
      console.error('Error during cache shutdown:', error);
    }
  }

  // Helper methods

  getMemoryKey(id) {
    return `memory:${id}`;
  }

  getUserListKey(userId) {
    return `user:${userId}:memories`;
  }

  getSearchKey(cacheKey) {
    return `search:${cacheKey}`;
  }

  serializeValue(value) {
    const json = JSON.stringify(value);
    
    if (this.compressionEnabled && json.length > this.compressionThreshold) {
      // In production, use actual compression like LZ4 or Snappy
      // For now, just return the JSON
      return json;
    }
    
    return json;
  }

  deserializeValue(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Failed to deserialize cached value:', error);
      return null;
    }
  }

  /**
   * Batch operations for efficiency
   */
  async batchSetMemories(memories) {
    try {
      const pipeline = this.redis.multi();
      
      for (const memory of memories) {
        const key = this.getMemoryKey(memory.id);
        const value = this.serializeValue(memory);
        pipeline.setEx(key, this.config.cache.redis.ttl.memory, value);
      }
      
      await pipeline.exec();
      this.stats.sets += memories.length;
      return true;
    } catch (error) {
      console.error('Failed to batch set memories:', error);
      return false;
    }
  }

  async batchGetMemories(ids) {
    try {
      const keys = ids.map(id => this.getMemoryKey(id));
      const values = await this.redis.mGet(keys);
      
      const results = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i]) {
          this.stats.hits++;
          results.push({
            id: ids[i],
            memory: this.deserializeValue(values[i])
          });
        } else {
          this.stats.misses++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to batch get memories:', error);
      return [];
    }
  }

  /**
   * Cache warming utilities
   */
  async warmUserCache(userId, memories) {
    try {
      // Cache individual memories
      await this.batchSetMemories(memories);
      
      // Cache user's memory list
      const memoryIds = memories.map(m => m.id);
      const key = this.getUserListKey(userId);
      await this.redis.sAdd(key, ...memoryIds);
      await this.redis.expire(key, this.config.cache.redis.ttl.user_list);
      
      return true;
    } catch (error) {
      console.error(`Failed to warm cache for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Cache health check
   */
  async healthCheck() {
    try {
      const testKey = 'health:check';
      const testValue = 'ok';
      
      await this.redis.setEx(testKey, 10, testValue);
      const retrieved = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }
}