#!/usr/bin/env node

import express from 'express';
import { createClient } from 'redis';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { VectorEmbeddingService } from './src/VectorEmbeddingService.js';
import { EmbeddingCache } from './src/EmbeddingCache.js';
import { FAISSSearch } from './src/FAISSSearch.js';
import { MetricsCollector } from './src/MetricsCollector.js';
import { HealthChecker } from './src/HealthChecker.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const config = {
  embedding: {
    providers: {
      openai: {
        api_key: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'text-embedding-3-small',
        dimensions: parseInt(process.env.OPENAI_DIMENSIONS) || 1536,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 8191,
        rate_limit: parseInt(process.env.OPENAI_RATE_LIMIT) || 3000
      },
      local: {
        model: process.env.LOCAL_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: parseInt(process.env.LOCAL_DIMENSIONS) || 384,
        device: process.env.LOCAL_DEVICE || 'cpu',
        batch_size: parseInt(process.env.LOCAL_BATCH_SIZE) || 32
      }
    },
    cache: {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
        ttl: parseInt(process.env.CACHE_TTL) || 86400,
        compression: process.env.CACHE_COMPRESSION !== 'false'
      }
    },
    search: {
      faiss: {
        index_type: process.env.FAISS_INDEX_TYPE || 'IndexFlatIP',
        dimension: parseInt(process.env.FAISS_DIMENSION) || 1536,
        batch_size: parseInt(process.env.FAISS_BATCH_SIZE) || 1000
      }
    },
    clustering: {
      algorithm: process.env.CLUSTERING_ALGORITHM || 'kmeans',
      max_clusters: parseInt(process.env.MAX_CLUSTERS) || 50,
      min_cluster_size: parseInt(process.env.MIN_CLUSTER_SIZE) || 3,
      similarity_threshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7
    }
  }
};

// Initialize services
let embeddingService;
let embeddingCache;
let faissSearch;
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 1000, // requests per window
  message: 'Too many embedding requests, please try again later.',
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
    console.log('Initializing Vector Embedding Service...');

    // Initialize Redis client
    const redisClient = createClient({
      url: `redis://${config.embedding.cache.redis.host}:${config.embedding.cache.redis.port}`,
      password: config.embedding.cache.redis.password || undefined
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    console.log('Connected to Redis');

    // Initialize managers
    embeddingCache = new EmbeddingCache(redisClient, config.embedding.cache);
    faissSearch = new FAISSSearch(config.embedding.search);
    metricsCollector = new MetricsCollector();
    healthChecker = new HealthChecker(redisClient, config);

    // Initialize main service
    embeddingService = new VectorEmbeddingService(
      embeddingCache,
      faissSearch,
      metricsCollector,
      config
    );

    await embeddingService.initialize();
    console.log('Vector Embedding Service initialized successfully');

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

// Embedding generation endpoints
app.post('/embeddings/generate', async (req, res) => {
  try {
    const { text, provider = 'openai', metadata = {} } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string' 
      });
    }

    const embedding = await embeddingService.generateEmbedding({
      text: text.trim(),
      provider,
      metadata
    });

    res.status(201).json(embedding);
  } catch (error) {
    console.error('Generate embedding error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/embeddings/batch', async (req, res) => {
  try {
    const { 
      texts, 
      provider = 'openai', 
      metadata = {},
      batch_size = 10 
    } = req.body;
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ 
        error: 'Texts array is required and must not be empty' 
      });
    }

    const embeddings = await embeddingService.batchGenerateEmbeddings({
      texts: texts.map(t => t.trim()),
      provider,
      metadata,
      batchSize: batch_size
    });

    res.status(201).json(embeddings);
  } catch (error) {
    console.error('Batch generate embeddings error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/embeddings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const embedding = await embeddingService.getEmbedding(id);
    
    if (!embedding) {
      return res.status(404).json({ error: 'Embedding not found' });
    }

    res.json(embedding);
  } catch (error) {
    console.error('Get embedding error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vector search endpoints
app.post('/embeddings/search', async (req, res) => {
  try {
    const { 
      query, 
      limit = 10, 
      threshold = 0.7,
      include_metadata = true,
      provider = 'openai'
    } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Query is required and must be a string' 
      });
    }

    const results = await embeddingService.semanticSearch({
      query: query.trim(),
      limit: parseInt(limit),
      threshold: parseFloat(threshold),
      includeMetadata: include_metadata,
      provider
    });

    res.json(results);
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/embeddings/similar', async (req, res) => {
  try {
    const { 
      embedding_id, 
      limit = 10, 
      threshold = 0.7,
      include_metadata = true 
    } = req.body;
    
    if (!embedding_id) {
      return res.status(400).json({ 
        error: 'embedding_id is required' 
      });
    }

    const results = await embeddingService.findSimilarEmbeddings({
      embeddingId: embedding_id,
      limit: parseInt(limit),
      threshold: parseFloat(threshold),
      includeMetadata: include_metadata
    });

    res.json(results);
  } catch (error) {
    console.error('Find similar embeddings error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/embeddings/nearest/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, threshold = 0.7 } = req.query;
    
    const results = await embeddingService.findNearestNeighbors({
      embeddingId: id,
      limit: parseInt(limit),
      threshold: parseFloat(threshold)
    });

    res.json(results);
  } catch (error) {
    console.error('Find nearest neighbors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clustering endpoints
app.post('/embeddings/cluster', async (req, res) => {
  try {
    const { 
      embedding_ids, 
      algorithm = 'kmeans',
      num_clusters = 5,
      min_cluster_size = 3 
    } = req.body;
    
    if (!Array.isArray(embedding_ids) || embedding_ids.length === 0) {
      return res.status(400).json({ 
        error: 'embedding_ids array is required and must not be empty' 
      });
    }

    const clusters = await embeddingService.clusterEmbeddings({
      embeddingIds: embedding_ids,
      algorithm,
      numClusters: parseInt(num_clusters),
      minClusterSize: parseInt(min_cluster_size)
    });

    res.status(201).json(clusters);
  } catch (error) {
    console.error('Cluster embeddings error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/embeddings/clusters', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    const clusters = await embeddingService.listClusters({
      limit: parseInt(limit),
      page: parseInt(page)
    });

    res.json(clusters);
  } catch (error) {
    console.error('List clusters error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/embeddings/clusters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cluster = await embeddingService.getCluster(id);
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    res.json(cluster);
  } catch (error) {
    console.error('Get cluster error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Model management endpoints
app.get('/embeddings/models', async (req, res) => {
  try {
    const models = await embeddingService.listModels();
    res.json(models);
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/embeddings/models/switch', async (req, res) => {
  try {
    const { provider, model } = req.body;
    
    if (!provider) {
      return res.status(400).json({ 
        error: 'Provider is required' 
      });
    }

    const result = await embeddingService.switchModel(provider, model);
    res.json(result);
  } catch (error) {
    console.error('Switch model error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/embeddings/models/status', async (req, res) => {
  try {
    const status = await embeddingService.getModelStatus();
    res.json(status);
  } catch (error) {
    console.error('Get model status error:', error);
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
    const { embedding_ids } = req.body;
    await embeddingService.warmCache(embedding_ids);
    res.json({ success: true, message: 'Cache warmed successfully' });
  } catch (error) {
    console.error('Cache warm error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/cache/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const count = await embeddingCache.invalidatePattern(pattern);
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
  
  if (embeddingService) {
    await embeddingService.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  if (embeddingService) {
    await embeddingService.shutdown();
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`Vector Embedding Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health/ready`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});