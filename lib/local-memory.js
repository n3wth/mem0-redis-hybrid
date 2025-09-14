import { RedisMemoryServer } from 'redis-memory-server';
import { createClient } from 'redis';
import crypto from 'crypto';
import { EventEmitter } from 'events';

class LocalMemory extends EventEmitter {
  constructor() {
    super();
    this.redisServer = null;
    this.client = null;
    this.pubClient = null;
    this.subClient = null;
    this.memories = new Map();
    this.isStarting = false;
    this.isReady = false;
  }

  async start() {
    if (this.isReady) return;
    if (this.isStarting) {
      await new Promise(resolve => this.once('ready', resolve));
      return;
    }

    this.isStarting = true;
    console.log('Starting embedded Redis server...');

    try {
      // Start the embedded Redis server
      this.redisServer = new RedisMemoryServer();
      await this.redisServer.start();

      const host = await this.redisServer.getHost();
      const port = await this.redisServer.getPort();
      const redisUrl = `redis://${host}:${port}`;

      console.log(`Embedded Redis server started at ${redisUrl}`);

      // Create Redis clients
      this.client = createClient({ url: redisUrl });
      this.pubClient = createClient({ url: redisUrl });
      this.subClient = createClient({ url: redisUrl });

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.pubClient.connect(),
        this.subClient.connect()
      ]);

      // Set up pub/sub for real-time sync
      this.subClient.subscribe('memory:update', (message) => {
        const data = JSON.parse(message);
        this.emit('memory:update', data);
      });

      this.isReady = true;
      this.isStarting = false;
      this.emit('ready');

      console.log('Local memory system ready');
    } catch (error) {
      this.isStarting = false;
      console.error('Failed to start embedded Redis:', error);
      throw error;
    }
  }

  async stop() {
    if (this.client) await this.client.quit();
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
    if (this.redisServer) await this.redisServer.stop();

    this.isReady = false;
    console.log('Embedded Redis server stopped');
  }

  async add(memory) {
    if (!this.isReady) await this.start();

    const id = memory.id || crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const memoryData = {
      id,
      content: memory.content || memory.messages || memory.data,
      user_id: memory.user_id || memory.userId || 'default',
      metadata: {
        ...memory.metadata,
        created_at: timestamp,
        priority: memory.priority || 'normal',
        source: 'local'
      }
    };

    // Store in Redis with TTL
    const key = `memory:${memoryData.user_id}:${id}`;
    const ttl = memory.ttl || 86400 * 30; // Default 30 days

    await this.client.setEx(key, ttl, JSON.stringify(memoryData));

    // Also store in sorted set for efficient retrieval
    await this.client.zAdd(`memories:${memoryData.user_id}`, {
      score: Date.now(),
      value: id
    });

    // Publish update for real-time sync
    await this.pubClient.publish('memory:update', JSON.stringify({
      action: 'add',
      memory: memoryData
    }));

    return { id, status: 'stored', local: true };
  }

  async search(params) {
    if (!this.isReady) await this.start();

    const userId = params.user_id || params.userId || 'default';
    const query = params.query || '';
    const limit = params.limit || 10;

    // Get memory IDs from sorted set (most recent first)
    const memoryIds = await this.client.zRange(
      `memories:${userId}`,
      -limit,
      -1,
      { REV: true }
    );

    const memories = [];
    for (const id of memoryIds) {
      const key = `memory:${userId}:${id}`;
      const data = await this.client.get(key);
      if (data) {
        const memory = JSON.parse(data);

        // Simple text matching for now (can be enhanced with vector search later)
        if (!query ||
            memory.content?.toLowerCase().includes(query.toLowerCase()) ||
            JSON.stringify(memory.metadata).toLowerCase().includes(query.toLowerCase())) {
          memories.push(memory);
        }
      }
    }

    return memories.slice(0, limit);
  }

  async getAll(params) {
    if (!this.isReady) await this.start();

    const userId = params.user_id || params.userId || 'default';
    const memoryIds = await this.client.zRange(`memories:${userId}`, 0, -1, { REV: true });

    const memories = [];
    for (const id of memoryIds) {
      const key = `memory:${userId}:${id}`;
      const data = await this.client.get(key);
      if (data) {
        memories.push(JSON.parse(data));
      }
    }

    return memories;
  }

  async delete(memoryId, userId = 'default') {
    if (!this.isReady) await this.start();

    const key = `memory:${userId}:${memoryId}`;
    await this.client.del(key);
    await this.client.zRem(`memories:${userId}`, memoryId);

    // Publish update for real-time sync
    await this.pubClient.publish('memory:update', JSON.stringify({
      action: 'delete',
      id: memoryId,
      userId
    }));

    return { id: memoryId, status: 'deleted' };
  }

  async update(memoryId, updates, userId = 'default') {
    if (!this.isReady) await this.start();

    const key = `memory:${userId}:${memoryId}`;
    const existing = await this.client.get(key);

    if (!existing) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    const memory = JSON.parse(existing);
    const updated = {
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
    await this.pubClient.publish('memory:update', JSON.stringify({
      action: 'update',
      memory: updated
    }));

    return updated;
  }

  async getStats() {
    if (!this.isReady) await this.start();

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

  async exportData() {
    if (!this.isReady) await this.start();

    const keys = await this.client.keys('memory:*');
    const data = {};

    for (const key of keys) {
      const value = await this.client.get(key);
      if (value) {
        data[key] = JSON.parse(value);
      }
    }

    return data;
  }

  async importData(data) {
    if (!this.isReady) await this.start();

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
}

export default LocalMemory;