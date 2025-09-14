import crypto from 'crypto';

/**
 * Embedding Cache Manager for Redis operations
 * Handles intelligent caching, compression, and invalidation for embeddings
 */
export class EmbeddingCache {
  constructor(redisClient, config) {
    this.redis = redisClient;
    this.config = config;
    this.compressionEnabled = config.compression;
    this.compressionThreshold = 1024; // bytes
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      compressionRatio: 0
    };
  }

  /**
   * Set embedding in cache
   */
  async setEmbedding(cacheKey, embedding) {
    try {
      const key = this.getEmbeddingKey(cacheKey);
      const value = this.serializeEmbedding(embedding);
      const ttl = this.config.ttl;
      
      await this.redis.setEx(key, ttl, value);
      
      // Also store by ID for direct lookup
      const idKey = this.getEmbeddingIdKey(embedding.id);
      await this.redis.setEx(idKey, ttl, value);
      
      // Add to recent embeddings list
      await this.addToRecentList(embedding);
      
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error(`Failed to cache embedding ${cacheKey}:`, error);
      return false;
    }
  }

  /**
   * Get embedding from cache by cache key
   */
  async getEmbedding(cacheKey) {
    try {
      const key = this.getEmbeddingKey(cacheKey);
      const value = await this.redis.get(key);
      
      if (value) {
        this.stats.hits++;
        return this.deserializeEmbedding(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Failed to get cached embedding ${cacheKey}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Get embedding by ID
   */
  async getEmbeddingById(id) {
    try {
      const key = this.getEmbeddingIdKey(id);
      const value = await this.redis.get(key);
      
      if (value) {
        this.stats.hits++;
        return this.deserializeEmbedding(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Failed to get embedding by ID ${id}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete embedding from cache
   */
  async deleteEmbedding(id) {
    try {
      const idKey = this.getEmbeddingIdKey(id);
      await this.redis.del(idKey);
      
      // Remove from recent list
      await this.removeFromRecentList(id);
      
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error(`Failed to delete cached embedding ${id}:`, error);
      return false;
    }
  }

  /**
   * Batch set embeddings
   */
  async batchSetEmbeddings(embeddings) {
    try {
      const pipeline = this.redis.multi();
      
      for (const embedding of embeddings) {
        const key = this.getEmbeddingIdKey(embedding.id);
        const value = this.serializeEmbedding(embedding);
        pipeline.setEx(key, this.config.ttl, value);
        
        // Add to recent list
        pipeline.zadd('recent:embeddings', Date.now(), embedding.id);
      }
      
      await pipeline.exec();
      this.stats.sets += embeddings.length;
      return true;
    } catch (error) {
      console.error('Failed to batch set embeddings:', error);
      return false;
    }
  }

  /**
   * Batch get embeddings by IDs
   */
  async batchGetEmbeddings(ids) {
    try {
      const keys = ids.map(id => this.getEmbeddingIdKey(id));
      const values = await this.redis.mGet(keys);
      
      const results = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i]) {
          this.stats.hits++;
          results.push({
            id: ids[i],
            embedding: this.deserializeEmbedding(values[i])
          });
        } else {
          this.stats.misses++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to batch get embeddings:', error);
      return [];
    }
  }

  /**
   * Get recent embeddings
   */
  async getRecentEmbeddings(limit = 100) {
    try {
      const ids = await this.redis.zrevrange('recent:embeddings', 0, limit - 1);
      const embeddings = [];
      
      for (const id of ids) {
        const embedding = await this.getEmbeddingById(id);
        if (embedding) {
          embeddings.push(embedding);
        }
      }
      
      return embeddings;
    } catch (error) {
      console.error('Failed to get recent embeddings:', error);
      return [];
    }
  }

  /**
   * Search embeddings by metadata
   */
  async searchEmbeddingsByMetadata(query) {
    try {
      // This would use Redis search or scan with pattern matching
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to search embeddings by metadata:', error);
      return [];
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
   * Clear all embedding cache
   */
  async clearAll() {
    try {
      const patterns = [
        'embedding:*',
        'embedding:id:*',
        'recent:embeddings'
      ];
      
      let totalInvalidated = 0;
      for (const pattern of patterns) {
        totalInvalidated += await this.invalidatePattern(pattern);
      }
      
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        invalidations: 0,
        compressionRatio: 0
      };
      
      return totalInvalidated;
    } catch (error) {
      console.error('Failed to clear embedding cache:', error);
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
      totalOperations: total,
      compressionEnabled: this.compressionEnabled,
      compressionThreshold: this.compressionThreshold
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const testKey = 'health:embedding:check';
      const testValue = 'ok';
      
      await this.redis.setEx(testKey, 10, testValue);
      const retrieved = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.error('Embedding cache health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown cache manager
   */
  async shutdown() {
    try {
      await this.redis.quit();
      console.log('EmbeddingCache shutdown complete');
    } catch (error) {
      console.error('Error during embedding cache shutdown:', error);
    }
  }

  // Helper methods

  getEmbeddingKey(cacheKey) {
    return `embedding:${cacheKey}`;
  }

  getEmbeddingIdKey(id) {
    return `embedding:id:${id}`;
  }

  serializeEmbedding(embedding) {
    const json = JSON.stringify(embedding);
    
    if (this.compressionEnabled && json.length > this.compressionThreshold) {
      // In production, use actual compression like LZ4
      // For now, just return the JSON
      return json;
    }
    
    return json;
  }

  deserializeEmbedding(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Failed to deserialize cached embedding:', error);
      return null;
    }
  }

  async addToRecentList(embedding) {
    try {
      await this.redis.zadd('recent:embeddings', Date.now(), embedding.id);
      
      // Keep only last 1000 embeddings in recent list
      await this.redis.zremrangebyrank('recent:embeddings', 0, -1001);
    } catch (error) {
      console.error('Failed to add to recent list:', error);
    }
  }

  async removeFromRecentList(id) {
    try {
      await this.redis.zrem('recent:embeddings', id);
    } catch (error) {
      console.error('Failed to remove from recent list:', error);
    }
  }

  /**
   * Cache warming utilities
   */
  async warmCache(embeddings) {
    try {
      await this.batchSetEmbeddings(embeddings);
      console.log(`Warmed cache with ${embeddings.length} embeddings`);
      return true;
    } catch (error) {
      console.error('Failed to warm embedding cache:', error);
      return false;
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize() {
    try {
      const embeddingKeys = await this.redis.keys('embedding:*');
      return embeddingKeys.length;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage() {
    try {
      const info = await this.redis.memory('usage');
      return {
        usedMemory: info,
        usedMemoryHuman: `${Math.round(info / 1024 / 1024)} MB`
      };
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return { usedMemory: 0, usedMemoryHuman: '0 MB' };
    }
  }
}