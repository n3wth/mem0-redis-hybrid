#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { createClient } from 'redis';
import crypto from 'crypto';
import LocalMemory from './lib/local-memory.js';

// Configuration
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const LOCAL_MODE = process.env.R3CALL_LOCAL === 'true' || process.argv.includes('--local');
const DEMO_MODE = process.env.DEMO_MODE === 'true' || (!MEM0_API_KEY && process.argv.includes('--demo'));

// Determine operation mode
let MODE = 'hybrid'; // Default: hybrid (local + cloud)
if (LOCAL_MODE || (!MEM0_API_KEY && !DEMO_MODE)) {
  MODE = 'local'; // Local-first with embedded Redis
} else if (DEMO_MODE) {
  MODE = 'demo'; // Demo mode (in-memory only)
} else if (!process.env.REDIS_URL) {
  MODE = 'local'; // No Redis URL provided, use embedded
}

if (MODE === 'local') {
  console.error('🚀 Running in LOCAL MODE - Using embedded Redis server');
  console.error('   Data is stored locally and persists between sessions');
} else if (MODE === 'demo') {
  console.error('🎮 Running in DEMO MODE - Using in-memory storage only');
} else if (!MEM0_API_KEY) {
  console.error('💡 No Mem0 API key provided - running in local-first mode');
  console.error('   Get a free API key at https://mem0.ai for cloud sync');
}

const MEM0_USER_ID = process.env.MEM0_USER_ID || 'default';
const MEM0_BASE_URL = process.env.MEM0_BASE_URL || 'https://api.mem0.ai';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Cache settings based on best practices
const CACHE_TTL = 86400; // 24 hours for L1 cache
const CACHE_TTL_L2 = 604800; // 7 days for L2 cache (less frequently accessed)
const MAX_CACHE_SIZE = 1000; // Increased cache size
const FREQUENT_ACCESS_THRESHOLD = 3; // Times accessed before promoting to L1
const BATCH_SIZE = 50; // Batch operations for efficiency
const SYNC_INTERVAL = 300000; // 5 minutes background sync
const SEARCH_CACHE_TTL = 300; // 5 minutes for search results cache

// Initialize storage clients
let redisClient;
let pubSubClient;
let subscriberClient;
let localMemory; // Local-first memory instance

// Background job queue
const jobQueue = new Map();
const pendingMemories = new Map();

async function initializeStorage() {
  // If in local mode, use embedded Redis
  if (MODE === 'local' || MODE === 'demo') {
    localMemory = new LocalMemory();
    await localMemory.start();

    // Get Redis connection from embedded server
    redisClient = localMemory.client;
    pubSubClient = localMemory.pubClient;
    subscriberClient = localMemory.subClient;

    console.error('✓ Local memory system initialized with embedded Redis');
    return true;
  }

  // Otherwise, try connecting to external Redis
  try {
    // Main Redis client for cache operations
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: retries => {
          const jitter = Math.floor(Math.random() * 200);
          const delay = Math.min(Math.pow(2, retries) * 50, 2000);
          return delay + jitter;
        }
      }
    });

    // Separate client for pub/sub to avoid blocking
    pubSubClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: retries => Math.min(Math.pow(2, retries) * 50, 2000)
      }
    });

    subscriberClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: retries => Math.min(Math.pow(2, retries) * 50, 2000)
      }
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    pubSubClient.on('error', (err) => console.error('Redis PubSub Error', err));
    subscriberClient.on('error', (err) => console.error('Redis Subscriber Error', err));

    await redisClient.connect();
    await pubSubClient.connect();
    await subscriberClient.connect();

    // Set up pub/sub for cache invalidation and async processing
    await setupPubSub();

    console.error('✓ Redis connected successfully with pub/sub');

    // Start background sync worker
    startBackgroundSync();

    return true;
  } catch (error) {
    console.error('✗ Redis connection failed:', error.message);
    console.error('Falling back to mem0-only mode');
    redisClient = null;
    pubSubClient = null;
    subscriberClient = null;
    return false;
  }
}

// Pub/Sub setup for cache invalidation and async processing
async function setupPubSub() {
  if (!subscriberClient) return;

  // Subscribe to cache invalidation channel
  await subscriberClient.subscribe('cache:invalidate', async (message) => {
    try {
      const { memoryId, operation } = JSON.parse(message);
      console.error(`Cache invalidation: ${operation} for ${memoryId}`);

      if (operation === 'delete' || operation === 'update') {
        // Invalidate cached memory
        await redisClient.del(`memory:${memoryId}`);
        await redisClient.del(`search:*`); // Clear search cache
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  });

  // Subscribe to async job completion channel
  await subscriberClient.subscribe('job:complete', async (message) => {
    try {
      const { jobId, result, error } = JSON.parse(message);
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
      console.error('Job completion error:', error);
    }
  });

  // Subscribe to memory processing channel
  await subscriberClient.subscribe('memory:process', async (message) => {
    try {
      const { memoryId, priority } = JSON.parse(message);
      await processMemoryAsync(memoryId, priority);
    } catch (error) {
      console.error('Memory processing error:', error);
    }
  });
}

// Background sync worker for cache warming and updates
function startBackgroundSync() {
  if (!redisClient) return;

  setInterval(async () => {
    try {
      console.error('Running background sync...');

      // 1. Update frequently accessed memories
      const topMemories = await getTopMemories(50);
      for (const memoryId of topMemories) {
        try {
          const endpoint = `/v1/memories/${memoryId}/?user_id=${MEM0_USER_ID}`;
          const freshData = await callMem0API(endpoint, 'GET');
          if (freshData) {
            await setCachedMemory(memoryId, freshData, CACHE_TTL);
          }
        } catch (error) {
          console.error(`Failed to refresh memory ${memoryId}:`, error);
        }
      }

      // 2. Process pending memories from queue
      for (const [memoryId, data] of pendingMemories.entries()) {
        if (Date.now() - data.timestamp > 60000) { // Process after 1 minute
          await processMemoryAsync(memoryId, data.priority);
          pendingMemories.delete(memoryId);
        }
      }

      // 3. Clean up expired search cache
      const searchKeys = await redisClient.keys('search:*');
      for (const key of searchKeys) {
        const ttl = await redisClient.ttl(key);
        if (ttl < 0) {
          await redisClient.del(key);
        }
      }

      console.error('Background sync completed');
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }, SYNC_INTERVAL);
}

// Async memory processing
async function processMemoryAsync(memoryId, priority = 'medium') {
  try {
    // Fetch full memory details from mem0
    const endpoint = `/v1/memories/${memoryId}/?user_id=${MEM0_USER_ID}`;
    const memory = await callMem0API(endpoint, 'GET');

    if (memory) {
      // Determine cache level based on priority and access patterns
      const accessCount = await redisClient.get(`access:${memoryId}`) || 0;
      const ttl = priority === 'high' || accessCount > FREQUENT_ACCESS_THRESHOLD
        ? CACHE_TTL
        : CACHE_TTL_L2;

      // Cache with appropriate TTL
      await setCachedMemory(memoryId, memory, ttl);

      // Index for semantic search (using simple keyword extraction for now)
      await indexMemoryForSearch(memoryId, memory);

      // CRITICAL FIX: Invalidate search cache after async processing completes
      await invalidateSearchCache();
    }
  } catch (error) {
    console.error(`Failed to process memory ${memoryId}:`, error);
  }
}

// Check for duplicate memories based on content similarity
async function checkForDuplicate(content, user_id = MEM0_USER_ID) {
  if (!content) return null;

  try {
    // Search for similar memories
    const searchResponse = await callMem0API('/v1/memories/search/', 'POST', {
      query: content.substring(0, 100), // Use first 100 chars for search
      user_id: user_id,
      limit: 5
    });

    const results = searchResponse.results || [];

    // Check for exact or very similar matches
    for (const result of results) {
      if (result.memory) {
        // Calculate simple similarity (could be improved with better algorithm)
        const similarity = calculateSimilarity(content.toLowerCase(), result.memory.toLowerCase());
        if (similarity > 0.85) { // 85% similarity threshold
          return {
            isDuplicate: true,
            existingId: result.id,
            existingMemory: result.memory,
            similarity: similarity
          };
        }
      }
    }
  } catch (error) {
    console.error('Duplicate check failed:', error);
  }

  return null;
}

// Simple similarity calculation (Jaccard similarity)
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// Invalidate all search cache entries
async function invalidateSearchCache() {
  if (!redisClient) return;

  try {
    // Find all search cache keys
    const searchKeys = await redisClient.keys('search:*');

    if (searchKeys.length > 0) {
      // Delete all search cache entries
      await redisClient.del(searchKeys);
      console.error(`✓ Invalidated ${searchKeys.length} search cache entries after memory update`);
    }
  } catch (error) {
    console.error('Failed to invalidate search cache:', error);
  }
}

// Simple keyword indexing for better search (can be replaced with vector embeddings)
async function indexMemoryForSearch(memoryId, memory) {
  if (!redisClient || !memory.memory) return;

  try {
    // Extract keywords (simple tokenization - can be improved with NLP)
    const text = memory.memory.toLowerCase();
    const keywords = text
      .split(/\W+/)
      .filter(word => word.length > 3)
      .slice(0, 20); // Top 20 keywords

    // Store in Redis sets for each keyword
    for (const keyword of keywords) {
      await redisClient.sAdd(`keyword:${keyword}`, memoryId);
      await redisClient.expire(`keyword:${keyword}`, CACHE_TTL);
    }

    // Store reverse index
    await redisClient.sAdd(`memory:keywords:${memoryId}`, ...keywords);
    await redisClient.expire(`memory:keywords:${memoryId}`, CACHE_TTL);
  } catch (error) {
    console.error('Indexing error:', error);
  }
}

// Improved search with keyword matching and hybrid strategy
async function smartSearch(query, limit = 10, preferCache = true) {
  const searchCacheKey = `search:${crypto.createHash('md5').update(query).digest('hex')}:${limit}`;

  // Check search results cache first
  if (redisClient && preferCache) {
    try {
      const cachedResults = await redisClient.get(searchCacheKey);
      if (cachedResults) {
        console.error('Returning cached search results');
        return JSON.parse(cachedResults);
      }
    } catch (error) {
      console.error('Search cache check failed:', error);
    }
  }

  // Determine search strategy based on preferCache
  let results = [];

  if (preferCache && redisClient) {
    // Try cache-first approach with keyword matching
    results = await searchFromCache(query, limit);

    // If not enough results, fallback to mem0
    if (results.length < limit) {
      const mem0Results = await searchFromMem0(query, limit - results.length);
      results = [...results, ...mem0Results];
    }
  } else {
    // Cloud-first approach (prefer_cache = false)
    results = await searchFromMem0(query, limit);

    // Cache the results for next time
    if (redisClient && results.length > 0) {
      for (const memory of results) {
        if (memory.id && memory.source === 'mem0_cloud') {
          await setCachedMemory(memory.id, memory);
        }
      }
    }
  }

  // Cache search results
  if (redisClient && results.length > 0) {
    try {
      await redisClient.setEx(searchCacheKey, SEARCH_CACHE_TTL, JSON.stringify(results));
    } catch (error) {
      console.error('Failed to cache search results:', error);
    }
  }

  return results.slice(0, limit);
}

// Search from cache using keyword matching
async function searchFromCache(query, limit) {
  if (!redisClient) return [];

  try {
    const queryKeywords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const memoryScores = new Map();

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
    const results = [];
    for (const memoryId of sortedMemoryIds) {
      const cached = await getCachedMemory(memoryId);
      if (cached) {
        results.push({ ...cached, source: 'redis_cache', relevance_score: memoryScores.get(memoryId) });
      }
    }

    return results;
  } catch (error) {
    console.error('Cache search error:', error);
    return [];
  }
}

// Search from mem0 cloud
async function searchFromMem0(query, limit) {
  try {
    const endpoint = `/v1/memories/?user_id=${MEM0_USER_ID}&query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await callMem0API(endpoint, 'GET');

    // Extract memories array from response (mem0 returns {results: [...]} or just array)
    let mem0Results = Array.isArray(response) ? response : (response.results || response.memories || []);

    // Ensure limit is respected
    if (mem0Results.length > limit) {
      mem0Results = mem0Results.slice(0, limit);
    }

    return mem0Results.map(m => ({ ...m, source: 'mem0_cloud' }));
  } catch (error) {
    console.error('Mem0 search failed:', error);
    return [];
  }
}

// Logging
console.error('Mem0-Redis Hybrid MCP Server starting...');
console.error(`User ID: ${MEM0_USER_ID}`);
console.error(`API Base: ${MEM0_BASE_URL}`);
console.error(`Redis: ${REDIS_URL}`);

const server = new Server(
  {
    name: 'mem0-redis-hybrid',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Demo mode in-memory storage
const demoStorage = {
  memories: new Map(),
  idCounter: 1
};

// Helper function for mem0 API calls
async function callMem0API(endpoint, method = 'GET', body = null) {
  // Demo mode: simulate API with local storage
  if (DEMO_MODE) {
    return simulateMem0API(endpoint, method, body);
  }

  const url = `${MEM0_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Token ${MEM0_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Mem0 API call failed: ${error.message}`);
    throw error;
  }
}

// Simulate Mem0 API for demo mode
function simulateMem0API(endpoint, method, body) {
  const userId = body?.user_id || MEM0_USER_ID;

  // Handle different endpoints
  if (endpoint.includes('/memories/') && method === 'POST') {
    // Add memory
    const id = `demo-${demoStorage.idCounter++}`;
    const memory = {
      id,
      memory: body.messages ? body.messages.map(m => m.content).join(' ') : body.content,
      metadata: body.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId
    };
    demoStorage.memories.set(id, memory);
    return { id, message: 'Memory added successfully (demo mode)' };
  }

  if (endpoint.includes('/memories/search/') && method === 'POST') {
    // Search memories
    const query = body.query.toLowerCase();
    const results = Array.from(demoStorage.memories.values())
      .filter(m => m.user_id === userId && m.memory.toLowerCase().includes(query))
      .map(m => ({ ...m, score: Math.random() }))
      .sort((a, b) => b.score - a.score)
      .slice(0, body.limit || 10);
    return { results };
  }

  if (endpoint.includes('/memories/') && method === 'GET') {
    // Get all memories
    const memories = Array.from(demoStorage.memories.values())
      .filter(m => m.user_id === userId);
    return { memories };
  }

  if (endpoint.includes('/memories/') && method === 'DELETE') {
    // Delete memory
    const memoryId = endpoint.split('/').pop();
    demoStorage.memories.delete(memoryId);
    return { message: 'Memory deleted successfully (demo mode)' };
  }

  return { message: 'Demo mode - operation simulated' };
}

// Redis cache helpers
async function getCachedMemory(key) {
  if (!redisClient) return null;

  try {
    const cached = await redisClient.get(`memory:${key}`);
    if (cached) {
      // Track access for cache optimization
      await redisClient.incr(`access:${key}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Redis get error:', error);
  }
  return null;
}

async function setCachedMemory(key, data, ttl = CACHE_TTL) {
  if (!redisClient) return;

  try {
    await redisClient.setEx(`memory:${key}`, ttl, JSON.stringify(data));
    await redisClient.incr(`access:${key}`);

    // Index for search
    await indexMemoryForSearch(key, data);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

async function getTopMemories(limit = 50) {
  if (!redisClient) return [];

  try {
    const keys = await redisClient.keys('memory:*');
    const accessPromises = keys.map(async (key) => {
      const memoryKey = key.replace('memory:', '');
      const accessCount = await redisClient.get(`access:${memoryKey}`) || 0;
      return { key: memoryKey, access: parseInt(accessCount) };
    });

    const accessData = await Promise.all(accessPromises);
    return accessData
      .sort((a, b) => b.access - a.access)
      .slice(0, limit)
      .map(item => item.key);
  } catch (error) {
    console.error('Redis top memories error:', error);
    return [];
  }
}

// Cache invalidation helper
async function invalidateCache(memoryId, operation = 'update') {
  if (!pubSubClient) return;

  try {
    await pubSubClient.publish('cache:invalidate', JSON.stringify({
      memoryId,
      operation,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Cache invalidation publish error:', error);
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'Add memory with async processing and intelligent caching. Returns immediately while processing in background.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' }
                },
                required: ['role', 'content']
              },
              description: 'Array of message objects (alternative to content)'
            },
            content: {
              type: 'string',
              description: 'Direct memory content (alternative to messages)'
            },
            user_id: {
              type: 'string',
              default: MEM0_USER_ID
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata'
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              default: 'medium',
              description: 'Processing priority (high = immediate cache)'
            },
            async: {
              type: 'boolean',
              default: true,
              description: 'Process asynchronously for better performance'
            },
            skip_duplicate_check: {
              type: 'boolean',
              default: false,
              description: 'Skip duplicate detection (use with caution)'
            }
          }
        }
      },
      {
        name: 'search_memory',
        description: 'Hybrid search with intelligent cache/cloud routing and relevance scoring',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            user_id: {
              type: 'string',
              default: MEM0_USER_ID
            },
            limit: {
              type: 'number',
              default: 10
            },
            prefer_cache: {
              type: 'boolean',
              default: true,
              description: 'true = cache-first with fallback, false = cloud-first with caching'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_all_memories',
        description: 'Get all memories with hybrid cloud/cache intelligence and pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              default: MEM0_USER_ID
            },
            limit: {
              type: 'number',
              default: 100,
              description: 'Number of memories to return (max 500)'
            },
            offset: {
              type: 'number',
              default: 0,
              description: 'Number of memories to skip for pagination'
            },
            include_cache_stats: {
              type: 'boolean',
              default: true,
              description: 'Include Redis cache statistics'
            },
            prefer_cache: {
              type: 'boolean',
              default: true,
              description: 'Use cached memories first to avoid slow API calls'
            }
          }
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete memory with automatic cache invalidation',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'ID of memory to delete'
            }
          },
          required: ['memory_id']
        }
      },
      {
        name: 'deduplicate_memories',
        description: 'Find and merge duplicate memories',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              default: MEM0_USER_ID
            },
            similarity_threshold: {
              type: 'number',
              default: 0.85,
              description: 'Similarity threshold for duplicate detection (0-1)'
            },
            dry_run: {
              type: 'boolean',
              default: true,
              description: 'Preview duplicates without deleting'
            }
          }
        }
      },
      {
        name: 'optimize_cache',
        description: 'Optimize cache with intelligent memory promotion and cleanup',
        inputSchema: {
          type: 'object',
          properties: {
            force_refresh: {
              type: 'boolean',
              default: false,
              description: 'Force refresh all memories from cloud'
            },
            max_memories: {
              type: 'number',
              default: 1000,
              description: 'Maximum memories to cache'
            }
          }
        }
      },
      {
        name: 'cache_stats',
        description: 'Get detailed cache performance statistics and health metrics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'sync_status',
        description: 'Check background sync and job queue status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_memory': {
        const user_id = args.user_id || MEM0_USER_ID;
        const isAsync = args.async !== false;
        const skipDuplicateCheck = args.skip_duplicate_check || false;

        // Prepare memory for mem0 cloud
        let body = { user_id };
        let contentToCheck = '';

        if (args.messages) {
          body.messages = args.messages;
          // Extract content from messages for duplicate check
          contentToCheck = args.messages.map(m => m.content).join(' ');
        } else if (args.content) {
          contentToCheck = args.content;
          body.messages = [
            { role: 'user', content: args.content },
            { role: 'assistant', content: 'I\'ll remember that.' }
          ];
        }
        if (args.metadata) {
          body.metadata = args.metadata;
        }

        // Check for duplicates unless explicitly skipped
        if (!skipDuplicateCheck && contentToCheck) {
          const duplicateCheck = await checkForDuplicate(contentToCheck, user_id);
          if (duplicateCheck && duplicateCheck.isDuplicate) {
            return {
              content: [
                {
                  type: 'text',
                  text: `⚠️ Duplicate detected (${Math.round(duplicateCheck.similarity * 100)}% similar)\nExisting memory ID: ${duplicateCheck.existingId}\nExisting: "${duplicateCheck.existingMemory.substring(0, 100)}..."\n\nUse skip_duplicate_check: true to force add.`
                }
              ]
            };
          }
        }

        if (isAsync && pubSubClient) {
          // Async processing for better performance
          const jobId = crypto.randomBytes(16).toString('hex');

          // Start async job
          const jobPromise = new Promise((resolve, reject) => {
            jobQueue.set(jobId, { resolve, reject });

            // Add timeout
            setTimeout(() => {
              if (jobQueue.has(jobId)) {
                jobQueue.delete(jobId);
                reject(new Error('Job timeout'));
              }
            }, 30000); // 30 second timeout
          });

          // Send to mem0 in background
          callMem0API('/v1/memories/', 'POST', body)
            .then(async (result) => {
              // Invalidate search caches immediately on new memory
              if (redisClient) {
                try {
                  // Clear all search caches to ensure fresh results
                  const searchKeys = await redisClient.keys('search:*');
                  if (searchKeys.length > 0) {
                    await redisClient.del(...searchKeys);
                  }
                } catch (error) {
                  console.error('Failed to invalidate search cache:', error);
                }
              }

              // Cache high-priority memories immediately
              if (args.priority === 'high' && result.length > 0) {
                for (const memory of result) {
                  if (memory.id) {
                    await setCachedMemory(memory.id, memory, CACHE_TTL);
                    await pubSubClient.publish('memory:process', JSON.stringify({
                      memoryId: memory.id,
                      priority: 'high'
                    }));
                  }
                }
              } else {
                // Queue for background processing but also cache immediately
                for (const memory of result) {
                  if (memory.id) {
                    // Cache ALL memories immediately, regardless of priority
                    await setCachedMemory(memory.id, memory, CACHE_TTL);
                    pendingMemories.set(memory.id, {
                      priority: args.priority || 'medium',
                      timestamp: Date.now()
                    });
                  }
                }
              }

              // Invalidate search cache after async memory addition
              await invalidateSearchCache();

              // Notify job completion
              await pubSubClient.publish('job:complete', JSON.stringify({
                jobId,
                result: result.length
              }));
            })
            .catch(async (error) => {
              await pubSubClient.publish('job:complete', JSON.stringify({
                jobId,
                error: error.message
              }));
            });

          return {
            content: [
              {
                type: 'text',
                text: `✓ Memory queued for async processing (job: ${jobId}). Will be available shortly.`
              }
            ]
          };
        } else {
          // Synchronous fallback
          const result = await callMem0API('/v1/memories/', 'POST', body);

          // Cache if high priority
          if (args.priority === 'high' && result.length > 0 && redisClient) {
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
                type: 'text',
                text: `✓ Added ${result.length} memory item(s) to mem0 cloud${args.priority === 'high' ? ' with immediate caching' : ''}`
              }
            ]
          };
        }
      }

      case 'search_memory': {
        const results = await smartSearch(args.query, args.limit || 10, args.prefer_cache !== false);

        const cacheCount = results.filter(r => r.source === 'redis_cache').length;
        const cloudCount = results.filter(r => r.source === 'mem0_cloud').length;

        // Show relevance scores if available
        const resultsWithScores = results.map(r => {
          if (r.relevance_score) {
            return { ...r, relevance_score: r.relevance_score };
          }
          return r;
        });

        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} results (${cacheCount} from cache, ${cloudCount} from cloud):\n${JSON.stringify(resultsWithScores, null, 2)}`
            }
          ]
        };
      }

      case 'get_all_memories': {
        const user_id = args.user_id || MEM0_USER_ID;
        const limit = Math.min(args.limit || 100, 500); // Cap at 500 to prevent overload
        const offset = args.offset || 0;
        const preferCache = args.prefer_cache !== false;

        let memories = [];
        let source = 'cloud';

        // Try cache-first approach if Redis is available
        if (preferCache && redisClient) {
          try {
            // Get cached memories
            const cacheKeys = await redisClient.keys('memory:*');

            if (cacheKeys.length > 0) {
              // Fetch from cache with pagination support
              const cachedMemories = [];
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
                source = 'cache';
                console.error(`Returning ${memories.length} memories from cache`);
              }
            }
          } catch (error) {
            console.error('Cache fetch failed:', error);
          }
        }

        // Fall back to cloud if no cache or preferCache is false
        if (memories.length === 0) {
          // Get from mem0 cloud (WARNING: API may return ALL memories regardless of limit!)
          const endpoint = `/v1/memories/?user_id=${user_id}&limit=${limit + offset}`;
          let response = await callMem0API(endpoint, 'GET');

          // Extract memories array from response
          let allMemories = Array.isArray(response) ? response : (response.results || response.memories || []);

          // Apply pagination
          memories = allMemories.slice(offset, offset + limit);

          source = 'cloud';
          console.error(`Fetched ${memories.length} memories from cloud (API returned ${Array.isArray(response) ? response.length : 'object'})`);
        }

        let stats = '';
        if (args.include_cache_stats && redisClient) {
          try {
            const cacheKeys = await redisClient.keys('memory:*');
            const accessKeys = await redisClient.keys('access:*');
            const keywordKeys = await redisClient.keys('keyword:*');
            const searchCacheKeys = await redisClient.keys('search:*');

            stats = `\n\nCache Stats:
- ${cacheKeys.length} memories cached
- ${accessKeys.length} access counters
- ${keywordKeys.length} keyword indexes
- ${searchCacheKeys.length} cached searches
- ${pendingMemories.size} pending async operations
- ${jobQueue.size} active jobs`;
          } catch (error) {
            stats = '\nCache stats unavailable';
          }
        }

        // Get total count for pagination info
        let totalCount = memories.length;
        if (redisClient) {
          try {
            const allKeys = await redisClient.keys('memory:*');
            totalCount = allKeys.length;
          } catch (e) {
            // Use current count if cache check fails
          }
        }

        // Optimize response for large datasets
        const response = {
          total: totalCount,
          limit: limit,
          offset: offset,
          returned: memories.length,
          hasMore: offset + memories.length < totalCount,
          source: source,
          memories: memories
        };

        // For very large responses, truncate memory content to prevent token overflow
        const responseSize = JSON.stringify(response).length;
        if (responseSize > 40000) {
          // Truncate long memory content
          response.memories = memories.map(m => {
            const wasTruncated = m.memory && m.memory.length > 100;
            return {
              id: m.id,
              memory: m.memory ? (wasTruncated ? m.memory.substring(0, 100) + '...' : m.memory) : '',
              user_id: m.user_id,
              created_at: m.created_at,
              metadata: wasTruncated ? { ...m.metadata, _truncated: true } : m.metadata
            };
          });
          response.truncated = true;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Memories: ${memories.length} (limit: ${limit}, source: ${source})${stats}\n\n${JSON.stringify(response, null, 2)}`
            }
          ]
        };
      }

      case 'delete_memory': {
        const memoryId = args.memory_id;

        // Delete from mem0 cloud
        const endpoint = `/v1/memories/${memoryId}/?user_id=${MEM0_USER_ID}`;
        await callMem0API(endpoint, 'DELETE');

        // Invalidate cache
        await invalidateCache(memoryId, 'delete');

        // Clean up local cache immediately
        if (redisClient) {
          await redisClient.del(`memory:${memoryId}`);
          await redisClient.del(`access:${memoryId}`);
          await redisClient.del(`memory:keywords:${memoryId}`);

          // Remove from keyword indexes
          const keywords = await redisClient.sMembers(`memory:keywords:${memoryId}`);
          for (const keyword of keywords) {
            await redisClient.sRem(`keyword:${keyword}`, memoryId);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `✓ Memory ${memoryId} deleted and cache invalidated`
            }
          ]
        };
      }

      case 'deduplicate_memories': {
        const user_id = args.user_id || MEM0_USER_ID;
        const threshold = args.similarity_threshold || 0.85;
        const isDryRun = args.dry_run !== false;

        // Get all memories for the user
        const endpoint = `/v1/memories/?user_id=${user_id}&limit=1000`;
        const response = await callMem0API(endpoint, 'GET');
        const memories = Array.isArray(response) ? response : (response.results || []);

        const duplicates = [];
        const processed = new Set();

        // Find duplicates
        for (let i = 0; i < memories.length; i++) {
          if (processed.has(memories[i].id)) continue;

          const group = {
            primary: memories[i],
            duplicates: []
          };

          for (let j = i + 1; j < memories.length; j++) {
            if (processed.has(memories[j].id)) continue;

            const similarity = calculateSimilarity(
              memories[i].memory?.toLowerCase() || '',
              memories[j].memory?.toLowerCase() || ''
            );

            if (similarity >= threshold) {
              group.duplicates.push({
                ...memories[j],
                similarity: Math.round(similarity * 100)
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
                await callMem0API(`/v1/memories/${dup.id}/?user_id=${user_id}`, 'DELETE');
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

        const summary = duplicates.map(g => ({
          primary: {
            id: g.primary.id,
            content: g.primary.memory?.substring(0, 100) + '...'
          },
          duplicates: g.duplicates.map(d => ({
            id: d.id,
            similarity: d.similarity + '%',
            content: d.memory?.substring(0, 100) + '...'
          }))
        }));

        return {
          content: [
            {
              type: 'text',
              text: isDryRun
                ? `Found ${duplicates.length} groups of duplicates (${duplicates.reduce((sum, g) => sum + g.duplicates.length, 0)} total duplicates)\n\n${JSON.stringify(summary, null, 2)}\n\nRun with dry_run: false to delete duplicates.`
                : `Deleted ${deleteCount} duplicate memories from ${duplicates.length} groups.\n\n${JSON.stringify(summary, null, 2)}`
            }
          ]
        };
      }

      case 'optimize_cache': {
        if (!redisClient) {
          return {
            content: [{ type: 'text', text: 'Redis cache not available' }]
          };
        }

        const maxMemories = args.max_memories || 1000;

        // Get memories to cache
        const endpoint = `/v1/memories/?user_id=${MEM0_USER_ID}&limit=${maxMemories}`;
        const response = await callMem0API(endpoint, 'GET');

        // Extract memories array from response (mem0 returns {results: [...]} or just array)
        let allMemories = Array.isArray(response) ? response : (response.results || response.memories || []);

        // Clear old cache if force refresh
        if (args.force_refresh) {
          const oldKeys = await redisClient.keys('memory:*');
          if (oldKeys.length > 0) {
            await redisClient.del(...oldKeys);
          }
          const oldKeywords = await redisClient.keys('keyword:*');
          if (oldKeywords.length > 0) {
            await redisClient.del(...oldKeywords);
          }
        }

        // Smart caching with priority
        let cached = 0;
        let l1Count = 0;
        let l2Count = 0;

        for (const memory of allMemories) {
          if (memory.id) {
            // Check access patterns
            const accessCount = await redisClient.get(`access:${memory.id}`) || 0;

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
              type: 'text',
              text: `✓ Cache optimized: ${cached} total memories cached\n- L1 (hot): ${l1Count} memories\n- L2 (warm): ${l2Count} memories`
            }
          ]
        };
      }

      case 'cache_stats': {
        if (!redisClient) {
          return {
            content: [{ type: 'text', text: 'Redis cache not available' }]
          };
        }

        try {
          const info = await redisClient.info('memory');
          const cacheKeys = await redisClient.keys('memory:*');
          const accessKeys = await redisClient.keys('access:*');
          const keywordKeys = await redisClient.keys('keyword:*');
          const searchCacheKeys = await redisClient.keys('search:*');

          // Get top accessed memories
          const topMemories = await getTopMemories(10);
          const accessCounts = await Promise.all(
            topMemories.map(async (key) => ({
              key,
              count: await redisClient.get(`access:${key}`) || 0
            }))
          );

          // Calculate cache hit rate (approximate)
          let totalAccess = 0;
          for (const key of accessKeys) {
            const count = await redisClient.get(key);
            totalAccess += parseInt(count) || 0;
          }

          const stats = {
            cached_memories: cacheKeys.length,
            access_counters: accessKeys.length,
            keyword_indexes: keywordKeys.length,
            cached_searches: searchCacheKeys.length,
            total_accesses: totalAccess,
            estimated_hit_rate: cacheKeys.length > 0 ? `${Math.min(100, (totalAccess / cacheKeys.length * 10)).toFixed(1)}%` : '0%',
            redis_memory_usage: info.split('used_memory_human:')[1]?.split('\r\n')[0] || 'unknown',
            pending_jobs: jobQueue.size,
            pending_memories: pendingMemories.size,
            top_accessed: accessCounts
          };

          return {
            content: [
              {
                type: 'text',
                text: `Cache Performance Stats:\n${JSON.stringify(stats, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Cache stats error: ${error.message}`
              }
            ]
          };
        }
      }

      case 'sync_status': {
        const status = {
          redis_connected: !!redisClient,
          pubsub_connected: !!pubSubClient,
          active_jobs: jobQueue.size,
          pending_memories: pendingMemories.size,
          pending_details: Array.from(pendingMemories.entries()).map(([id, data]) => ({
            id,
            priority: data.priority,
            waiting_time: `${Math.round((Date.now() - data.timestamp) / 1000)}s`
          }))
        };

        return {
          content: [
            {
              type: 'text',
              text: `Sync Status:\n${JSON.stringify(status, null, 2)}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  await initializeRedis();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✓ Mem0-Redis Hybrid MCP Server v2.0 running with async processing');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});