#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  ListToolsRequest,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { createClient, RedisClientType } from "redis";
import * as crypto from "crypto";
import { LocalMemory } from "./lib/local-memory.js";
import { EnhancedVectraMemory } from "./lib/enhanced-vectra-memory.js";
import { EntityExtractor } from "./lib/entity-extractor.js";

// Type definitions
interface Memory {
  id: string;
  memory: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  user_id: string;
  source?: string;
  relevance_score?: number;
  score_breakdown?: {
    semantic: number;
    keyword: number;
    entity: number;
    relationship: number;
    recency: number;
  };
  matched_entities?: string[];
  matched_relationships?: string[];
}

interface DuplicateCheck {
  isDuplicate: boolean;
  existingId?: string;
  existingMemory?: string;
  similarity?: number;
}

interface Job {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

interface PendingMemory {
  priority: string;
  timestamp: number;
}

interface CacheInvalidateMessage {
  memoryId: string;
  operation: string;
  timestamp?: number;
}

interface JobCompleteMessage {
  jobId: string;
  result?: any;
  error?: string;
}

interface MemoryProcessMessage {
  memoryId: string;
  priority: string;
}

// Configuration
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const QUIET_MODE =
  process.env.QUIET_MODE !== "false" &&
  (!process.stdin.isTTY || process.env.NODE_ENV === "production"); // Default to quiet for MCP

// Intelligence mode configuration - Enhanced by default!
let INTELLIGENCE_MODE =
  process.env.INTELLIGENCE_MODE === "basic" || process.argv.includes("--basic")
    ? "basic"
    : "enhanced";
const ENABLE_ENTITY_EXTRACTION = INTELLIGENCE_MODE === "enhanced";
const ENABLE_RELATIONSHIP_MAPPING = INTELLIGENCE_MODE === "enhanced";
const ENABLE_REAL_EMBEDDINGS = INTELLIGENCE_MODE === "enhanced";
const ENABLE_SEMANTIC_SEARCH = INTELLIGENCE_MODE === "enhanced";

// Suppress mutex warnings from transformers.js globally
if (INTELLIGENCE_MODE === "enhanced") {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: any, ...args: any[]): boolean => {
    const str = chunk?.toString() || "";
    if (
      str.includes("mutex") ||
      str.includes("libc++") ||
      str.includes("Invalid argument") ||
      str.includes("dtype")
    ) {
      return true;
    }
    return originalStderrWrite(chunk, ...args);
  };

  // Also handle uncaught exceptions related to mutex
  process.on("uncaughtException", (error) => {
    if (
      error.message?.includes("mutex") ||
      error.message?.includes("Invalid argument")
    ) {
      // Silently ignore mutex errors from transformers.js
      return;
    }
    // Re-throw other errors
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });

  // Handle SIGTERM and SIGINT for clean shutdown
  const cleanShutdown = () => {
    if (QUIET_MODE) {
      // Force immediate exit to avoid mutex warnings
      (process as any).reallyExit?.(0) || process.exit(0);
    } else {
      process.exit(0);
    }
  };
  process.on("SIGTERM", cleanShutdown);
  process.on("SIGINT", cleanShutdown);
}

// Determine operation mode - always default to local-first
let MODE: "local" | "hybrid" | "demo" = "local";

if (process.argv.includes("--demo") || process.env.DEMO_MODE === "true") {
  MODE = "demo"; // Demo mode (in-memory only, no persistence)
} else if (MEM0_API_KEY && process.argv.includes("--hybrid")) {
  MODE = "hybrid"; // Only use hybrid if explicitly requested with --hybrid flag
} else {
  MODE = "local"; // Default: local mode with embedded Redis (persistent and fully offline)
}

// Helper for conditional logging
const log = (message: string, ...args: any[]) => {
  if (!QUIET_MODE) {
    console.error(message, ...args);
  }
};

// Log mode information
if (MODE === "local") {
  log("🚀 Running in LOCAL MODE - Using embedded Redis server");
  log("   Data persists locally between sessions");
  if (!MEM0_API_KEY) {
    log(
      "   💡 Tip: Add MEM0_API_KEY for cloud sync (get free at https://mem0.ai)",
    );
  }
} else if (MODE === "demo") {
  log("🎮 Running in DEMO MODE - Using in-memory storage only");
} else if (MODE === "hybrid") {
  log("☁️  Running in HYBRID MODE - Local cache + cloud storage");
}

// For backward compatibility
const DEMO_MODE = MODE === "demo";

const MEM0_USER_ID = process.env.MEM0_USER_ID || "oliver";
const MEM0_BASE_URL = process.env.MEM0_BASE_URL || "https://api.mem0.ai";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Cache settings based on best practices
const CACHE_TTL = 86400; // 24 hours for L1 cache
const CACHE_TTL_L2 = 604800; // 7 days for L2 cache (less frequently accessed)
const MAX_CACHE_SIZE = 1000; // Increased cache size
const FREQUENT_ACCESS_THRESHOLD = 3; // Times accessed before promoting to L1
const BATCH_SIZE = 50; // Batch operations for efficiency
const SYNC_INTERVAL = 300000; // 5 minutes background sync
const SEARCH_CACHE_TTL = 300; // 5 minutes for search results cache

// Initialize Redis clients
let redisClient: RedisClientType | null = null;
let pubSubClient: RedisClientType | null = null;
let subscriberClient: RedisClientType | null = null;
let localMemory: LocalMemory | null = null;

// Intelligence components (only initialized in enhanced mode)
let enhancedVectra: EnhancedVectraMemory | null = null;
let entityExtractor: EntityExtractor | null = null;

// Background job queue
const jobQueue = new Map<string, Job>();
const pendingMemories = new Map<string, PendingMemory>();

// Demo mode in-memory storage
const demoStorage = {
  memories: new Map<string, Memory>(),
  idCounter: 1,
};

async function initializeRedis(): Promise<boolean> {
  // If in local mode, use embedded Redis
  if (MODE === "local" && !process.env.REDIS_URL) {
    // First, try to connect to existing Redis on localhost:6379
    try {
      const testClient = createClient({ url: "redis://localhost:6379" }) as RedisClientType;
      await testClient.connect();
      await testClient.ping();
      await testClient.quit();

      // If we get here, Redis is already running locally
      debugLog("Found existing Redis on localhost:6379, using it");
      process.env.REDIS_URL = "redis://localhost:6379";
      // Fall through to external Redis connection logic
    } catch {
      // No existing Redis, try embedded
      try {
        debugLog("Starting LocalMemory with embedded Redis...");
        localMemory = new LocalMemory(QUIET_MODE);

      // Add timeout for LocalMemory startup
      const localMemoryPromise = localMemory.start();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("LocalMemory startup timeout")),
          15000,
        ),
      );

      await Promise.race([localMemoryPromise, timeoutPromise]);

      // Get Redis clients from embedded server
      redisClient = localMemory.getClient();
      pubSubClient = localMemory.getPubClient();
      subscriberClient = localMemory.getSubClient();

      debugLog("LocalMemory clients:", {
        redisClient: !!redisClient,
        pubSubClient: !!pubSubClient,
        subscriberClient: !!subscriberClient,
      });

      // Initialize enhanced intelligence if enabled
      if (INTELLIGENCE_MODE === "enhanced") {
        try {
          debugLog("Initializing enhanced intelligence features...");

          // Initialize vector memory with real embeddings
          enhancedVectra = new EnhancedVectraMemory(
            "./data/vectra-index",
            QUIET_MODE,
          );
          await enhancedVectra.initialize();

          // Initialize entity extractor
          entityExtractor = new EntityExtractor(QUIET_MODE);

          log("✓ AI intelligence features activated (default mode)");
        } catch (error: any) {
          console.error(
            "Warning: Enhanced features failed to initialize:",
            error.message,
          );
          console.error("  Continuing with basic mode");
          INTELLIGENCE_MODE = "basic";
        }
      }

      log(
        "✓ Local memory system initialized with embedded Redis and vector search",
      );
      return true;
    } catch (error: any) {
      console.error("❌ Failed to start embedded Redis:", error.message);
      debugLog("Embedded Redis error details:", error);

      // Try to fallback to demo mode
      console.error("   Falling back to demo mode (in-memory only)");
      return false;
    }
    }
  }

  // Otherwise, connect to external Redis
  try {
    // Main Redis client for cache operations
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          const jitter = Math.floor(Math.random() * 200);
          const delay = Math.min(Math.pow(2, retries) * 50, 2000);
          return delay + jitter;
        },
      },
    }) as RedisClientType;

    // Separate client for pub/sub to avoid blocking
    pubSubClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) =>
          Math.min(Math.pow(2, retries) * 50, 2000),
      },
    }) as RedisClientType;

    subscriberClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) =>
          Math.min(Math.pow(2, retries) * 50, 2000),
      },
    }) as RedisClientType;

    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    pubSubClient.on("error", (err) => console.error("Redis PubSub Error", err));
    subscriberClient.on("error", (err) =>
      console.error("Redis Subscriber Error", err),
    );

    // Connect all clients in parallel for faster startup
    await Promise.all([
      redisClient.connect(),
      pubSubClient.connect(),
      subscriberClient.connect()
    ]);

    // Set up pub/sub for cache invalidation and async processing
    await setupPubSub();

    console.error("✓ Redis connected successfully with pub/sub");

    // Start background sync worker
    startBackgroundSync();

    return true;
  } catch (error: any) {
    console.error("✗ Redis connection failed:", error.message);
    console.error("Falling back to mem0-only mode");
    redisClient = null;
    pubSubClient = null;
    subscriberClient = null;
    return false;
  }
}

// Pub/Sub setup for cache invalidation and async processing
async function setupPubSub(): Promise<void> {
  if (!subscriberClient) return;

  // Subscribe to cache invalidation channel
  await subscriberClient.subscribe(
    "cache:invalidate",
    async (message: string) => {
      try {
        const { memoryId, operation }: CacheInvalidateMessage =
          JSON.parse(message);
        console.error(`Cache invalidation: ${operation} for ${memoryId}`);

        if ((operation === "delete" || operation === "update") && redisClient) {
          // Invalidate cached memory
          await redisClient.del(`memory:${memoryId}`);
          // Clear search cache
          const searchKeys = await redisClient.keys("search:*");
          if (searchKeys.length > 0) {
            await redisClient.del(searchKeys);
          }
        }
      } catch (error) {
        console.error("Cache invalidation error:", error);
      }
    },
  );

  // Subscribe to async job completion channel
  await subscriberClient.subscribe("job:complete", async (message: string) => {
    try {
      const { jobId, result, error }: JobCompleteMessage = JSON.parse(message);
      const job = jobQueue.get(jobId);
      if (job) {
        if (error) {
          job.reject(new Error(error));
        } else {
          job.resolve(result);
        }
        jobQueue.delete(jobId);
      }
    } catch (error) {
      console.error("Job completion error:", error);
    }
  });

  // Subscribe to memory processing channel
  await subscriberClient.subscribe(
    "memory:process",
    async (message: string) => {
      try {
        const { memoryId, priority }: MemoryProcessMessage =
          JSON.parse(message);
        await processMemoryAsync(memoryId, priority);
      } catch (error) {
        console.error("Memory processing error:", error);
      }
    },
  );
}

// Background sync worker for cache warming and updates
function startBackgroundSync(): void {
  if (!redisClient) return;

  setInterval(async () => {
    try {
      console.error("Running background sync...");

      // 1. Update frequently accessed memories
      const topMemories = await getTopMemories(50);
      for (const memoryId of topMemories) {
        try {
          const endpoint = `/v1/memories/${memoryId}/?user_id=${MEM0_USER_ID}`;
          const freshData = await callMem0API(endpoint, "GET");
          if (freshData) {
            await setCachedMemory(memoryId, freshData, CACHE_TTL);
          }
        } catch (error) {
          console.error(`Failed to refresh memory ${memoryId}:`, error);
        }
      }

      // 2. Process pending memories from queue
      for (const [memoryId, data] of pendingMemories.entries()) {
        if (Date.now() - data.timestamp > 60000) {
          // Process after 1 minute
          await processMemoryAsync(memoryId, data.priority);
          pendingMemories.delete(memoryId);
        }
      }

      // 3. Clean up expired search cache
      if (redisClient) {
        const searchKeys = await redisClient.keys("search:*");
        for (const key of searchKeys) {
          const ttl = await redisClient.ttl(key);
          if (ttl < 0) {
            await redisClient.del(key);
          }
        }
      }

      console.error("Background sync completed");
    } catch (error) {
      console.error("Background sync error:", error);
    }
  }, SYNC_INTERVAL);
}

// Async memory processing
async function processMemoryAsync(
  memoryId: string,
  priority: string = "medium",
): Promise<void> {
  try {
    // Fetch full memory details from mem0
    const endpoint = `/v1/memories/${memoryId}/?user_id=${MEM0_USER_ID}`;
    const memory = await callMem0API(endpoint, "GET");

    if (memory && redisClient) {
      // Check access patterns
      const accessCount = parseInt(
        (await redisClient.get(`access:${memoryId}`)) || "0",
      );

      // Determine cache level based on priority and access patterns
      const ttl =
        priority === "high" || accessCount > FREQUENT_ACCESS_THRESHOLD
          ? CACHE_TTL
          : CACHE_TTL_L2;

      // Enhanced intelligence processing
      if (INTELLIGENCE_MODE === "enhanced" && memory.memory) {
        try {
          // Extract entities and relationships
          if (ENABLE_ENTITY_EXTRACTION && entityExtractor) {
            const extraction = await entityExtractor.extract(memory.memory);
            memory.entities = extraction.entities;
            memory.relationships = extraction.relationships;
            memory.keywords = extraction.keywords;
          }

          // Generate real embeddings
          if (ENABLE_REAL_EMBEDDINGS && enhancedVectra) {
            await enhancedVectra.addMemory({
              id: memoryId,
              content: memory.memory,
              user_id: memory.user_id,
              metadata: {
                entities: memory.entities,
                relationships: memory.relationships,
                keywords: memory.keywords,
                priority: priority as "low" | "normal" | "high" | "critical",
                access_count: accessCount,
              },
            });
          }
        } catch (error: any) {
          debugLog("Enhanced processing error:", error.message);
          // Continue with basic processing
        }
      }

      // Cache with appropriate TTL
      await setCachedMemory(memoryId, memory, ttl);

      // Index for semantic search (using simple keyword extraction for now)
      await indexMemoryForSearch(memoryId, memory);

      // Invalidate search cache after async processing completes
      await invalidateSearchCache();
    }
  } catch (error) {
    console.error(`Failed to process memory ${memoryId}:`, error);
  }
}

// Check for duplicate memories based on content similarity
async function checkForDuplicate(
  content: string,
  user_id: string = MEM0_USER_ID,
): Promise<DuplicateCheck | null> {
  if (!content) return null;

  try {
    // Search for similar memories
    const searchResponse = await callMem0API("/v1/memories/search/", "POST", {
      query: content.substring(0, 100), // Use first 100 chars for search
      user_id: user_id,
      limit: 5,
    });

    const results = searchResponse.results || [];

    // Check for exact or very similar matches
    for (const result of results) {
      if (result.memory) {
        // Calculate simple similarity (could be improved with better algorithm)
        const similarity = calculateSimilarity(
          content.toLowerCase(),
          result.memory.toLowerCase(),
        );
        if (similarity > 0.85) {
          // 85% similarity threshold
          return {
            isDuplicate: true,
            existingId: result.id,
            existingMemory: result.memory,
            similarity: similarity,
          };
        }
      }
    }
  } catch (error) {
    console.error("Duplicate check failed:", error);
  }

  return null;
}

// Simple similarity calculation (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// Invalidate all search cache entries
async function invalidateSearchCache(): Promise<void> {
  if (!redisClient) return;

  try {
    // Find all search cache keys
    const searchKeys = await redisClient.keys("search:*");

    if (searchKeys.length > 0) {
      // Delete all search cache entries
      await redisClient.del(searchKeys);
      console.error(
        `✓ Invalidated ${searchKeys.length} search cache entries after memory update`,
      );
    }
  } catch (error) {
    console.error("Failed to invalidate search cache:", error);
  }
}

// Simple keyword indexing for better search (can be replaced with vector embeddings)
async function indexMemoryForSearch(
  memoryId: string,
  memory: Memory,
): Promise<void> {
  if (!redisClient || !memory.memory) return;

  try {
    // Extract keywords (simple tokenization - can be improved with NLP)
    const text = memory.memory.toLowerCase();
    const keywords = text
      .split(/\W+/)
      .filter((word) => word.length > 3)
      .slice(0, 20); // Top 20 keywords

    // Store in Redis sets for each keyword
    for (const keyword of keywords) {
      await redisClient.sAdd(`keyword:${keyword}`, memoryId);
      await redisClient.expire(`keyword:${keyword}`, CACHE_TTL);
    }

    // Store reverse index
    if (keywords.length > 0) {
      await redisClient.sAdd(`memory:keywords:${memoryId}`, keywords);
    }
    await redisClient.expire(`memory:keywords:${memoryId}`, CACHE_TTL);
  } catch (error) {
    console.error("Indexing error:", error);
  }
}

// Improved search with keyword matching and hybrid strategy
async function smartSearch(
  query: string,
  limit: number = 10,
  preferCache: boolean = true,
): Promise<Memory[]> {
  const searchCacheKey = `search:${crypto.createHash("md5").update(query).digest("hex")}:${limit}`;

  // Check search results cache first
  if (redisClient && preferCache) {
    try {
      const cachedResults = await redisClient.get(searchCacheKey);
      if (cachedResults) {
        console.error("Returning cached search results");
        return JSON.parse(cachedResults);
      }
    } catch (error) {
      console.error("Search cache check failed:", error);
    }
  }

  // Determine search strategy based on preferCache
  let results: Memory[] = [];

  // Use enhanced vector search if available
  if (
    INTELLIGENCE_MODE === "enhanced" &&
    enhancedVectra &&
    ENABLE_REAL_EMBEDDINGS
  ) {
    try {
      const vectorResults = await enhancedVectra.searchMemories(
        query,
        limit * 2,
      );

      // Extract entities from query for matching
      let queryEntities: any = null;
      if (ENABLE_ENTITY_EXTRACTION && entityExtractor) {
        const extraction = await entityExtractor.extract(query);
        queryEntities = extraction.entities;
      }

      // Calculate multi-factor relevance scores
      for (const result of vectorResults) {
        const scoreBreakdown: any = {
          semantic_similarity: result.metadata?.similarity_score || 0,
          keyword_match: 0,
          entity_overlap: 0,
          recency_bonus: 0,
          access_frequency: 0,
        };

        // Keyword matching score
        const queryKeywords = query
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 2);
        const contentWords = result.content.toLowerCase().split(/\W+/);
        const keywordMatches = queryKeywords.filter((k) =>
          contentWords.includes(k),
        ).length;
        scoreBreakdown.keyword_match =
          keywordMatches / Math.max(queryKeywords.length, 1);

        // Entity overlap score
        if (queryEntities && result.metadata?.entities) {
          const entityTypes = [
            "people",
            "organizations",
            "technologies",
            "projects",
          ];
          let totalOverlap = 0;
          for (const type of entityTypes) {
            const queryEnts =
              queryEntities[type]?.map((e: any) => e.text.toLowerCase()) || [];
            const memEnts =
              result.metadata.entities[type]?.map((e: any) =>
                e.text.toLowerCase(),
              ) || [];
            const overlap = queryEnts.filter((e: string) =>
              memEnts.includes(e),
            ).length;
            totalOverlap += overlap;
          }
          scoreBreakdown.entity_overlap = Math.min(totalOverlap * 0.2, 1);
        }

        // Recency bonus (if created within last 7 days)
        const createdAt = result.metadata?.created_at;
        if (createdAt) {
          const ageInDays =
            (Date.now() - new Date(createdAt).getTime()) /
            (1000 * 60 * 60 * 24);
          scoreBreakdown.recency_bonus = Math.max(0, (7 - ageInDays) / 7) * 0.1;
        }

        // Access frequency bonus
        if (result.metadata?.access_count) {
          scoreBreakdown.access_frequency =
            Math.min(result.metadata.access_count / 10, 1) * 0.05;
        }

        // Calculate weighted final score
        const finalScore =
          scoreBreakdown.semantic_similarity * 0.5 +
          scoreBreakdown.keyword_match * 0.2 +
          scoreBreakdown.entity_overlap * 0.15 +
          scoreBreakdown.recency_bonus * 0.1 +
          scoreBreakdown.access_frequency * 0.05;

        // Map vector result to Memory interface
        const memory: Memory = {
          id: result.id,
          memory: result.content,
          metadata: result.metadata,
          created_at: result.metadata?.created_at || new Date().toISOString(),
          user_id: result.user_id,
          source: "enhanced_vector",
          relevance_score: finalScore,
          score_breakdown: {
            semantic: scoreBreakdown.semantic_similarity,
            keyword: scoreBreakdown.keyword_match,
            entity: scoreBreakdown.entity_overlap,
            relationship: 0,
            recency: scoreBreakdown.recency_bonus,
          },
          matched_entities: queryEntities
            ? Object.values(queryEntities)
                .flat()
                .map((e: any) => e.text)
            : [],
        };
        results.push(memory);
      }

      // Sort by final relevance score
      results.sort(
        (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0),
      );
      results = results.slice(0, limit);
    } catch (error: any) {
      debugLog("Enhanced search error:", error.message);
      // Fallback to basic search
    }
  }

  // Fallback to basic search if enhanced not available or didn't return enough results
  if (results.length < limit) {
    if (preferCache && redisClient) {
      // Try cache-first approach with keyword matching
      const cacheResults = await searchFromCache(query, limit - results.length);
      results = [...results, ...cacheResults];

      // If not enough results, fallback to mem0
      if (results.length < limit) {
        const mem0Results = await searchFromMem0(query, limit - results.length);
        results = [...results, ...mem0Results];
      }
    } else {
      // Cloud-first approach (prefer_cache = false)
      const mem0Results = await searchFromMem0(query, limit - results.length);
      results = [...results, ...mem0Results];

      // Cache the results for next time
      if (redisClient && mem0Results.length > 0) {
        for (const memory of mem0Results) {
          if (memory.id && memory.source === "mem0_cloud") {
            await setCachedMemory(memory.id, memory);
          }
        }
      }
    }
  }

  // Cache search results
  if (redisClient && results.length > 0) {
    try {
      await redisClient.setEx(
        searchCacheKey,
        SEARCH_CACHE_TTL,
        JSON.stringify(results),
      );
    } catch (error) {
      console.error("Failed to cache search results:", error);
    }
  }

  return results.slice(0, limit);
}

// Search from cache using keyword matching
async function searchFromCache(
  query: string,
  limit: number,
): Promise<Memory[]> {
  if (!redisClient) return [];

  try {
    const queryKeywords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    const memoryScores = new Map<string, number>();

    // Find memories matching keywords
    for (const keyword of queryKeywords) {
      const memoryIds = await redisClient.sMembers(`keyword:${keyword}`);
      for (const memoryId of memoryIds) {
        const score = memoryScores.get(memoryId) || 0;
        memoryScores.set(memoryId, score + 1);
      }
    }

    // Sort by relevance score
    const sortedMemoryIds = Array.from(memoryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch memories from cache
    const results: Memory[] = [];
    for (const memoryId of sortedMemoryIds) {
      const cached = await getCachedMemory(memoryId);
      if (cached) {
        results.push({
          ...cached,
          source: "redis_cache",
          relevance_score: memoryScores.get(memoryId),
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Cache search error:", error);
    return [];
  }
}

// Search from mem0 cloud
async function searchFromMem0(query: string, limit: number): Promise<Memory[]> {
  try {
    const endpoint = `/v1/memories/?user_id=${MEM0_USER_ID}&query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await callMem0API(endpoint, "GET");

    // Extract memories array from response (mem0 returns {results: [...]} or just array)
    let mem0Results = Array.isArray(response)
      ? response
      : response.results || response.memories || [];

    // Ensure limit is respected
    if (mem0Results.length > limit) {
      mem0Results = mem0Results.slice(0, limit);
    }

    return mem0Results.map((m: any) => ({ ...m, source: "mem0_cloud" }));
  } catch (error) {
    console.error("Mem0 search failed:", error);
    return [];
  }
}

// Helper function for mem0 API calls - local-first with cloud fallback
async function callMem0API(
  endpoint: string,
  method: string = "GET",
  body: any = null,
): Promise<any> {
  // Local mode: use local storage only
  if (MODE === "local") {
    return simulateLocalAPI(endpoint, method, body);
  }

  // Demo mode: simulate API with local storage
  if (DEMO_MODE) {
    return simulateMem0API(endpoint, method, body);
  }

  // Hybrid mode: use cloud API
  const url = `${MEM0_BASE_URL}${endpoint}`;
  const options: any = {
    method,
    headers: {
      Authorization: `Token ${MEM0_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = (await response.json()) as any;

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Mem0 API call failed: ${error.message}`);
    throw error;
  }
}

// Simulate Local API using LocalMemory - fully offline
async function simulateLocalAPI(
  endpoint: string,
  method: string,
  body: any,
): Promise<any> {
  if (!localMemory) {
    throw new Error("Local memory not initialized");
  }

  const userId = body?.user_id || MEM0_USER_ID;

  // Handle different endpoints
  if (endpoint.includes("/memories/") && method === "POST") {
    // Add memory
    const content = body.messages
      ? body.messages.map((m: any) => m.content).join(" ")
      : body.content;
    const result = await localMemory.add({
      content,
      user_id: userId,
      metadata: body.metadata || {},
      priority: body.priority || "normal",
    });

    return [
      {
        id: result.id,
        memory: content,
        user_id: userId,
        created_at: new Date().toISOString(),
      },
    ];
  }

  if (endpoint.includes("/memories/search/") && method === "POST") {
    // Search memories
    const results = await localMemory.search({
      query: body.query,
      user_id: userId,
      limit: body.limit || 10,
    });
    return {
      results: results.map((r) => ({
        ...r,
        memory: r.content,
        score: Math.random(),
      })),
    };
  }

  if (endpoint.includes("/memories/") && method === "GET") {
    // Get all memories or specific memory
    if (endpoint.includes("?")) {
      // Get all memories with query params
      const results = await localMemory.getAll({
        user_id: userId,
        limit: 100,
      });
      return { memories: results.map((r) => ({ ...r, memory: r.content })) };
    } else {
      // Get specific memory by ID (extract ID from endpoint)
      const memoryId = endpoint
        .split("/")
        .filter((p) => p && p !== "memories" && p !== "v1")
        .pop()
        ?.replace("?user_id=" + userId, "");
      if (memoryId) {
        const allResults = await localMemory.getAll({ user_id: userId });
        const found = allResults.find((r) => r.id === memoryId);
        if (found) {
          return { ...found, memory: found.content };
        }
      }
    }
  }

  if (endpoint.includes("/memories/") && method === "DELETE") {
    // Delete memory
    const memoryId = endpoint
      .split("/")
      .filter((p) => p && p !== "memories" && p !== "v1")
      .pop()
      ?.split("?")[0];
    if (memoryId) {
      await localMemory.delete(memoryId, userId);
    }
    return { message: "Memory deleted successfully (local mode)" };
  }

  return { message: "Local mode - operation completed" };
}

// Simulate Mem0 API for demo mode
function simulateMem0API(endpoint: string, method: string, body: any): any {
  const userId = body?.user_id || MEM0_USER_ID;

  // Handle different endpoints
  if (endpoint.includes("/memories/") && method === "POST") {
    // Add memory
    const id = `demo-${demoStorage.idCounter++}`;
    const memory: Memory = {
      id,
      memory: body.messages
        ? body.messages.map((m: any) => m.content).join(" ")
        : body.content,
      metadata: body.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId,
    };
    demoStorage.memories.set(id, memory);
    return { id, message: "Memory added successfully (demo mode)" };
  }

  if (endpoint.includes("/memories/search/") && method === "POST") {
    // Search memories
    const query = body.query.toLowerCase();
    const results = Array.from(demoStorage.memories.values())
      .filter(
        (m) => m.user_id === userId && m.memory.toLowerCase().includes(query),
      )
      .map((m) => ({ ...m, score: Math.random() }))
      .sort((a, b) => b.score - a.score)
      .slice(0, body.limit || 10);
    return { results };
  }

  if (endpoint.includes("/memories/") && method === "GET") {
    // Get all memories
    const memories = Array.from(demoStorage.memories.values()).filter(
      (m) => m.user_id === userId,
    );
    return { memories };
  }

  if (endpoint.includes("/memories/") && method === "DELETE") {
    // Delete memory
    const memoryId = endpoint
      .split("/")
      .filter((p) => p)
      .pop();
    if (memoryId) {
      demoStorage.memories.delete(memoryId);
    }
    return { message: "Memory deleted successfully (demo mode)" };
  }

  return { message: "Demo mode - operation simulated" };
}

// Redis cache helpers
async function getCachedMemory(key: string): Promise<Memory | null> {
  if (!redisClient) return null;

  try {
    const cached = await redisClient.get(`memory:${key}`);
    if (cached) {
      // Track access for cache optimization
      await redisClient.incr(`access:${key}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Redis get error:", error);
  }
  return null;
}

async function setCachedMemory(
  key: string,
  data: Memory,
  ttl: number = CACHE_TTL,
): Promise<void> {
  if (!redisClient) return;

  try {
    await redisClient.setEx(`memory:${key}`, ttl, JSON.stringify(data));
    await redisClient.incr(`access:${key}`);

    // Index for search
    await indexMemoryForSearch(key, data);
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

async function getTopMemories(limit: number = 50): Promise<string[]> {
  if (!redisClient) return [];

  try {
    const keys = await redisClient.keys("memory:*");
    const accessPromises = keys.map(async (key) => {
      const memoryKey = key.replace("memory:", "");
      const accessCount =
        (await redisClient!.get(`access:${memoryKey}`)) || "0";
      return { key: memoryKey, access: parseInt(accessCount) };
    });

    const accessData = await Promise.all(accessPromises);
    return accessData
      .sort((a, b) => b.access - a.access)
      .slice(0, limit)
      .map((item) => item.key);
  } catch (error) {
    console.error("Redis top memories error:", error);
    return [];
  }
}

// Cache invalidation helper
async function invalidateCache(
  memoryId: string,
  operation: string = "update",
): Promise<void> {
  if (!pubSubClient) return;

  try {
    await pubSubClient.publish(
      "cache:invalidate",
      JSON.stringify({
        memoryId,
        operation,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.error("Cache invalidation publish error:", error);
  }
}

// Logging
log("Mem0-Redis Hybrid MCP Server starting...");
log(`User ID: ${MEM0_USER_ID}`);
log(`API Base: ${MEM0_BASE_URL}`);
log(`Redis: ${REDIS_URL}`);

const server = new Server(
  {
    name: "r3call",
    version: "1.2.9",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = [
    {
      name: "add_memory",
      description:
        "Add memory with async processing and intelligent caching. Returns immediately while processing in background.",
      inputSchema: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["user", "assistant", "system"] },
                content: { type: "string" },
              },
              required: ["role", "content"],
            },
            description: "Array of message objects (alternative to content)",
          },
          content: {
            type: "string",
            description: "Direct memory content (alternative to messages)",
          },
          user_id: {
            type: "string",
            default: MEM0_USER_ID,
          },
          metadata: {
            type: "object",
            description: "Additional metadata",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
            default: "medium",
            description: "Processing priority (high = immediate cache)",
          },
          async: {
            type: "boolean",
            default: true,
            description: "Process asynchronously for better performance",
          },
          skip_duplicate_check: {
            type: "boolean",
            default: false,
            description: "Skip duplicate detection (use with caution)",
          },
        },
      },
    },
    {
      name: "search_memory",
      description:
        "Hybrid search with intelligent cache/cloud routing and relevance scoring",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          user_id: {
            type: "string",
            default: MEM0_USER_ID,
          },
          limit: {
            type: "number",
            default: 10,
          },
          prefer_cache: {
            type: "boolean",
            default: true,
            description:
              "true = cache-first with fallback, false = cloud-first with caching",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get_all_memories",
      description:
        "Get all memories with hybrid cloud/cache intelligence and pagination support",
      inputSchema: {
        type: "object",
        properties: {
          user_id: {
            type: "string",
            default: MEM0_USER_ID,
          },
          limit: {
            type: "number",
            default: 100,
            description: "Number of memories to return (max 500)",
          },
          offset: {
            type: "number",
            default: 0,
            description: "Number of memories to skip for pagination",
          },
          include_cache_stats: {
            type: "boolean",
            default: true,
            description: "Include Redis cache statistics",
          },
          prefer_cache: {
            type: "boolean",
            default: true,
            description: "Use cached memories first to avoid slow API calls",
          },
        },
      },
    },
    {
      name: "delete_memory",
      description: "Delete memory with automatic cache invalidation",
      inputSchema: {
        type: "object",
        properties: {
          memory_id: {
            type: "string",
            description: "ID of memory to delete",
          },
        },
        required: ["memory_id"],
      },
    },
    {
      name: "deduplicate_memories",
      description: "Find and merge duplicate memories",
      inputSchema: {
        type: "object",
        properties: {
          user_id: {
            type: "string",
            default: MEM0_USER_ID,
          },
          similarity_threshold: {
            type: "number",
            default: 0.85,
            description: "Similarity threshold for duplicate detection (0-1)",
          },
          dry_run: {
            type: "boolean",
            default: true,
            description: "Preview duplicates without deleting",
          },
        },
      },
    },
    {
      name: "optimize_cache",
      description:
        "Optimize cache with intelligent memory promotion and cleanup",
      inputSchema: {
        type: "object",
        properties: {
          force_refresh: {
            type: "boolean",
            default: false,
            description: "Force refresh all memories from cloud",
          },
          max_memories: {
            type: "number",
            default: 1000,
            description: "Maximum memories to cache",
          },
        },
      },
    },
    {
      name: "cache_stats",
      description:
        "Get detailed cache performance statistics and health metrics",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "sync_status",
      description: "Check background sync and job queue status",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "extract_entities",
      description: "Extract entities and relationships from text using NLP",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to extract entities from",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "get_knowledge_graph",
      description:
        "Get memories organized as a knowledge graph with entities and relationships",
      inputSchema: {
        type: "object",
        properties: {
          entity_type: {
            type: "string",
            description:
              "Filter by entity type (people, organizations, technologies, projects)",
          },
          entity_name: {
            type: "string",
            description: "Filter by specific entity name",
          },
          relationship_type: {
            type: "string",
            description:
              "Filter by relationship type (WORKS_FOR, USES, BUILT_WITH, etc.)",
          },
          limit: {
            type: "number",
            default: 20,
            description: "Maximum number of nodes to return",
          },
        },
      },
    },
    {
      name: "find_connections",
      description: "Find connections between entities in the knowledge graph",
      inputSchema: {
        type: "object",
        properties: {
          from_entity: {
            type: "string",
            description: "Starting entity name",
          },
          to_entity: {
            type: "string",
            description:
              "Target entity name (optional - finds all if not specified)",
          },
          max_depth: {
            type: "number",
            default: 2,
            description: "Maximum relationship depth to traverse",
          },
        },
        required: ["from_entity"],
      },
    },
  ];

  return { tools };
});

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: rawArgs } = request.params;

    if (!rawArgs) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No arguments provided",
          },
        ],
        isError: true,
      };
    }

    // Type the args as any to avoid TypeScript issues
    const args = rawArgs as any;

    try {
      switch (name) {
        case "add_memory": {
          const user_id = args.user_id || MEM0_USER_ID;
          const isAsync = args.async !== false;
          const skipDuplicateCheck = args.skip_duplicate_check || false;

          // Prepare memory for mem0 cloud
          let body: any = { user_id };
          let contentToCheck = "";

          if (args.messages) {
            body.messages = args.messages;
            // Extract content from messages for duplicate check
            contentToCheck = args.messages.map((m: any) => m.content).join(" ");
          } else if (args.content) {
            contentToCheck = args.content;
            body.messages = [
              { role: "user", content: args.content },
              { role: "assistant", content: "I'll remember that." },
            ];
          }
          if (args.metadata) {
            body.metadata = args.metadata;
          }

          // Check for duplicates unless explicitly skipped
          if (!skipDuplicateCheck && contentToCheck) {
            const duplicateCheck = await checkForDuplicate(
              contentToCheck,
              user_id,
            );
            if (duplicateCheck && duplicateCheck.isDuplicate) {
              return {
                content: [
                  {
                    type: "text",
                    text: "Already saved",
                  },
                ],
              };
            }
          }

          if (isAsync && pubSubClient) {
            // Async processing for better performance
            const jobId = crypto.randomBytes(16).toString("hex");

            // Start async job
            const jobPromise = new Promise((resolve, reject) => {
              jobQueue.set(jobId, { resolve, reject });

              // Add timeout
              setTimeout(() => {
                if (jobQueue.has(jobId)) {
                  jobQueue.delete(jobId);
                  reject(new Error("Job timeout"));
                }
              }, 30000); // 30 second timeout
            });

            // Send to mem0 in background
            callMem0API("/v1/memories/", "POST", body)
              .then(async (result) => {
                // Invalidate search caches immediately on new memory
                if (redisClient) {
                  try {
                    // Clear all search caches to ensure fresh results
                    const searchKeys = await redisClient.keys("search:*");
                    if (searchKeys.length > 0) {
                      await redisClient.del(searchKeys);
                    }
                  } catch (error) {
                    console.error("Failed to invalidate search cache:", error);
                  }
                }

                // Cache high-priority memories immediately
                if (args.priority === "high" && result.length > 0) {
                  for (const memory of result) {
                    if (memory.id) {
                      await setCachedMemory(memory.id, memory, CACHE_TTL);
                      if (pubSubClient) {
                        await pubSubClient.publish(
                          "memory:process",
                          JSON.stringify({
                            memoryId: memory.id,
                            priority: "high",
                          }),
                        );
                      }
                    }
                  }
                } else {
                  // Queue for background processing but also cache immediately
                  for (const memory of result) {
                    if (memory.id) {
                      // Cache ALL memories immediately, regardless of priority
                      await setCachedMemory(memory.id, memory, CACHE_TTL);
                      pendingMemories.set(memory.id, {
                        priority: args.priority || "medium",
                        timestamp: Date.now(),
                      });
                    }
                  }
                }

                // Invalidate search cache after async memory addition
                await invalidateSearchCache();

                // Notify job completion
                if (pubSubClient) {
                  await pubSubClient.publish(
                    "job:complete",
                    JSON.stringify({
                      jobId,
                      result: result.length,
                    }),
                  );
                }
              })
              .catch(async (error) => {
                if (pubSubClient) {
                  await pubSubClient.publish(
                    "job:complete",
                    JSON.stringify({
                      jobId,
                      error: error.message,
                    }),
                  );
                }
              });

            return {
              content: [
                {
                  type: "text",
                  text: "Saved",
                },
              ],
            };
          } else {
            // Synchronous fallback
            const result = await callMem0API("/v1/memories/", "POST", body);

            // Cache if high priority
            if (args.priority === "high" && result.length > 0 && redisClient) {
              for (const memory of result) {
                if (memory.id) {
                  await setCachedMemory(memory.id, memory, CACHE_TTL);
                }
              }
              // Invalidate search cache after synchronous high-priority adds
              await invalidateSearchCache();
            }

            return {
              content: [
                {
                  type: "text",
                  text: "Saved",
                },
              ],
            };
          }
        }

        case "search_memory": {
          const results = await smartSearch(
            args.query,
            args.limit || 10,
            args.prefer_cache !== false,
          );

          const cacheCount = results.filter(
            (r) => r.source === "redis_cache",
          ).length;
          const cloudCount = results.filter(
            (r) => r.source === "mem0_cloud" || r.source === "local",
          ).length;

          // Simplified source label with symbols
          const sourceInfo =
            cacheCount > 0 && cloudCount > 0
              ? `⚡ ${cacheCount} cache | ☁ ${cloudCount} ${MODE === "local" ? "local" : "cloud"}`
              : cacheCount > 0
                ? `⚡ cache hit`
                : MODE === "local"
                  ? `💾 local`
                  : `☁ cloud`;

          // Clean, professional output with full content
          if (results.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No memories found",
                },
              ],
            };
          }

          // Return full memory content formatted cleanly
          const memories = results
            .map((r) => {
              // Clean up the memory text - remove excessive whitespace but keep content intact
              const cleanMemory = r.memory
                ? r.memory
                    .replace(/\n\n+/g, "\n") // Collapse multiple newlines to single
                    .replace(/[ \t]+/g, " ") // Collapse multiple spaces/tabs to single space
                    .trim()
                : "";
              return cleanMemory;
            })
            .filter((m) => m); // Remove empty memories

          // Single memory - return it directly
          if (memories.length === 1) {
            return {
              content: [
                {
                  type: "text",
                  text: memories[0],
                },
              ],
            };
          }

          // Multiple memories - separate with clear delimiter
          return {
            content: [
              {
                type: "text",
                text: memories.join("\n---\n"),
              },
            ],
          };
        }

        case "get_all_memories": {
          const user_id = args.user_id || MEM0_USER_ID;
          const limit = Math.min(args.limit || 100, 500); // Cap at 500 to prevent overload
          const offset = args.offset || 0;
          const preferCache = args.prefer_cache !== false;

          let memories: Memory[] = [];
          let source = "cloud";

          // Try cache-first approach if Redis is available
          if (preferCache && redisClient) {
            try {
              // Get cached memories
              const cacheKeys = await redisClient.keys("memory:*");

              if (cacheKeys.length > 0) {
                // Fetch from cache with pagination support
                const cachedMemories: Memory[] = [];
                const startIdx = offset;
                const endIdx = Math.min(offset + limit, cacheKeys.length);

                for (const key of cacheKeys.slice(startIdx, endIdx)) {
                  const cached = await redisClient.get(key);
                  if (cached) {
                    cachedMemories.push(JSON.parse(cached));
                  }
                }

                if (cachedMemories.length > 0) {
                  memories = cachedMemories;
                  source = "cache";
                  console.error(
                    `Returning ${memories.length} memories from cache`,
                  );
                }
              }
            } catch (error) {
              console.error("Cache fetch failed:", error);
            }
          }

          // Fall back to cloud if no cache or preferCache is false
          if (memories.length === 0) {
            // Get from mem0 cloud (WARNING: API may return ALL memories regardless of limit!)
            const endpoint = `/v1/memories/?user_id=${user_id}&limit=${limit + offset}`;
            let response = await callMem0API(endpoint, "GET");

            // Extract memories array from response
            let allMemories = Array.isArray(response)
              ? response
              : response.results || response.memories || [];

            // Apply pagination
            memories = allMemories.slice(offset, offset + limit);

            source = "cloud";
            console.error(
              `Fetched ${memories.length} memories from cloud (API returned ${Array.isArray(response) ? response.length : "object"})`,
            );
          }

          let stats = "";
          if (args.include_cache_stats && redisClient) {
            try {
              const cacheKeys = await redisClient.keys("memory:*");
              const keywordKeys = await redisClient.keys("keyword:*");

              stats = ` [${cacheKeys.length}c/${keywordKeys.length}k]`;
            } catch (error) {
              stats = "";
            }
          }

          // Get total count for pagination info
          let totalCount = memories.length;
          if (redisClient) {
            try {
              const allKeys = await redisClient.keys("memory:*");
              totalCount = allKeys.length;
            } catch (e) {
              // Use current count if cache check fails
            }
          }

          // Optimize response for large datasets
          const response: any = {
            total: totalCount,
            limit: limit,
            offset: offset,
            returned: memories.length,
            hasMore: offset + memories.length < totalCount,
            source: source,
            memories: memories,
          };

          // For very large responses, truncate memory content to prevent token overflow
          const responseSize = JSON.stringify(response).length;
          if (responseSize > 40000) {
            // Truncate long memory content
            response.memories = memories.map((m) => {
              const wasTruncated = m.memory && m.memory.length > 100;
              return {
                id: m.id,
                memory: m.memory
                  ? wasTruncated
                    ? m.memory.substring(0, 100) + "..."
                    : m.memory
                  : "",
                user_id: m.user_id,
                created_at: m.created_at,
                metadata: wasTruncated
                  ? { ...m.metadata, _truncated: true }
                  : m.metadata,
              };
            });
            response.truncated = true;
          }

          // More concise response format with source symbols
          const sourceSymbol =
            source === "cache" ? "⚡" : MODE === "local" ? "💾" : "☁";
          const sourceLabel =
            source === "cache"
              ? "cache hit"
              : MODE === "local"
                ? "local"
                : "cloud";

          return {
            content: [
              {
                type: "text",
                text:
                  memories.length === 0
                    ? "No memories found"
                    : `${memories.length} ${memories.length === 1 ? "memory" : "memories"} retrieved`,
              },
            ],
          };
        }

        case "delete_memory": {
          const memoryId = args.memory_id;

          // Delete from mem0 cloud
          const endpoint = `/v1/memories/${memoryId}/?user_id=${MEM0_USER_ID}`;
          await callMem0API(endpoint, "DELETE");

          // Invalidate cache
          await invalidateCache(memoryId, "delete");

          // Clean up local cache immediately
          if (redisClient) {
            await redisClient.del(`memory:${memoryId}`);
            await redisClient.del(`access:${memoryId}`);
            await redisClient.del(`memory:keywords:${memoryId}`);

            // Remove from keyword indexes
            const keywords = await redisClient.sMembers(
              `memory:keywords:${memoryId}`,
            );
            for (const keyword of keywords) {
              await redisClient.sRem(`keyword:${keyword}`, memoryId);
            }
          }

          return {
            content: [
              {
                type: "text",
                text: "Deleted",
              },
            ],
          };
        }

        case "deduplicate_memories": {
          const user_id = args.user_id || MEM0_USER_ID;
          const threshold = args.similarity_threshold || 0.85;
          const isDryRun = args.dry_run !== false;

          // Get all memories for the user
          const endpoint = `/v1/memories/?user_id=${user_id}&limit=1000`;
          const response = await callMem0API(endpoint, "GET");
          const memories = Array.isArray(response)
            ? response
            : response.results || [];

          const duplicates: any[] = [];
          const processed = new Set<string>();

          // Find duplicates
          for (let i = 0; i < memories.length; i++) {
            if (processed.has(memories[i].id)) continue;

            const group = {
              primary: memories[i],
              duplicates: [] as any[],
            };

            for (let j = i + 1; j < memories.length; j++) {
              if (processed.has(memories[j].id)) continue;

              const similarity = calculateSimilarity(
                memories[i].memory?.toLowerCase() || "",
                memories[j].memory?.toLowerCase() || "",
              );

              if (similarity >= threshold) {
                group.duplicates.push({
                  ...memories[j],
                  similarity: Math.round(similarity * 100),
                });
                processed.add(memories[j].id);
              }
            }

            if (group.duplicates.length > 0) {
              duplicates.push(group);
              processed.add(memories[i].id);
            }
          }

          let deleteCount = 0;
          if (!isDryRun && duplicates.length > 0) {
            // Delete duplicates
            for (const group of duplicates) {
              for (const dup of group.duplicates) {
                try {
                  await callMem0API(
                    `/v1/memories/${dup.id}/?user_id=${user_id}`,
                    "DELETE",
                  );
                  deleteCount++;

                  // Remove from cache
                  if (redisClient) {
                    await redisClient.del(`memory:${dup.id}`);
                  }
                } catch (error) {
                  console.error(`Failed to delete duplicate ${dup.id}:`, error);
                }
              }
            }

            // Invalidate search cache
            await invalidateSearchCache();
          }

          const summary = duplicates.map((g) => ({
            primary: {
              id: g.primary.id,
              content: g.primary.memory?.substring(0, 100) + "...",
            },
            duplicates: g.duplicates.map((d: any) => ({
              id: d.id,
              similarity: d.similarity + "%",
              content: d.memory?.substring(0, 100) + "...",
            })),
          }));

          const totalDuplicates = duplicates.reduce(
            (sum, g) => sum + g.duplicates.length,
            0,
          );
          const compactSummary = duplicates
            .slice(0, 3)
            .map(
              (g) =>
                `• ${g.primary.id.substring(0, 8)}: ${g.duplicates.length} duplicate(s)`,
            )
            .join("\n");

          const message = isDryRun
            ? `${totalDuplicates} dups in ${duplicates.length} groups → dry_run:false to delete`
            : `✗ ${deleteCount} dups`;

          return {
            content: [
              {
                type: "text",
                text: message,
              },
            ],
          };
        }

        case "optimize_cache": {
          if (!redisClient) {
            return {
              content: [{ type: "text", text: "Cache not available" }],
            };
          }

          const maxMemories = args.max_memories || 1000;

          // Get memories to cache
          const endpoint = `/v1/memories/?user_id=${MEM0_USER_ID}&limit=${maxMemories}`;
          const response = await callMem0API(endpoint, "GET");

          // Extract memories array from response (mem0 returns {results: [...]} or just array)
          let allMemories = Array.isArray(response)
            ? response
            : response.results || response.memories || [];

          // Clear old cache if force refresh
          if (args.force_refresh) {
            const oldKeys = await redisClient.keys("memory:*");
            if (oldKeys.length > 0) {
              await redisClient.del(oldKeys);
            }
            const oldKeywords = await redisClient.keys("keyword:*");
            if (oldKeywords.length > 0) {
              await redisClient.del(oldKeywords);
            }
          }

          // Smart caching with priority
          let cached = 0;
          let l1Count = 0;
          let l2Count = 0;

          for (const memory of allMemories) {
            if (memory.id) {
              // Check access patterns
              const accessCount = parseInt(
                (await redisClient.get(`access:${memory.id}`)) || "0",
              );

              // Determine cache level
              if (cached < 100 || accessCount > FREQUENT_ACCESS_THRESHOLD) {
                // L1 cache - hot data
                await setCachedMemory(memory.id, memory, CACHE_TTL);
                l1Count++;
              } else if (cached < maxMemories) {
                // L2 cache - warm data
                await setCachedMemory(memory.id, memory, CACHE_TTL_L2);
                l2Count++;
              }
              cached++;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: `Cache optimized: ${cached} memories ready`,
              },
            ],
          };
        }

        case "cache_stats": {
          if (!redisClient) {
            return {
              content: [{ type: "text", text: "Cache not available" }],
            };
          }

          try {
            const info = await redisClient.info("memory");
            const cacheKeys = await redisClient.keys("memory:*");
            const accessKeys = await redisClient.keys("access:*");
            const keywordKeys = await redisClient.keys("keyword:*");
            const searchCacheKeys = await redisClient.keys("search:*");

            // Get top accessed memories
            const topMemories = await getTopMemories(10);
            const accessCounts = await Promise.all(
              topMemories.map(async (key) => ({
                key,
                count: (await redisClient!.get(`access:${key}`)) || 0,
              })),
            );

            // Calculate cache hit rate (approximate)
            let totalAccess = 0;
            for (const key of accessKeys) {
              const count = await redisClient.get(key);
              totalAccess += parseInt(count || "0");
            }

            const hitRate =
              cacheKeys.length > 0
                ? Math.min(100, (totalAccess / cacheKeys.length) * 10).toFixed(
                    0,
                  )
                : "0";

            const memUsage =
              info.split("used_memory_human:")[1]?.split("\r\n")[0] || "?";

            const topItems = accessCounts
              .slice(0, 3)
              .map((item) => `${item.key.substring(0, 8)}: ${item.count}x`)
              .join(", ");

            return {
              content: [
                {
                  type: "text",
                  text: `${cacheKeys.length} memories cached`,
                },
              ],
            };
          } catch (error: any) {
            return {
              content: [
                {
                  type: "text",
                  text: "Could not retrieve cache statistics",
                },
              ],
            };
          }
        }

        case "sync_status": {
          const pendingCount = pendingMemories.size + jobQueue.size;
          const statusText =
            pendingCount > 0
              ? `${pendingCount} operations pending`
              : "All operations complete";

          return {
            content: [
              {
                type: "text",
                text: statusText,
              },
            ],
          };
        }

        case "extract_entities": {
          if (INTELLIGENCE_MODE !== "enhanced" || !entityExtractor) {
            return {
              content: [
                {
                  type: "text",
                  text: "Entity extraction failed to initialize. Restart server or use --basic flag to disable.",
                },
              ],
            };
          }

          const { text } = args as { text: string };
          const extraction = await entityExtractor.extract(text);

          const entitySummary = {
            people: extraction.entities.people.map((e) => e.text),
            organizations: extraction.entities.organizations.map((e) => e.text),
            technologies: extraction.entities.technologies.map((e) => e.text),
            projects: extraction.entities.projects.map((e) => e.text),
            relationships: extraction.relationships.map(
              (r) => `${r.from} --[${r.type}]--> ${r.to}`,
            ),
            keywords: extraction.keywords.slice(0, 10),
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(entitySummary, null, 2),
              },
            ],
          };
        }

        case "get_knowledge_graph": {
          if (INTELLIGENCE_MODE !== "enhanced" || !enhancedVectra) {
            return {
              content: [
                {
                  type: "text",
                  text: "Knowledge graph failed to initialize. Restart server or use --basic flag to disable.",
                },
              ],
            };
          }

          const {
            entity_type,
            entity_name,
            relationship_type,
            limit = 20,
          } = args as any;

          // Get all memories with entity/relationship data
          const allMemories = await enhancedVectra.getAllMemories();

          const graphNodes: any[] = [];
          const graphEdges: any[] = [];
          const entityMap = new Map<string, any>();

          for (const memory of allMemories) {
            if (!memory.metadata?.entities) continue;

            // Filter and collect entities
            const entities = memory.metadata.entities;
            for (const [type, entityList] of Object.entries(entities)) {
              if (entity_type && type !== entity_type) continue;

              for (const entity of entityList as any[]) {
                if (
                  entity_name &&
                  !entity.text.toLowerCase().includes(entity_name.toLowerCase())
                )
                  continue;

                const key = `${type}:${entity.text}`;
                if (!entityMap.has(key)) {
                  entityMap.set(key, {
                    id: key,
                    type,
                    name: entity.text,
                    memories: [],
                  });
                }
                entityMap.get(key).memories.push(memory.id);
              }
            }

            // Collect relationships
            if (memory.metadata.relationships) {
              for (const rel of memory.metadata.relationships) {
                if (relationship_type && rel.type !== relationship_type)
                  continue;

                graphEdges.push({
                  from: rel.from,
                  to: rel.to,
                  type: rel.type,
                  confidence: rel.confidence,
                  memory_id: memory.id,
                });
              }
            }
          }

          // Convert to array and limit
          graphNodes.push(...Array.from(entityMap.values()).slice(0, limit));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { nodes: graphNodes, edges: graphEdges },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "find_connections": {
          if (INTELLIGENCE_MODE !== "enhanced" || !enhancedVectra) {
            return {
              content: [
                {
                  type: "text",
                  text: "Connection finding failed to initialize. Restart server or use --basic flag to disable.",
                },
              ],
            };
          }

          const { from_entity, to_entity, max_depth = 2 } = args as any;

          // Simple BFS to find connections
          const allMemories = await enhancedVectra.getAllMemories();
          const graph = new Map<string, Set<{ to: string; type: string }>>();

          // Build adjacency list
          for (const memory of allMemories) {
            if (!memory.metadata?.relationships) continue;

            for (const rel of memory.metadata.relationships) {
              if (!graph.has(rel.from)) {
                graph.set(rel.from, new Set());
              }
              graph.get(rel.from)!.add({ to: rel.to, type: rel.type });
            }
          }

          // BFS to find paths
          const paths: any[] = [];
          const queue: Array<{ node: string; path: any[]; depth: number }> = [
            { node: from_entity, path: [], depth: 0 },
          ];
          const visited = new Set<string>();

          while (queue.length > 0 && paths.length < 10) {
            const { node, path, depth } = queue.shift()!;

            if (visited.has(node) || depth > max_depth) continue;
            visited.add(node);

            // Check if we reached target
            if (to_entity && node === to_entity && path.length > 0) {
              paths.push(path);
              continue;
            }

            // Explore neighbors
            const neighbors = graph.get(node);
            if (neighbors && depth < max_depth) {
              for (const neighbor of neighbors) {
                const newPath = [
                  ...path,
                  { from: node, to: neighbor.to, type: neighbor.type },
                ];

                if (!to_entity && depth === max_depth - 1) {
                  // If no target specified, collect all paths at max depth
                  paths.push(newPath);
                } else {
                  queue.push({
                    node: neighbor.to,
                    path: newPath,
                    depth: depth + 1,
                  });
                }
              }
            }
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    from: from_entity,
                    to: to_entity || "any",
                    max_depth,
                    paths_found: paths.length,
                    paths,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Enhanced logging and timeout handling
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.error(
      `[DEBUG ${timestamp}] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  }
}

export async function startServer() {
  log("🚀 Starting r3call server...");
  debugLog("Process arguments:", process.argv);
  debugLog("Environment mode:", { MODE, MEM0_API_KEY: !!MEM0_API_KEY });

  const startupTimeout = setTimeout(() => {
    console.error("❌ Server startup timeout after 30 seconds");
    console.error("   This may indicate an issue with Redis or dependencies");
    console.error("   Try running with --debug for more information");
    process.exit(1);
  }, 30000);

  try {
    debugLog("Creating transport...");
    const transport = new StdioServerTransport();

    debugLog("Connecting server immediately...");
    await server.connect(transport);

    clearTimeout(startupTimeout);

    // Initialize Redis in background after server is ready
    debugLog("Initializing Redis in background...");
    initializeRedis().then((redisSuccess) => {
      debugLog("Redis initialization result:", { success: redisSuccess });
      if (redisSuccess) {
        log("  ✓ Redis cache ready");
      }
    }).catch((error) => {
      debugLog("Redis initialization failed:", error);
    });
    log("✓ r3call MCP Server v2.0 running successfully");
    log(`  Mode: ${MODE.toUpperCase()}`);
    log(`  Redis: ${redisClient ? "Connected" : "Fallback"}`);
    log(`  Vector Search: ${localMemory ? "Enabled" : "Disabled"}`);

    // Show intelligence mode status
    if (INTELLIGENCE_MODE === "enhanced") {
      log("  AI Intelligence: ENABLED (default)");
      log("  • Real embeddings (384-dim)");
      log("  • Entity extraction");
      log("  • Knowledge graph tools");
    } else {
      log("  AI Intelligence: DISABLED (--basic mode)");
    }

    // Add process signal handlers for graceful shutdown
    process.on("SIGTERM", () => {
      console.error("Received SIGTERM, shutting down gracefully...");
      gracefulShutdown();
    });

    process.on("SIGINT", () => {
      console.error("Received SIGINT, shutting down gracefully...");
      gracefulShutdown();
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
      gracefulShutdown();
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled rejection at:", promise, "reason:", reason);
    });
  } catch (error: any) {
    clearTimeout(startupTimeout);
    console.error("❌ Server startup failed:", error.message);
    debugLog("Full error details:", error);

    if (error.message.includes("Redis")) {
      console.error(
        "   Redis connection failed - check if Redis is running or try demo mode",
      );
      console.error("   Run with --demo for in-memory mode without Redis");
    }

    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.error("Shutting down gracefully...");

  try {
    if (localMemory) {
      debugLog("Stopping local memory...");
      await localMemory.stop();
    }

    if (redisClient) {
      debugLog("Closing Redis connections...");
      await Promise.all([
        redisClient.quit().catch(() => {}),
        pubSubClient?.quit().catch(() => {}),
        subscriberClient?.quit().catch(() => {}),
      ]);
    }

    console.error("✓ Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Only run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error("❌ Fatal server error:", error.message);
    debugLog("Fatal error details:", error);
    process.exit(1);
  });
}
