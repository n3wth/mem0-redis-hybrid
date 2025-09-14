import crypto from 'crypto';
import fetch from 'node-fetch';
import { EmbeddingCache } from './EmbeddingCache.js';
import { FAISSSearch } from './FAISSSearch.js';
import { MetricsCollector } from './MetricsCollector.js';

/**
 * Core Vector Embedding Service
 * Orchestrates embedding generation, caching, and semantic search
 */
export class VectorEmbeddingService {
  constructor(embeddingCache, faissSearch, metricsCollector, config) {
    this.cache = embeddingCache;
    this.faiss = faissSearch;
    this.metrics = metricsCollector;
    this.config = config;
    
    this.initialized = false;
    this.currentProvider = 'openai';
    this.localModel = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize FAISS search
      await this.faiss.initialize();
      
      // Load local model if configured
      if (this.config.embedding.providers.local) {
        await this.loadLocalModel();
      }

      this.initialized = true;
      console.log('VectorEmbeddingService initialized');
    } catch (error) {
      console.error('Failed to initialize VectorEmbeddingService:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(options) {
    const startTime = Date.now();
    
    try {
      const {
        text,
        provider = this.currentProvider,
        metadata = {}
      } = options;

      // Validate input
      this.validateTextInput(text);

      // Check cache first
      const cacheKey = this.generateCacheKey(text, provider);
      let embedding = await this.cache.getEmbedding(cacheKey);
      
      if (embedding) {
        this.metrics.recordOperation('generate_embedding', Date.now() - startTime, true);
        return embedding;
      }

      // Generate new embedding
      const vector = await this.generateVector(text, provider);
      
      // Create embedding object
      embedding = {
        id: crypto.randomUUID(),
        text: text.trim(),
        vector,
        provider,
        dimensions: vector.length,
        metadata,
        createdAt: new Date().toISOString(),
        magnitude: this.calculateMagnitude(vector)
      };

      // Cache the embedding
      await this.cache.setEmbedding(cacheKey, embedding);
      
      // Add to FAISS index
      await this.faiss.addEmbedding(embedding);

      this.metrics.recordOperation('generate_embedding', Date.now() - startTime, true);
      return embedding;
    } catch (error) {
      this.metrics.recordOperation('generate_embedding', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Batch generate embeddings
   */
  async batchGenerateEmbeddings(options) {
    const startTime = Date.now();
    
    try {
      const {
        texts,
        provider = this.currentProvider,
        metadata = {},
        batchSize = 10
      } = options;

      // Validate input
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Texts array is required and must not be empty');
      }

      const results = [];
      const errors = [];

      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        try {
          const batchResults = await Promise.all(
            batch.map(text => this.generateEmbedding({ text, provider, metadata }))
          );
          results.push(...batchResults);
        } catch (error) {
          errors.push({ batch: i, error: error.message });
        }
      }

      this.metrics.recordOperation('batch_generate_embeddings', Date.now() - startTime, errors.length === 0);
      
      return {
        success: errors.length === 0,
        generated: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      this.metrics.recordOperation('batch_generate_embeddings', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get embedding by ID
   */
  async getEmbedding(id) {
    const startTime = Date.now();
    
    try {
      const embedding = await this.cache.getEmbeddingById(id);
      this.metrics.recordOperation('get_embedding', Date.now() - startTime, !!embedding);
      return embedding;
    } catch (error) {
      this.metrics.recordOperation('get_embedding', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Perform semantic search
   */
  async semanticSearch(options) {
    const startTime = Date.now();
    
    try {
      const {
        query,
        limit = 10,
        threshold = 0.7,
        includeMetadata = true,
        provider = this.currentProvider
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding({
        text: query,
        provider,
        metadata: { type: 'search_query' }
      });

      // Search for similar embeddings
      const results = await this.faiss.searchSimilar(
        queryEmbedding.vector,
        limit,
        threshold
      );

      // Enhance results with metadata
      const enhancedResults = await Promise.all(
        results.map(async (result) => {
          const embedding = await this.getEmbedding(result.id);
          return {
            ...result,
            embedding: includeMetadata ? embedding : {
              id: embedding.id,
              text: embedding.text,
              provider: embedding.provider,
              createdAt: embedding.createdAt
            }
          };
        })
      );

      this.metrics.recordOperation('semantic_search', Date.now() - startTime, true);
      
      return {
        query,
        results: enhancedResults,
        totalFound: results.length,
        searchTime: Date.now() - startTime,
        queryEmbedding: {
          id: queryEmbedding.id,
          dimensions: queryEmbedding.dimensions,
          provider: queryEmbedding.provider
        }
      };
    } catch (error) {
      this.metrics.recordOperation('semantic_search', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Find similar embeddings
   */
  async findSimilarEmbeddings(options) {
    const startTime = Date.now();
    
    try {
      const {
        embeddingId,
        limit = 10,
        threshold = 0.7,
        includeMetadata = true
      } = options;

      const embedding = await this.getEmbedding(embeddingId);
      if (!embedding) {
        throw new Error(`Embedding ${embeddingId} not found`);
      }

      const results = await this.faiss.searchSimilar(
        embedding.vector,
        limit + 1, // +1 to exclude the source embedding
        threshold
      );

      // Filter out the source embedding
      const filteredResults = results.filter(r => r.id !== embeddingId);

      // Enhance results
      const enhancedResults = await Promise.all(
        filteredResults.map(async (result) => {
          const resultEmbedding = await this.getEmbedding(result.id);
          return {
            ...result,
            embedding: includeMetadata ? resultEmbedding : {
              id: resultEmbedding.id,
              text: resultEmbedding.text,
              provider: resultEmbedding.provider,
              createdAt: resultEmbedding.createdAt
            }
          };
        })
      );

      this.metrics.recordOperation('find_similar_embeddings', Date.now() - startTime, true);
      
      return {
        sourceEmbedding: {
          id: embedding.id,
          text: embedding.text,
          provider: embedding.provider
        },
        results: enhancedResults,
        totalFound: filteredResults.length
      };
    } catch (error) {
      this.metrics.recordOperation('find_similar_embeddings', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Find nearest neighbors
   */
  async findNearestNeighbors(options) {
    const startTime = Date.now();
    
    try {
      const {
        embeddingId,
        limit = 10,
        threshold = 0.7
      } = options;

      const embedding = await this.getEmbedding(embeddingId);
      if (!embedding) {
        throw new Error(`Embedding ${embeddingId} not found`);
      }

      const results = await this.faiss.findNearestNeighbors(
        embedding.vector,
        limit,
        threshold
      );

      this.metrics.recordOperation('find_nearest_neighbors', Date.now() - startTime, true);
      
      return {
        sourceEmbedding: {
          id: embedding.id,
          text: embedding.text,
          provider: embedding.provider
        },
        neighbors: results,
        totalFound: results.length
      };
    } catch (error) {
      this.metrics.recordOperation('find_nearest_neighbors', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Cluster embeddings
   */
  async clusterEmbeddings(options) {
    const startTime = Date.now();
    
    try {
      const {
        embeddingIds,
        algorithm = 'kmeans',
        numClusters = 5,
        minClusterSize = 3
      } = options;

      // Get embeddings
      const embeddings = await Promise.all(
        embeddingIds.map(id => this.getEmbedding(id))
      );

      const validEmbeddings = embeddings.filter(e => e !== null);
      if (validEmbeddings.length === 0) {
        throw new Error('No valid embeddings found');
      }

      // Perform clustering
      const clusters = await this.faiss.clusterEmbeddings(
        validEmbeddings,
        algorithm,
        numClusters,
        minClusterSize
      );

      this.metrics.recordOperation('cluster_embeddings', Date.now() - startTime, true);
      
      return {
        algorithm,
        numClusters: clusters.length,
        totalEmbeddings: validEmbeddings.length,
        clusters: clusters.map(cluster => ({
          id: crypto.randomUUID(),
          centroid: cluster.centroid,
          members: cluster.members,
          size: cluster.members.length,
          cohesion: cluster.cohesion,
          createdAt: new Date().toISOString()
        }))
      };
    } catch (error) {
      this.metrics.recordOperation('cluster_embeddings', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * List clusters
   */
  async listClusters(options = {}) {
    const startTime = Date.now();
    
    try {
      const { limit = 20, page = 1 } = options;
      
      const clusters = await this.faiss.listClusters(limit, page);
      
      this.metrics.recordOperation('list_clusters', Date.now() - startTime, true);
      return clusters;
    } catch (error) {
      this.metrics.recordOperation('list_clusters', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get cluster by ID
   */
  async getCluster(id) {
    const startTime = Date.now();
    
    try {
      const cluster = await this.faiss.getCluster(id);
      this.metrics.recordOperation('get_cluster', Date.now() - startTime, !!cluster);
      return cluster;
    } catch (error) {
      this.metrics.recordOperation('get_cluster', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels() {
    const models = {
      openai: {
        provider: 'openai',
        models: [
          {
            name: 'text-embedding-3-small',
            dimensions: 1536,
            max_tokens: 8191,
            cost_per_1k_tokens: 0.00002
          },
          {
            name: 'text-embedding-3-large',
            dimensions: 3072,
            max_tokens: 8191,
            cost_per_1k_tokens: 0.00013
          },
          {
            name: 'text-embedding-ada-002',
            dimensions: 1536,
            max_tokens: 8191,
            cost_per_1k_tokens: 0.0001
          }
        ]
      },
      local: {
        provider: 'local',
        models: [
          {
            name: 'sentence-transformers/all-MiniLM-L6-v2',
            dimensions: 384,
            max_tokens: 256,
            cost_per_1k_tokens: 0
          },
          {
            name: 'sentence-transformers/all-mpnet-base-v2',
            dimensions: 768,
            max_tokens: 384,
            cost_per_1k_tokens: 0
          }
        ]
      }
    };

    return models;
  }

  /**
   * Switch embedding model
   */
  async switchModel(provider, model = null) {
    try {
      if (!this.config.embedding.providers[provider]) {
        throw new Error(`Provider ${provider} not configured`);
      }

      this.currentProvider = provider;
      
      if (model) {
        this.config.embedding.providers[provider].model = model;
      }

      // Reload local model if switching to local
      if (provider === 'local') {
        await this.loadLocalModel();
      }

      return {
        success: true,
        provider,
        model: this.config.embedding.providers[provider].model,
        message: `Switched to ${provider} provider`
      };
    } catch (error) {
      throw new Error(`Failed to switch model: ${error.message}`);
    }
  }

  /**
   * Get model status
   */
  async getModelStatus() {
    const status = {
      currentProvider: this.currentProvider,
      providers: {}
    };

    // OpenAI status
    if (this.config.embedding.providers.openai?.api_key) {
      status.providers.openai = {
        available: true,
        model: this.config.embedding.providers.openai.model,
        dimensions: this.config.embedding.providers.openai.dimensions,
        rateLimit: this.config.embedding.providers.openai.rate_limit
      };
    } else {
      status.providers.openai = { available: false };
    }

    // Local model status
    if (this.config.embedding.providers.local) {
      status.providers.local = {
        available: !!this.localModel,
        model: this.config.embedding.providers.local.model,
        dimensions: this.config.embedding.providers.local.dimensions,
        device: this.config.embedding.providers.local.device
      };
    } else {
      status.providers.local = { available: false };
    }

    return status;
  }

  /**
   * Warm cache with embeddings
   */
  async warmCache(embeddingIds = null) {
    try {
      if (embeddingIds && Array.isArray(embeddingIds)) {
        // Warm specific embeddings
        for (const id of embeddingIds) {
          await this.getEmbedding(id);
        }
        console.log(`Warmed cache with ${embeddingIds.length} embeddings`);
      } else {
        // Warm with recent embeddings
        const recentEmbeddings = await this.cache.getRecentEmbeddings(100);
        console.log(`Warmed cache with ${recentEmbeddings.length} recent embeddings`);
      }
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    try {
      await this.faiss.shutdown();
      await this.cache.shutdown();
      console.log('VectorEmbeddingService shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  // Helper methods

  async generateVector(text, provider) {
    switch (provider) {
      case 'openai':
        return await this.generateOpenAIEmbedding(text);
      case 'local':
        return await this.generateLocalEmbedding(text);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async generateOpenAIEmbedding(text) {
    const config = this.config.embedding.providers.openai;
    
    if (!config.api_key) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: config.model
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async generateLocalEmbedding(text) {
    if (!this.localModel) {
      throw new Error('Local model not loaded');
    }

    // This would use the loaded Sentence-Transformers model
    // For now, return a placeholder vector
    const dimensions = this.config.embedding.providers.local.dimensions;
    const vector = new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
    return this.normalizeVector(vector);
  }

  async loadLocalModel() {
    try {
      // In production, this would load the actual Sentence-Transformers model
      // For now, just mark as loaded
      this.localModel = {
        name: this.config.embedding.providers.local.model,
        dimensions: this.config.embedding.providers.local.dimensions,
        loaded: true
      };
      console.log(`Local model ${this.localModel.name} loaded`);
    } catch (error) {
      console.error('Failed to load local model:', error);
      this.localModel = null;
    }
  }

  generateCacheKey(text, provider) {
    const hash = crypto.createHash('md5').update(`${text}:${provider}`).digest('hex');
    return `embedding:${hash}`;
  }

  validateTextInput(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }
    
    if (text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    
    if (text.length > 50000) {
      throw new Error('Text too long (max 50,000 characters)');
    }
  }

  calculateMagnitude(vector) {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }

  normalizeVector(vector) {
    const magnitude = this.calculateMagnitude(vector);
    return vector.map(val => val / magnitude);
  }
}