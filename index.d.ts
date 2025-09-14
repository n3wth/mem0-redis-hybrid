// TypeScript definitions for @n3wth/mem0-redis-hybrid

export interface Mem0Config {
  apiKey?: string;
  userId?: string;
  baseUrl?: string;
}

export interface RedisConfig {
  url?: string;
  maxConnections?: number;
  minConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export interface CacheConfig {
  ttl?: number;
  ttlL2?: number;
  maxSize?: number;
  searchCacheTtl?: number;
  frequentAccessThreshold?: number;
  batchSize?: number;
  syncInterval?: number;
}

export interface MemoryMetadata {
  [key: string]: any;
}

export type Priority = "low" | "normal" | "high" | "critical";

export interface AddMemoryOptions {
  content?: string;
  messages?: Array<{ role: string; content: string }>;
  metadata?: MemoryMetadata;
  priority?: Priority;
  async?: boolean;
  user_id?: string;
}

export interface SearchMemoryOptions {
  query: string;
  limit?: number;
  user_id?: string;
  prefer_cache?: boolean;
  metadata_filter?: MemoryMetadata;
}

export interface Memory {
  id: string;
  memory: string;
  hash: string;
  metadata: MemoryMetadata | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface SearchResult {
  memory: string;
  metadata: MemoryMetadata | null;
  score: number;
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: string;
  size: number;
  max_size: number;
  memory_usage: string;
  evictions: number;
  avg_response_time: string;
  connection_pool?: {
    active: number;
    idle: number;
    waiting: number;
    created: number;
    destroyed: number;
    errors: number;
  };
}

export interface OptimizationResult {
  promoted: number;
  demoted: number;
  expired: number;
  duration: string;
  memory_freed: string;
}

export interface HealthStatus {
  redis: boolean;
  mem0: boolean;
  cache: {
    l1_size: number;
    l2_size: number;
    hit_rate: string;
  };
  uptime: string;
  memory: {
    used: string;
    rss: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServer {
  tools: MCPTool[];

  addMemory(
    options: AddMemoryOptions,
  ): Promise<{ memory_id: string; message: string }>;
  searchMemory(
    options: SearchMemoryOptions,
  ): Promise<{ results: SearchResult[]; source: string }>;
  getAllMemories(
    userId?: string,
  ): Promise<{ memories: Memory[]; source: string }>;
  updateMemory(
    memoryId: string,
    content: string,
    metadata?: MemoryMetadata,
  ): Promise<{ success: boolean; message: string }>;
  deleteMemory(
    memoryId: string,
  ): Promise<{ success: boolean; message: string }>;
  deleteAllMemories(
    userId?: string,
  ): Promise<{ deleted: number; message: string }>;
  getMemoryHistory(
    memoryId: string,
  ): Promise<{ history: any[]; message: string }>;
  getCacheStats(): Promise<CacheStats>;
  optimizeCache(): Promise<OptimizationResult>;
  clearCache(pattern?: string): Promise<{ cleared: number; message: string }>;
  warmupCache(
    queries?: string[],
  ): Promise<{ warmed: number; duration: string }>;
  getHealth(): Promise<HealthStatus>;
  exportMemories(
    format?: "json" | "csv",
    userId?: string,
  ): Promise<{ data: string; count: number }>;
  importMemories(
    data: string,
    format?: "json" | "csv",
  ): Promise<{ imported: number; failed: number }>;
}

export class Mem0Error extends Error {
  statusCode: number;
  details: Record<string, any>;
  timestamp: string;
}

export class RedisError extends Error {
  operation: string;
  details: Record<string, any>;
  timestamp: string;
}

export class ValidationError extends Error {
  field: string;
  value: any;
}

export interface CircuitBreakerState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failures: number;
  lastFailure: string | null;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoff?: number;
  shouldRetry?: (error: Error) => boolean;
}

declare module "@n3wth/mem0-redis-hybrid" {
  export function createServer(config?: {
    mem0?: Mem0Config;
    redis?: RedisConfig;
    cache?: CacheConfig;
  }): Promise<MCPServer>;

  export function withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T>;

  export class CircuitBreaker {
    constructor(options?: { failureThreshold?: number; resetTimeout?: number });
    execute<T>(fn: () => Promise<T>): Promise<T>;
    getState(): CircuitBreakerState;
  }

  export class RedisConnectionPool {
    constructor(options?: RedisConfig);
    initialize(): Promise<RedisConnectionPool>;
    acquire(): Promise<any>;
    release(connection: any): void;
    execute<T>(fn: (connection: any) => Promise<T>): Promise<T>;
    shutdown(): Promise<void>;
    getStats(): any;
  }
}
