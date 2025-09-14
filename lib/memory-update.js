import crypto from 'crypto';
import { createClient } from 'redis';

/**
 * Smart memory update with conflict resolution and diffing
 * Tracks changes, merges conflicts, and maintains version history
 */
export class MemoryUpdateManager {
  constructor(redisClient, mem0Client) {
    this.redis = redisClient;
    this.mem0 = mem0Client;
    this.conflictStrategies = {
      'merge': this.mergeConflicts.bind(this),
      'override': this.overrideConflicts.bind(this),
      'newest': this.newestWins.bind(this),
      'ai_resolve': this.aiResolveConflicts.bind(this)
    };
  }

  /**
   * Update memory with smart diffing and conflict resolution
   * @param {string} memoryId - Memory ID to update
   * @param {Object} updates - Updates to apply
   * @param {Object} options - Update options
   */
  async updateMemory(memoryId, updates, options = {}) {
    const {
      strategy = 'merge',
      trackHistory = true,
      validateSchema = true,
      atomicUpdate = true
    } = options;

    try {
      // Start transaction for atomic updates
      if (atomicUpdate) {
        await this.redis.watch(`memory:${memoryId}`);
      }

      // Fetch current memory state
      const current = await this.fetchMemory(memoryId);
      if (!current) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      // Calculate diff
      const diff = this.calculateDiff(current, updates);

      // Check for conflicts
      const conflicts = this.detectConflicts(current, updates, diff);

      // Resolve conflicts based on strategy
      const resolved = conflicts.length > 0
        ? await this.conflictStrategies[strategy](current, updates, conflicts)
        : this.applyDiff(current, diff);

      // Validate updated memory
      if (validateSchema) {
        this.validateMemory(resolved);
      }

      // Track version history
      if (trackHistory) {
        await this.saveVersion(memoryId, current, resolved, diff);
      }

      // Update in both stores
      const result = await this.persistUpdate(memoryId, resolved, atomicUpdate);

      // Invalidate relevant caches
      await this.invalidateCaches(memoryId, diff);

      return {
        success: true,
        memory: result,
        diff,
        conflicts: conflicts.length,
        strategy: conflicts.length > 0 ? strategy : 'none'
      };

    } catch (error) {
      if (atomicUpdate) {
        await this.redis.unwatch();
      }
      throw error;
    }
  }

  /**
   * Calculate diff between current and updated memory
   */
  calculateDiff(current, updates) {
    const diff = {
      added: {},
      modified: {},
      removed: [],
      metadata: {}
    };

    // Track field changes
    for (const [key, value] of Object.entries(updates)) {
      if (!(key in current)) {
        diff.added[key] = value;
      } else if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
        diff.modified[key] = {
          old: current[key],
          new: value
        };
      }
    }

    // Track removed fields
    for (const key of Object.keys(current)) {
      if (!(key in updates) && updates._removeFields?.includes(key)) {
        diff.removed.push(key);
      }
    }

    // Special handling for metadata
    if (updates.metadata) {
      diff.metadata = this.diffMetadata(current.metadata || {}, updates.metadata);
    }

    return diff;
  }

  /**
   * Detect conflicts between concurrent updates
   */
  detectConflicts(current, updates, diff) {
    const conflicts = [];

    // Check for concurrent modifications
    if (current._version && updates._baseVersion) {
      if (current._version !== updates._baseVersion) {
        // Another update happened since this update was prepared
        for (const field of Object.keys(diff.modified)) {
          conflicts.push({
            field,
            type: 'concurrent_modification',
            currentValue: current[field],
            updateValue: updates[field]
          });
        }
      }
    }

    // Check for semantic conflicts
    conflicts.push(...this.detectSemanticConflicts(current, updates));

    return conflicts;
  }

  /**
   * Detect semantic conflicts (e.g., contradictory information)
   */
  detectSemanticConflicts(current, updates) {
    const conflicts = [];

    // Check for contradictory preferences
    if (current.preferences && updates.preferences) {
      for (const [key, value] of Object.entries(updates.preferences)) {
        if (current.preferences[key] &&
            this.isContradictory(current.preferences[key], value)) {
          conflicts.push({
            field: `preferences.${key}`,
            type: 'semantic_contradiction',
            currentValue: current.preferences[key],
            updateValue: value
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Merge conflict resolution strategy
   */
  async mergeConflicts(current, updates, conflicts) {
    const resolved = { ...current };

    for (const conflict of conflicts) {
      if (conflict.type === 'concurrent_modification') {
        // Merge arrays
        if (Array.isArray(conflict.currentValue) && Array.isArray(conflict.updateValue)) {
          resolved[conflict.field] = [...new Set([...conflict.currentValue, ...conflict.updateValue])];
        }
        // Merge objects
        else if (typeof conflict.currentValue === 'object' && typeof conflict.updateValue === 'object') {
          resolved[conflict.field] = { ...conflict.currentValue, ...conflict.updateValue };
        }
        // Default to update value
        else {
          resolved[conflict.field] = conflict.updateValue;
        }
      }
    }

    // Apply non-conflicting updates
    for (const [key, value] of Object.entries(updates)) {
      if (!conflicts.find(c => c.field === key)) {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Override conflict resolution - updates win
   */
  async overrideConflicts(current, updates, conflicts) {
    return { ...current, ...updates, _version: this.generateVersion() };
  }

  /**
   * Newest wins conflict resolution
   */
  async newestWins(current, updates, conflicts) {
    const currentTime = new Date(current.updated_at || current.created_at).getTime();
    const updateTime = new Date(updates._timestamp || Date.now()).getTime();

    return updateTime >= currentTime
      ? { ...current, ...updates, _version: this.generateVersion() }
      : current;
  }

  /**
   * AI-powered conflict resolution
   */
  async aiResolveConflicts(current, updates, conflicts) {
    // This would integrate with an LLM to intelligently resolve conflicts
    // For now, fall back to merge strategy
    return this.mergeConflicts(current, updates, conflicts);
  }

  /**
   * Apply diff to current memory
   */
  applyDiff(current, diff) {
    const updated = { ...current };

    // Apply additions
    Object.assign(updated, diff.added);

    // Apply modifications
    for (const [key, change] of Object.entries(diff.modified)) {
      updated[key] = change.new;
    }

    // Apply removals
    for (const key of diff.removed) {
      delete updated[key];
    }

    // Apply metadata changes
    if (diff.metadata) {
      updated.metadata = { ...updated.metadata, ...diff.metadata };
    }

    // Update version and timestamp
    updated._version = this.generateVersion();
    updated.updated_at = new Date().toISOString();

    return updated;
  }

  /**
   * Save version history
   */
  async saveVersion(memoryId, oldVersion, newVersion, diff) {
    const version = {
      id: crypto.randomUUID(),
      memoryId,
      timestamp: new Date().toISOString(),
      diff,
      snapshot: oldVersion
    };

    // Store in Redis with TTL (30 days)
    const key = `history:${memoryId}:${version.timestamp}`;
    await this.redis.setex(key, 2592000, JSON.stringify(version));

    // Maintain version index
    await this.redis.zadd(
      `versions:${memoryId}`,
      Date.now(),
      version.id
    );

    // Limit history to last 100 versions
    await this.redis.zremrangebyrank(`versions:${memoryId}`, 0, -101);
  }

  /**
   * Persist update to both Redis and Mem0
   */
  async persistUpdate(memoryId, memory, atomic) {
    const multi = atomic ? this.redis.multi() : null;

    // Update Redis cache
    const cacheKey = `memory:${memoryId}`;
    const cacheData = JSON.stringify(memory);

    if (multi) {
      multi.set(cacheKey, cacheData);
      multi.expire(cacheKey, 86400); // 24h TTL
      await multi.exec();
    } else {
      await this.redis.set(cacheKey, cacheData, 'EX', 86400);
    }

    // Update Mem0 cloud
    const cloudResult = await this.mem0.update(memoryId, memory);

    // Publish update event
    await this.redis.publish('memory:updated', JSON.stringify({
      memoryId,
      timestamp: Date.now(),
      version: memory._version
    }));

    return cloudResult;
  }

  /**
   * Invalidate affected caches
   */
  async invalidateCaches(memoryId, diff) {
    const patterns = [
      `search:*${memoryId}*`,
      `query:*${memoryId}*`
    ];

    // Add patterns based on modified fields
    for (const field of Object.keys(diff.modified)) {
      patterns.push(`field:${field}:*`);
    }

    // Invalidate matching cache entries
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  /**
   * Validate memory schema
   */
  validateMemory(memory) {
    // Basic validation rules
    if (!memory.content && !memory.memory) {
      throw new Error('Memory must have content or memory field');
    }

    if (memory.metadata && typeof memory.metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }

    if (memory.priority && !['low', 'normal', 'high', 'critical'].includes(memory.priority)) {
      throw new Error('Invalid priority value');
    }

    return true;
  }

  /**
   * Check if two values are contradictory
   */
  isContradictory(value1, value2) {
    // Simple contradiction detection
    const opposites = {
      'light': 'dark',
      'dark': 'light',
      'enabled': 'disabled',
      'disabled': 'enabled',
      'true': 'false',
      'false': 'true'
    };

    const v1 = String(value1).toLowerCase();
    const v2 = String(value2).toLowerCase();

    return opposites[v1] === v2;
  }

  /**
   * Generate version identifier
   */
  generateVersion() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Fetch memory from cache or cloud
   */
  async fetchMemory(memoryId) {
    // Try cache first
    const cached = await this.redis.get(`memory:${memoryId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to cloud
    return await this.mem0.get(memoryId);
  }

  /**
   * Diff metadata objects
   */
  diffMetadata(current, updates) {
    const diff = {};

    for (const [key, value] of Object.entries(updates)) {
      if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
        diff[key] = value;
      }
    }

    return diff;
  }

  /**
   * Get version history for a memory
   */
  async getHistory(memoryId, limit = 10) {
    const versionIds = await this.redis.zrevrange(
      `versions:${memoryId}`,
      0,
      limit - 1,
      'WITHSCORES'
    );

    const history = [];
    for (let i = 0; i < versionIds.length; i += 2) {
      const versionId = versionIds[i];
      const timestamp = versionIds[i + 1];

      const key = `history:${memoryId}:${new Date(parseInt(timestamp)).toISOString()}`;
      const data = await this.redis.get(key);

      if (data) {
        history.push(JSON.parse(data));
      }
    }

    return history;
  }

  /**
   * Rollback to a previous version
   */
  async rollback(memoryId, versionId) {
    const history = await this.getHistory(memoryId, 100);
    const version = history.find(v => v.id === versionId);

    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Restore the snapshot
    return await this.persistUpdate(memoryId, version.snapshot, true);
  }
}