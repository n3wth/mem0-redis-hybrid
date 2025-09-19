import sqlite3 from "sqlite3";
const { Database } = sqlite3;
import { createClient, RedisClientType } from "redis";
import Fuse from "fuse.js";

// Types
interface Memory {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  project?: string;
  directory?: string;
  tags: string[];
  metadata: {
    executable?: boolean;
    dangerous?: boolean;
    requires_sudo?: boolean;
    category?: string;
    last_used?: string;
    use_count?: number;
    [key: string]: any;
  };
}

interface SearchOptions {
  fuzzy?: boolean;
  project?: string;
  directory?: string;
  tags?: string[];
  limit?: number;
  include_archived?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memory: number;
}

export class MemoryEngine {
  private db: sqlite3.Database;
  private redis: RedisClientType | null = null;
  private fuse: Fuse<Memory> | null = null;
  private memoryCache: Map<string, Memory> = new Map();
  private searchCache: Map<string, Memory[]> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memory: 0,
  };

  // Performance monitoring
  private operationTimes: Map<string, number[]> = new Map();

  constructor(
    private dbPath: string = "./data/memories.db",
    private redisUrl: string = process.env.REDIS_URL ||
      "redis://localhost:6379",
  ) {
    this.db = new Database(dbPath);
    this.initializeDatabase();
    this.connectRedis();
  }

  private async initializeDatabase(): Promise<void> {
    const startTime = performance.now();

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Optimized schema for fast queries
        this.db.run(`
          CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            project TEXT,
            directory TEXT,
            tags TEXT, -- JSON array
            metadata TEXT, -- JSON object
            search_text TEXT, -- Pre-computed search text
            use_count INTEGER DEFAULT 0,
            last_used DATETIME
          )
        `);

        // Indexes for lightning-fast queries
        this.db.run(
          "CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id)",
        );
        this.db.run(
          "CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project)",
        );
        this.db.run(
          "CREATE INDEX IF NOT EXISTS idx_memories_directory ON memories(directory)",
        );
        this.db.run(
          "CREATE INDEX IF NOT EXISTS idx_memories_last_used ON memories(last_used DESC)",
        );
        this.db.run(
          "CREATE INDEX IF NOT EXISTS idx_memories_use_count ON memories(use_count DESC)",
        );
        this.db.run(
          "CREATE INDEX IF NOT EXISTS idx_memories_search_text ON memories(search_text)",
        );

        // Full-text search
        this.db.run(`
          CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
            id, content, tags, metadata,
            content='memories', content_rowid='rowid'
          )
        `);

        // Stats table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS stats (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        resolve(undefined);
      });
    }).then(() => {
      this.recordOperation("db_init", performance.now() - startTime);
      this.loadMemoriesIntoCache();
    });
  }

  private async connectRedis(): Promise<void> {
    try {
      this.redis = createClient({ url: this.redisUrl });
      await this.redis.connect();
      // Silently connect - no console output
    } catch (error) {
      // Redis unavailable, using local cache only
      this.redis = null;
    }
  }

  private async loadMemoriesIntoCache(): Promise<void> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      // Load most recent and frequently used memories into cache
      this.db.all(
        `
        SELECT * FROM memories
        ORDER BY
          CASE WHEN last_used > datetime('now', '-7 days') THEN use_count ELSE 0 END DESC,
          last_used DESC
        LIMIT 1000
      `,
        [],
        (err, rows: any[]) => {
          if (!err && rows) {
            const memories: Memory[] = rows.map(this.parseMemoryRow);

            // Populate memory cache
            memories.forEach((memory) => {
              this.memoryCache.set(memory.id, memory);
            });

            // Initialize Fuse.js for fuzzy search
            this.fuse = new Fuse(memories, {
              keys: [
                { name: "content", weight: 0.7 },
                { name: "tags", weight: 0.2 },
                { name: "metadata.category", weight: 0.1 },
              ],
              threshold: 0.3,
              includeScore: true,
              useExtendedSearch: true,
            });

            this.stats.size = memories.length;
            this.recordOperation("cache_load", performance.now() - startTime);
            // Loaded memories into cache
          }
          resolve(undefined);
        },
      );
    });
  }

  async addMemory(
    memory: Omit<Memory, "id" | "created_at" | "updated_at">,
  ): Promise<string> {
    const startTime = performance.now();
    const id = this.generateId();
    const now = new Date().toISOString();

    const fullMemory: Memory = {
      ...memory,
      id,
      created_at: now,
      updated_at: now,
      metadata: {
        use_count: 0,
        ...memory.metadata,
      },
    };

    // Add to database
    await this.insertMemoryToDb(fullMemory);

    // Add to caches
    this.memoryCache.set(id, fullMemory);
    this.invalidateSearchCache();
    this.updateFuseIndex();

    // Cache in Redis
    if (this.redis) {
      await this.redis.setEx(`memory:${id}`, 3600, JSON.stringify(fullMemory));
    }

    this.recordOperation("add_memory", performance.now() - startTime);
    return id;
  }

  async getMemory(id: string): Promise<Memory | null> {
    const startTime = performance.now();

    // Check local cache first
    if (this.memoryCache.has(id)) {
      this.stats.hits++;
      this.recordOperation("get_memory_cache", performance.now() - startTime);
      return this.memoryCache.get(id)!;
    }

    // Check Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`memory:${id}`);
        if (cached) {
          const memory = JSON.parse(cached) as Memory;
          this.memoryCache.set(id, memory);
          this.stats.hits++;
          this.recordOperation(
            "get_memory_redis",
            performance.now() - startTime,
          );
          return memory;
        }
      } catch (error) {
        // Redis error, continue to database
      }
    }

    // Fallback to database
    const memory = await this.getMemoryFromDb(id);
    if (memory) {
      this.memoryCache.set(id, memory);
      if (this.redis) {
        await this.redis.setEx(`memory:${id}`, 3600, JSON.stringify(memory));
      }
    }

    this.stats.misses++;
    this.recordOperation("get_memory_db", performance.now() - startTime);
    return memory;
  }

  async searchMemories(
    query: string,
    options: SearchOptions = {},
  ): Promise<Memory[]> {
    const startTime = performance.now();
    const cacheKey = JSON.stringify({ query, options });

    // Check search cache first
    if (this.searchCache.has(cacheKey)) {
      this.stats.hits++;
      this.recordOperation("search_cache", performance.now() - startTime);
      return this.searchCache.get(cacheKey)!;
    }

    let results: Memory[] = [];

    if (options.fuzzy !== false && this.fuse) {
      // Fuzzy search with Fuse.js
      const fuseResults = this.fuse.search(query);
      results = fuseResults.map((result) => result.item);
    } else {
      // Full-text search with SQLite
      results = await this.fullTextSearch(query, options);
    }

    // Apply filters
    if (options.project) {
      results = results.filter((m) => m.project === options.project);
    }
    if (options.directory) {
      results = results.filter((m) => m.directory === options.directory);
    }
    if (options.tags && options.tags.length > 0) {
      results = results.filter((m) =>
        options.tags!.some((tag) => m.tags.includes(tag)),
      );
    }

    // Limit results
    const limit = options.limit || 50;
    results = results.slice(0, limit);

    // Cache results
    this.searchCache.set(cacheKey, results);

    this.stats.misses++;
    this.recordOperation("search", performance.now() - startTime);
    return results;
  }

  async getRecentMemories(limit: number = 20): Promise<Memory[]> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      // First try to get memories with last_used, then fall back to created_at
      this.db.all(
        `
        SELECT * FROM memories
        ORDER BY
          CASE WHEN last_used IS NOT NULL THEN last_used ELSE created_at END DESC
        LIMIT ?
      `,
        [limit],
        (err, rows: any[]) => {
          if (err) {
            resolve([]);
            return;
          }

          const memories = rows.map(this.parseMemoryRow);
          this.recordOperation("get_recent", performance.now() - startTime);
          resolve(memories);
        },
      );
    });
  }

  async getAllMemories(limit: number = 100): Promise<Memory[]> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      this.db.all(
        `
        SELECT * FROM memories
        ORDER BY created_at DESC
        LIMIT ?
      `,
        [limit],
        (err, rows: any[]) => {
          if (err) {
            resolve([]);
            return;
          }

          const memories = rows.map(this.parseMemoryRow);
          this.recordOperation("get_all", performance.now() - startTime);
          resolve(memories);
        },
      );
    });
  }

  async getPopularMemories(limit: number = 20): Promise<Memory[]> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      this.db.all(
        `
        SELECT * FROM memories
        WHERE use_count > 0
        ORDER BY use_count DESC, last_used DESC
        LIMIT ?
      `,
        [limit],
        (err, rows: any[]) => {
          if (err) {
            resolve([]);
            return;
          }

          const memories = rows.map(this.parseMemoryRow);
          this.recordOperation("get_popular", performance.now() - startTime);
          resolve(memories);
        },
      );
    });
  }

  async incrementUseCount(id: string): Promise<void> {
    const now = new Date().toISOString();

    // Update database
    this.db.run(
      `
      UPDATE memories
      SET use_count = use_count + 1, last_used = ?
      WHERE id = ?
    `,
      [now, id],
    );

    // Update cache
    const memory = this.memoryCache.get(id);
    if (memory) {
      memory.metadata.use_count = (memory.metadata.use_count || 0) + 1;
      memory.metadata.last_used = now;
    }

    // Update Redis
    if (this.redis && memory) {
      await this.redis.setEx(`memory:${id}`, 3600, JSON.stringify(memory));
    }
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const startTime = performance.now();
    const memory = await this.getMemory(id);
    if (!memory) return;

    const updated: Memory = {
      ...memory,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Update database
    await this.updateMemoryInDb(updated);

    // Update caches
    this.memoryCache.set(id, updated);
    this.invalidateSearchCache();
    this.updateFuseIndex();

    if (this.redis) {
      await this.redis.setEx(`memory:${id}`, 3600, JSON.stringify(updated));
    }

    this.recordOperation("update_memory", performance.now() - startTime);
  }

  async deleteMemory(id: string): Promise<void> {
    const startTime = performance.now();

    // Remove from database
    this.db.run("DELETE FROM memories WHERE id = ?", [id]);

    // Remove from caches
    this.memoryCache.delete(id);
    this.invalidateSearchCache();
    this.updateFuseIndex();

    if (this.redis) {
      await this.redis.del(`memory:${id}`);
    }

    this.recordOperation("delete_memory", performance.now() - startTime);
  }

  getPerformanceStats(): {
    [operation: string]: {
      avg: number;
      count: number;
      min: number;
      max: number;
    };
  } {
    const stats: any = {};

    for (const [operation, times] of this.operationTimes) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      stats[operation] = {
        avg: Math.round(avg * 100) / 100,
        count: times.length,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
      };
    }

    return stats;
  }

  getCacheStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate =
      totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    this.stats.memory = process.memoryUsage().heapUsed;
    return { ...this.stats };
  }

  // Private helper methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private parseMemoryRow(row: any): Memory {
    return {
      id: row.id,
      content: row.content,
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      project: row.project,
      directory: row.directory,
      tags: JSON.parse(row.tags || "[]"),
      metadata: JSON.parse(row.metadata || "{}"),
    };
  }

  private async insertMemoryToDb(memory: Memory): Promise<void> {
    return new Promise((resolve, reject) => {
      const searchText = `${memory.content} ${memory.tags.join(" ")} ${memory.metadata.category || ""}`;

      this.db.run(
        `
        INSERT INTO memories (
          id, content, user_id, created_at, updated_at,
          project, directory, tags, metadata, search_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          memory.id,
          memory.content,
          memory.user_id,
          memory.created_at,
          memory.updated_at,
          memory.project,
          memory.directory,
          JSON.stringify(memory.tags),
          JSON.stringify(memory.metadata),
          searchText,
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  private async getMemoryFromDb(id: string): Promise<Memory | null> {
    return new Promise((resolve) => {
      this.db.get(
        "SELECT * FROM memories WHERE id = ?",
        [id],
        (err, row: any) => {
          if (err || !row) {
            resolve(null);
          } else {
            resolve(this.parseMemoryRow(row));
          }
        },
      );
    });
  }

  private async updateMemoryInDb(memory: Memory): Promise<void> {
    return new Promise((resolve, reject) => {
      const searchText = `${memory.content} ${memory.tags.join(" ")} ${memory.metadata.category || ""}`;

      this.db.run(
        `
        UPDATE memories SET
          content = ?, updated_at = ?, project = ?, directory = ?,
          tags = ?, metadata = ?, search_text = ?
        WHERE id = ?
      `,
        [
          memory.content,
          memory.updated_at,
          memory.project,
          memory.directory,
          JSON.stringify(memory.tags),
          JSON.stringify(memory.metadata),
          searchText,
          memory.id,
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  private async fullTextSearch(
    query: string,
    options: SearchOptions,
  ): Promise<Memory[]> {
    return new Promise((resolve) => {
      let sql = `
        SELECT m.* FROM memories m
        JOIN memories_fts fts ON m.rowid = fts.rowid
        WHERE fts MATCH ?
      `;
      const params: any[] = [query];

      if (options.project) {
        sql += " AND m.project = ?";
        params.push(options.project);
      }

      sql += " ORDER BY bm25(fts) LIMIT ?";
      params.push(options.limit || 50);

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err || !rows) {
          resolve([]);
        } else {
          resolve(rows.map(this.parseMemoryRow));
        }
      });
    });
  }

  private invalidateSearchCache(): void {
    this.searchCache.clear();
  }

  private updateFuseIndex(): void {
    if (this.fuse) {
      const memories = Array.from(this.memoryCache.values());
      this.fuse.setCollection(memories);
    }
  }

  private recordOperation(operation: string, time: number): void {
    if (!this.operationTimes.has(operation)) {
      this.operationTimes.set(operation, []);
    }

    const times = this.operationTimes.get(operation)!;
    times.push(time);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }

    return new Promise((resolve) => {
      this.db.close(() => {
        resolve();
      });
    });
  }
}
