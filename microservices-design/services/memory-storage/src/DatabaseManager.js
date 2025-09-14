import fs from 'fs/promises';
import path from 'path';

/**
 * Database Manager for PostgreSQL operations
 * Handles all database interactions with connection pooling and query optimization
 */
export class DatabaseManager {
  constructor(pool, config) {
    this.pool = pool;
    this.config = config;
    this.initialized = false;
    
    this.stats = {
      queries: 0,
      errors: 0,
      avgQueryTime: 0,
      activeConnections: 0
    };
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    if (this.initialized) return;

    try {
      // Check if schema exists
      const result = await this.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'memories'
        );
      `);

      if (!result.rows[0].exists) {
        // Load and execute schema
        const schemaPath = path.join(process.cwd(), 'microservices-design/services/memory-storage/schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        // Execute each statement
        for (const statement of statements) {
          if (statement.trim()) {
            await this.query(statement);
          }
        }

        console.log('Database schema initialized');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Create memory in database
   */
  async createMemory(memory) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        INSERT INTO memories (id, content, metadata, user_id, priority, version, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        memory.id,
        memory.content,
        JSON.stringify(memory.metadata),
        memory.userId,
        memory.priority,
        memory.version,
        memory.createdAt,
        memory.updatedAt
      ]);

      this.recordQuery('create_memory', Date.now() - startTime, true);
      return this.mapMemoryFromDb(result.rows[0]);
    } catch (error) {
      this.recordQuery('create_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  async getMemory(id) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        SELECT * FROM memories 
        WHERE id = $1 AND deleted_at IS NULL
      `, [id]);

      this.recordQuery('get_memory', Date.now() - startTime, true);
      return result.rows.length > 0 ? this.mapMemoryFromDb(result.rows[0]) : null;
    } catch (error) {
      this.recordQuery('get_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Update memory
   */
  async updateMemory(id, memory) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        UPDATE memories 
        SET content = $2, metadata = $3, priority = $4, version = $5, updated_at = $6
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `, [
        id,
        memory.content,
        JSON.stringify(memory.metadata),
        memory.priority,
        memory.version,
        memory.updatedAt
      ]);

      this.recordQuery('update_memory', Date.now() - startTime, true);
      return result.rows.length > 0 ? this.mapMemoryFromDb(result.rows[0]) : null;
    } catch (error) {
      this.recordQuery('update_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Soft delete memory
   */
  async softDeleteMemory(id) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        UPDATE memories 
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `, [id]);

      this.recordQuery('soft_delete_memory', Date.now() - startTime, true);
      return result.rows.length > 0;
    } catch (error) {
      this.recordQuery('soft_delete_memory', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Hard delete memory
   */
  async hardDeleteMemory(id) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        DELETE FROM memories 
        WHERE id = $1
        RETURNING *
      `, [id]);

      this.recordQuery('hard_delete_memory', Date.now() - startTime, true);
      return result.rows.length > 0;
    } catch (error) {
      this.recordQuery('hard_delete_memory', Date.now() - startTime, false);
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

      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      const whereConditions = ['deleted_at IS NULL'];
      const params = [];
      let paramIndex = 1;

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }

      if (priority) {
        whereConditions.push(`priority = $${paramIndex++}`);
        params.push(priority);
      }

      if (since) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        params.push(since.toISOString());
      }

      if (until) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        params.push(until.toISOString());
      }

      if (search) {
        whereConditions.push(`to_tsvector('english', content) @@ plainto_tsquery('english', $${paramIndex++})`);
        params.push(search);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await this.query(`
        SELECT COUNT(*) as total FROM memories ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await this.query(`
        SELECT * FROM memories 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, [...params, limit, offset]);

      this.recordQuery('list_memories', Date.now() - startTime, true);
      
      return {
        memories: result.rows.map(row => this.mapMemoryFromDb(row)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.recordQuery('list_memories', Date.now() - startTime, false);
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

      const params = [];
      let paramIndex = 1;

      // Build WHERE clause
      const whereConditions = ['deleted_at IS NULL'];
      
      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }

      // Full-text search
      whereConditions.push(`to_tsvector('english', content) @@ plainto_tsquery('english', $${paramIndex++})`);
      params.push(query);

      const whereClause = whereConditions.join(' AND ');

      const result = await this.query(`
        SELECT *, 
               ts_rank(to_tsvector('english', content), plainto_tsquery('english', $${paramIndex++})) as rank
        FROM memories 
        WHERE ${whereClause}
        ORDER BY rank DESC, created_at DESC
        LIMIT $${paramIndex++}
      `, [...params, query, limit]);

      this.recordQuery('search_memories', Date.now() - startTime, true);
      
      return {
        query,
        results: result.rows.map(row => ({
          ...this.mapMemoryFromDb(row),
          relevanceScore: parseFloat(row.rank)
        })),
        total: result.rows.length
      };
    } catch (error) {
      this.recordQuery('search_memories', Date.now() - startTime, false);
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
        relationshipType,
        strength
      } = relationshipData;

      const result = await this.query(`
        INSERT INTO memory_relationships (source_memory_id, target_memory_id, relationship_type, strength)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [sourceId, targetMemoryId, relationshipType, strength]);

      this.recordQuery('create_relationship', Date.now() - startTime, true);
      return result.rows[0];
    } catch (error) {
      this.recordQuery('create_relationship', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory relationships
   */
  async getRelationships(memoryId) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        SELECT mr.*, m.content as target_content, m.user_id as target_user_id
        FROM memory_relationships mr
        JOIN memories m ON mr.target_memory_id = m.id
        WHERE mr.source_memory_id = $1 AND m.deleted_at IS NULL
        ORDER BY mr.strength DESC, mr.created_at DESC
      `, [memoryId]);

      this.recordQuery('get_relationships', Date.now() - startTime, true);
      return result.rows;
    } catch (error) {
      this.recordQuery('get_relationships', Date.now() - startTime, false);
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

      const result = await this.query(`
        INSERT INTO memory_tags (memory_id, tag_name, tag_value)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [memoryId, name, value]);

      this.recordQuery('add_tag', Date.now() - startTime, true);
      return result.rows[0];
    } catch (error) {
      this.recordQuery('add_tag', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory tags
   */
  async getTags(memoryId) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        SELECT * FROM memory_tags 
        WHERE memory_id = $1
        ORDER BY created_at DESC
      `, [memoryId]);

      this.recordQuery('get_tags', Date.now() - startTime, true);
      return result.rows;
    } catch (error) {
      this.recordQuery('get_tags', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get memory versions
   */
  async getVersions(memoryId, limit = 10) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        SELECT * FROM memory_versions 
        WHERE memory_id = $1
        ORDER BY version_number DESC
        LIMIT $2
      `, [memoryId, limit]);

      this.recordQuery('get_versions', Date.now() - startTime, true);
      return result.rows;
    } catch (error) {
      this.recordQuery('get_versions', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get user memories for cache warming
   */
  async getUserMemories(userId, limit = 100) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        SELECT * FROM memories 
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      this.recordQuery('get_user_memories', Date.now() - startTime, true);
      return result.rows.map(row => this.mapMemoryFromDb(row));
    } catch (error) {
      this.recordQuery('get_user_memories', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get recent memories for cache warming
   */
  async getRecentMemories(limit = 1000) {
    const startTime = Date.now();
    
    try {
      const result = await this.query(`
        SELECT * FROM memories 
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      this.recordQuery('get_recent_memories', Date.now() - startTime, true);
      return result.rows.map(row => this.mapMemoryFromDb(row));
    } catch (error) {
      this.recordQuery('get_recent_memories', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Execute raw query
   */
  async query(text, params = []) {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      this.recordQuery('raw_query', Date.now() - startTime, true);
      return result;
    } catch (error) {
      this.recordQuery('raw_query', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const result = await this.query(`
        SELECT 
          (SELECT COUNT(*) FROM memories WHERE deleted_at IS NULL) as total_memories,
          (SELECT COUNT(*) FROM memory_relationships) as total_relationships,
          (SELECT COUNT(*) FROM memory_tags) as total_tags,
          (SELECT COUNT(DISTINCT user_id) FROM memories WHERE deleted_at IS NULL) as unique_users
      `);

      return {
        ...this.stats,
        database: result.rows[0]
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return this.stats;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown database manager
   */
  async shutdown() {
    try {
      await this.pool.end();
      console.log('DatabaseManager shutdown complete');
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  }

  // Helper methods

  mapMemoryFromDb(row) {
    return {
      id: row.id,
      content: row.content,
      metadata: row.metadata || {},
      userId: row.user_id,
      priority: row.priority,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    };
  }

  recordQuery(operation, duration, success) {
    this.stats.queries++;
    if (!success) {
      this.stats.errors++;
    }
    
    // Update average query time
    this.stats.avgQueryTime = 
      (this.stats.avgQueryTime * (this.stats.queries - 1) + duration) / this.stats.queries;
  }
}