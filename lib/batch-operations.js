import crypto from 'crypto';

/**
 * Batch operations manager for efficient bulk processing
 * Implements pipelining, chunking, and parallel execution strategies
 */
export class BatchOperationsManager {
  constructor(redisClient, mem0Client, options = {}) {
    this.redis = redisClient;
    this.mem0 = mem0Client;
    this.options = {
      maxBatchSize: options.maxBatchSize || 100,
      pipelineThreshold: options.pipelineThreshold || 10,
      parallelWorkers: options.parallelWorkers || 4,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      compressionThreshold: options.compressionThreshold || 1024
    };

    this.stats = {
      totalBatches: 0,
      successfulBatches: 0,
      failedBatches: 0,
      totalItems: 0,
      avgBatchTime: 0
    };
  }

  /**
   * Batch add memories with intelligent chunking
   * @param {Array} memories - Array of memory objects to add
   * @param {Object} options - Batch options
   */
  async batchAdd(memories, options = {}) {
    const {
      usePipeline = true,
      parallel = true,
      validateDuplicates = true,
      progressCallback = null
    } = options;

    const startTime = Date.now();
    const results = [];
    const errors = [];

    try {
      // Validate and prepare memories
      const prepared = await this.prepareMemories(memories, validateDuplicates);

      // Split into optimal chunks
      const chunks = this.createChunks(prepared, this.options.maxBatchSize);

      this.stats.totalBatches++;
      this.stats.totalItems += memories.length;

      // Process chunks
      if (parallel) {
        const chunkResults = await this.processChunksParallel(
          chunks,
          this.addChunk.bind(this),
          progressCallback
        );
        results.push(...chunkResults.results);
        errors.push(...chunkResults.errors);
      } else {
        for (const [index, chunk] of chunks.entries()) {
          try {
            const chunkResult = await this.addChunk(chunk, usePipeline);
            results.push(...chunkResult);

            if (progressCallback) {
              progressCallback({
                current: index + 1,
                total: chunks.length,
                percentage: ((index + 1) / chunks.length) * 100
              });
            }
          } catch (error) {
            errors.push({ chunk: index, error: error.message });
          }
        }
      }

      // Update statistics
      const duration = Date.now() - startTime;
      this.updateStats(duration, errors.length === 0);

      return {
        success: errors.length === 0,
        added: results.length,
        failed: errors.length,
        results,
        errors,
        duration: `${duration}ms`,
        stats: this.getStats()
      };

    } catch (error) {
      this.stats.failedBatches++;
      throw error;
    }
  }

  /**
   * Batch search memories with parallel execution
   * @param {Array} queries - Array of search queries
   * @param {Object} options - Search options
   */
  async batchSearch(queries, options = {}) {
    const {
      parallel = true,
      cacheResults = true,
      deduplicateResults = true,
      limit = 10
    } = options;

    const startTime = Date.now();
    const results = new Map();

    try {
      // Check cache for existing results
      const cacheKeys = queries.map(q => this.getSearchCacheKey(q));
      const cachedResults = await this.getCachedSearchResults(cacheKeys);

      // Filter out cached queries
      const uncachedQueries = queries.filter((q, i) => !cachedResults[i]);

      if (uncachedQueries.length > 0) {
        // Process uncached queries
        const searchPromises = uncachedQueries.map(async (query) => {
          const result = await this.searchWithRetry(query, { limit });

          if (cacheResults) {
            await this.cacheSearchResult(query, result);
          }

          return { query, result };
        });

        const searchResults = parallel
          ? await Promise.all(searchPromises)
          : await this.executeSequential(searchPromises);

        // Combine results
        searchResults.forEach(({ query, result }) => {
          results.set(query, result);
        });
      }

      // Add cached results
      queries.forEach((query, index) => {
        if (cachedResults[index]) {
          results.set(query, cachedResults[index]);
        }
      });

      // Deduplicate if requested
      const finalResults = deduplicateResults
        ? this.deduplicateSearchResults(results)
        : Array.from(results.values());

      return {
        success: true,
        queries: queries.length,
        cached: cachedResults.filter(Boolean).length,
        results: finalResults,
        duration: `${Date.now() - startTime}ms`
      };

    } catch (error) {
      throw new Error(`Batch search failed: ${error.message}`);
    }
  }

  /**
   * Batch update memories with conflict resolution
   * @param {Array} updates - Array of {id, updates} objects
   * @param {Object} options - Update options
   */
  async batchUpdate(updates, options = {}) {
    const {
      strategy = 'merge',
      atomic = false,
      parallel = true
    } = options;

    const startTime = Date.now();
    const results = [];
    const errors = [];

    try {
      if (atomic) {
        // Use Redis MULTI for atomic updates
        const multi = this.redis.multi();

        for (const update of updates) {
          const key = `memory:${update.id}`;
          const value = JSON.stringify(update.updates);
          multi.set(key, value, 'EX', 86400);
        }

        await multi.exec();
      } else {
        // Process updates in parallel or sequence
        const updatePromises = updates.map(async (update) => {
          try {
            const result = await this.updateMemoryWithStrategy(
              update.id,
              update.updates,
              strategy
            );
            return { id: update.id, success: true, result };
          } catch (error) {
            return { id: update.id, success: false, error: error.message };
          }
        });

        const updateResults = parallel
          ? await Promise.all(updatePromises)
          : await this.executeSequential(updatePromises);

        updateResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
        });
      }

      return {
        success: errors.length === 0,
        updated: results.length,
        failed: errors.length,
        results,
        errors,
        duration: `${Date.now() - startTime}ms`
      };

    } catch (error) {
      throw new Error(`Batch update failed: ${error.message}`);
    }
  }

  /**
   * Batch delete memories
   * @param {Array} memoryIds - Array of memory IDs to delete
   * @param {Object} options - Delete options
   */
  async batchDelete(memoryIds, options = {}) {
    const {
      softDelete = false,
      archiveBeforeDelete = true
    } = options;

    const startTime = Date.now();
    const results = [];
    const errors = [];

    try {
      // Archive if requested
      if (archiveBeforeDelete) {
        await this.archiveMemories(memoryIds);
      }

      if (softDelete) {
        // Mark as deleted without removing
        const multi = this.redis.multi();

        for (const id of memoryIds) {
          const key = `memory:${id}`;
          multi.hset(key, 'deleted', 'true', 'deleted_at', Date.now());
        }

        await multi.exec();
        results.push(...memoryIds);
      } else {
        // Hard delete from both cache and cloud
        const chunks = this.createChunks(memoryIds, 50);

        for (const chunk of chunks) {
          try {
            // Delete from Redis
            const cacheKeys = chunk.map(id => `memory:${id}`);
            await this.redis.del(...cacheKeys);

            // Delete from Mem0
            await Promise.all(chunk.map(id => this.mem0.delete(id)));

            results.push(...chunk);
          } catch (error) {
            errors.push({ chunk, error: error.message });
          }
        }
      }

      return {
        success: errors.length === 0,
        deleted: results.length,
        failed: errors.length,
        results,
        errors,
        duration: `${Date.now() - startTime}ms`
      };

    } catch (error) {
      throw new Error(`Batch delete failed: ${error.message}`);
    }
  }

  /**
   * Process a chunk of memories using Redis pipeline
   */
  async addChunk(chunk, usePipeline) {
    const results = [];

    if (usePipeline && chunk.length >= this.options.pipelineThreshold) {
      // Use Redis pipeline for efficiency
      const pipeline = this.redis.pipeline();

      for (const memory of chunk) {
        const id = memory.id || crypto.randomUUID();
        const key = `memory:${id}`;
        const value = this.compress(JSON.stringify(memory));

        pipeline.set(key, value, 'EX', 86400);
        pipeline.zadd('memory:index', Date.now(), id);

        results.push({ id, status: 'cached' });
      }

      await pipeline.exec();
    } else {
      // Process individually
      for (const memory of chunk) {
        const result = await this.addSingleMemory(memory);
        results.push(result);
      }
    }

    // Sync to cloud in background
    this.syncToCloud(chunk).catch(err =>
      console.error('Background sync failed:', err)
    );

    return results;
  }

  /**
   * Process chunks in parallel with worker limit
   */
  async processChunksParallel(chunks, processor, progressCallback) {
    const results = [];
    const errors = [];
    const workers = this.options.parallelWorkers;

    // Create worker pool
    const workerPool = [];
    let chunkIndex = 0;
    let completed = 0;

    for (let i = 0; i < Math.min(workers, chunks.length); i++) {
      workerPool.push(this.createWorker());
    }

    // Process chunks with workers
    await Promise.all(workerPool.map(async (worker) => {
      while (chunkIndex < chunks.length) {
        const currentIndex = chunkIndex++;
        const chunk = chunks[currentIndex];

        try {
          const result = await processor(chunk, true);
          results.push(...result);
          completed++;

          if (progressCallback) {
            progressCallback({
              current: completed,
              total: chunks.length,
              percentage: (completed / chunks.length) * 100
            });
          }
        } catch (error) {
          errors.push({ chunk: currentIndex, error: error.message });
        }
      }
    }));

    return { results, errors };
  }

  /**
   * Prepare memories for batch processing
   */
  async prepareMemories(memories, validateDuplicates) {
    const prepared = [];
    const seen = new Set();

    for (const memory of memories) {
      // Generate hash for duplicate detection
      const hash = this.generateHash(memory.content || memory.memory);

      if (validateDuplicates && seen.has(hash)) {
        continue; // Skip duplicate
      }

      seen.add(hash);

      // Prepare memory object
      prepared.push({
        ...memory,
        id: memory.id || crypto.randomUUID(),
        hash,
        created_at: new Date().toISOString(),
        user_id: memory.user_id || this.options.defaultUserId
      });
    }

    return prepared;
  }

  /**
   * Create optimal chunks for batch processing
   */
  createChunks(items, chunkSize) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Execute promises sequentially
   */
  async executeSequential(promises) {
    const results = [];
    for (const promise of promises) {
      results.push(await promise);
    }
    return results;
  }

  /**
   * Search with retry logic
   */
  async searchWithRetry(query, options, attempt = 1) {
    try {
      return await this.mem0.search({ query, ...options });
    } catch (error) {
      if (attempt < this.options.retryAttempts) {
        await this.delay(this.options.retryDelay * attempt);
        return this.searchWithRetry(query, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Cache search results
   */
  async cacheSearchResult(query, result) {
    const key = this.getSearchCacheKey(query);
    const value = JSON.stringify(result);
    await this.redis.setex(key, 300, value); // 5 minute cache
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(keys) {
    const results = await this.redis.mget(...keys);
    return results.map(r => r ? JSON.parse(r) : null);
  }

  /**
   * Generate cache key for search query
   */
  getSearchCacheKey(query) {
    const hash = crypto.createHash('md5').update(query).digest('hex');
    return `search:${hash}`;
  }

  /**
   * Deduplicate search results
   */
  deduplicateSearchResults(resultsMap) {
    const seen = new Set();
    const deduplicated = [];

    for (const results of resultsMap.values()) {
      for (const result of results) {
        if (!seen.has(result.id)) {
          seen.add(result.id);
          deduplicated.push(result);
        }
      }
    }

    return deduplicated;
  }

  /**
   * Archive memories before deletion
   */
  async archiveMemories(memoryIds) {
    const pipeline = this.redis.pipeline();
    const timestamp = Date.now();

    for (const id of memoryIds) {
      const archiveKey = `archive:${id}:${timestamp}`;
      const memoryKey = `memory:${id}`;

      // Copy to archive
      pipeline.copy(memoryKey, archiveKey);
      pipeline.expire(archiveKey, 2592000); // 30 days
    }

    await pipeline.exec();
  }

  /**
   * Sync memories to cloud storage
   */
  async syncToCloud(memories) {
    try {
      const cloudPromises = memories.map(memory =>
        this.mem0.add({
          content: memory.content || memory.memory,
          metadata: memory.metadata,
          user_id: memory.user_id
        })
      );

      await Promise.all(cloudPromises);
    } catch (error) {
      console.error('Cloud sync failed:', error);
      // Queue for retry
      this.queueForRetry(memories);
    }
  }

  /**
   * Queue memories for retry
   */
  queueForRetry(memories) {
    const queueKey = 'retry:queue';
    const items = memories.map(m => JSON.stringify(m));
    this.redis.lpush(queueKey, ...items);
  }

  /**
   * Compress data if above threshold
   */
  compress(data) {
    if (data.length < this.options.compressionThreshold) {
      return data;
    }
    // In production, use actual compression like LZ4
    return data; // Placeholder
  }

  /**
   * Generate hash for content
   */
  generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Update memory with strategy
   */
  async updateMemoryWithStrategy(id, updates, strategy) {
    // Implementation would use the MemoryUpdateManager
    return { id, updates, strategy };
  }

  /**
   * Create a worker for parallel processing
   */
  createWorker() {
    return {
      id: crypto.randomUUID(),
      created: Date.now()
    };
  }

  /**
   * Add single memory
   */
  async addSingleMemory(memory) {
    const id = memory.id || crypto.randomUUID();
    const key = `memory:${id}`;

    await this.redis.set(key, JSON.stringify(memory), 'EX', 86400);

    return { id, status: 'added' };
  }

  /**
   * Update statistics
   */
  updateStats(duration, success) {
    if (success) {
      this.stats.successfulBatches++;
    } else {
      this.stats.failedBatches++;
    }

    // Update average batch time
    const totalBatches = this.stats.successfulBatches + this.stats.failedBatches;
    this.stats.avgBatchTime =
      (this.stats.avgBatchTime * (totalBatches - 1) + duration) / totalBatches;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalBatches > 0
        ? (this.stats.successfulBatches / this.stats.totalBatches * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}