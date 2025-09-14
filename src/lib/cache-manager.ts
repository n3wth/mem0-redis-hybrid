/**
 * Cache Manager - Centralized cache operations with improved error handling
 */

import * as crypto from "crypto";
import { RedisManager } from "./redis-manager.js";
import { CacheError, ErrorHandler, TimeoutError } from "./errors.js";

export interface Memory {
  id: string;
  memory: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  user_id: string;
  source?: string;
  relevance_score?: number;
  score_breakdown?: {
    semantic: number;
    keyword: number;
    entity: number;
    relationship: number;
    recency: number;
  };
  matched_entities?: string[];
  matched_relationships?: string[];
}

export interface CacheConfig {
  ttl: {
    l1: number;      // Hot data TTL
    l2: number;      // Warm data TTL
    search: number;  // Search results TTL
  };
  maxSize: number;
  frequentAccessThreshold: number;
}

export class CacheKeys {
  static memory = (id: string) => `memory:${id}`;
  static access = (id: string) => `access:${id}`;
  static keyword = (word: string) => `keyword:${word}`;
  static memoryKeywords = (id: string) => `memory:keywords:${id}`;
  static search = (query: string, limit: number) => {
    const hash = crypto.createHash("md5").update(query).digest("hex");
    return `search:${hash}:${limit}`;
  };
}

export class CacheManager {
  private redisManager: RedisManager;
  private config: CacheConfig;

  constructor(redisManager: RedisManager, config?: Partial<CacheConfig>) {
    this.redisManager = redisManager;
    this.config = {
      ttl: {
        l1: config?.ttl?.l1 || 86400,        // 24 hours
        l2: config?.ttl?.l2 || 604800,       // 7 days
        search: config?.ttl?.search || 300,  // 5 minutes
      },
      maxSize: config?.maxSize || 1000,
      frequentAccessThreshold: config?.frequentAccessThreshold || 3,
    };
  }

  // Get cached memory with access tracking
  async getCachedMemory(memoryId: string): Promise<Memory | null> {
    try {
      const key = CacheKeys.memory(memoryId);
      const cached = await this.redisManager.get(key);

      if (cached) {
        // Track access for cache optimization
        await this.trackAccess(memoryId);
        return JSON.parse(cached);
      }
      return null;
    } catch (error: any) {
      throw new CacheError(
        'getCachedMemory',
        error.message,
        true,
        { memoryId }
      );
    }
  }

  // Set cached memory with appropriate TTL
  async setCachedMemory(
    memoryId: string,
    data: Memory,
    ttl?: number
  ): Promise<void> {
    try {
      const key = CacheKeys.memory(memoryId);
      const effectiveTtl = ttl || await this.determineTTL(memoryId);

      await this.redisManager.set(key, JSON.stringify(data), effectiveTtl);
      await this.trackAccess(memoryId);

      // Index for search
      if (data.memory) {
        await this.indexMemoryForSearch(memoryId, data);
      }
    } catch (error: any) {
      throw new CacheError(
        'setCachedMemory',
        error.message,
        true,
        { memoryId }
      );
    }
  }

  // Delete cached memory and clean up indices
  async deleteCachedMemory(memoryId: string): Promise<void> {
    try {
      // Get keywords before deleting
      const keywordsKey = CacheKeys.memoryKeywords(memoryId);
      const keywords = await this.redisManager.sMembers(keywordsKey);

      // Remove from keyword indices
      for (const keyword of keywords) {
        await this.redisManager.sRem(CacheKeys.keyword(keyword), memoryId);
      }

      // Delete memory and related keys
      await this.redisManager.del([
        CacheKeys.memory(memoryId),
        CacheKeys.access(memoryId),
        keywordsKey,
      ]);
    } catch (error: any) {
      throw new CacheError(
        'deleteCachedMemory',
        error.message,
        true,
        { memoryId }
      );
    }
  }

  // Track memory access for cache optimization
  private async trackAccess(memoryId: string): Promise<void> {
    try {
      await this.redisManager.incr(CacheKeys.access(memoryId));
    } catch (error: any) {
      // Non-critical error, log but don't throw
      ErrorHandler.logError(error, `Failed to track access for ${memoryId}`);
    }
  }

  // Determine TTL based on access patterns
  private async determineTTL(memoryId: string): Promise<number> {
    try {
      const accessCount = await this.getAccessCount(memoryId);
      return accessCount >= this.config.frequentAccessThreshold
        ? this.config.ttl.l1
        : this.config.ttl.l2;
    } catch (error) {
      // Default to L2 TTL on error
      return this.config.ttl.l2;
    }
  }

  // Get access count for a memory
  private async getAccessCount(memoryId: string): Promise<number> {
    try {
      const count = await this.redisManager.get(CacheKeys.access(memoryId));
      return parseInt(count || "0");
    } catch (error) {
      return 0;
    }
  }

  // Index memory for keyword search
  private async indexMemoryForSearch(
    memoryId: string,
    memory: Memory
  ): Promise<void> {
    if (!memory.memory) return;

    try {
      // Extract keywords (simple tokenization)
      const text = memory.memory.toLowerCase();
      const keywords = text
        .split(/\W+/)
        .filter((word) => word.length > 3)
        .slice(0, 20); // Top 20 keywords

      // Store in Redis sets for each keyword
      for (const keyword of keywords) {
        await this.redisManager.sAdd(CacheKeys.keyword(keyword), memoryId);
        await this.redisManager.expire(
          CacheKeys.keyword(keyword),
          this.config.ttl.l1
        );
      }

      // Store reverse index
      if (keywords.length > 0) {
        await this.redisManager.sAdd(
          CacheKeys.memoryKeywords(memoryId),
          keywords
        );
        await this.redisManager.expire(
          CacheKeys.memoryKeywords(memoryId),
          this.config.ttl.l1
        );
      }
    } catch (error: any) {
      ErrorHandler.logError(error, `Failed to index memory ${memoryId}`);
    }
  }

  // Cache search results
  async cacheSearchResults(
    query: string,
    limit: number,
    results: Memory[]
  ): Promise<void> {
    try {
      const key = CacheKeys.search(query, limit);
      await this.redisManager.set(
        key,
        JSON.stringify(results),
        this.config.ttl.search
      );
    } catch (error: any) {
      ErrorHandler.logError(error, "Failed to cache search results");
    }
  }

  // Get cached search results
  async getCachedSearchResults(
    query: string,
    limit: number
  ): Promise<Memory[] | null> {
    try {
      const key = CacheKeys.search(query, limit);
      const cached = await this.redisManager.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error: any) {
      ErrorHandler.logError(error, "Failed to get cached search results");
      return null;
    }
  }

  // Invalidate all search cache entries
  async invalidateSearchCache(): Promise<void> {
    try {
      const searchKeys = await this.redisManager.keys("search:*");
      if (searchKeys.length > 0) {
        await this.redisManager.del(searchKeys);
        console.error(
          `✓ Invalidated ${searchKeys.length} search cache entries`
        );
      }
    } catch (error: any) {
      throw new CacheError(
        'invalidateSearchCache',
        error.message,
        false
      );
    }
  }

  // Get top accessed memories
  async getTopMemories(limit: number = 50): Promise<string[]> {
    try {
      const keys = await this.redisManager.keys("memory:*");
      const accessData: { key: string; access: number }[] = [];

      for (const key of keys) {
        const memoryKey = key.replace("memory:", "");
        const accessCount = await this.getAccessCount(memoryKey);
        accessData.push({ key: memoryKey, access: accessCount });
      }

      return accessData
        .sort((a, b) => b.access - a.access)
        .slice(0, limit)
        .map((item) => item.key);
    } catch (error: any) {
      throw new CacheError(
        'getTopMemories',
        error.message,
        false
      );
    }
  }

  // Search cache using keyword matching
  async searchFromCache(
    query: string,
    limit: number
  ): Promise<Memory[]> {
    try {
      const queryKeywords = query
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3);

      const memoryScores = new Map<string, number>();

      // Find memories matching keywords
      for (const keyword of queryKeywords) {
        const memoryIds = await this.redisManager.sMembers(
          CacheKeys.keyword(keyword)
        );
        for (const memoryId of memoryIds) {
          const score = memoryScores.get(memoryId) || 0;
          memoryScores.set(memoryId, score + 1);
        }
      }

      // Sort by relevance score
      const sortedMemoryIds = Array.from(memoryScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      // Fetch memories from cache
      const results: Memory[] = [];
      for (const memoryId of sortedMemoryIds) {
        const cached = await this.getCachedMemory(memoryId);
        if (cached) {
          results.push({
            ...cached,
            source: "redis_cache",
            relevance_score: memoryScores.get(memoryId),
          });
        }
      }

      return results;
    } catch (error: any) {
      throw new CacheError(
        'searchFromCache',
        error.message,
        true,
        { query, limit }
      );
    }
  }

  // Optimize cache by refreshing frequently accessed memories
  async optimizeCache(
    memories: Memory[],
    maxMemories: number,
    forceRefresh: boolean = false
  ): Promise<{ cached: number; l1Count: number; l2Count: number }> {
    try {
      // Clear old cache if force refresh
      if (forceRefresh) {
        const oldKeys = await this.redisManager.keys("memory:*");
        if (oldKeys.length > 0) {
          await this.redisManager.del(oldKeys);
        }
        const oldKeywords = await this.redisManager.keys("keyword:*");
        if (oldKeywords.length > 0) {
          await this.redisManager.del(oldKeywords);
        }
      }

      let cached = 0;
      let l1Count = 0;
      let l2Count = 0;

      for (const memory of memories) {
        if (!memory.id || cached >= maxMemories) continue;

        // Check access patterns
        const accessCount = await this.getAccessCount(memory.id);

        // Determine cache level
        if (cached < 100 || accessCount > this.config.frequentAccessThreshold) {
          // L1 cache - hot data
          await this.setCachedMemory(memory.id, memory, this.config.ttl.l1);
          l1Count++;
        } else {
          // L2 cache - warm data
          await this.setCachedMemory(memory.id, memory, this.config.ttl.l2);
          l2Count++;
        }
        cached++;
      }

      return { cached, l1Count, l2Count };
    } catch (error: any) {
      throw new CacheError(
        'optimizeCache',
        error.message,
        false,
        { maxMemories, forceRefresh }
      );
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalMemories: number;
    totalAccess: number;
    hitRate: string;
    memoryUsage: string;
    topAccessed: Array<{ key: string; count: string }>;
  }> {
    try {
      const info = await this.redisManager.info("memory");
      const cacheKeys = await this.redisManager.keys("memory:*");
      const accessKeys = await this.redisManager.keys("access:*");

      // Calculate total access
      let totalAccess = 0;
      for (const key of accessKeys) {
        const count = await this.redisManager.get(key);
        totalAccess += parseInt(count || "0");
      }

      // Get top accessed memories
      const topMemories = await this.getTopMemories(10);
      const topAccessed = await Promise.all(
        topMemories.slice(0, 3).map(async (key) => ({
          key: key.substring(0, 8),
          count: (await this.redisManager.get(CacheKeys.access(key))) || "0",
        }))
      );

      // Calculate hit rate
      const hitRate =
        cacheKeys.length > 0
          ? Math.min(100, (totalAccess / cacheKeys.length) * 10).toFixed(0)
          : "0";

      // Extract memory usage
      const memUsage =
        info.split("used_memory_human:")[1]?.split("\r\n")[0] || "unknown";

      return {
        totalMemories: cacheKeys.length,
        totalAccess,
        hitRate,
        memoryUsage: memUsage,
        topAccessed,
      };
    } catch (error: any) {
      throw new CacheError(
        'getCacheStats',
        error.message,
        false
      );
    }
  }

  // Batch operations for efficiency
  async batchGet(memoryIds: string[]): Promise<(Memory | null)[]> {
    const results = await Promise.all(
      memoryIds.map(id => this.getCachedMemory(id))
    );
    return results;
  }

  async batchSet(memories: Memory[], ttl?: number): Promise<void> {
    await Promise.all(
      memories.map(memory =>
        this.setCachedMemory(memory.id, memory, ttl)
      )
    );
  }

  async batchDelete(memoryIds: string[]): Promise<void> {
    await Promise.all(
      memoryIds.map(id => this.deleteCachedMemory(id))
    );
  }
}