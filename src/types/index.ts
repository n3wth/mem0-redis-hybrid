export interface MemoryMetadata {
  created_at?: string;
  updated_at?: string;
  priority?: "low" | "normal" | "high" | "critical";
  source?: string;
  tags?: string[];
  [key: string]: any;
}

export interface Memory {
  id: string;
  content: string;
  user_id: string;
  metadata: MemoryMetadata;
  score?: number;
  timestamp?: string;
}

export interface AddMemoryParams {
  content?: string;
  messages?: any[];
  data?: any;
  user_id?: string;
  userId?: string;
  priority?: "low" | "normal" | "high" | "critical";
  metadata?: MemoryMetadata;
  ttl?: number;
  tags?: string[];
  async?: boolean;
  prefer_cache?: boolean;
}

export interface SearchMemoryParams {
  query: string;
  user_id?: string;
  userId?: string;
  limit?: number;
  threshold?: number;
  prefer_cache?: boolean;
  tags?: string[];
}

export interface GetAllMemoriesParams {
  user_id?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteMemoryParams {
  memory_id: string;
  user_id?: string;
  userId?: string;
}

export interface UpdateMemoryParams {
  memory_id: string;
  content?: string;
  metadata?: MemoryMetadata;
  user_id?: string;
  userId?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalMemories: number;
  cacheSize: number;
  avgLatency: number;
  lastSync?: string;
  redisStatus: "connected" | "disconnected" | "error";
  mode: "local" | "hybrid" | "demo";
}

export interface RecallConfig {
  apiKey?: string;
  userId?: string;
  baseUrl?: string;
  redis?: {
    url?: string;
    embedded?: boolean;
  };
  cache?: {
    ttl?: {
      l1?: number;
      l2?: number;
      search?: number;
    };
    maxSize?: number;
    compression?: boolean;
    compressionThreshold?: number;
  };
  mode?: "local" | "hybrid" | "demo";
  sync?: {
    enabled?: boolean;
    interval?: number;
    batchSize?: number;
  };
}

export interface StorageBackend {
  add(params: AddMemoryParams): Promise<any>;
  search(params: SearchMemoryParams): Promise<Memory[]>;
  getAll(params: GetAllMemoriesParams): Promise<Memory[]>;
  delete(memoryId: string, userId?: string): Promise<any>;
  update(memoryId: string, updates: any, userId?: string): Promise<any>;
  getStats(): Promise<any>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}
