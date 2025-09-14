import { RedisMemoryServer } from 'redis-memory-server';
import { createClient, RedisClientType } from 'redis';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { VectraMemory } from './vectra-memory.js';
import type {
  StorageBackend,
  Memory,
  AddMemoryParams,
  SearchMemoryParams,
  GetAllMemoriesParams,
  MemoryMetadata
} from '../types/index.js';

export class LocalMemory extends EventEmitter implements StorageBackend {
  private redisServer: RedisMemoryServer | null = null;
  private client: RedisClientType | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private vectraMemory: VectraMemory | null = null;
  private memories: Map<string, Memory> = new Map();
  private isStarting: boolean = false;
  private isReady: boolean = false;
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    super();
    this.quiet = quiet;
  }

  private log(message: string, ...args: any[]) {
    if (!this.quiet) {
      console.log(message, ...args);
    }
  }

  private logError(message: string, ...args: any[]) {
    if (!this.quiet) {
      console.error(message, ...args);
    }
  }

  async start(): Promise<void> {
    if (this.isReady) return;
    if (this.isStarting) {
      await new Promise<void>(resolve => this.once('ready', resolve));
      return;
    }

    this.isStarting = true;
    this.log('Starting embedded Redis server...');

    try {
      // Start the embedded Redis server
      this.redisServer = new RedisMemoryServer();
      await this.redisServer.start();

      const host = await this.redisServer.getHost();
      const port = await this.redisServer.getPort();
      const redisUrl = `redis://${host}:${port}`;

      this.log(`Embedded Redis server started at ${redisUrl}`);

      // Create Redis clients with proper typing
      this.client = createClient({ url: redisUrl }) as RedisClientType;
      this.pubClient = createClient({ url: redisUrl }) as RedisClientType;
      this.subClient = createClient({ url: redisUrl }) as RedisClientType;

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.pubClient.connect(),
        this.subClient.connect()
      ]);

      // Set up pub/sub for real-time sync
      await this.subClient.subscribe('memory:update', (message: string) => {
        const data = JSON.parse(message);
        this.emit('memory:update', data);
      });

      // Initialize Vectra for semantic search
      this.vectraMemory = new VectraMemory('./data/vectra-index', this.quiet);
      await this.vectraMemory.initialize();

      this.isReady = true;
      this.isStarting = false;
      this.emit('ready');

      this.log('Local memory system ready with vector search');
    } catch (error) {
      this.isStarting = false;
      this.logError('Failed to start embedded Redis:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.client) await this.client.quit();
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
    if (this.redisServer) await this.redisServer.stop();

    this.isReady = false;
    this.log('Embedded Redis server stopped');
  }

  async add(params: AddMemoryParams): Promise<{ id: string; status: string; local: boolean }> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const userId = params.user_id || params.userId || 'default';

    const memoryData: Memory = {
      id,
      content: params.content || JSON.stringify(params.messages || params.data),
      user_id: userId,
      metadata: {
        ...params.metadata,
        created_at: timestamp,
        priority: params.priority || 'normal',
        source: 'local',
        tags: params.tags || []
      }
    };

    // Store in Redis with TTL
    const key = `memory:${userId}:${id}`;
    const ttl = params.ttl || 86400 * 30; // Default 30 days

    await this.client.setEx(key, ttl, JSON.stringify(memoryData));

    // Also store in sorted set for efficient retrieval
    await this.client.zAdd(`memories:${userId}`, {
      score: Date.now(),
      value: id
    });

    // Add to vector index for semantic search
    if (this.vectraMemory) {
      try {
        await this.vectraMemory.addMemory({
          id,
          content: memoryData.content,
          user_id: userId,
          metadata: memoryData.metadata
        });
      } catch (error) {
        this.logError('Failed to add to vector index:', error);
        // Continue - Redis storage is primary
      }
    }

    // Publish update for real-time sync
    if (this.pubClient) {
      await this.pubClient.publish('memory:update', JSON.stringify({
        action: 'add',
        memory: memoryData
      }));
    }

    return { id, status: 'stored', local: true };
  }

  async search(params: SearchMemoryParams): Promise<Memory[]> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const userId = params.user_id || params.userId || 'default';
    const query = params.query || '';
    const limit = params.limit || 10;

    // Use hybrid search: semantic (Vectra) + keyword (Redis)
    const semanticResults: Memory[] = [];
    const keywordResults: Memory[] = [];

    // 1. Semantic search using Vectra
    if (this.vectraMemory && query.trim()) {
      try {
        const vectraResults = await this.vectraMemory.searchMemories(query, Math.ceil(limit * 0.7), userId);
        semanticResults.push(...vectraResults);
      } catch (error) {
        this.logError('Vectra search failed:', error);
      }
    }

    // 2. Keyword search using Redis
    const memoryIds = await this.client.zRange(
      `memories:${userId}`,
      0,
      -1,
      { REV: true }
    );

    const scoredMemories: (Memory & { relevanceScore: number })[] = [];

    for (const id of memoryIds) {
      const key = `memory:${userId}:${id}`;
      const data = await this.client.get(key);
      if (data) {
        const memory = JSON.parse(data) as Memory;
        const relevanceScore = this.calculateRelevanceScore(memory, query);

        if (relevanceScore > 0) {
          scoredMemories.push({ ...memory, relevanceScore });
        }
      }
    }

    // Get top keyword results
    keywordResults.push(...scoredMemories
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, Math.ceil(limit * 0.5))
      .map(({ relevanceScore, ...memory }) => memory)
    );

    // 3. Merge and deduplicate results
    const allResults = [...semanticResults, ...keywordResults];
    const uniqueResults = new Map<string, Memory>();

    for (const result of allResults) {
      if (!uniqueResults.has(result.id)) {
        uniqueResults.set(result.id, {
          ...result,
          metadata: {
            ...result.metadata,
            search_method: semanticResults.find(r => r.id === result.id) ? 'semantic' : 'keyword'
          }
        });
      }
    }

    return Array.from(uniqueResults.values()).slice(0, limit);
  }

  private calculateRelevanceScore(memory: Memory, query: string): number {
    if (!query) return 1; // Return all memories if no query

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const content = (memory.content || '').toLowerCase();
    const metadata = JSON.stringify(memory.metadata || {}).toLowerCase();
    const fullText = content + ' ' + metadata;

    let score = 0;

    for (const word of queryWords) {
      // Exact phrase match gets highest score
      if (fullText.includes(query.toLowerCase())) {
        score += 10;
      }

      // Individual word matches
      if (content.includes(word)) {
        score += 5;
      }

      // Metadata matches
      if (metadata.includes(word)) {
        score += 3;
      }

      // Partial matches
      const partialMatches = fullText.match(new RegExp(word.slice(0, -1), 'g')) || [];
      score += partialMatches.length * 1;
    }

    return score;
  }

  async getAll(params: GetAllMemoriesParams): Promise<Memory[]> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const userId = params.user_id || params.userId || 'default';
    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const memoryIds = await this.client.zRange(
      `memories:${userId}`,
      offset,
      offset + limit - 1,
      { REV: true }
    );

    const memories: Memory[] = [];
    for (const id of memoryIds) {
      const key = `memory:${userId}:${id}`;
      const data = await this.client.get(key);
      if (data) {
        memories.push(JSON.parse(data) as Memory);
      }
    }

    return memories;
  }

  async delete(memoryId: string, userId: string = 'default'): Promise<{ id: string; status: string }> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const key = `memory:${userId}:${memoryId}`;
    await this.client.del(key);
    await this.client.zRem(`memories:${userId}`, memoryId);

    // Remove from vector index
    if (this.vectraMemory) {
      try {
        await this.vectraMemory.deleteMemory(memoryId);
      } catch (error) {
        this.logError('Failed to delete from vector index:', error);
        // Continue - Redis deletion is primary
      }
    }

    // Publish update for real-time sync
    if (this.pubClient) {
      await this.pubClient.publish('memory:update', JSON.stringify({
        action: 'delete',
        id: memoryId,
        userId
      }));
    }

    return { id: memoryId, status: 'deleted' };
  }

  async update(memoryId: string, updates: Partial<Memory>, userId: string = 'default'): Promise<Memory> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const key = `memory:${userId}:${memoryId}`;
    const existing = await this.client.get(key);

    if (!existing) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    const memory = JSON.parse(existing) as Memory;
    const updated: Memory = {
      ...memory,
      ...updates,
      metadata: {
        ...memory.metadata,
        ...updates.metadata,
        updated_at: new Date().toISOString()
      }
    };

    await this.client.setEx(key, 86400 * 30, JSON.stringify(updated));

    // Publish update for real-time sync
    if (this.pubClient) {
      await this.pubClient.publish('memory:update', JSON.stringify({
        action: 'update',
        memory: updated
      }));
    }

    return updated;
  }

  async getStats(): Promise<{
    status: string;
    type: string;
    memories: number;
    memory_usage: string;
    uptime: string;
  }> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const info = await this.client.info('memory');
    const dbSize = await this.client.dbSize();

    return {
      status: 'healthy',
      type: 'embedded',
      memories: dbSize,
      memory_usage: info,
      uptime: this.redisServer ? 'running' : 'stopped'
    };
  }

  async exportData(): Promise<Record<string, Memory>> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    const keys = await this.client.keys('memory:*');
    const data: Record<string, Memory> = {};

    for (const key of keys) {
      const value = await this.client.get(key);
      if (value) {
        data[key] = JSON.parse(value) as Memory;
      }
    }

    return data;
  }

  async importData(data: Record<string, Memory>): Promise<{ imported: number }> {
    if (!this.isReady) await this.start();
    if (!this.client) throw new Error('Redis client not initialized');

    for (const [key, value] of Object.entries(data)) {
      await this.client.setEx(key, 86400 * 30, JSON.stringify(value));

      // Extract userId and memoryId from key
      const parts = key.split(':');
      if (parts.length === 3) {
        const userId = parts[1];
        const memoryId = parts[2];
        await this.client.zAdd(`memories:${userId}`, {
          score: Date.now(),
          value: memoryId
        });
      }
    }

    return { imported: Object.keys(data).length };
  }

  // Getters for Redis clients (for hybrid mode)
  getClient(): RedisClientType | null {
    return this.client;
  }

  getPubClient(): RedisClientType | null {
    return this.pubClient;
  }

  getSubClient(): RedisClientType | null {
    return this.subClient;
  }
}

export default LocalMemory;