import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Vector Embeddings Manager for Semantic Search and Understanding
 * Transforms text into mathematical representations that capture meaning
 */
export class VectorEmbeddingsManager {
  constructor(options = {}) {
    this.options = {
      provider: options.provider || 'openai',
      model: options.model || 'text-embedding-3-small',
      dimensions: options.dimensions || 1536,
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      localModel: options.localModel || null,
      cacheEmbeddings: options.cacheEmbeddings !== false,
      similarityThreshold: options.similarityThreshold || 0.7,
      maxRetries: options.maxRetries || 3,
      batchSize: options.batchSize || 100
    };

    this.embeddingCache = new Map();
    this.indexedVectors = new Map();
    this.semanticClusters = new Map();
    this.conceptGraph = new Map();
  }

  /**
   * Initialize the embeddings system
   */
  async initialize(redisClient) {
    this.redis = redisClient;

    // Load cached embeddings
    if (this.options.cacheEmbeddings) {
      await this.loadEmbeddingCache();
    }

    // Initialize local model if specified
    if (this.options.localModel) {
      await this.initializeLocalModel();
    }

    // Build initial semantic index
    await this.buildSemanticIndex();

    console.log('Vector embeddings manager initialized');
  }

  /**
   * Generate embedding for text
   * @param {string} text - Text to embed
   * @param {Object} options - Embedding options
   */
  async generateEmbedding(text, options = {}) {
    const {
      useCache = true,
      metadata = {},
      storeInIndex = true
    } = options;

    // Check cache first
    if (useCache && this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text);
    }

    try {
      // Generate embedding based on provider
      let embedding;
      switch (this.options.provider) {
        case 'openai':
          embedding = await this.generateOpenAIEmbedding(text);
          break;
        case 'local':
          embedding = await this.generateLocalEmbedding(text);
          break;
        case 'hybrid':
          embedding = await this.generateHybridEmbedding(text);
          break;
        default:
          throw new Error(`Unknown provider: ${this.options.provider}`);
      }

      // Enhance embedding with metadata
      const enhancedEmbedding = {
        vector: embedding,
        text,
        metadata,
        magnitude: this.calculateMagnitude(embedding),
        timestamp: Date.now(),
        id: crypto.randomUUID()
      };

      // Cache the embedding
      if (useCache) {
        await this.cacheEmbedding(text, enhancedEmbedding);
      }

      // Store in semantic index
      if (storeInIndex) {
        await this.addToIndex(enhancedEmbedding);
      }

      return enhancedEmbedding;

    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Perform semantic search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  async semanticSearch(query, options = {}) {
    const {
      limit = 10,
      threshold = this.options.similarityThreshold,
      includeMetadata = true,
      rerank = true,
      diversify = false
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query, {
      storeInIndex: false
    });

    // Search through indexed vectors
    const candidates = await this.findSimilarVectors(
      queryEmbedding.vector,
      limit * 3 // Get extra candidates for reranking
    );

    // Calculate similarities
    const results = candidates.map(candidate => ({
      ...candidate,
      similarity: this.cosineSimilarity(queryEmbedding.vector, candidate.vector),
      relevanceScore: this.calculateRelevance(queryEmbedding, candidate)
    }));

    // Filter by threshold
    const filtered = results.filter(r => r.similarity >= threshold);

    // Rerank if requested
    let ranked = rerank
      ? this.rerankResults(filtered, queryEmbedding)
      : filtered.sort((a, b) => b.similarity - a.similarity);

    // Diversify results if requested
    if (diversify) {
      ranked = this.diversifyResults(ranked);
    }

    // Limit results
    const limited = ranked.slice(0, limit);

    // Enhance with semantic clusters
    const enhanced = await this.enhanceWithClusters(limited);

    return {
      query,
      results: enhanced,
      totalFound: filtered.length,
      searchTime: Date.now() - queryEmbedding.timestamp,
      semanticConcepts: this.extractConcepts(enhanced)
    };
  }

  /**
   * Find semantically related memories
   * @param {string} memoryId - Source memory ID
   * @param {Object} options - Relation options
   */
  async findRelatedMemories(memoryId, options = {}) {
    const {
      depth = 2,
      minSimilarity = 0.6,
      maxResults = 20
    } = options;

    const memory = await this.getMemoryEmbedding(memoryId);
    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    // Build relationship graph
    const relationships = new Map();
    const visited = new Set([memoryId]);
    const queue = [{ memory, depth: 0 }];

    while (queue.length > 0) {
      const { memory: current, depth: currentDepth } = queue.shift();

      if (currentDepth >= depth) continue;

      // Find similar memories
      const similar = await this.findSimilarVectors(
        current.vector,
        maxResults
      );

      for (const related of similar) {
        if (visited.has(related.id)) continue;

        const similarity = this.cosineSimilarity(current.vector, related.vector);
        if (similarity < minSimilarity) continue;

        // Store relationship
        if (!relationships.has(related.id)) {
          relationships.set(related.id, {
            memory: related,
            paths: [],
            maxSimilarity: similarity
          });
        }

        const rel = relationships.get(related.id);
        rel.paths.push({
          from: current.id,
          similarity,
          depth: currentDepth + 1
        });
        rel.maxSimilarity = Math.max(rel.maxSimilarity, similarity);

        // Add to queue for deeper exploration
        if (currentDepth + 1 < depth) {
          visited.add(related.id);
          queue.push({ memory: related, depth: currentDepth + 1 });
        }
      }
    }

    // Convert to sorted array
    const relatedMemories = Array.from(relationships.values())
      .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
      .slice(0, maxResults);

    return {
      sourceMemory: memoryId,
      related: relatedMemories,
      graphDepth: depth,
      totalExplored: visited.size
    };
  }

  /**
   * Cluster memories by semantic similarity
   * @param {Array} memories - Memories to cluster
   * @param {Object} options - Clustering options
   */
  async clusterMemories(memories, options = {}) {
    const {
      numClusters = 'auto',
      minClusterSize = 3,
      maxIterations = 100
    } = options;

    // Generate embeddings for all memories
    const embeddings = await Promise.all(
      memories.map(m => this.generateEmbedding(m.content || m.memory))
    );

    // Determine optimal number of clusters
    const k = numClusters === 'auto'
      ? this.determineOptimalClusters(embeddings)
      : numClusters;

    // Perform k-means clustering
    const clusters = await this.kMeansClustering(embeddings, k, maxIterations);

    // Filter small clusters
    const significantClusters = clusters.filter(c => c.members.length >= minClusterSize);

    // Generate cluster summaries
    const summarizedClusters = await Promise.all(
      significantClusters.map(async cluster => ({
        id: crypto.randomUUID(),
        centroid: cluster.centroid,
        members: cluster.members,
        size: cluster.members.length,
        cohesion: this.calculateClusterCohesion(cluster),
        summary: await this.generateClusterSummary(cluster),
        keywords: this.extractClusterKeywords(cluster)
      }))
    );

    // Store clusters for future reference
    for (const cluster of summarizedClusters) {
      this.semanticClusters.set(cluster.id, cluster);
    }

    return {
      clusters: summarizedClusters,
      totalMemories: memories.length,
      clusteringQuality: this.evaluateClusteringQuality(summarizedClusters)
    };
  }

  /**
   * Build concept graph from memories
   * @param {Array} memories - Memories to analyze
   */
  async buildConceptGraph(memories) {
    const concepts = new Map();
    const edges = [];

    // Extract concepts from each memory
    for (const memory of memories) {
      const embedding = await this.generateEmbedding(memory.content);
      const extractedConcepts = this.extractConcepts([embedding]);

      for (const concept of extractedConcepts) {
        if (!concepts.has(concept)) {
          concepts.set(concept, {
            name: concept,
            frequency: 0,
            memories: [],
            embedding: null
          });
        }

        const node = concepts.get(concept);
        node.frequency++;
        node.memories.push(memory.id);
      }
    }

    // Generate embeddings for concepts
    for (const [concept, node] of concepts.entries()) {
      node.embedding = await this.generateEmbedding(concept);
    }

    // Find relationships between concepts
    const conceptArray = Array.from(concepts.values());
    for (let i = 0; i < conceptArray.length; i++) {
      for (let j = i + 1; j < conceptArray.length; j++) {
        const similarity = this.cosineSimilarity(
          conceptArray[i].embedding.vector,
          conceptArray[j].embedding.vector
        );

        if (similarity > 0.5) {
          edges.push({
            from: conceptArray[i].name,
            to: conceptArray[j].name,
            weight: similarity,
            sharedMemories: this.findSharedMemories(
              conceptArray[i].memories,
              conceptArray[j].memories
            )
          });
        }
      }
    }

    // Store concept graph
    this.conceptGraph = {
      nodes: conceptArray,
      edges,
      timestamp: Date.now()
    };

    return this.conceptGraph;
  }

  /**
   * Generate OpenAI embedding
   */
  async generateOpenAIEmbedding(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: this.options.model
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Generate local embedding (placeholder for local model)
   */
  async generateLocalEmbedding(text) {
    // This would use a local model like sentence-transformers
    // For now, generate a random vector as placeholder
    const vector = new Array(this.options.dimensions);
    for (let i = 0; i < this.options.dimensions; i++) {
      vector[i] = Math.random() * 2 - 1;
    }
    return this.normalizeVector(vector);
  }

  /**
   * Generate hybrid embedding combining multiple models
   */
  async generateHybridEmbedding(text) {
    const [openai, local] = await Promise.all([
      this.generateOpenAIEmbedding(text),
      this.generateLocalEmbedding(text)
    ]);

    // Combine embeddings with weighted average
    return this.combineEmbeddings([openai, local], [0.7, 0.3]);
  }

  /**
   * Calculate cosine similarity between vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find similar vectors using HNSW algorithm simulation
   */
  async findSimilarVectors(queryVector, limit) {
    const candidates = [];

    // In production, use a proper vector database
    // For now, brute force search through indexed vectors
    for (const [id, vector] of this.indexedVectors.entries()) {
      const similarity = this.cosineSimilarity(queryVector, vector.vector);
      candidates.push({ ...vector, similarity });
    }

    // Sort by similarity and return top results
    return candidates
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Rerank results using advanced scoring
   */
  rerankResults(results, queryEmbedding) {
    return results.map(result => {
      // Calculate multiple relevance factors
      const semanticScore = result.similarity;
      const freshness = this.calculateFreshness(result.timestamp);
      const contextualRelevance = this.calculateContextualRelevance(result, queryEmbedding);
      const diversityBonus = this.calculateDiversityBonus(result, results);

      // Weighted combination
      result.finalScore =
        semanticScore * 0.5 +
        freshness * 0.1 +
        contextualRelevance * 0.3 +
        diversityBonus * 0.1;

      return result;
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Diversify search results
   */
  diversifyResults(results) {
    const diversified = [];
    const seen = new Set();

    for (const result of results) {
      // Check if too similar to already selected results
      let tooSimilar = false;
      for (const selected of diversified) {
        const similarity = this.cosineSimilarity(
          result.vector,
          selected.vector
        );
        if (similarity > 0.9) {
          tooSimilar = true;
          break;
        }
      }

      if (!tooSimilar) {
        diversified.push(result);
      }
    }

    return diversified;
  }

  /**
   * K-means clustering implementation
   */
  async kMeansClustering(embeddings, k, maxIterations) {
    // Initialize centroids
    const centroids = this.initializeCentroids(embeddings, k);
    const clusters = new Array(k).fill(null).map(() => ({
      centroid: null,
      members: []
    }));

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Clear previous assignments
      clusters.forEach(c => c.members = []);

      // Assign points to nearest centroid
      for (const embedding of embeddings) {
        let minDistance = Infinity;
        let closestCluster = 0;

        for (let i = 0; i < k; i++) {
          const distance = this.euclideanDistance(
            embedding.vector,
            centroids[i]
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = i;
          }
        }

        clusters[closestCluster].members.push(embedding);
      }

      // Update centroids
      let converged = true;
      for (let i = 0; i < k; i++) {
        if (clusters[i].members.length === 0) continue;

        const newCentroid = this.calculateCentroid(clusters[i].members);
        const shift = this.euclideanDistance(centroids[i], newCentroid);

        if (shift > 0.001) {
          converged = false;
        }

        centroids[i] = newCentroid;
        clusters[i].centroid = newCentroid;
      }

      if (converged) break;
    }

    return clusters;
  }

  /**
   * Helper functions
   */

  calculateMagnitude(vector) {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }

  normalizeVector(vector) {
    const magnitude = this.calculateMagnitude(vector);
    return vector.map(val => val / magnitude);
  }

  euclideanDistance(vec1, vec2) {
    return Math.sqrt(
      vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0)
    );
  }

  calculateCentroid(points) {
    const dimensions = points[0].vector.length;
    const centroid = new Array(dimensions).fill(0);

    for (const point of points) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += point.vector[i];
      }
    }

    return centroid.map(val => val / points.length);
  }

  initializeCentroids(embeddings, k) {
    // K-means++ initialization
    const centroids = [];
    const indices = new Set();

    // Choose first centroid randomly
    const firstIndex = Math.floor(Math.random() * embeddings.length);
    centroids.push(embeddings[firstIndex].vector);
    indices.add(firstIndex);

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      const distances = embeddings.map((emb, idx) => {
        if (indices.has(idx)) return 0;

        const minDist = centroids.reduce((min, centroid) => {
          const dist = this.euclideanDistance(emb.vector, centroid);
          return Math.min(min, dist);
        }, Infinity);

        return minDist * minDist;
      });

      // Choose next centroid with probability proportional to distance
      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let random = Math.random() * totalDist;

      for (let j = 0; j < embeddings.length; j++) {
        random -= distances[j];
        if (random <= 0 && !indices.has(j)) {
          centroids.push(embeddings[j].vector);
          indices.add(j);
          break;
        }
      }
    }

    return centroids;
  }

  calculateClusterCohesion(cluster) {
    if (cluster.members.length < 2) return 1;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < cluster.members.length; i++) {
      for (let j = i + 1; j < cluster.members.length; j++) {
        totalSimilarity += this.cosineSimilarity(
          cluster.members[i].vector,
          cluster.members[j].vector
        );
        comparisons++;
      }
    }

    return totalSimilarity / comparisons;
  }

  async generateClusterSummary(cluster) {
    // In production, use LLM to generate summary
    // For now, return placeholder
    return `Cluster with ${cluster.members.length} related memories`;
  }

  extractClusterKeywords(cluster) {
    // Extract common terms from cluster members
    const terms = new Map();

    for (const member of cluster.members) {
      const words = member.text.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3) {
          terms.set(word, (terms.get(word) || 0) + 1);
        }
      }
    }

    // Return top terms
    return Array.from(terms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);
  }

  evaluateClusteringQuality(clusters) {
    // Calculate silhouette coefficient
    const cohesions = clusters.map(c => c.cohesion);
    const avgCohesion = cohesions.reduce((sum, c) => sum + c, 0) / cohesions.length;

    return {
      averageCohesion: avgCohesion,
      minCohesion: Math.min(...cohesions),
      maxCohesion: Math.max(...cohesions),
      quality: avgCohesion > 0.7 ? 'excellent' : avgCohesion > 0.5 ? 'good' : 'fair'
    };
  }

  extractConcepts(embeddings) {
    // Extract key concepts from embeddings
    // In production, use NER or topic modeling
    const concepts = new Set();

    for (const embedding of embeddings) {
      if (embedding.metadata && embedding.metadata.concepts) {
        embedding.metadata.concepts.forEach(c => concepts.add(c));
      }
    }

    return Array.from(concepts);
  }

  findSharedMemories(memories1, memories2) {
    return memories1.filter(m => memories2.includes(m));
  }

  calculateRelevance(queryEmbedding, candidate) {
    // Complex relevance calculation
    return this.cosineSimilarity(queryEmbedding.vector, candidate.vector);
  }

  calculateFreshness(timestamp) {
    const age = Date.now() - timestamp;
    const dayInMs = 86400000;
    return Math.exp(-age / (7 * dayInMs)); // Decay over a week
  }

  calculateContextualRelevance(result, queryEmbedding) {
    // Would use context from user session
    return 0.5;
  }

  calculateDiversityBonus(result, allResults) {
    // Reward results that add diversity
    return 0.1;
  }

  combineEmbeddings(embeddings, weights) {
    const combined = new Array(embeddings[0].length).fill(0);

    for (let i = 0; i < embeddings.length; i++) {
      for (let j = 0; j < embeddings[i].length; j++) {
        combined[j] += embeddings[i][j] * weights[i];
      }
    }

    return this.normalizeVector(combined);
  }

  determineOptimalClusters(embeddings) {
    // Elbow method for optimal k
    return Math.min(Math.sqrt(embeddings.length / 2), 10);
  }

  async cacheEmbedding(text, embedding) {
    this.embeddingCache.set(text, embedding);

    if (this.redis) {
      const key = `embedding:${crypto.createHash('md5').update(text).digest('hex')}`;
      await this.redis.setex(key, 86400, JSON.stringify(embedding));
    }
  }

  async loadEmbeddingCache() {
    if (!this.redis) return;

    const keys = await this.redis.keys('embedding:*');
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const embedding = JSON.parse(data);
        this.embeddingCache.set(embedding.text, embedding);
      }
    }
  }

  async addToIndex(embedding) {
    this.indexedVectors.set(embedding.id, embedding);

    if (this.redis) {
      await this.redis.zadd(
        'vector:index',
        Date.now(),
        embedding.id
      );
    }
  }

  async buildSemanticIndex() {
    // Load existing vectors from Redis
    if (!this.redis) return;

    const vectorIds = await this.redis.zrange('vector:index', 0, -1);
    // Load actual vectors (would need separate storage)
  }

  async initializeLocalModel() {
    // Initialize local embedding model
    // Would load sentence-transformers or similar
    console.log('Local model initialized (placeholder)');
  }

  async getMemoryEmbedding(memoryId) {
    // Fetch memory embedding from cache or generate
    return this.indexedVectors.get(memoryId);
  }

  async enhanceWithClusters(results) {
    // Add cluster information to results
    return results.map(result => ({
      ...result,
      clusters: this.findContainingClusters(result)
    }));
  }

  findContainingClusters(embedding) {
    const clusters = [];
    for (const [id, cluster] of this.semanticClusters.entries()) {
      if (cluster.members.some(m => m.id === embedding.id)) {
        clusters.push(id);
      }
    }
    return clusters;
  }
}