/**
 * PubSub Manager - Centralized pub/sub operations for cache invalidation and async processing
 */

import { RedisManager } from "./redis-manager.js";
import { ErrorHandler, JobQueueError, TimeoutError } from "./errors.js";

export interface CacheInvalidateMessage {
  memoryId: string;
  operation: string;
  timestamp?: number;
}

export interface JobCompleteMessage {
  jobId: string;
  result?: any;
  error?: string;
}

export interface MemoryProcessMessage {
  memoryId: string;
  priority: string;
}

export interface Job {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout?: NodeJS.Timeout;
  createdAt: number;
}

export interface PendingMemory {
  priority: string;
  timestamp: number;
}

export class PubSubManager {
  private redisManager: RedisManager;
  private jobQueue = new Map<string, Job>();
  private pendingMemories = new Map<string, PendingMemory>();
  private handlers = new Map<string, (message: any) => void | Promise<void>>();
  private maxJobQueueSize: number;
  private defaultJobTimeout: number;

  constructor(
    redisManager: RedisManager,
    config?: {
      maxJobQueueSize?: number;
      defaultJobTimeout?: number;
    },
  ) {
    this.redisManager = redisManager;
    this.maxJobQueueSize = config?.maxJobQueueSize || 1000;
    this.defaultJobTimeout = config?.defaultJobTimeout || 30000; // 30 seconds
  }

  // Initialize pub/sub subscriptions
  async initialize(): Promise<void> {
    try {
      // Subscribe to cache invalidation channel
      await this.subscribe("cache:invalidate", async (message: string) => {
        try {
          const data: CacheInvalidateMessage = JSON.parse(message);
          await this.handleCacheInvalidation(data);
        } catch (error) {
          ErrorHandler.logError(error, "Cache invalidation processing");
        }
      });

      // Subscribe to job completion channel
      await this.subscribe("job:complete", async (message: string) => {
        try {
          const data: JobCompleteMessage = JSON.parse(message);
          await this.handleJobCompletion(data);
        } catch (error) {
          ErrorHandler.logError(error, "Job completion processing");
        }
      });

      // Subscribe to memory processing channel
      await this.subscribe("memory:process", async (message: string) => {
        try {
          const data: MemoryProcessMessage = JSON.parse(message);
          const handler = this.handlers.get("memory:process");
          if (handler) {
            await handler(data);
          }
        } catch (error) {
          ErrorHandler.logError(error, "Memory processing");
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to initialize PubSub: ${error.message}`);
    }
  }

  // Subscribe to a channel
  private async subscribe(
    channel: string,
    handler: (message: string) => void | Promise<void>,
  ): Promise<void> {
    await this.redisManager.subscribe(channel, handler);
  }

  // Publish a message to a channel
  async publish(channel: string, data: any): Promise<void> {
    try {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      await this.redisManager.publish(channel, message);
    } catch (error: any) {
      ErrorHandler.logError(error, `Failed to publish to ${channel}`);
    }
  }

  // Handle cache invalidation
  private async handleCacheInvalidation(
    data: CacheInvalidateMessage,
  ): Promise<void> {
    console.error(`Cache invalidation: ${data.operation} for ${data.memoryId}`);

    const handler = this.handlers.get("cache:invalidate");
    if (handler) {
      await handler(data);
    }
  }

  // Handle job completion
  private async handleJobCompletion(data: JobCompleteMessage): Promise<void> {
    const job = this.jobQueue.get(data.jobId);
    if (job) {
      // Clear timeout if exists
      if (job.timeout) {
        clearTimeout(job.timeout);
      }

      // Resolve or reject the job
      if (data.error) {
        job.reject(new JobQueueError(data.jobId, data.error));
      } else {
        job.resolve(data.result);
      }

      // Remove from queue
      this.jobQueue.delete(data.jobId);
    }
  }

  // Register a handler for a specific channel
  registerHandler(
    channel: string,
    handler: (data: any) => void | Promise<void>,
  ): void {
    this.handlers.set(channel, handler);
  }

  // Create an async job with timeout
  createAsyncJob(jobId: string, timeoutMs?: number): Promise<any> {
    // Check queue size limit
    if (this.jobQueue.size >= this.maxJobQueueSize) {
      throw new JobQueueError(
        jobId,
        `Job queue full (max: ${this.maxJobQueueSize})`,
        false,
        { queueSize: this.jobQueue.size },
      );
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.jobQueue.has(jobId)) {
          this.jobQueue.delete(jobId);
          reject(
            new TimeoutError("Job", timeoutMs || this.defaultJobTimeout, {
              jobId,
            }),
          );
        }
      }, timeoutMs || this.defaultJobTimeout);

      this.jobQueue.set(jobId, {
        resolve,
        reject,
        timeout,
        createdAt: Date.now(),
      });
    });
  }

  // Publish cache invalidation
  async invalidateCache(
    memoryId: string,
    operation: string = "update",
  ): Promise<void> {
    await this.publish("cache:invalidate", {
      memoryId,
      operation,
      timestamp: Date.now(),
    } as CacheInvalidateMessage);
  }

  // Publish job completion
  async completeJob(
    jobId: string,
    result?: any,
    error?: string,
  ): Promise<void> {
    await this.publish("job:complete", {
      jobId,
      result,
      error,
    } as JobCompleteMessage);
  }

  // Queue memory for processing
  async queueMemoryProcessing(
    memoryId: string,
    priority: string = "medium",
  ): Promise<void> {
    this.pendingMemories.set(memoryId, {
      priority,
      timestamp: Date.now(),
    });

    await this.publish("memory:process", {
      memoryId,
      priority,
    } as MemoryProcessMessage);
  }

  // Process pending memories (batch operation)
  async processPendingMemories(
    processor: (memoryId: string, priority: string) => Promise<void>,
    maxAge: number = 60000,
  ): Promise<void> {
    const now = Date.now();
    const toProcess: Array<[string, PendingMemory]> = [];

    // Find memories ready to process
    for (const [memoryId, data] of this.pendingMemories.entries()) {
      if (now - data.timestamp > maxAge) {
        toProcess.push([memoryId, data]);
      }
    }

    // Process in parallel with error handling
    await Promise.allSettled(
      toProcess.map(async ([memoryId, data]) => {
        try {
          await processor(memoryId, data.priority);
          this.pendingMemories.delete(memoryId);
        } catch (error) {
          ErrorHandler.logError(error, `Failed to process memory ${memoryId}`);
        }
      }),
    );
  }

  // Get queue statistics
  getQueueStats(): {
    jobQueueSize: number;
    pendingMemoriesSize: number;
    oldestJob: number | null;
    handlers: string[];
  } {
    let oldestJob: number | null = null;

    if (this.jobQueue.size > 0) {
      const now = Date.now();
      for (const job of this.jobQueue.values()) {
        const age = now - job.createdAt;
        if (oldestJob === null || age > oldestJob) {
          oldestJob = age;
        }
      }
    }

    return {
      jobQueueSize: this.jobQueue.size,
      pendingMemoriesSize: this.pendingMemories.size,
      oldestJob,
      handlers: Array.from(this.handlers.keys()),
    };
  }

  // Clean up stale jobs
  cleanupStaleJobs(maxAge: number = 60000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.jobQueue.entries()) {
      if (now - job.createdAt > maxAge) {
        if (job.timeout) {
          clearTimeout(job.timeout);
        }
        job.reject(
          new JobQueueError(jobId, "Job expired", false, {
            age: now - job.createdAt,
          }),
        );
        this.jobQueue.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.error(`Cleaned up ${cleaned} stale jobs`);
    }

    return cleaned;
  }

  // Shutdown and cleanup
  async shutdown(): Promise<void> {
    // Clear all timeouts
    for (const job of this.jobQueue.values()) {
      if (job.timeout) {
        clearTimeout(job.timeout);
      }
    }

    // Reject all pending jobs
    for (const [jobId, job] of this.jobQueue.entries()) {
      job.reject(new JobQueueError(jobId, "PubSub shutting down", false));
    }

    // Clear queues
    this.jobQueue.clear();
    this.pendingMemories.clear();
    this.handlers.clear();
  }
}
