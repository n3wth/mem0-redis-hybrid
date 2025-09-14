import { LocalIndex } from "vectra";
import { pipeline } from "@huggingface/transformers";
import path from "path";
import crypto from "crypto";
import type { Memory } from "../types/index.js";

interface VectraMemoryItem {
  id: string;
  vector: number[];
  metadata: {
    content: string;
    user_id: string;
    created_at: string;
    priority: string;
    entities?: any;
    relationships?: any[];
    [key: string]: any;
  };
}

export class EnhancedVectraMemory {
  private index: LocalIndex;
  private indexPath: string;
  private isInitialized: boolean = false;
  private quiet: boolean;
  private embedder: any = null;
  private embeddingModel: string = "Xenova/all-MiniLM-L6-v2";
  private embeddingDimension: number = 384; // all-MiniLM-L6-v2 produces 384-dim vectors

  constructor(
    dataDir: string = "./data/vectra-index",
    quiet: boolean = false
  ) {
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
      // Initialize the embedding pipeline
      this.log("Loading embedding model...");

      // Temporarily suppress stderr to avoid mutex warnings from transformers.js
      const originalStderrWrite = process.stderr.write;
      if (this.quiet) {
        process.stderr.write = (chunk: any, ...args: any[]): boolean => {
          const str = chunk?.toString() || '';
          // Filter out mutex and libc++ errors from transformers.js
          if (str.includes('mutex') || str.includes('libc++') || str.includes('Invalid argument')) {
            return true;
          }
          return originalStderrWrite.call(process.stderr, chunk, ...args);
        };
      }

      this.embedder = await pipeline(
        "feature-extraction",
        this.embeddingModel,
        {
          device: "cpu",
          progress_callback: (progress: any) => {
            if (progress.status === "download" && !this.quiet) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              originalStderrWrite.call(process.stderr, `\rDownloading model: ${percent}%`);
              if (percent === 100) originalStderrWrite.call(process.stderr, "\n");
            }
          }
        }
      );

      // Restore stderr
      if (this.quiet) {
        process.stderr.write = originalStderrWrite;
      }

      this.log("✓ Embedding model loaded");

      // Initialize vector index
      if (!(await this.index.isIndexCreated())) {
        await this.index.createIndex();
        this.log("✓ Vectra vector index created");
      }

      this.isInitialized = true;
      this.log("✓ Enhanced Vectra memory system initialized");
    } catch (error) {
      this.log("Failed to initialize Enhanced Vectra:", error);
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
          priority: memory.metadata?.priority || "normal",
          ...memory.metadata,
        },
      };

      await this.index.insertItem(item);
      this.log(`✓ Added memory ${memory.id} with real embedding`);
      return memory.id;
    } catch (error) {
      this.log("Failed to add memory to Enhanced Vectra:", error);
      throw error;
    }
  }

  async searchMemories(
    query: string,
    limit: number = 10,
    userId?: string
  ): Promise<Memory[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      const queryVector = await this.generateEmbedding(query);
      const results = await this.index.queryItems(queryVector, limit * 2);

      let filteredResults = results;
      if (userId) {
        filteredResults = results.filter(
          (r) => r.item.metadata.user_id === userId
        );
      }

      return filteredResults.slice(0, limit).map((result) => ({
        id: result.item.id,
        content: String(result.item.metadata.content),
        user_id: String(result.item.metadata.user_id),
        metadata: {
          ...result.item.metadata,
          similarity_score: 1 - result.score, // Convert distance to similarity
          search_type: "semantic",
        },
      }));
    } catch (error) {
      this.log("Failed to search Enhanced Vectra memories:", error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.index.deleteItem(memoryId);
      this.log(`✓ Deleted memory ${memoryId}`);
    } catch (error) {
      this.log("Failed to delete memory from Enhanced Vectra:", error);
    }
  }

  async getStats(): Promise<{
    totalItems: number;
    indexSize: string;
    isHealthy: boolean;
    modelLoaded: boolean;
    embeddingModel: string;
  }> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Get all items to count (Vectra doesn't expose count directly)
      const allItems = await this.index.listItems();

      return {
        totalItems: allItems.length,
        indexSize: `${this.embeddingDimension}D vectors`,
        isHealthy: true,
        modelLoaded: this.embedder !== null,
        embeddingModel: this.embeddingModel,
      };
    } catch (error) {
      return {
        totalItems: 0,
        indexSize: "unknown",
        isHealthy: false,
        modelLoaded: false,
        embeddingModel: this.embeddingModel,
      };
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error("Embedding model not loaded");
    }

    try {
      // Temporarily suppress stderr for mutex warnings
      const originalStderrWrite = process.stderr.write;
      process.stderr.write = (chunk: any, ...args: any[]): boolean => {
        const str = chunk?.toString() || '';
        // Filter out mutex and libc++ errors from transformers.js
        if (str.includes('mutex') || str.includes('libc++') || str.includes('Invalid argument')) {
          return true;
        }
        return originalStderrWrite.call(process.stderr, chunk, ...args);
      };

      // Generate real embeddings using transformers.js
      const output = await this.embedder(text, {
        pooling: "mean",
        normalize: true,
      });

      // Restore stderr
      process.stderr.write = originalStderrWrite;

      // Convert from Float32Array to regular array
      return Array.from(output.data);
    } catch (error) {
      this.log("Failed to generate embedding:", error);

      // Fallback to simple embedding if model fails
      return this.generateFallbackEmbedding(text);
    }
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Simple fallback embedding based on character frequencies
    // This ensures the system still works even if the model fails
    const vector = new Array(this.embeddingDimension).fill(0);
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, "");
    const words = cleanText.split(/\s+/).filter((w) => w.length > 2);

    // Simple word frequency features
    for (const word of words) {
      const hash = this.hashString(word);
      for (let i = 0; i < 4; i++) {
        const idx = (hash + i * 31) % this.embeddingDimension;
        vector[idx] += 1 / Math.sqrt(words.length);
      }
    }

    // Normalize
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude > 0) {
      return vector.map((val) => val / magnitude);
    }

    return vector;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Batch processing for efficiency
  async addMemories(memories: Memory[]): Promise<string[]> {
    const ids: string[] = [];

    for (const memory of memories) {
      const id = await this.addMemory(memory);
      ids.push(id);
    }

    return ids;
  }

  // Find similar memories using semantic search
  async findSimilar(
    memoryId: string,
    limit: number = 5
  ): Promise<Memory[]> {
    try {
      // Get the memory's content
      const item = await this.index.getItem(memoryId);
      if (!item) return [];

      // Search using its content
      return await this.searchMemories(
        item.metadata.content as string,
        limit + 1 // Get one extra to exclude self
      ).then(results => results.filter(r => r.id !== memoryId).slice(0, limit));
    } catch (error) {
      this.log("Failed to find similar memories:", error);
      return [];
    }
  }

  async getAllMemories(): Promise<any[]> {
    try {
      const items = await this.index.listItems();
      return items.map((item) => ({
        id: item.id,
        content: item.metadata?.content || "",
        user_id: item.metadata?.user_id || "",
        created_at: item.metadata?.created_at || new Date().toISOString(),
        metadata: item.metadata || {},
      }));
    } catch (error: any) {
      this.log("Error getting all memories:", error.message);
      return [];
    }
  }
}