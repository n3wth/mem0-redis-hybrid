import crypto from 'crypto';

/**
 * FAISS Vector Search Manager
 * Handles vector similarity search, clustering, and nearest neighbor operations
 */
export class FAISSSearch {
  constructor(config) {
    this.config = config;
    this.index = null;
    this.embeddings = new Map(); // In-memory storage for demo
    this.clusters = new Map();
    this.initialized = false;
    
    this.stats = {
      searches: 0,
      additions: 0,
      clusters: 0,
      avgSearchTime: 0
    };
  }

  /**
   * Initialize FAISS index
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // In production, this would initialize a real FAISS index
      // For now, we'll use in-memory storage with cosine similarity
      this.index = {
        type: this.config.index_type,
        dimension: this.config.dimension,
        size: 0
      };

      this.initialized = true;
      console.log('FAISS index initialized');
    } catch (error) {
      console.error('Failed to initialize FAISS index:', error);
      throw error;
    }
  }

  /**
   * Add embedding to index
   */
  async addEmbedding(embedding) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Store embedding
      this.embeddings.set(embedding.id, {
        id: embedding.id,
        vector: embedding.vector,
        text: embedding.text,
        provider: embedding.provider,
        metadata: embedding.metadata,
        createdAt: embedding.createdAt,
        magnitude: embedding.magnitude
      });

      this.index.size++;
      this.stats.additions++;
      
      return true;
    } catch (error) {
      console.error(`Failed to add embedding ${embedding.id}:`, error);
      return false;
    }
  }

  /**
   * Search for similar embeddings
   */
  async searchSimilar(queryVector, limit = 10, threshold = 0.7) {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const results = [];
      
      // Calculate similarity with all embeddings
      for (const [id, embedding] of this.embeddings.entries()) {
        const similarity = this.cosineSimilarity(queryVector, embedding.vector);
        
        if (similarity >= threshold) {
          results.push({
            id: embedding.id,
            similarity,
            text: embedding.text,
            provider: embedding.provider,
            createdAt: embedding.createdAt
          });
        }
      }

      // Sort by similarity and limit results
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      const duration = Date.now() - startTime;
      this.updateSearchStats(duration);
      
      return sortedResults;
    } catch (error) {
      console.error('Failed to search similar embeddings:', error);
      throw error;
    }
  }

  /**
   * Find nearest neighbors
   */
  async findNearestNeighbors(queryVector, limit = 10, threshold = 0.7) {
    const startTime = Date.now();
    
    try {
      const results = await this.searchSimilar(queryVector, limit, threshold);
      
      const duration = Date.now() - startTime;
      this.updateSearchStats(duration);
      
      return results.map(result => ({
        id: result.id,
        distance: 1 - result.similarity, // Convert similarity to distance
        similarity: result.similarity,
        text: result.text,
        provider: result.provider
      }));
    } catch (error) {
      console.error('Failed to find nearest neighbors:', error);
      throw error;
    }
  }

  /**
   * Cluster embeddings
   */
  async clusterEmbeddings(embeddings, algorithm = 'kmeans', numClusters = 5, minClusterSize = 3) {
    const startTime = Date.now();
    
    try {
      if (embeddings.length < numClusters) {
        throw new Error('Not enough embeddings for clustering');
      }

      let clusters;
      
      switch (algorithm) {
        case 'kmeans':
          clusters = await this.kMeansClustering(embeddings, numClusters);
          break;
        case 'dbscan':
          clusters = await this.dbscanClustering(embeddings, minClusterSize);
          break;
        default:
          throw new Error(`Unknown clustering algorithm: ${algorithm}`);
      }

      // Filter clusters by minimum size
      const validClusters = clusters.filter(cluster => 
        cluster.members.length >= minClusterSize
      );

      // Store clusters
      for (const cluster of validClusters) {
        const clusterId = crypto.randomUUID();
        cluster.id = clusterId;
        cluster.algorithm = algorithm;
        cluster.createdAt = new Date().toISOString();
        cluster.cohesion = this.calculateClusterCohesion(cluster);
        
        this.clusters.set(clusterId, cluster);
      }

      this.stats.clusters += validClusters.length;
      
      return validClusters;
    } catch (error) {
      console.error('Failed to cluster embeddings:', error);
      throw error;
    }
  }

  /**
   * List clusters
   */
  async listClusters(limit = 20, page = 1) {
    try {
      const clusters = Array.from(this.clusters.values());
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        clusters: clusters.slice(startIndex, endIndex),
        pagination: {
          page,
          limit,
          total: clusters.length,
          pages: Math.ceil(clusters.length / limit)
        }
      };
    } catch (error) {
      console.error('Failed to list clusters:', error);
      throw error;
    }
  }

  /**
   * Get cluster by ID
   */
  async getCluster(id) {
    try {
      return this.clusters.get(id) || null;
    } catch (error) {
      console.error(`Failed to get cluster ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove embedding from index
   */
  async removeEmbedding(id) {
    try {
      const removed = this.embeddings.delete(id);
      if (removed) {
        this.index.size--;
      }
      return removed;
    } catch (error) {
      console.error(`Failed to remove embedding ${id}:`, error);
      return false;
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      ...this.stats,
      indexSize: this.index?.size || 0,
      clusterCount: this.clusters.size,
      avgSearchTime: this.stats.avgSearchTime
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return this.initialized && this.index !== null;
    } catch (error) {
      console.error('FAISS health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown FAISS search
   */
  async shutdown() {
    try {
      this.embeddings.clear();
      this.clusters.clear();
      this.index = null;
      this.initialized = false;
      console.log('FAISSSearch shutdown complete');
    } catch (error) {
      console.error('Error during FAISS shutdown:', error);
    }
  }

  // Helper methods

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

  euclideanDistance(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      sum += Math.pow(vec1[i] - vec2[i], 2);
    }

    return Math.sqrt(sum);
  }

  async kMeansClustering(embeddings, k) {
    const vectors = embeddings.map(e => e.vector);
    const dimensions = vectors[0].length;
    
    // Initialize centroids randomly
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * vectors.length);
      centroids.push([...vectors[randomIndex]]);
    }

    const clusters = new Array(k).fill(null).map(() => ({
      centroid: null,
      members: []
    }));

    // K-means iterations
    for (let iteration = 0; iteration < 100; iteration++) {
      // Clear previous assignments
      clusters.forEach(c => c.members = []);

      // Assign points to nearest centroid
      for (let i = 0; i < vectors.length; i++) {
        let minDistance = Infinity;
        let closestCluster = 0;

        for (let j = 0; j < k; j++) {
          const distance = this.euclideanDistance(vectors[i], centroids[j]);
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = j;
          }
        }

        clusters[closestCluster].members.push(embeddings[i]);
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

    return clusters.filter(c => c.members.length > 0);
  }

  async dbscanClustering(embeddings, minClusterSize) {
    const vectors = embeddings.map(e => e.vector);
    const eps = 0.5; // Distance threshold
    const visited = new Set();
    const clusters = [];
    let clusterId = 0;

    for (let i = 0; i < vectors.length; i++) {
      if (visited.has(i)) continue;

      const neighbors = this.findNeighbors(vectors, i, eps);
      
      if (neighbors.length < minClusterSize) {
        continue; // Noise point
      }

      const cluster = {
        id: clusterId++,
        centroid: null,
        members: []
      };

      // Expand cluster
      const queue = [...neighbors];
      while (queue.length > 0) {
        const pointIndex = queue.shift();
        
        if (visited.has(pointIndex)) continue;
        
        visited.add(pointIndex);
        cluster.members.push(embeddings[pointIndex]);

        const pointNeighbors = this.findNeighbors(vectors, pointIndex, eps);
        if (pointNeighbors.length >= minClusterSize) {
          queue.push(...pointNeighbors.filter(n => !visited.has(n)));
        }
      }

      if (cluster.members.length >= minClusterSize) {
        cluster.centroid = this.calculateCentroid(cluster.members);
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  findNeighbors(vectors, pointIndex, eps) {
    const neighbors = [];
    const point = vectors[pointIndex];

    for (let i = 0; i < vectors.length; i++) {
      if (i === pointIndex) continue;
      
      const distance = this.euclideanDistance(point, vectors[i]);
      if (distance <= eps) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  calculateCentroid(embeddings) {
    if (embeddings.length === 0) return null;

    const dimensions = embeddings[0].vector.length;
    const centroid = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding.vector[i];
      }
    }

    return centroid.map(val => val / embeddings.length);
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

  updateSearchStats(duration) {
    this.stats.searches++;
    this.stats.avgSearchTime = 
      (this.stats.avgSearchTime * (this.stats.searches - 1) + duration) / this.stats.searches;
  }
}