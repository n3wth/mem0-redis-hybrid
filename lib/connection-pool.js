import { createClient } from 'redis';
import { withRetry, CircuitBreaker, RedisError } from './error-handler.js';

// Connection pool for Redis clients
export class RedisConnectionPool {
  constructor(options = {}) {
    this.url = options.url || 'redis://localhost:6379';
    this.maxConnections = options.maxConnections || 10;
    this.minConnections = options.minConnections || 2;
    this.connectionTimeout = options.connectionTimeout || 5000;
    this.idleTimeout = options.idleTimeout || 30000;

    this.pool = [];
    this.activeConnections = new Set();
    this.waitingQueue = [];
    this.circuitBreaker = new CircuitBreaker();
    this.stats = {
      created: 0,
      destroyed: 0,
      active: 0,
      idle: 0,
      waiting: 0,
      errors: 0
    };
  }

  async initialize() {
    console.error('Initializing Redis connection pool...');

    // Create minimum connections
    const promises = [];
    for (let i = 0; i < this.minConnections; i++) {
      promises.push(this.createConnection());
    }

    const connections = await Promise.allSettled(promises);

    for (const result of connections) {
      if (result.status === 'fulfilled') {
        this.pool.push(result.value);
      } else {
        console.error('Failed to create initial connection:', result.reason);
      }
    }

    if (this.pool.length === 0) {
      throw new RedisError('Failed to create any Redis connections', 'POOL_INIT');
    }

    console.error(`✓ Redis pool initialized with ${this.pool.length} connections`);
    this.startHealthCheck();
    return this;
  }

  async createConnection() {
    const client = createClient({
      url: this.url,
      socket: {
        connectTimeout: this.connectionTimeout,
        reconnectStrategy: (retries) => {
          if (retries > 3) return false;
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      this.stats.errors++;
      console.error('Redis connection error:', err.message);
    });

    await withRetry(
      () => client.connect(),
      { maxRetries: 3, initialDelay: 100 }
    );

    this.stats.created++;

    // Add metadata
    client._poolMetadata = {
      created: Date.now(),
      lastUsed: Date.now(),
      useCount: 0
    };

    return client;
  }

  async acquire() {
    return this.circuitBreaker.execute(async () => {
      // Update stats
      this.stats.active = this.activeConnections.size;
      this.stats.idle = this.pool.length;
      this.stats.waiting = this.waitingQueue.length;

      // Try to get connection from pool
      let connection = this.pool.shift();

      if (!connection && this.activeConnections.size < this.maxConnections) {
        // Create new connection if under limit
        try {
          connection = await this.createConnection();
        } catch (error) {
          throw new RedisError('Failed to create new connection', 'ACQUIRE', { error: error.message });
        }
      }

      if (!connection) {
        // Wait for available connection
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            const index = this.waitingQueue.indexOf(waitingRequest);
            if (index > -1) {
              this.waitingQueue.splice(index, 1);
            }
            reject(new RedisError('Connection acquisition timeout', 'TIMEOUT'));
          }, this.connectionTimeout);

          const waitingRequest = { resolve, reject, timeout };
          this.waitingQueue.push(waitingRequest);
          this.stats.waiting++;
        });
      }

      // Mark as active
      this.activeConnections.add(connection);
      connection._poolMetadata.lastUsed = Date.now();
      connection._poolMetadata.useCount++;

      return connection;
    });
  }

  release(connection) {
    if (!connection) return;

    this.activeConnections.delete(connection);

    // Check if connection is still healthy
    if (connection.isOpen && connection._poolMetadata) {
      const idleTime = Date.now() - connection._poolMetadata.lastUsed;

      // Destroy if idle too long or pool is too large
      if (idleTime > this.idleTimeout || this.pool.length >= this.maxConnections) {
        this.destroy(connection);
      } else {
        // Return to pool
        this.pool.push(connection);

        // Process waiting queue
        if (this.waitingQueue.length > 0) {
          const waiting = this.waitingQueue.shift();
          clearTimeout(waiting.timeout);
          this.stats.waiting--;

          // Give connection to waiting request
          this.activeConnections.add(connection);
          waiting.resolve(connection);
        }
      }
    } else {
      this.destroy(connection);
    }
  }

  async destroy(connection) {
    if (!connection) return;

    try {
      await connection.quit();
    } catch (error) {
      console.error('Error destroying connection:', error.message);
    }

    this.stats.destroyed++;
    this.activeConnections.delete(connection);
  }

  async execute(fn) {
    const connection = await this.acquire();

    try {
      return await fn(connection);
    } finally {
      this.release(connection);
    }
  }

  async shutdown() {
    console.error('Shutting down Redis connection pool...');

    // Clear waiting queue
    for (const waiting of this.waitingQueue) {
      clearTimeout(waiting.timeout);
      waiting.reject(new RedisError('Pool shutting down', 'SHUTDOWN'));
    }
    this.waitingQueue = [];

    // Close all connections
    const connections = [...this.pool, ...this.activeConnections];
    const promises = connections.map(conn => this.destroy(conn));

    await Promise.allSettled(promises);

    this.pool = [];
    this.activeConnections.clear();

    console.error('✓ Redis connection pool shut down');
  }

  startHealthCheck() {
    setInterval(async () => {
      // Remove unhealthy connections
      const healthyPool = [];

      for (const conn of this.pool) {
        try {
          await conn.ping();
          healthyPool.push(conn);
        } catch (error) {
          console.error('Removing unhealthy connection from pool');
          this.destroy(conn);
        }
      }

      this.pool = healthyPool;

      // Ensure minimum connections
      while (this.pool.length < this.minConnections) {
        try {
          const conn = await this.createConnection();
          this.pool.push(conn);
        } catch (error) {
          console.error('Failed to maintain minimum connections:', error.message);
          break;
        }
      }
    }, 30000); // Check every 30 seconds
  }

  getStats() {
    return {
      ...this.stats,
      active: this.activeConnections.size,
      idle: this.pool.length,
      waiting: this.waitingQueue.length,
      circuitBreaker: this.circuitBreaker.getState()
    };
  }
}

// Singleton instance
let poolInstance = null;

export async function getPool(options = {}) {
  if (!poolInstance) {
    poolInstance = new RedisConnectionPool(options);
    await poolInstance.initialize();
  }
  return poolInstance;
}

export async function closePool() {
  if (poolInstance) {
    await poolInstance.shutdown();
    poolInstance = null;
  }
}