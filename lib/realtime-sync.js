import { WebSocketServer } from 'ws';
import EventEmitter from 'events';
import crypto from 'crypto';

/**
 * Real-time synchronization manager for live memory updates
 * Implements WebSocket connections, event streaming, and intelligent subscriptions
 */
export class RealtimeSyncManager extends EventEmitter {
  constructor(redisClient, options = {}) {
    super();
    this.redis = redisClient;
    this.options = {
      port: options.port || 3001,
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxConnectionsPerUser: options.maxConnectionsPerUser || 5,
      compressionThreshold: options.compressionThreshold || 1024,
      enableBroadcast: options.enableBroadcast !== false,
      eventBufferSize: options.eventBufferSize || 100,
      reconnectWindow: options.reconnectWindow || 60000
    };

    this.connections = new Map();
    this.subscriptions = new Map();
    this.eventBuffer = new Map();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesPerSecond: 0,
      bytesTransmitted: 0
    };
  }

  /**
   * Initialize WebSocket server and Redis pub/sub
   */
  async initialize() {
    // Create WebSocket server
    this.wss = new WebSocketServer({
      port: this.options.port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        threshold: this.options.compressionThreshold
      }
    });

    // Set up connection handling
    this.wss.on('connection', this.handleConnection.bind(this));

    // Set up Redis pub/sub for distributed events
    await this.setupRedisPubSub();

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Initialize metrics collection
    this.startMetricsCollection();

    console.log(`WebSocket server listening on port ${this.options.port}`);
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, request) {
    const connectionId = crypto.randomUUID();
    const userId = this.extractUserId(request);

    // Enforce connection limits per user
    if (!this.checkConnectionLimit(userId)) {
      ws.close(1008, 'Connection limit exceeded');
      return;
    }

    // Create connection context
    const connection = {
      id: connectionId,
      ws,
      userId,
      subscriptions: new Set(),
      lastActivity: Date.now(),
      metadata: {
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        connectedAt: new Date().toISOString()
      }
    };

    // Store connection
    this.connections.set(connectionId, connection);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Set up event handlers
    ws.on('message', (data) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleDisconnect(connectionId));
    ws.on('error', (error) => this.handleError(connectionId, error));
    ws.on('pong', () => this.handlePong(connectionId));

    // Send welcome message with connection info
    this.sendToConnection(connectionId, {
      type: 'connection',
      connectionId,
      userId,
      timestamp: Date.now(),
      capabilities: this.getCapabilities()
    });

    // Restore previous subscriptions if reconnecting
    await this.restoreSubscriptions(userId, connectionId);

    // Send buffered events if any
    await this.sendBufferedEvents(userId, connectionId);

    this.emit('connection', { connectionId, userId });
  }

  /**
   * Handle incoming WebSocket message
   */
  async handleMessage(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = Date.now();

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(connectionId, message);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribe(connectionId, message);
          break;

        case 'sync':
          await this.handleSyncRequest(connectionId, message);
          break;

        case 'broadcast':
          await this.handleBroadcast(connectionId, message);
          break;

        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong', timestamp: Date.now() });
          break;

        case 'query':
          await this.handleQuery(connectionId, message);
          break;

        default:
          this.sendError(connectionId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.sendError(connectionId, `Invalid message: ${error.message}`);
    }
  }

  /**
   * Handle subscription request
   */
  async handleSubscribe(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { channels = [], patterns = [], options = {} } = message;

    // Subscribe to specific channels
    for (const channel of channels) {
      connection.subscriptions.add(channel);

      // Track global subscriptions
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }
      this.subscriptions.get(channel).add(connectionId);

      // Subscribe to Redis channel if needed
      if (this.subscriptions.get(channel).size === 1) {
        await this.redis.subscribe(channel);
      }
    }

    // Subscribe to patterns
    for (const pattern of patterns) {
      const patternKey = `pattern:${pattern}`;
      connection.subscriptions.add(patternKey);

      if (!this.subscriptions.has(patternKey)) {
        this.subscriptions.set(patternKey, new Set());
        await this.redis.psubscribe(pattern);
      }
      this.subscriptions.get(patternKey).add(connectionId);
    }

    // Send confirmation
    this.sendToConnection(connectionId, {
      type: 'subscribed',
      channels,
      patterns,
      timestamp: Date.now()
    });

    // Send initial state if requested
    if (options.sendInitialState) {
      await this.sendInitialState(connectionId, channels);
    }
  }

  /**
   * Handle sync request for specific memories
   */
  async handleSyncRequest(connectionId, message) {
    const { memoryIds = [], since, until } = message;

    try {
      const updates = await this.getMemoryUpdates(memoryIds, since, until);

      this.sendToConnection(connectionId, {
        type: 'sync_response',
        updates,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(connectionId, `Sync failed: ${error.message}`);
    }
  }

  /**
   * Handle broadcast message
   */
  async handleBroadcast(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !this.options.enableBroadcast) return;

    const { channel, data, targetUsers } = message;

    // Broadcast to specific users or all subscribers
    const event = {
      type: 'broadcast',
      channel,
      data,
      fromUser: connection.userId,
      timestamp: Date.now()
    };

    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      for (const userId of targetUsers) {
        await this.sendToUser(userId, event);
      }
    } else {
      // Broadcast to all channel subscribers
      await this.broadcastToChannel(channel, event, connectionId);
    }

    // Publish to Redis for distributed broadcasting
    await this.redis.publish(`broadcast:${channel}`, JSON.stringify(event));
  }

  /**
   * Broadcast event to channel subscribers
   */
  async broadcastToChannel(channel, event, excludeConnectionId = null) {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;

    for (const connId of subscribers) {
      if (connId !== excludeConnectionId) {
        this.sendToConnection(connId, event);
      }
    }
  }

  /**
   * Send message to specific user
   */
  async sendToUser(userId, message) {
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    for (const connection of userConnections) {
      this.sendToConnection(connection.id, message);
    }

    // Buffer message if user is offline
    if (userConnections.length === 0) {
      this.bufferEvent(userId, message);
    }
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== 1) return;

    try {
      const data = JSON.stringify(message);
      connection.ws.send(data);
      this.metrics.bytesTransmitted += data.length;
    } catch (error) {
      console.error(`Failed to send to ${connectionId}:`, error);
    }
  }

  /**
   * Send error message
   */
  sendError(connectionId, error) {
    this.sendToConnection(connectionId, {
      type: 'error',
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Handle connection disconnect
   */
  handleDisconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clean up subscriptions
    for (const subscription of connection.subscriptions) {
      const subscribers = this.subscriptions.get(subscription);
      if (subscribers) {
        subscribers.delete(connectionId);

        // Unsubscribe from Redis if no more subscribers
        if (subscribers.size === 0) {
          if (subscription.startsWith('pattern:')) {
            this.redis.punsubscribe(subscription.replace('pattern:', ''));
          } else {
            this.redis.unsubscribe(subscription);
          }
          this.subscriptions.delete(subscription);
        }
      }
    }

    // Store disconnection time for reconnection window
    this.storeDisconnectionInfo(connection.userId, connectionId);

    // Clean up connection
    this.connections.delete(connectionId);
    this.metrics.activeConnections--;

    this.emit('disconnect', { connectionId, userId: connection.userId });
  }

  /**
   * Handle connection error
   */
  handleError(connectionId, error) {
    console.error(`WebSocket error for ${connectionId}:`, error);
    this.emit('error', { connectionId, error });
  }

  /**
   * Handle pong response
   */
  handlePong(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Set up Redis pub/sub for distributed events
   */
  async setupRedisPubSub() {
    // Subscribe to memory events
    await this.redis.subscribe('memory:created');
    await this.redis.subscribe('memory:updated');
    await this.redis.subscribe('memory:deleted');

    // Handle incoming Redis messages
    this.redis.on('message', async (channel, message) => {
      try {
        const event = JSON.parse(message);
        await this.handleRedisEvent(channel, event);
      } catch (error) {
        console.error('Failed to handle Redis event:', error);
      }
    });
  }

  /**
   * Handle event from Redis pub/sub
   */
  async handleRedisEvent(channel, event) {
    // Determine which connections should receive this event
    const targetConnections = this.findTargetConnections(channel, event);

    // Send event to each connection
    for (const connectionId of targetConnections) {
      this.sendToConnection(connectionId, {
        type: 'event',
        channel,
        event,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Find connections that should receive an event
   */
  findTargetConnections(channel, event) {
    const connections = new Set();

    // Direct channel subscribers
    const channelSubscribers = this.subscriptions.get(channel);
    if (channelSubscribers) {
      for (const connId of channelSubscribers) {
        connections.add(connId);
      }
    }

    // Pattern subscribers
    for (const [pattern, subscribers] of this.subscriptions.entries()) {
      if (pattern.startsWith('pattern:')) {
        const regex = this.patternToRegex(pattern.replace('pattern:', ''));
        if (regex.test(channel)) {
          for (const connId of subscribers) {
            connections.add(connId);
          }
        }
      }
    }

    // User-specific targeting
    if (event.userId) {
      const userConnections = Array.from(this.connections.entries())
        .filter(([_, conn]) => conn.userId === event.userId)
        .map(([connId, _]) => connId);

      for (const connId of userConnections) {
        connections.add(connId);
      }
    }

    return Array.from(connections);
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.options.heartbeatInterval * 2;

      for (const [connectionId, connection] of this.connections.entries()) {
        // Check for inactive connections
        if (now - connection.lastActivity > timeout) {
          connection.ws.terminate();
          this.handleDisconnect(connectionId);
        } else {
          // Send ping
          connection.ws.ping();
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    setInterval(() => {
      // Calculate messages per second
      // This would need actual message counting implementation
      this.emit('metrics', this.getMetrics());
    }, 5000);
  }

  /**
   * Extract user ID from request
   */
  extractUserId(request) {
    // Extract from headers, query params, or auth token
    const url = new URL(request.url, `http://${request.headers.host}`);
    return url.searchParams.get('userId') || 'anonymous';
  }

  /**
   * Check connection limit for user
   */
  checkConnectionLimit(userId) {
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId).length;

    return userConnections < this.options.maxConnectionsPerUser;
  }

  /**
   * Get server capabilities
   */
  getCapabilities() {
    return {
      compression: true,
      broadcast: this.options.enableBroadcast,
      patterns: true,
      sync: true,
      query: true,
      maxSubscriptions: 100,
      heartbeatInterval: this.options.heartbeatInterval
    };
  }

  /**
   * Restore subscriptions for reconnecting user
   */
  async restoreSubscriptions(userId, connectionId) {
    const key = `subscriptions:${userId}`;
    const subscriptions = await this.redis.smembers(key);

    if (subscriptions.length > 0) {
      await this.handleSubscribe(connectionId, {
        channels: subscriptions,
        patterns: []
      });
    }
  }

  /**
   * Send buffered events to connection
   */
  async sendBufferedEvents(userId, connectionId) {
    const buffer = this.eventBuffer.get(userId);
    if (!buffer || buffer.length === 0) return;

    for (const event of buffer) {
      this.sendToConnection(connectionId, event);
    }

    // Clear buffer
    this.eventBuffer.delete(userId);
  }

  /**
   * Buffer event for offline user
   */
  bufferEvent(userId, event) {
    if (!this.eventBuffer.has(userId)) {
      this.eventBuffer.set(userId, []);
    }

    const buffer = this.eventBuffer.get(userId);
    buffer.push(event);

    // Limit buffer size
    if (buffer.length > this.options.eventBufferSize) {
      buffer.shift();
    }
  }

  /**
   * Store disconnection info for reconnection
   */
  storeDisconnectionInfo(userId, connectionId) {
    const key = `disconnect:${userId}`;
    const value = JSON.stringify({
      connectionId,
      timestamp: Date.now()
    });

    this.redis.setex(key, this.options.reconnectWindow / 1000, value);
  }

  /**
   * Get memory updates within time range
   */
  async getMemoryUpdates(memoryIds, since, until) {
    const updates = [];

    for (const id of memoryIds) {
      const key = `updates:${id}`;
      const range = await this.redis.zrangebyscore(
        key,
        since || '-inf',
        until || '+inf',
        'WITHSCORES'
      );

      for (let i = 0; i < range.length; i += 2) {
        updates.push({
          memoryId: id,
          update: JSON.parse(range[i]),
          timestamp: parseInt(range[i + 1])
        });
      }
    }

    return updates;
  }

  /**
   * Send initial state for channels
   */
  async sendInitialState(connectionId, channels) {
    for (const channel of channels) {
      const state = await this.getChannelState(channel);
      this.sendToConnection(connectionId, {
        type: 'initial_state',
        channel,
        state,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get current state for a channel
   */
  async getChannelState(channel) {
    // Implementation would fetch current state from Redis/Mem0
    return {};
  }

  /**
   * Convert pattern to regex
   */
  patternToRegex(pattern) {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * Handle query request
   */
  async handleQuery(connectionId, message) {
    // Implementation for real-time queries
    const { query, options } = message;

    try {
      // Execute query logic here
      const results = await this.executeQuery(query, options);

      this.sendToConnection(connectionId, {
        type: 'query_response',
        results,
        query,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(connectionId, `Query failed: ${error.message}`);
    }
  }

  /**
   * Execute query
   */
  async executeQuery(query, options) {
    // Placeholder for query execution
    return [];
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      subscriptions: this.subscriptions.size,
      avgConnectionsPerUser: this.metrics.activeConnections /
        new Set(Array.from(this.connections.values()).map(c => c.userId)).size
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
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

    // Unsubscribe from Redis
    await this.redis.unsubscribe();
    await this.redis.punsubscribe();

    this.emit('shutdown');
  }
}