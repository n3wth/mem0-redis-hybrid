import { LocalIndex } from 'vectra';
import path from 'path';
import crypto from 'crypto';
import type { Memory } from '../types/index.js';

interface VectraMemoryItem {
  id: string;
  vector: number[];
  metadata: {
    content: string;
    user_id: string;
    created_at: string;
    priority: string;
    [key: string]: any;
  };
}

export class VectraMemory {
  private index: LocalIndex;
  private indexPath: string;
  private isInitialized: boolean = false;
  private quiet: boolean;

  constructor(dataDir: string = './data/vectra-index', quiet: boolean = false) {
    this.indexPath = path.resolve(dataDir);
    this.index = new LocalIndex(this.indexPath);
    this.quiet = quiet;
  }

  private log(message: string, ...args: any[]) {
    if (!this.quiet) {
      console.error(message, ...args);
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!(await this.index.isIndexCreated())) {
        await this.index.createIndex();
        this.log('✓ Vectra vector index created');
      }
      this.isInitialized = true;
      this.log('✓ Vectra memory system initialized');
    } catch (error) {
      this.log('Failed to initialize Vectra:', error);
      throw error;
    }
  }

  async addMemory(memory: Memory): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    try {
      const vector = await this.generateEmbedding(memory.content);
      const item: VectraMemoryItem = {
        id: memory.id,
        vector,
        metadata: {
          content: memory.content,
          user_id: memory.user_id,
          created_at: new Date().toISOString(),
          priority: memory.metadata?.priority || 'normal',
          ...memory.metadata
        }
      };

      await this.index.insertItem(item);
      return memory.id;
    } catch (error) {
      this.log('Failed to add memory to Vectra:', error);
      throw error;
    }
  }

  async searchMemories(query: string, limit: number = 10, userId?: string): Promise<Memory[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      const queryVector = await this.generateEmbedding(query);
      const results = await this.index.queryItems(queryVector, limit * 2); // Get more to filter by user

      let filteredResults = results;
      if (userId) {
        filteredResults = results.filter(r => r.item.metadata.user_id === userId);
      }

      return filteredResults.slice(0, limit).map(result => ({
        id: result.item.id,
        content: String(result.item.metadata.content),
        user_id: String(result.item.metadata.user_id),
        metadata: {
          ...result.item.metadata,
          similarity_score: 1 - result.score, // Convert distance to similarity
          search_type: 'semantic'
        }
      }));
    } catch (error) {
      this.log('Failed to search Vectra memories:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.index.deleteItem(memoryId);
    } catch (error) {
      this.log('Failed to delete memory from Vectra:', error);
      // Don't throw - memory might not exist in vector index
    }
  }

  async getStats(): Promise<{
    totalItems: number;
    indexSize: string;
    isHealthy: boolean;
  }> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Get basic stats (Vectra doesn't expose detailed stats)
      return {
        totalItems: 0, // Would need to query to get exact count
        indexSize: 'unknown',
        isHealthy: true
      };
    } catch (error) {
      return {
        totalItems: 0,
        indexSize: 'unknown',
        isHealthy: false
      };
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple text-to-vector conversion using character frequency
    // This is a placeholder - in production you'd use a proper embedding model
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = cleanText.split(/\s+/).filter(w => w.length > 2);

    // Create a simple 384-dimensional vector based on word characteristics
    const vector = new Array(384).fill(0);

    for (let i = 0; i < words.length && i < 50; i++) {
      const word = words[i];
      const hash = this.simpleHash(word);

      // Distribute word features across vector dimensions
      for (let j = 0; j < 8; j++) {
        const idx = (hash + j * 47) % 384;
        vector[idx] += 1 / (j + 1); // Diminishing returns for hash variations
      }

      // Add position-based features
      const positionWeight = 1 - (i / Math.max(words.length, 1)) * 0.5;
      const posIdx = (hash % 100) + 200;
      vector[posIdx] += positionWeight;

      // Add length-based features
      const lengthWeight = Math.min(word.length / 10, 1);
      const lengthIdx = (hash % 84) + 300;
      vector[lengthIdx] += lengthWeight;
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export default VectraMemory;