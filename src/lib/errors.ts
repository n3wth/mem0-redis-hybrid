/**
 * Custom error classes for r3call
 * Provides structured error handling with context and recovery strategies
 */

export class R3callError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

export class RedisConnectionError extends R3callError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'REDIS_CONNECTION_ERROR', true, context);
  }
}

export class RedisOperationError extends R3callError {
  constructor(
    operation: string,
    originalError: Error,
    context?: Record<string, any>
  ) {
    super(
      `Redis operation '${operation}' failed: ${originalError.message}`,
      'REDIS_OPERATION_ERROR',
      true,
      { ...context, operation, originalError: originalError.message }
    );
  }
}

export class CacheError extends R3callError {
  constructor(
    operation: string,
    message: string,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(
      `Cache ${operation} failed: ${message}`,
      'CACHE_ERROR',
      retryable,
      { ...context, operation }
    );
  }
}

export class Mem0APIError extends R3callError {
  constructor(
    public readonly statusCode?: number,
    message: string = 'Mem0 API request failed',
    context?: Record<string, any>
  ) {
    super(
      message,
      'MEM0_API_ERROR',
      statusCode ? statusCode >= 500 : true, // 5xx errors are retryable
      { ...context, statusCode }
    );
  }
}

export class DuplicateMemoryError extends R3callError {
  constructor(
    public readonly existingId: string,
    public readonly similarity: number,
    existingMemory?: string
  ) {
    super(
      `Duplicate memory detected (${Math.round(similarity * 100)}% similar)`,
      'DUPLICATE_MEMORY',
      false,
      { existingId, similarity, existingMemory }
    );
  }
}

export class ValidationError extends R3callError {
  constructor(
    field: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(
      `Validation failed for '${field}': ${message}`,
      'VALIDATION_ERROR',
      false,
      { ...context, field }
    );
  }
}

export class TimeoutError extends R3callError {
  constructor(
    operation: string,
    timeoutMs: number,
    context?: Record<string, any>
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      true,
      { ...context, operation, timeoutMs }
    );
  }
}

export class JobQueueError extends R3callError {
  constructor(
    jobId: string,
    message: string,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(
      `Job '${jobId}' failed: ${message}`,
      'JOB_QUEUE_ERROR',
      retryable,
      { ...context, jobId }
    );
  }
}

export class IntelligenceError extends R3callError {
  constructor(
    feature: string,
    message: string,
    fallbackAvailable: boolean = true,
    context?: Record<string, any>
  ) {
    super(
      `Intelligence feature '${feature}' failed: ${message}`,
      'INTELLIGENCE_ERROR',
      false,
      { ...context, feature, fallbackAvailable }
    );
  }
}

export class InitializationError extends R3callError {
  constructor(
    component: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(
      `Failed to initialize ${component}: ${message}`,
      'INITIALIZATION_ERROR',
      false,
      { ...context, component }
    );
  }
}

/**
 * Error handler utility for consistent error logging and recovery
 */
export class ErrorHandler {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (error instanceof R3callError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.RETRY_DELAYS[attempt] || 5000;
        console.error(
          `${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    throw new R3callError(
      `${operationName} failed after ${maxRetries + 1} attempts`,
      'MAX_RETRIES_EXCEEDED',
      false,
      { lastError: lastError?.message, operationName, attempts: maxRetries + 1 }
    );
  }

  static handleError(error: any, context?: string): never {
    if (error instanceof R3callError) {
      console.error(`[${error.code}] ${context || 'Error'}:`, error.message);
      if (error.context) {
        console.error('Context:', JSON.stringify(error.context, null, 2));
      }
    } else {
      console.error(`${context || 'Unexpected error'}:`, error);
    }
    throw error;
  }

  static logError(error: any, context?: string): void {
    if (error instanceof R3callError) {
      console.error(`[${error.code}] ${context || 'Error'}:`, error.message);
      if (error.context && process.env.DEBUG === 'true') {
        console.error('Debug context:', JSON.stringify(error.context, null, 2));
      }
    } else {
      console.error(`${context || 'Error'}:`, error?.message || error);
    }
  }
}