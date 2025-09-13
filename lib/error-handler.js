// Custom error classes for better error handling
export class Mem0Error extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'Mem0Error';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class RedisError extends Error {
  constructor(message, operation, details = {}) {
    super(message);
    this.name = 'RedisError';
    this.operation = operation;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

// Retry logic with exponential backoff
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoff = 2,
    shouldRetry = (error) => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoff, attempt) + Math.random() * 100,
        maxDelay
      );

      console.error(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Circuit breaker implementation
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.error(`Circuit breaker opened after ${this.failures} failures`);
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null
    };
  }
}

// Error recovery strategies
export const RecoveryStrategies = {
  FALLBACK_TO_CACHE: 'fallback_to_cache',
  FALLBACK_TO_MEM0: 'fallback_to_mem0',
  RETURN_PARTIAL: 'return_partial',
  RETRY_WITH_BACKOFF: 'retry_with_backoff',
  CIRCUIT_BREAK: 'circuit_break'
};

// Global error handler
export function handleError(error, context = {}) {
  const errorInfo = {
    name: error.name || 'UnknownError',
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  };

  // Log to console with appropriate level
  if (error instanceof ValidationError) {
    console.warn('Validation Error:', errorInfo);
  } else if (error instanceof RedisError) {
    console.error('Redis Error:', errorInfo);
  } else if (error instanceof Mem0Error) {
    console.error('Mem0 Error:', errorInfo);
  } else {
    console.error('Unexpected Error:', errorInfo);
  }

  // Return structured error response
  return {
    error: true,
    type: error.name,
    message: error.message,
    details: error.details || {},
    context,
    recoveryStrategy: suggestRecovery(error)
  };
}

// Suggest recovery strategy based on error type
function suggestRecovery(error) {
  if (error instanceof RedisError) {
    return RecoveryStrategies.FALLBACK_TO_MEM0;
  } else if (error instanceof Mem0Error && error.statusCode === 429) {
    return RecoveryStrategies.RETRY_WITH_BACKOFF;
  } else if (error instanceof Mem0Error && error.statusCode >= 500) {
    return RecoveryStrategies.FALLBACK_TO_CACHE;
  }
  return RecoveryStrategies.RETURN_PARTIAL;
}