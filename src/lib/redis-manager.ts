/**
 * Redis Manager - Centralized Redis connection and operation management
 */

import { createClient, RedisClientType } from "redis";
import { LocalMemory } from "./local-memory.js";
import {
  RedisConnectionError,
  RedisOperationError,
  InitializationError,
  ErrorHandler,
} from "./errors.js";

export interface RedisConfig {
  url?: string;
  embedded?: boolean;
  quiet?: boolean;
  reconnectStrategy?: (retries: number) => number;
}

export class RedisManager {
  private redisClient: RedisClientType | null = null;
  private pubSubClient: RedisClientType | null = null;
  private subscriberClient: RedisClientType | null = null;
  private localMemory: LocalMemory | null = null;
  private isConnected: boolean = false;
  private config: RedisConfig;

  constructor(config: RedisConfig = {}) {
    this.config = {
      url: config.url || process.env.REDIS_URL || "redis://localhost:6379",
      embedded: config.embedded ?? !config.url,
      quiet: config.quiet ?? true,
      reconnectStrategy:
        config.reconnectStrategy || this.defaultReconnectStrategy,
    };
  }

  private defaultReconnectStrategy(retries: number): number {
    const jitter = Math.floor(Math.random() * 200);
    const delay = Math.min(Math.pow(2, retries) * 50, 2000);
    return delay + jitter;
  }

  private log(message: string, ...args: any[]): void {
    if (!this.config.quiet) {
      console.error(message, ...args);
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      if (this.config.embedded) {
        return await this.initializeEmbedded();
      } else {
        return await this.initializeExternal();
      }
    } catch (error: any) {
      throw new InitializationError("Redis", error.message, {
        embedded: this.config.embedded,
        url: this.config.url,
      });
    }
  }

  private async initializeEmbedded(): Promise<boolean> {
    try {
      this.log("Starting embedded Redis server...");

      this.localMemory = new LocalMemory(this.config.quiet!);

      // Add timeout for LocalMemory startup
      const startupPromise = this.localMemory.start();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("LocalMemory startup timeout")),
          15000,
        ),
      );

      await Promise.race([startupPromise, timeoutPromise]);

      // Get Redis clients from embedded server
      this.redisClient = this.localMemory.getClient();
      this.pubSubClient = this.localMemory.getPubClient();
      this.subscriberClient = this.localMemory.getSubClient();

      if (!this.redisClient || !this.pubSubClient || !this.subscriberClient) {
        throw new Error("Failed to get Redis clients from LocalMemory");
      }

      this.isConnected = true;
      this.log("✓ Embedded Redis server started successfully");
      return true;
    } catch (error: any) {
      throw new RedisConnectionError(
        `Failed to start embedded Redis: ${error.message}`,
        { embedded: true },
      );
    }
  }

  private async initializeExternal(): Promise<boolean> {
    try {
      this.log(`Connecting to external Redis at ${this.config.url}...`);

      // Create Redis clients
      this.redisClient = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: this.config.reconnectStrategy,
        },
      }) as RedisClientType;

      this.pubSubClient = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: this.config.reconnectStrategy,
        },
      }) as RedisClientType;

      this.subscriberClient = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: this.config.reconnectStrategy,
        },
      }) as RedisClientType;

      // Set up error handlers
      this.setupErrorHandlers();

      // Connect all clients
      await Promise.all([
        this.redisClient.connect(),
        this.pubSubClient.connect(),
        this.subscriberClient.connect(),
      ]);

      this.isConnected = true;
      this.log("✓ Connected to external Redis successfully");
      return true;
    } catch (error: any) {
      throw new RedisConnectionError(
        `Failed to connect to external Redis: ${error.message}`,
        { url: this.config.url },
      );
    }
  }

  private setupErrorHandlers(): void {
    const handleError = (clientName: string) => (err: Error) => {
      ErrorHandler.logError(
        new RedisOperationError(clientName, err),
        `Redis ${clientName} Error`,
      );
    };

    this.redisClient?.on("error", handleError("Client"));
    this.pubSubClient?.on("error", handleError("PubSub"));
    this.subscriberClient?.on("error", handleError("Subscriber"));
  }

  async shutdown(): Promise<void> {
    this.log("Shutting down Redis connections...");

    const shutdownTasks: Promise<void>[] = [];

    if (this.localMemory) {
      shutdownTasks.push(
        this.localMemory
          .stop()
          .catch((err) => ErrorHandler.logError(err, "LocalMemory shutdown")),
      );
    }

    if (this.redisClient) {
      shutdownTasks.push(
        this.redisClient.quit().then(
          () => {},
          (err) => {
            ErrorHandler.logError(err, "Redis client shutdown");
          },
        ),
      );
    }

    if (this.pubSubClient) {
      shutdownTasks.push(
        this.pubSubClient.quit().then(
          () => {},
          (err) => {
            ErrorHandler.logError(err, "PubSub client shutdown");
          },
        ),
      );
    }

    if (this.subscriberClient) {
      shutdownTasks.push(
        this.subscriberClient.quit().then(
          () => {},
          (err) => {
            ErrorHandler.logError(err, "Subscriber client shutdown");
          },
        ),
      );
    }

    await Promise.all(shutdownTasks);
    this.isConnected = false;
    this.log("✓ Redis connections closed");
  }

  // Safe wrapper for Redis operations with error handling
  async execute<T>(operation: string, handler: () => Promise<T>): Promise<T> {
    if (!this.isConnected || !this.redisClient) {
      throw new RedisConnectionError("Redis not connected");
    }

    try {
      return await handler();
    } catch (error: any) {
      throw new RedisOperationError(operation, error);
    }
  }

  // Getters for clients
  getClient(): RedisClientType | null {
    return this.redisClient;
  }

  getPubSubClient(): RedisClientType | null {
    return this.pubSubClient;
  }

  getSubscriberClient(): RedisClientType | null {
    return this.subscriberClient;
  }

  getLocalMemory(): LocalMemory | null {
    return this.localMemory;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Common Redis operations with error handling
  async get(key: string): Promise<string | null> {
    return this.execute(`get:${key}`, async () => {
      return await this.redisClient!.get(key);
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    return this.execute(`set:${key}`, async () => {
      if (ttl) {
        await this.redisClient!.setEx(key, ttl, value);
      } else {
        await this.redisClient!.set(key, value);
      }
    });
  }

  async del(keys: string | string[]): Promise<number> {
    return this.execute(
      `del:${Array.isArray(keys) ? keys.length : 1}`,
      async () => {
        return await this.redisClient!.del(keys);
      },
    );
  }

  async keys(pattern: string): Promise<string[]> {
    return this.execute(`keys:${pattern}`, async () => {
      return await this.redisClient!.keys(pattern);
    });
  }

  async incr(key: string): Promise<number> {
    return this.execute(`incr:${key}`, async () => {
      return await this.redisClient!.incr(key);
    });
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    return this.execute(`expire:${key}`, async () => {
      const result = await this.redisClient!.expire(key, ttl);
      return result === 1;
    });
  }

  async ttl(key: string): Promise<number> {
    return this.execute(`ttl:${key}`, async () => {
      return await this.redisClient!.ttl(key);
    });
  }

  // Set operations
  async sAdd(key: string, members: string | string[]): Promise<number> {
    return this.execute(`sAdd:${key}`, async () => {
      return await this.redisClient!.sAdd(key, members);
    });
  }

  async sMembers(key: string): Promise<string[]> {
    return this.execute(`sMembers:${key}`, async () => {
      return await this.redisClient!.sMembers(key);
    });
  }

  async sRem(key: string, members: string | string[]): Promise<number> {
    return this.execute(`sRem:${key}`, async () => {
      return await this.redisClient!.sRem(key, members);
    });
  }

  // Hash operations for optimized cache manager
  async hIncrBy(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return this.execute(`hIncrBy:${key}:${field}`, async () => {
      return await this.redisClient!.hIncrBy(key, field, increment);
    });
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    return this.execute(`hGet:${key}:${field}`, async () => {
      const result = await this.redisClient!.hGet(key, field);
      return result ?? undefined;
    });
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.execute(`hGetAll:${key}`, async () => {
      return await this.redisClient!.hGetAll(key);
    });
  }

  async hDel(key: string, fields: string | string[]): Promise<number> {
    return this.execute(`hDel:${key}`, async () => {
      return await this.redisClient!.hDel(key, fields);
    });
  }

  // SCAN operation for better performance
  async scan(
    cursor: string,
    options?: { MATCH?: string; COUNT?: number },
  ): Promise<{ cursor: string; keys: string[] }> {
    return this.execute(`scan:${cursor}`, async () => {
      const result = await this.redisClient!.scan(cursor, options);
      return result;
    });
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    if (!this.pubSubClient) {
      throw new RedisConnectionError("PubSub client not connected");
    }

    try {
      return await this.pubSubClient.publish(channel, message);
    } catch (error: any) {
      throw new RedisOperationError(`publish:${channel}`, error);
    }
  }

  async subscribe(
    channel: string,
    handler: (message: string, channel: string) => void,
  ): Promise<void> {
    if (!this.subscriberClient) {
      throw new RedisConnectionError("Subscriber client not connected");
    }

    try {
      await this.subscriberClient.subscribe(channel, handler);
    } catch (error: any) {
      throw new RedisOperationError(`subscribe:${channel}`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriberClient) {
      throw new RedisConnectionError("Subscriber client not connected");
    }

    try {
      await this.subscriberClient.unsubscribe(channel);
    } catch (error: any) {
      throw new RedisOperationError(`unsubscribe:${channel}`, error);
    }
  }

  // Info operations
  async info(section?: string): Promise<string> {
    return this.execute(`info:${section || "all"}`, async () => {
      return await this.redisClient!.info(section);
    });
  }
}
