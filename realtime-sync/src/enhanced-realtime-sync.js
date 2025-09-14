import { WebSocketServer } from 'ws';
import EventEmitter from 'events';
import crypto from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import { RabbitMQManager } from './rabbitmq-manager.js';
import { EventReplayManager } from './event-replay.js';
import { PatternMatcher } from './pattern-matcher.js';
import { RateLimitManager } from './rate-limiter.js';
import { createLogger } from './logger.js';
import { CONFIG } from '../config/config.js';

const logger = createLogger('EnhancedRealtimeSync');

/**
 * Enhanced Real-time Synchronization Manager
 * Extends the basic WebSocket implementation with advanced features:
 * - RabbitMQ message queuing
 * - Event replay system
 * - Advanced pattern matching
 * - Rate limiting
 * - Message compression
 * - Monitoring and metrics
 */
export class EnhancedRealtimeSyncManager extends EventEmitter {
  constructor(redisClient, options = {}) {
    super();
    this.redis = redisClient;
    this.options = {
      ...CONFIG.websocket,
      ...options
    };

    // Core managers
    this.rabbitmq = null;
    this.eventReplay = null;
    this.patternMatcher = null;
    this.rateLimiter = null;

    // Connection management
    this.connections = new Map();
    this.subscriptions = new Map(); // pattern -> Set of connectionIds
    this.userConnections = new Map(); // userId -> Set of connectionIds

    // Compression settings
    this.compressionThreshold = this.options.compressionThreshold || 1024;
    this.compressionLevel = 6;

    // Metrics and monitoring
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesPerSecond: 0,
      bytesTransmitted: 0,
      bytesCompressed: 0,
      compressionRatio: 0,
      eventsReplayed: 0,
      rateLimitBlocks: 0,
      patternMatches: 0,
      rabbitmqMessages: 0
    };

    this.messageBuffer = new Map(); // connectionId -> array of messages
    this.lastMetricsReset = Date.now();
  }

  /**
   * Initialize the enhanced WebSocket server and all subsystems
   */
  async initialize() {
    logger.info('Initializing Enhanced Realtime Sync Manager...');

    try {
      // Initialize core managers
      await this.initializeManagers();

      // Create WebSocket server with enhanced compression
      await this.initializeWebSocketServer();

      // Set up Redis pub/sub
      await this.setupRedisPubSub();

      // Start background processes
      this.startBackgroundProcesses();

      logger.info('Enhanced Realtime Sync Manager initialized successfully', {
        port: this.options.port,
        features: {
          rabbitmq: !!this.rabbitmq,
          eventReplay: !!this.eventReplay,
          patternMatching: !!this.patternMatcher,
          rateLimiting: !!this.rateLimiter
        }
      });

      this.emit('initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Enhanced Realtime Sync Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize all subsystem managers
   */
  async initializeManagers() {
    // Initialize RabbitMQ manager
    try {
      this.rabbitmq = new RabbitMQManager();
      await this.rabbitmq.initialize();
      logger.info('RabbitMQ manager initialized');
    } catch (error) {
      logger.warn('RabbitMQ unavailable, continuing without message queuing:', error.message);
    }

    // Initialize event replay manager
    this.eventReplay = new EventReplayManager(this.redis, this.rabbitmq);
    logger.info('Event replay manager initialized');

    // Initialize pattern matcher
    this.patternMatcher = new PatternMatcher();
    logger.info('Pattern matcher initialized');

    // Initialize rate limiter
    this.rateLimiter = new RateLimitManager(this.redis);
    logger.info('Rate limiter initialized');
  }

  /**
   * Initialize WebSocket server with enhanced compression
   */
  async initializeWebSocketServer() {
    this.wss = new WebSocketServer({
      port: this.options.port,
      host: this.options.host || '0.0.0.0',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 8,
          level: this.compressionLevel
        },
        threshold: this.compressionThreshold,
        concurrencyLimit: 10,
        clientMaxWindowBits: 13,
        serverMaxWindowBits: 13,
        serverMaxNoContextTakeover: false,
        clientMaxNoContextTakeover: false,
        compress: true
      },
      maxPayload: this.options.maxMessageSize || 1048576 // 1MB
    });

    // Enhanced connection handling
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));

    logger.info('WebSocket server created', {
      port: this.options.port,
      compressionThreshold: this.compressionThreshold,
      maxPayload: this.options.maxMessageSize
    });
  }

  /**
   * Handle new WebSocket connection with enhanced features
   */
  async handleConnection(ws, request) {
    const connectionId = crypto.randomUUID();
    const userId = this.extractUserId(request);
    const userAgent = request.headers['user-agent'];
    const ip = this.getClientIP(request);

    logger.info('New connection attempt', { connectionId, userId, ip, userAgent });

    try {
      // Check rate limits first
      const rateLimitResult = await this.rateLimiter.checkRateLimit(
        connectionId,
        userId,
        'connection'
      );

      if (!rateLimitResult.allowed) {
        logger.warn('Connection rejected by rate limiter', {
          connectionId,
          userId,
          reason: rateLimitResult.reason
        });
        ws.close(1008, `Rate limit exceeded: ${rateLimitResult.reason}`);
        return;
      }

      // Check connection limits per user
      if (!this.checkConnectionLimit(userId)) {
        logger.warn('Connection rejected: user limit exceeded', { userId });
        ws.close(1008, 'Connection limit exceeded for user');
        return;
      }

      // Create enhanced connection context
      const connection = {
        id: connectionId,
        ws,
        userId,
        subscriptions: new Set(),
        patterns: new Set(),
        lastActivity: Date.now(),
        connectedAt: Date.now(),
        messageCount: 0,
        bytesReceived: 0,
        bytesSent: 0,
        compressionEnabled: false,
        metadata: {
          ip,
          userAgent,
          protocol: ws.protocol,
          extensions: ws.extensions
        },
        rateLimitStatus: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      };

      // Store connection
      this.connections.set(connectionId, connection);
      this.updateUserConnections(userId, connectionId, 'add');

      // Update metrics
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      // Set up enhanced event handlers
      ws.on('message', (data) => this.handleMessage(connectionId, data));
      ws.on('close', (code, reason) => this.handleDisconnect(connectionId, code, reason));
      ws.on('error', (error) => this.handleError(connectionId, error));
      ws.on('pong', () => this.handlePong(connectionId));

      // Send enhanced welcome message
      const welcomeMessage = {
        type: 'connection',
        connectionId,
        userId,
        timestamp: Date.now(),
        server: {
          version: '2.0.0',
          features: {
            compression: true,
            patterns: true,
            replay: this.eventReplay.config.enabled,
            rateLimit: true,
            messageQueue: !!this.rabbitmq
          },
          limits: {
            maxMessageSize: this.options.maxMessageSize,
            maxConnections: this.options.maxConnectionsPerUser,
            compressionThreshold: this.compressionThreshold
          }
        }
      };

      await this.sendToConnection(connectionId, welcomeMessage);

      // Restore previous subscriptions if reconnecting
      await this.restoreUserState(userId, connectionId);

      logger.info('Connection established', {
        connectionId,
        userId,
        activeConnections: this.metrics.activeConnections
      });

      this.emit('connection', { connectionId, userId, connection });
    } catch (error) {
      logger.error('Failed to handle new connection:', error);
      ws.close(1011, 'Server error during connection setup');
    }
  }

  /**
   * Enhanced message handling with compression and rate limiting
   */
  async handleMessage(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Update connection activity
      connection.lastActivity = Date.now();
      connection.messageCount++;
      connection.bytesReceived += data.length;

      // Parse message (handle compressed data if needed)
      let messageStr;
      if (data[0] === 0x1f && data[1] === 0x8b) {
        // Gzip compressed data
        messageStr = gunzipSync(data).toString();
      } else {
        messageStr = data.toString();
      }

      const message = JSON.parse(messageStr);

      // Enhanced rate limiting check
      const rateLimitResult = await this.rateLimiter.checkRateLimit(
        connectionId,
        connection.userId,
        message.type,
        { checkGlobal: true }
      );

      if (!rateLimitResult.allowed) {
        this.metrics.rateLimitBlocks++;
        await this.sendError(connectionId, {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded: ${rateLimitResult.reason}`,
          retryAfter: rateLimitResult.retryAfter,
          type: rateLimitResult.type
        });
        return;
      }

      // Update rate limit status
      connection.rateLimitStatus = {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      };

      // Handle message with enhanced processing
      await this.processMessage(connectionId, message);

    } catch (error) {
      logger.error('Failed to handle message:', { connectionId, error });
      await this.sendError(connectionId, {
        code: 'MESSAGE_PROCESSING_ERROR',
        message: `Failed to process message: ${error.message}`
      });
    }
  }

  /**
   * Process message with enhanced features
   */
  async processMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    logger.debug('Processing message', {
      connectionId,
      type: message.type,
      userId: connection.userId
    });

    // Publish to RabbitMQ for distributed processing
    if (this.rabbitmq) {
      await this.rabbitmq.publishEvent(
        `message.${message.type}`,
        {
          ...message,
          connectionId,
          userId: connection.userId,
          timestamp: Date.now()
        }
      );
      this.metrics.rabbitmqMessages++;
    }

    // Process based on message type
    switch (message.type) {
      case 'subscribe':
        await this.handleEnhancedSubscribe(connectionId, message);
        break;

      case 'unsubscribe':
        await this.handleEnhancedUnsubscribe(connectionId, message);
        break;

      case 'replay':
        await this.handleReplayRequest(connectionId, message);
        break;

      case 'broadcast':
        await this.handleEnhancedBroadcast(connectionId, message);
        break;

      case 'sync':
        await this.handleSyncRequest(connectionId, message);
        break;

      case 'query':
        await this.handleQuery(connectionId, message);
        break;

      case 'ping':
        await this.sendToConnection(connectionId, {
          type: 'pong',
          timestamp: Date.now(),
          serverTime: Date.now()
        });
        break;

      case 'compression':
        await this.handleCompressionRequest(connectionId, message);
        break;

      case 'status':
        await this.handleStatusRequest(connectionId, message);
        break;

      default:
        await this.sendError(connectionId, {
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  /**
   * Enhanced subscription handling with pattern matching
   */
  async handleEnhancedSubscribe(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { channels = [], patterns = [], options = {} } = message;

    try {
      // Validate patterns
      for (const pattern of patterns) {
        const validation = this.patternMatcher.validatePattern(pattern);
        if (!validation.valid) {
          await this.sendError(connectionId, {
            code: 'INVALID_PATTERN',
            message: `Invalid pattern '${pattern}': ${validation.errors.join(', ')}`
          });
          return;
        }
      }

      // Subscribe to channels
      for (const channel of channels) {
        connection.subscriptions.add(channel);
        this.addToSubscriptionMap(channel, connectionId, 'channel');

        // Subscribe to Redis if needed
        if (!this.subscriptions.has(channel)) {
          await this.redis.subscribe(channel);
        }
      }

      // Subscribe to patterns with enhanced matching
      for (const pattern of patterns) {
        connection.patterns.add(pattern);
        this.addToSubscriptionMap(`pattern:${pattern}`, connectionId, 'pattern');

        // Subscribe to Redis pattern
        await this.redis.psubscribe(pattern);
      }

      // Store subscription state for reconnection
      await this.storeSubscriptionState(connection.userId, {
        channels: Array.from(connection.subscriptions),
        patterns: Array.from(connection.patterns)
      });

      // Send confirmation with enhanced info
      await this.sendToConnection(connectionId, {
        type: 'subscribed',
        channels,
        patterns,
        totalSubscriptions: connection.subscriptions.size + connection.patterns.size,
        timestamp: Date.now(),
        options
      });

      // Send initial state if requested
      if (options.sendInitialState) {
        await this.sendInitialState(connectionId, channels);
      }

      // Replay events if requested
      if (options.replayEvents && this.eventReplay.config.enabled) {
        await this.replayEventsForSubscription(
          connectionId,
          channels,
          patterns,
          options.replaySince
        );
      }

      logger.info('Enhanced subscription successful', {
        connectionId,
        userId: connection.userId,
        channels: channels.length,
        patterns: patterns.length
      });

    } catch (error) {
      logger.error('Enhanced subscription failed:', error);
      await this.sendError(connectionId, {
        code: 'SUBSCRIPTION_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Handle event replay requests
   */
  async handleReplayRequest(connectionId, message) {
    if (!this.eventReplay.config.enabled) {
      await this.sendError(connectionId, {
        code: 'REPLAY_DISABLED',
        message: 'Event replay is not enabled'
      });
      return;
    }

    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const {
        since = 0,
        categories = [],
        priority,
        limit = 100
      } = message;

      // Get replay summary first
      const summary = await this.eventReplay.getReplaySummary(connection.userId, since);

      if (summary.availableEvents === 0) {
        await this.sendToConnection(connectionId, {
          type: 'replay_response',
          events: [],
          summary,
          timestamp: Date.now()
        });
        return;
      }

      // Replay events
      const events = await this.eventReplay.replayEvents(
        connection.userId,
        since,
        { categories, priority, limit }
      );

      this.metrics.eventsReplayed += events.length;

      await this.sendToConnection(connectionId, {
        type: 'replay_response',
        events,
        summary,
        replayed: events.length,
        timestamp: Date.now()
      });

      logger.info('Event replay completed', {
        connectionId,
        userId: connection.userId,
        eventsReplayed: events.length,
        since
      });

    } catch (error) {
      logger.error('Event replay failed:', error);
      await this.sendError(connectionId, {
        code: 'REPLAY_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Handle compression requests
   */
  async handleCompressionRequest(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { enable = true, level = this.compressionLevel } = message;

    connection.compressionEnabled = enable && level > 0;
    connection.compressionLevel = Math.min(9, Math.max(1, level));

    await this.sendToConnection(connectionId, {
      type: 'compression_response',
      enabled: connection.compressionEnabled,
      level: connection.compressionLevel,
      threshold: this.compressionThreshold,
      timestamp: Date.now()
    });

    logger.debug('Compression settings updated', {
      connectionId,
      enabled: connection.compressionEnabled,
      level: connection.compressionLevel
    });
  }

  /**
   * Enhanced message sending with compression
   */
  async sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== 1) return false;

    try {
      let data = JSON.stringify(message);
      const originalSize = Buffer.byteLength(data);
      let finalData = data;
      let compressed = false;

      // Apply compression if enabled and message is large enough
      if (connection.compressionEnabled &&
          originalSize > this.compressionThreshold) {
        const compressedBuffer = gzipSync(Buffer.from(data), {
          level: connection.compressionLevel || this.compressionLevel
        });

        // Only use compression if it actually reduces size
        if (compressedBuffer.length < originalSize * 0.9) {
          finalData = compressedBuffer;
          compressed = true;
          this.metrics.bytesCompressed += originalSize - compressedBuffer.length;
          this.metrics.compressionRatio =
            (this.metrics.compressionRatio + (compressedBuffer.length / originalSize)) / 2;
        }
      }

      // Send the message
      connection.ws.send(finalData);

      // Update metrics and connection stats
      const finalSize = Buffer.byteLength(finalData);
      connection.bytesSent += finalSize;
      this.metrics.bytesTransmitted += finalSize;

      if (compressed) {
        logger.debug('Sent compressed message', {
          connectionId,
          originalSize,
          compressedSize: finalSize,
          compressionRatio: (finalSize / originalSize).toFixed(3)
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to send message:', { connectionId, error });
      return false;
    }
  }

  /**
   * Enhanced error sending
   */
  async sendError(connectionId, error) {
    await this.sendToConnection(connectionId, {
      type: 'error',
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        timestamp: Date.now(),
        ...error
      }
    });
  }

  /**
   * Handle status requests
   */
  async handleStatusRequest(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const status = {
      connection: {
        id: connectionId,
        userId: connection.userId,
        connectedAt: connection.connectedAt,
        uptime: Date.now() - connection.connectedAt,
        messageCount: connection.messageCount,
        bytesReceived: connection.bytesReceived,
        bytesSent: connection.bytesSent,
        subscriptions: connection.subscriptions.size,
        patterns: connection.patterns.size,
        compressionEnabled: connection.compressionEnabled,
        rateLimitStatus: connection.rateLimitStatus
      },
      server: await this.getServerStatus()
    };

    await this.sendToConnection(connectionId, {
      type: 'status_response',
      status,
      timestamp: Date.now()
    });
  }

  /**
   * Get comprehensive server status
   */
  async getServerStatus() {
    const [
      rabbitMqMetrics,
      replayMetrics,
      patternStats,
      rateLimitMetrics
    ] = await Promise.all([
      this.rabbitmq?.getMetrics() || null,
      this.eventReplay?.getMetrics() || null,
      this.patternMatcher?.getStats() || null,
      this.rateLimiter?.getMetrics() || null
    ]);

    return {
      uptime: Date.now() - this.lastMetricsReset,
      activeConnections: this.metrics.activeConnections,
      totalConnections: this.metrics.totalConnections,
      metrics: this.metrics,
      subsystems: {
        rabbitmq: rabbitMqMetrics,
        eventReplay: replayMetrics,
        patternMatcher: patternStats,
        rateLimiter: rateLimitMetrics
      }
    };
  }

  /**
   * Store subscription state for user
   */
  async storeSubscriptionState(userId, subscriptions) {
    const key = `${CONFIG.redis.keyPrefix}subscriptions:${userId}`;
    await this.redis.setex(key, 86400, JSON.stringify(subscriptions)); // 24 hour TTL
  }

  /**
   * Restore user state on reconnection
   */
  async restoreUserState(userId, connectionId) {
    try {
      // Restore subscriptions
      const key = `${CONFIG.redis.keyPrefix}subscriptions:${userId}`;
      const subscriptionData = await this.redis.get(key);

      if (subscriptionData) {
        const subscriptions = JSON.parse(subscriptionData);

        if (subscriptions.channels?.length > 0 || subscriptions.patterns?.length > 0) {
          await this.handleEnhancedSubscribe(connectionId, {
            type: 'subscribe',
            channels: subscriptions.channels || [],
            patterns: subscriptions.patterns || [],
            options: { replayEvents: true, sendInitialState: true }
          });

          logger.info('Restored user subscriptions', {
            userId,
            connectionId,
            channels: subscriptions.channels?.length || 0,
            patterns: subscriptions.patterns?.length || 0
          });
        }
      }
    } catch (error) {
      logger.error('Failed to restore user state:', error);
    }
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Heartbeat monitoring
    setInterval(() => {
      this.performHeartbeat();
    }, this.options.heartbeatInterval);

    // Metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, CONFIG.monitoring.metricsInterval);

    // Connection cleanup
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Every minute

    logger.info('Background processes started');
  }

  /**
   * Perform enhanced heartbeat with metrics
   */
  performHeartbeat() {
    const now = Date.now();
    const timeout = this.options.heartbeatInterval * 2;
    let staleConnections = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastActivity > timeout) {
        connection.ws.terminate();
        this.handleDisconnect(connectionId, 1001, 'Heartbeat timeout');
        staleConnections++;
      } else {
        connection.ws.ping();
      }
    }

    if (staleConnections > 0) {
      logger.info('Cleaned up stale connections', { count: staleConnections });
    }
  }

  /**
   * Collect and emit metrics
   */
  collectMetrics() {
    // Calculate messages per second
    const now = Date.now();
    const duration = (now - this.lastMetricsReset) / 1000;
    const totalMessages = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.messageCount, 0);

    this.metrics.messagesPerSecond = duration > 0 ? totalMessages / duration : 0;

    this.emit('metrics', {
      ...this.metrics,
      timestamp: now,
      connections: this.connections.size,
      subscriptions: this.subscriptions.size
    });
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const maxIdleTime = 10 * 60 * 1000; // 10 minutes

    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.ws.readyState === 3 || // CLOSED
          (now - connection.lastActivity > maxIdleTime)) {
        this.handleDisconnect(connectionId, 1000, 'Cleanup');
      }
    }
  }

  /**
   * Utility methods
   */
  getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0] ||
           request.headers['x-real-ip'] ||
           request.socket.remoteAddress;
  }

  extractUserId(request) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    return url.searchParams.get('userId') ||
           request.headers['x-user-id'] ||
           'anonymous';
  }

  checkConnectionLimit(userId) {
    const userConns = this.userConnections.get(userId);
    return !userConns || userConns.size < this.options.maxConnectionsPerUser;
  }

  updateUserConnections(userId, connectionId, action) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    const userConns = this.userConnections.get(userId);
    if (action === 'add') {
      userConns.add(connectionId);
    } else if (action === 'remove') {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  addToSubscriptionMap(key, connectionId, type) {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key).add(connectionId);
  }

  /**
   * Enhanced disconnect handling
   */
  handleDisconnect(connectionId, code, reason) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    logger.info('Connection disconnected', {
      connectionId,
      userId: connection.userId,
      code,
      reason,
      duration: Date.now() - connection.connectedAt
    });

    // Clean up subscriptions
    for (const subscription of connection.subscriptions) {
      this.cleanupSubscription(subscription, connectionId);
    }

    for (const pattern of connection.patterns) {
      this.cleanupSubscription(`pattern:${pattern}`, connectionId);
    }

    // Update user connections
    this.updateUserConnections(connection.userId, connectionId, 'remove');

    // Remove from connections
    this.connections.delete(connectionId);
    this.metrics.activeConnections--;

    this.emit('disconnect', {
      connectionId,
      userId: connection.userId,
      code,
      reason,
      stats: {
        messageCount: connection.messageCount,
        bytesReceived: connection.bytesReceived,
        bytesSent: connection.bytesSent,
        duration: Date.now() - connection.connectedAt
      }
    });
  }

  cleanupSubscription(subscription, connectionId) {
    const subscribers = this.subscriptions.get(subscription);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(subscription);

        // Unsubscribe from Redis
        if (subscription.startsWith('pattern:')) {
          this.redis.punsubscribe(subscription.replace('pattern:', ''));
        } else {
          this.redis.unsubscribe(subscription);
        }
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down Enhanced Realtime Sync Manager...');

    try {
      // Close all connections
      for (const [connectionId, connection] of this.connections.entries()) {
        connection.ws.close(1001, 'Server shutting down');
      }

      // Close WebSocket server
      if (this.wss) {
        await new Promise((resolve) => {
          this.wss.close(resolve);
        });
      }

      // Shutdown subsystems
      await Promise.all([
        this.rabbitmq?.shutdown(),
        this.eventReplay?.shutdown(),
        this.patternMatcher?.shutdown(),
        this.rateLimiter?.shutdown()
      ]);

      // Unsubscribe from Redis
      await this.redis.unsubscribe();
      await this.redis.punsubscribe();

      logger.info('Enhanced Realtime Sync Manager shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}