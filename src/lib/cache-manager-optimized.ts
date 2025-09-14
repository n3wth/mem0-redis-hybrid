/**
 * Optimized Cache Manager with improved type safety and performance
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
    l1: number;
    l2: number;
    search: number;
  };
  maxSize: number;
  frequentAccessThreshold: number;
  operationTimeout: number; // Add timeout config
}

export interface CacheStats {
  totalMemories: number;
  totalAccess: number;
  hitRate: string;
  memoryUsage: string;
  topAccessed: Array<{ key: string; count: string }>;
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
  static cacheMetadata = () => `cache:metadata`;
}

export class CacheManager {
  private redisManager: RedisManager;
  private config: CacheConfig;
  private operationQueue: Map<string, Promise<any>> = new Map();

  constructor(redisManager: RedisManager, config?: Partial<CacheConfig>) {
    this.redisManager = redisManager;
    this.config = {
      ttl: {
        l1: config?.ttl?.l1 || 86400,
        l2: config?.ttl?.l2 || 604800,
        search: config?.ttl?.search || 300,
      },
      maxSize: config?.maxSize || 1000,
      frequentAccessThreshold: config?.frequentAccessThreshold || 3,
      operationTimeout: config?.operationTimeout || 5000, // 5 second default timeout
    };
  }

  // Wrapper for operations with timeout
  private async withTimeout<T>(
    operation: Promise<T>,
    operationName: string,
    timeout?: number
  ): Promise<T> {
    const timeoutMs = timeout || this.config.operationTimeout;

    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(operationName, timeoutMs)),
          timeoutMs
        )
      ),
    ]);
  }

  // Get cached memory with improved error handling
  async getCachedMemory(memoryId: string): Promise<Memory | null> {
    const operationKey = `get:${memoryId}`;

    // Dedup concurrent requests for same memory
    if (this.operationQueue.has(operationKey)) {
      return this.operationQueue.get(operationKey);
    }

    const operation = this.withTimeout(
      this._getCachedMemory(memoryId),
      `getCachedMemory:${memoryId}`
    ).finally(() => {
      this.operationQueue.delete(operationKey);
    });

    this.operationQueue.set(operationKey, operation);
    return operation;
  }

  private async _getCachedMemory(memoryId: string): Promise<Memory | null> {
    try {
      const key = CacheKeys.memory(memoryId);
      const cached = await this.redisManager.get(key);

      if (cached) {
        // Use HINCRBY for atomic counter increment (avoids type errors)
        await this.trackAccessAtomic(memoryId);
        return JSON.parse(cached);
      }
      return null;
    } catch (error: any) {
      // Log but don't fail on cache miss
      ErrorHandler.logError(error, `Cache miss for ${memoryId}`);
      return null;
    }
  }

  // Set cached memory with proper error recovery
  async setCachedMemory(
    memoryId: string,
    data: Memory,
    ttl?: number
  ): Promise<void> {
    const operation = this.withTimeout(
      this._setCachedMemory(memoryId, data, ttl),
      `setCachedMemory:${memoryId}`
    );

    return operation;
  }

  private async _setCachedMemory(
    memoryId: string,
    data: Memory,
    ttl?: number
  ): Promise<void> {
    try {
      const key = CacheKeys.memory(memoryId);
      const effectiveTtl = ttl || (await this.determineTTL(memoryId));

      await this.redisManager.set(key, JSON.stringify(data), effectiveTtl);
      await this.trackAccessAtomic(memoryId);

      // Index for search in background
      this.indexMemoryForSearchAsync(memoryId, data).catch((err) =>
        ErrorHandler.logError(err, `Failed to index ${memoryId}`)
      );
    } catch (error: any) {
      throw new CacheError("setCachedMemory", error.message, true, {
        memoryId,
      });
    }
  }

  // Use atomic HINCRBY to avoid type conflicts
  private async trackAccessAtomic(memoryId: string): Promise<void> {
    try {
      // Use hash to store all access counts atomically
      await this.redisManager.hIncrBy(
        CacheKeys.cacheMetadata(),
        `access:${memoryId}`,
        1
      );
    } catch (error: any) {
      ErrorHandler.logError(error, `Failed to track access for ${memoryId}`);
    }
  }

  // Get access count from hash
  private async getAccessCount(memoryId: string): Promise<number> {
    try {
      const count = await this.redisManager.hGet(
        CacheKeys.cacheMetadata(),
        `access:${memoryId}`
      );
      return parseInt(count || "0");
    } catch {
      return 0;
    }
  }

  // Optimized cache stats using SCAN instead of KEYS
  async getCacheStats(): Promise<CacheStats> {
    const operation = this.withTimeout(
      this._getCacheStats(),
      "getCacheStats",
      10000 // Allow more time for stats
    );

    return operation;
  }

  private async _getCacheStats(): Promise<CacheStats> {
    try {
      // Use SCAN for better performance on large datasets
      const memoryCount = await this.scanCount("memory:*");

      // Get all access counts from hash in one operation
      const allAccess = await this.redisManager.hGetAll(
        CacheKeys.cacheMetadata()
      );

      // Calculate total access
      let totalAccess = 0;
      const accessEntries: Array<[string, number]> = [];

      for (const [key, value] of Object.entries(allAccess)) {
        if (key.startsWith("access:")) {
          const count = parseInt(value as string) || 0;
          totalAccess += count;
          accessEntries.push([key.replace("access:", ""), count]);
        }
      }

      // Get top 3 accessed memories efficiently
      const topAccessed = accessEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key, count]) => ({
          key: key.substring(0, 8),
          count: count.toString(),
        }));

      // Calculate hit rate
      const hitRate =
        memoryCount > 0
          ? Math.min(100, (totalAccess / memoryCount) * 10).toFixed(0)
          : "0";

      // Get memory usage safely
      let memoryUsage = "unknown";
      try {
        const info = await this.redisManager.info("memory");
        memoryUsage =
          info.split("used_memory_human:")[1]?.split("\r\n")[0] || "unknown";
      } catch {
        // Fallback if INFO command fails
      }

      return {
        totalMemories: memoryCount,
        totalAccess,
        hitRate,
        memoryUsage,
        topAccessed,
      };
    } catch (error: any) {
      // Return safe defaults on error
      return {
        totalMemories: 0,
        totalAccess: 0,
        hitRate: "0",
        memoryUsage: "unknown",
        topAccessed: [],
      };
    }
  }

  // Use SCAN instead of KEYS for better performance
  private async scanCount(pattern: string): Promise<number> {
    let cursor = "0";
    let count = 0;

    do {
      const result = await this.redisManager.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor;
      count += result.keys.length;
    } while (cursor !== "0");

    return count;
  }

  // Async background indexing
  private async indexMemoryForSearchAsync(
    memoryId: string,
    data: Memory
  ): Promise<void> {
    // Extract keywords and index in background
    if (!data.memory) return;

    const keywords = this.extractKeywords(data.memory);
    const keywordsKey = CacheKeys.memoryKeywords(memoryId);

    // Store keywords for this memory
    if (keywords.length > 0) {
      await this.redisManager.sAdd(keywordsKey, keywords);

      // Add memory to keyword indices
      for (const keyword of keywords) {
        await this.redisManager.sAdd(CacheKeys.keyword(keyword), memoryId);
      }
    }
  }

  // Extract keywords from text
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "the", "is", "at", "which", "on", "a", "an", "and", "or", "but",
      "in", "with", "to", "for", "of", "as", "by", "that", "this",
      "it", "from", "be", "are", "was", "were", "been",
    ]);

    return words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Limit keywords per memory
  }

  // Delete cached memory with cleanup
  async deleteCachedMemory(memoryId: string): Promise<void> {
    const operation = this.withTimeout(
      this._deleteCachedMemory(memoryId),
      `deleteCachedMemory:${memoryId}`
    );

    return operation;
  }

  private async _deleteCachedMemory(memoryId: string): Promise<void> {
    try {
      // Get keywords before deleting
      const keywordsKey = CacheKeys.memoryKeywords(memoryId);
      const keywords = await this.redisManager.sMembers(keywordsKey);

      // Batch delete operations
      const deleteOps = [
        this.redisManager.del([CacheKeys.memory(memoryId), keywordsKey]),
        this.redisManager.hDel(
          CacheKeys.cacheMetadata(),
          `access:${memoryId}`
        ),
      ];

      // Remove from keyword indices
      for (const keyword of keywords) {
        deleteOps.push(
          this.redisManager.sRem(CacheKeys.keyword(keyword), memoryId)
        );
      }

      await Promise.all(deleteOps);
    } catch (error: any) {
      throw new CacheError("deleteCachedMemory", error.message, true, {
        memoryId,
      });
    }
  }

  // Determine TTL based on access patterns
  private async determineTTL(memoryId: string): Promise<number> {
    const accessCount = await this.getAccessCount(memoryId);
    return accessCount >= this.config.frequentAccessThreshold
      ? this.config.ttl.l1
      : this.config.ttl.l2;
  }

  // Batch get with parallel processing
  async batchGet(memoryIds: string[]): Promise<(Memory | null)[]> {
    // Process in chunks to avoid overwhelming Redis
    const chunkSize = 10;
    const results: (Memory | null)[] = [];

    for (let i = 0; i < memoryIds.length; i += chunkSize) {
      const chunk = memoryIds.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map((id) => this.getCachedMemory(id))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  // Batch set with error recovery
  async batchSet(memories: Memory[], ttl?: number): Promise<void> {
    const chunkSize = 10;

    for (let i = 0; i < memories.length; i += chunkSize) {
      const chunk = memories.slice(i, i + chunkSize);
      await Promise.allSettled(
        chunk.map((memory) => this.setCachedMemory(memory.id, memory, ttl))
      );
    }
  }

  // Get cached search results
  async getCachedSearch(query: string, limit: number): Promise<Memory[] | null> {
    try {
      const key = CacheKeys.search(query, limit);
      const cached = await this.redisManager.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  // Alias for backward compatibility
  async getCachedSearchResults(query: string, limit: number): Promise<Memory[] | null> {
    return this.getCachedSearch(query, limit);
  }

  // Set cached search results
  async setCachedSearch(
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
      ErrorHandler.logError(error, `Failed to cache search for: ${query}`);
    }
  }

  // Alias for backward compatibility
  async cacheSearchResults(query: string, limit: number, results: Memory[]): Promise<void> {
    return this.setCachedSearch(query, limit, results);
  }

  // Search from cache (for getAllMemories compatibility)
  async searchFromCache(pattern: string, limit: number): Promise<Memory[]> {
    try {
      // If searching for all (*), try to get all cached memories
      if (pattern === "*") {
        let cursor = "0";
        const memories: Memory[] = [];
        const seenIds = new Set<string>();

        do {
          const result = await this.redisManager.scan(cursor, {
            MATCH: "memory:*",
            COUNT: 100,
          });
          cursor = result.cursor;

          for (const key of result.keys) {
            if (!key.includes(":keywords:") && !key.includes(":access:")) {
              const memoryId = key.replace("memory:", "");
              if (!seenIds.has(memoryId)) {
                const memory = await this.getCachedMemory(memoryId);
                if (memory) {
                  memories.push(memory);
                  seenIds.add(memoryId);
                  if (memories.length >= limit) break;
                }
              }
            }
          }
        } while (cursor !== "0" && memories.length < limit);

        return memories.slice(0, limit);
      }

      // For specific patterns, search by keywords
      const keywords = this.extractKeywords(pattern);
      const memoryIds = new Set<string>();

      for (const keyword of keywords) {
        const ids = await this.redisManager.sMembers(CacheKeys.keyword(keyword));
        ids.forEach(id => memoryIds.add(id));
      }

      const memories = await this.batchGet(Array.from(memoryIds));
      return memories.filter((m): m is Memory => m !== null).slice(0, limit);
    } catch (error: any) {
      ErrorHandler.logError(error, `Failed to search from cache: ${pattern}`);
      return [];
    }
  }

  // Invalidate search cache
  async invalidateSearchCache(): Promise<void> {
    try {
      let cursor = "0";
      do {
        const result = await this.redisManager.scan(cursor, {
          MATCH: "search:*",
          COUNT: 100,
        });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await this.redisManager.del(result.keys);
        }
      } while (cursor !== "0");
    } catch (error: any) {
      ErrorHandler.logError(error, "Failed to invalidate search cache");
    }
  }

  // Optimize cache by preloading frequent memories
  async optimizeCache(
    memories: Memory[],
    maxMemories: number,
    forceRefresh: boolean
  ): Promise<{ cached: number; duration: string }> {
    const start = Date.now();

    try {
      // Get access stats to prioritize caching
      const allAccess = await this.redisManager.hGetAll(
        CacheKeys.cacheMetadata()
      );

      // Sort memories by access count
      const memoriesWithAccess = memories.map((memory) => ({
        memory,
        accessCount: parseInt(
          allAccess[`access:${memory.id}`] as string || "0"
        ),
      }));

      memoriesWithAccess.sort((a, b) => b.accessCount - a.accessCount);

      // Cache top memories
      const toCache = memoriesWithAccess
        .slice(0, maxMemories)
        .map((item) => item.memory);

      await this.batchSet(toCache, this.config.ttl.l1);

      const duration = `${Date.now() - start}ms`;
      return { cached: toCache.length, duration };
    } catch (error: any) {
      throw new CacheError("optimizeCache", error.message, false);
    }
  }
}