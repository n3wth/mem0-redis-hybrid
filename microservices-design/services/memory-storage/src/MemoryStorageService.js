import crypto from 'crypto';
import { CacheManager } from './CacheManager.js';
import { DatabaseManager } from './DatabaseManager.js';
import { MetricsCollector } from './MetricsCollector.js';

/**
 * Core Memory Storage Service
 * Orchestrates database operations, caching, and business logic
 */
export class MemoryStorageService {
  constructor(databaseManager, cacheManager, metricsCollector, config) {
    this.db = databaseManager;
    this.cache = cacheManager;
    this.metrics = metricsCollector;
    this.config = config;
    
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize database schema if needed
      await this.db.initializeSchema();
      
      // Warm cache if enabled
      if (this.config.performance.cache_warming) {
        await this.warmCache();
      }

      this.initialized = true;
      console.log('MemoryStorageService initialized');
    } catch (error) {
      console.error('Failed to initialize MemoryStorageService:', error);
      throw error;
    }
  }

  /**
   * Create a new memory
   */
  async createMemory(memoryData) {
    const startTime = Date.now();
    
    try {
      const {
        content,
        metadata = {},
        userId,
        priority = 'normal'
      } = memoryData;

      // Validate input
      this.validateMemoryData({ content, userId, priority });

      // Generate memory ID and version
      const id = crypto.randomUUID();
      const version = crypto.randomBytes(8).toString('hex');

      const memory = {
        id,
        content: content.trim(),
        metadata,
        userId,
        priority,
        version,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in database
      await this.db.createMemory(memory);

      // Cache the memory
      await this.cache.setMemory(id, memory);

      // Update user's memory list cache
      await this.cache.addToUserList(userId, id);

      // Record metrics
      this.metrics.recordOperation('create_memory', Date.now() - startTime, true);

      return memory;
    } catch (error) {
      this.metrics.recordOperation('create_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  async getMemory(id) {
    const startTime = Date.now();
    
    try {
      // Try cache first
      let memory = await this.cache.getMemory(id);
      
      if (!memory) {
        // Fallback to database
        memory = await this.db.getMemory(id);
        
        if (memory) {
          // Cache for future requests
          await this.cache.setMemory(id, memory);
        }
      }

      this.metrics.recordOperation('get_memory', Date.now() - startTime, !!memory);
      return memory;
    } catch (error) {
      this.metrics.recordOperation('get_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Update memory
   */
  async updateMemory(id, updates) {
    const startTime = Date.now();
    
    try {
      // Get current memory
      const currentMemory = await this.getMemory(id);
      if (!currentMemory) {
        return null;
      }

      // Validate updates
      this.validateMemoryUpdates(updates);

      // Generate new version
      const newVersion = crypto.randomBytes(8).toString('hex');

      const updatedMemory = {
        ...currentMemory,
        ...updates,
        id, // Ensure ID doesn't change
        version: newVersion,
        updatedAt: new Date().toISOString()
      };

      // Update in database
      await this.db.updateMemory(id, updatedMemory);

      // Update cache
      await this.cache.setMemory(id, updatedMemory);

      // Record metrics
      this.metrics.recordOperation('update_memory', Date.now() - startTime, true);

      return updatedMemory;
    } catch (error) {
      this.metrics.recordOperation('update_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Delete memory
   */
  async deleteMemory(id, options = {}) {
    const startTime = Date.now();
    const { soft = true } = options;
    
    try {
      const memory = await this.getMemory(id);
      if (!memory) {
        return false;
      }

      if (soft) {
        // Soft delete - mark as deleted
        await this.db.softDeleteMemory(id);
        
        // Remove from cache
        await this.cache.deleteMemory(id);
        
        // Remove from user list cache
        await this.cache.removeFromUserList(memory.userId, id);
      } else {
        // Hard delete - remove completely
        await this.db.hardDeleteMemory(id);
        
        // Remove from cache
        await this.cache.deleteMemory(id);
        
        // Remove from user list cache
        await this.cache.removeFromUserList(memory.userId, id);
      }

      this.metrics.recordOperation('delete_memory', Date.now() - startTime, true);
      return true;
    } catch (error) {
      this.metrics.recordOperation('delete_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * List memories with filtering and pagination
   */
  async listMemories(filters = {}, pagination = {}) {
    const startTime = Date.now();
    
    try {
      const {
        userId,
        priority,
        since,
        until,
        search
      } = filters;

      const {
        page = 1,
        limit = 20
      } = pagination;

      // Check cache for user's memory list
      if (userId && !search && !since && !until && !priority) {
        const cachedList = await this.cache.getUserMemoryList(userId, page, limit);
        if (cachedList) {
          this.metrics.recordOperation('list_memories', Date.now() - startTime, true);
          return cachedList;
        }
      }

      // Query database
      const result = await this.db.listMemories(filters, pagination);

      // Cache user's memory list if simple query
      if (userId && !search && !since && !until && !priority) {
        await this.cache.setUserMemoryList(userId, page, limit, result);
      }

      this.metrics.recordOperation('list_memories', Date.now() - startTime, true);
      return result;
    } catch (error) {
      this.metrics.recordOperation('list_memories', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Search memories
   */
  async searchMemories(searchOptions) {
    const startTime = Date.now();
    
    try {
      const {
        query,
        userId,
        limit = 10,
        threshold = 0.7
      } = searchOptions;

      // Check search cache
      const cacheKey = this.getSearchCacheKey(query, userId, limit);
      const cachedResults = await this.cache.getSearchResults(cacheKey);
      
      if (cachedResults) {
        this.metrics.recordOperation('search_memories', Date.now() - startTime, true);
        return cachedResults;
      }

      // Perform search
      const results = await this.db.searchMemories(searchOptions);

      // Cache search results
      await this.cache.setSearchResults(cacheKey, results);

      this.metrics.recordOperation('search_memories', Date.now() - startTime, true);
      return results;
    } catch (error) {
      this.metrics.recordOperation('search_memories', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Batch create memories
   */
  async batchCreate(memories) {
    const startTime = Date.now();
    
    try {
      const results = [];
      const errors = [];

      // Process in chunks
      const chunks = this.chunkArray(memories, this.config.performance.batch_size);
      
      for (const chunk of chunks) {
        try {
          const chunkResults = await Promise.all(
            chunk.map(memory => this.createMemory(memory))
          );
          results.push(...chunkResults);
        } catch (error) {
          errors.push({ chunk, error: error.message });
        }
      }

      this.metrics.recordOperation('batch_create', Date.now() - startTime, errors.length === 0);
      
      return {
        success: errors.length === 0,
        created: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      this.metrics.recordOperation('batch_create', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Batch update memories
   */
  async batchUpdate(updates) {
    const startTime = Date.now();
    
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const result = await this.updateMemory(update.id, update.updates);
          results.push(result);
        } catch (error) {
          errors.push({ id: update.id, error: error.message });
        }
      }

      this.metrics.recordOperation('batch_update', Date.now() - startTime, errors.length === 0);
      
      return {
        success: errors.length === 0,
        updated: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      this.metrics.recordOperation('batch_update', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Batch delete memories
   */
  async batchDelete(ids, options = {}) {
    const startTime = Date.now();
    
    try {
      const results = [];
      const errors = [];

      for (const id of ids) {
        try {
          const success = await this.deleteMemory(id, options);
          if (success) {
            results.push(id);
          }
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      this.metrics.recordOperation('batch_delete', Date.now() - startTime, errors.length === 0);
      
      return {
        success: errors.length === 0,
        deleted: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      this.metrics.recordOperation('batch_delete', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Create memory relationship
   */
  async createRelationship(sourceId, relationshipData) {
    const startTime = Date.now();
    
    try {
      const {
        targetMemoryId,
        relationshipType = 'related',
        strength = 1.0
      } = relationshipData;

      const relationship = await this.db.createRelationship(sourceId, {
        targetMemoryId,
        relationshipType,
        strength
      });

      this.metrics.recordOperation('create_relationship', Date.now() - startTime, true);
      return relationship;
    } catch (error) {
      this.metrics.recordOperation('create_relationship', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory relationships
   */
  async getRelationships(memoryId) {
    const startTime = Date.now();
    
    try {
      const relationships = await this.db.getRelationships(memoryId);
      this.metrics.recordOperation('get_relationships', Date.now() - startTime, true);
      return relationships;
    } catch (error) {
      this.metrics.recordOperation('get_relationships', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Add tag to memory
   */
  async addTag(memoryId, tagData) {
    const startTime = Date.now();
    
    try {
      const { name, value } = tagData;
      const tag = await this.db.addTag(memoryId, { name, value });
      
      this.metrics.recordOperation('add_tag', Date.now() - startTime, true);
      return tag;
    } catch (error) {
      this.metrics.recordOperation('add_tag', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory tags
   */
  async getTags(memoryId) {
    const startTime = Date.now();
    
    try {
      const tags = await this.db.getTags(memoryId);
      this.metrics.recordOperation('get_tags', Date.now() - startTime, true);
      return tags;
    } catch (error) {
      this.metrics.recordOperation('get_tags', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory versions
   */
  async getVersions(memoryId, limit = 10) {
    const startTime = Date.now();
    
    try {
      const versions = await this.db.getVersions(memoryId, limit);
      this.metrics.recordOperation('get_versions', Date.now() - startTime, true);
      return versions;
    } catch (error) {
      this.metrics.recordOperation('get_versions', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Warm cache for a user
   */
  async warmCache(userId = null) {
    try {
      if (userId) {
        // Warm cache for specific user
        const memories = await this.db.getUserMemories(userId, 100);
        for (const memory of memories) {
          await this.cache.setMemory(memory.id, memory);
        }
        console.log(`Warmed cache for user ${userId} with ${memories.length} memories`);
      } else {
        // Warm cache with recent memories
        const recentMemories = await this.db.getRecentMemories(1000);
        for (const memory of recentMemories) {
          await this.cache.setMemory(memory.id, memory);
        }
        console.log(`Warmed cache with ${recentMemories.length} recent memories`);
      }
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    try {
      await this.db.shutdown();
      await this.cache.shutdown();
      console.log('MemoryStorageService shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  // Helper methods

  validateMemoryData({ content, userId, priority }) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Content is required and must be a non-empty string');
    }
    
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('UserId is required and must be a non-empty string');
    }
    
    if (priority && !['low', 'normal', 'high', 'critical'].includes(priority)) {
      throw new Error('Priority must be one of: low, normal, high, critical');
    }
  }

  validateMemoryUpdates(updates) {
    if (updates.content !== undefined) {
      if (typeof updates.content !== 'string' || updates.content.trim().length === 0) {
        throw new Error('Content must be a non-empty string');
      }
    }
    
    if (updates.priority !== undefined) {
      if (!['low', 'normal', 'high', 'critical'].includes(updates.priority)) {
        throw new Error('Priority must be one of: low, normal, high, critical');
      }
    }
    
    if (updates.metadata !== undefined && typeof updates.metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }
  }

  getSearchCacheKey(query, userId, limit) {
    const hash = crypto.createHash('md5').update(`${query}:${userId}:${limit}`).digest('hex');
    return `search:${hash}`;
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}