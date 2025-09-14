import { config } from 'dotenv';

config();

export const CONFIG = {
  // Server configuration
  server: {
    port: parseInt(process.env.REALTIME_PORT) || 3001,
    host: process.env.REALTIME_HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // WebSocket configuration
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
    maxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER) || 10,
    compressionThreshold: parseInt(process.env.WS_COMPRESSION_THRESHOLD) || 1024,
    enableBroadcast: process.env.WS_ENABLE_BROADCAST !== 'false',
    eventBufferSize: parseInt(process.env.WS_EVENT_BUFFER_SIZE) || 1000,
    reconnectWindow: parseInt(process.env.WS_RECONNECT_WINDOW) || 300000, // 5 minutes
    maxMessageSize: parseInt(process.env.WS_MAX_MESSAGE_SIZE) || 1048576 // 1MB
  },

  // RabbitMQ configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'mem0-realtime',
    exchangeType: 'topic',
    queues: {
      events: 'mem0-events',
      deadLetter: 'mem0-dead-letter',
      replay: 'mem0-replay'
    },
    options: {
      durable: true,
      persistent: true,
      prefetch: parseInt(process.env.RABBITMQ_PREFETCH) || 100,
      heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT) || 60
    }
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'mem0:realtime:',
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true
  },

  // Rate limiting configuration
  rateLimit: {
    points: parseInt(process.env.RATE_LIMIT_POINTS) || 1000, // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_DURATION) || 60, // Per 60 seconds
    blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION) || 60, // Block for 60 seconds
    execEvenly: true,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  // Event replay configuration
  eventReplay: {
    enabled: process.env.EVENT_REPLAY_ENABLED !== 'false',
    retentionDays: parseInt(process.env.EVENT_REPLAY_RETENTION_DAYS) || 7,
    batchSize: parseInt(process.env.EVENT_REPLAY_BATCH_SIZE) || 100,
    maxEventsPerReplay: parseInt(process.env.EVENT_REPLAY_MAX_EVENTS) || 10000,
    compressionLevel: parseInt(process.env.EVENT_REPLAY_COMPRESSION) || 6
  },

  // Pattern matching configuration
  patterns: {
    maxPatterns: parseInt(process.env.MAX_PATTERNS_PER_CONNECTION) || 50,
    cacheSize: parseInt(process.env.PATTERN_CACHE_SIZE) || 1000,
    cacheTtl: parseInt(process.env.PATTERN_CACHE_TTL) || 3600 // 1 hour
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    port: parseInt(process.env.MONITORING_PORT) || 3002,
    metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 10000, // 10 seconds
    healthCheck: {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV === 'development',
    file: process.env.LOG_FILE,
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m'
  },

  // Security configuration
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
    helmetEnabled: process.env.HELMET_ENABLED !== 'false'
  }
};

// Validate critical configuration
export function validateConfig() {
  const required = [
    { key: 'RABBITMQ_URL', value: CONFIG.rabbitmq.url, default: 'amqp://localhost:5672' },
    { key: 'REDIS_HOST', value: CONFIG.redis.host, default: 'localhost' }
  ];

  const missing = required.filter(({ value, default: defaultValue }) =>
    !value || value === defaultValue
  );

  if (missing.length > 0 && CONFIG.server.environment === 'production') {
    console.warn('Warning: Using default values in production:', missing.map(m => m.key));
  }

  return true;
}