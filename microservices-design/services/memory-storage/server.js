#!/usr/bin/env node

import express from 'express';
import { createClient } from 'redis';
import pg from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { MemoryStorageService } from './src/MemoryStorageService.js';
import { CacheManager } from './src/CacheManager.js';
import { DatabaseManager } from './src/DatabaseManager.js';
import { MetricsCollector } from './src/MetricsCollector.js';
import { HealthChecker } from './src/HealthChecker.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'recall',
    username: process.env.POSTGRES_USER || 'recall_user',
    password: process.env.POSTGRES_PASSWORD || 'password',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idle: parseInt(process.env.DB_POOL_IDLE) || 30000
    }
  },
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      ttl: {
        memory: parseInt(process.env.CACHE_TTL_MEMORY) || 86400,      // 24 hours
        search: parseInt(process.env.CACHE_TTL_SEARCH) || 300,        // 5 minutes
        user_list: parseInt(process.env.CACHE_TTL_USER_LIST) || 3600  // 1 hour
      }
    }
  },
  performance: {
    batch_size: parseInt(process.env.BATCH_SIZE) || 100,
    cache_warming: process.env.CACHE_WARMING !== 'false',
    compression: process.env.COMPRESSION !== 'false',
    compression_threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024
  },
  security: {
    rate_limit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // requests per window
    }
  }
};

// Initialize services
let memoryService;
let cacheManager;
let databaseManager;
let metricsCollector;
let healthChecker;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rate_limit.windowMs,
  max: config.security.rate_limit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    if (metricsCollector) {
      metricsCollector.recordRequest(req.method, req.path, res.statusCode, duration);
    }
  });
  next();
});

// Initialize services
async function initializeServices() {
  try {
    console.log('Initializing Memory Storage Service...');

    // Initialize Redis client
    const redisClient = createClient({
      url: `redis://${config.cache.redis.host}:${config.cache.redis.port}`,
      password: config.cache.redis.password || undefined
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    console.log('Connected to Redis');

    // Initialize PostgreSQL pool
    const pgPool = new pg.Pool(config.database);
    
    // Test database connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Connected to PostgreSQL');

    // Initialize managers
    cacheManager = new CacheManager(redisClient, config.cache);
    databaseManager = new DatabaseManager(pgPool, config.database);
    metricsCollector = new MetricsCollector();
    healthChecker = new HealthChecker(redisClient, pgPool);

    // Initialize main service
    memoryService = new MemoryStorageService(
      databaseManager,
      cacheManager,
      metricsCollector,
      config
    );

    await memoryService.initialize();
    console.log('Memory Storage Service initialized successfully');

  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// API Routes

// Health check endpoints
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.checkReadiness();
    res.status(health.ready ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({ 
      ready: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/detailed', async (req, res) => {
  try {
    const health = await healthChecker.getDetailedHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Memory CRUD operations
app.post('/memories', async (req, res) => {
  try {
    const { content, metadata, userId, priority } = req.body;
    
    if (!content || !userId) {
      return res.status(400).json({ 
        error: 'Content and userId are required' 
      });
    }

    const memory = await memoryService.createMemory({
      content,
      metadata: metadata || {},
      userId,
      priority: priority || 'normal'
    });

    res.status(201).json(memory);
  } catch (error) {
    console.error('Create memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const memory = await memoryService.getMemory(id);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json(memory);
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const memory = await memoryService.updateMemory(id, updates);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json(memory);
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { soft = true } = req.query;
    
    const success = await memoryService.deleteMemory(id, { soft: soft === 'true' });
    
    if (!success) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List memories with pagination and filtering
app.get('/memories', async (req, res) => {
  try {
    const { 
      userId, 
      page = 1, 
      limit = 20, 
      priority, 
      since, 
      until,
      search 
    } = req.query;

    const filters = {
      userId,
      priority,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      search
    };

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100) // Max 100 per page
    };

    const result = await memoryService.listMemories(filters, pagination);
    res.json(result);
  } catch (error) {
    console.error('List memories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch operations
app.post('/memories/batch', async (req, res) => {
  try {
    const { operation, memories, updates, ids } = req.body;
    
    let result;
    switch (operation) {
      case 'create':
        result = await memoryService.batchCreate(memories);
        break;
      case 'update':
        result = await memoryService.batchUpdate(updates);
        break;
      case 'delete':
        result = await memoryService.batchDelete(ids);
        break;
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    res.json(result);
  } catch (error) {
    console.error('Batch operation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search memories
app.post('/memories/search', async (req, res) => {
  try {
    const { query, userId, limit = 10, threshold = 0.7 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await memoryService.searchMemories({
      query,
      userId,
      limit: parseInt(limit),
      threshold: parseFloat(threshold)
    });

    res.json(results);
  } catch (error) {
    console.error('Search memories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Memory relationships
app.post('/memories/:id/relationships', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetMemoryId, relationshipType, strength } = req.body;
    
    const relationship = await memoryService.createRelationship(id, {
      targetMemoryId,
      relationshipType: relationshipType || 'related',
      strength: strength || 1.0
    });

    res.status(201).json(relationship);
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/memories/:id/relationships', async (req, res) => {
  try {
    const { id } = req.params;
    const relationships = await memoryService.getRelationships(id);
    res.json(relationships);
  } catch (error) {
    console.error('Get relationships error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Memory tags
app.post('/memories/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value } = req.body;
    
    const tag = await memoryService.addTag(id, { name, value });
    res.status(201).json(tag);
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/memories/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const tags = await memoryService.getTags(id);
    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Memory versions/history
app.get('/memories/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    
    const versions = await memoryService.getVersions(id, parseInt(limit));
    res.json(versions);
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache management endpoints
app.post('/cache/warm', async (req, res) => {
  try {
    const { userId } = req.body;
    await memoryService.warmCache(userId);
    res.json({ success: true, message: 'Cache warmed successfully' });
  } catch (error) {
    console.error('Cache warm error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/cache/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const count = await cacheManager.invalidatePattern(pattern);
    res.json({ success: true, invalidated: count });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  if (memoryService) {
    await memoryService.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  if (memoryService) {
    await memoryService.shutdown();
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`Memory Storage Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health/ready`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});