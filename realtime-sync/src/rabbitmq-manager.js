import amqp from 'amqplib';
import { createLogger } from './logger.js';
import { CONFIG } from '../config/config.js';

const logger = createLogger('RabbitMQManager');

/**
 * Enhanced RabbitMQ manager for message queuing and event distribution
 * Handles connection management, queue setup, publishing, and consuming
 */
export class RabbitMQManager {
  constructor(config = CONFIG.rabbitmq) {
    this.config = config;
    this.connection = null;
    this.channel = null;
    this.publishChannel = null;
    this.consumers = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.messageQueue = [];
    this.metrics = {
      messagesPublished: 0,
      messagesConsumed: 0,
      connectionAttempts: 0,
      errors: 0
    };
  }

  /**
   * Initialize RabbitMQ connection and setup
   */
  async initialize() {
    try {
      logger.info('Connecting to RabbitMQ...', { url: this.config.url });

      // Create connection with options
      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.options.heartbeat,
        clientProperties: {
          connection_name: 'mem0-realtime-sync'
        }
      });

      // Handle connection events
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

      // Create channels
      this.channel = await this.connection.createChannel();
      this.publishChannel = await this.connection.createConfirmChannel();

      // Set prefetch for better load balancing
      await this.channel.prefetch(this.config.options.prefetch);
      await this.publishChannel.prefetch(this.config.options.prefetch);

      // Setup exchanges and queues
      await this.setupExchangesAndQueues();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.metrics.connectionAttempts++;

      logger.info('RabbitMQ connected successfully');

      // Process any queued messages
      await this.processQueuedMessages();

      return true;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Setup exchanges and queues
   */
  async setupExchangesAndQueues() {
    const { exchange, exchangeType, queues } = this.config;

    try {
      // Declare main exchange
      await this.channel.assertExchange(exchange, exchangeType, {
        durable: this.config.options.durable
      });

      // Declare dead letter exchange
      await this.channel.assertExchange(`${exchange}.dlx`, 'direct', {
        durable: this.config.options.durable
      });

      // Setup queues
      const queueOptions = {
        durable: this.config.options.durable,
        arguments: {
          'x-dead-letter-exchange': `${exchange}.dlx`,
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours
          'x-max-length': 100000 // Max queue length
        }
      };

      // Main event queue
      await this.channel.assertQueue(queues.events, queueOptions);
      await this.channel.bindQueue(queues.events, exchange, 'events.*');

      // Event replay queue
      await this.channel.assertQueue(queues.replay, queueOptions);
      await this.channel.bindQueue(queues.replay, exchange, 'replay.*');

      // Dead letter queue
      await this.channel.assertQueue(queues.deadLetter, {
        durable: this.config.options.durable
      });
      await this.channel.bindQueue(queues.deadLetter, `${exchange}.dlx`, '#');

      logger.info('RabbitMQ exchanges and queues setup complete');
    } catch (error) {
      logger.error('Failed to setup exchanges and queues:', error);
      throw error;
    }
  }

  /**
   * Publish event to RabbitMQ
   */
  async publishEvent(routingKey, event, options = {}) {
    if (!this.isConnected) {
      // Queue message for later if not connected
      this.messageQueue.push({ routingKey, event, options });
      logger.warn('RabbitMQ not connected, queuing message');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));
      const publishOptions = {
        persistent: this.config.options.persistent,
        timestamp: Date.now(),
        messageId: options.messageId || event.id,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        headers: {
          source: 'mem0-realtime-sync',
          version: '1.0.0',
          ...options.headers
        },
        ...options
      };

      const published = await new Promise((resolve, reject) => {
        this.publishChannel.publish(
          this.config.exchange,
          routingKey,
          message,
          publishOptions,
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      });

      if (published) {
        this.metrics.messagesPublished++;
        logger.debug('Event published:', { routingKey, eventId: event.id });
      }

      return published;
    } catch (error) {
      logger.error('Failed to publish event:', error);
      this.metrics.errors++;

      // Queue for retry
      this.messageQueue.push({ routingKey, event, options });
      return false;
    }
  }

  /**
   * Subscribe to events with pattern matching
   */
  async subscribeToEvents(pattern, handler, options = {}) {
    if (!this.isConnected) {
      throw new Error('RabbitMQ not connected');
    }

    try {
      const queueName = options.queueName || `${pattern}-${Date.now()}`;
      const queueOptions = {
        exclusive: options.exclusive !== false,
        durable: options.durable || false,
        autoDelete: options.autoDelete !== false
      };

      // Declare queue
      const { queue } = await this.channel.assertQueue(queueName, queueOptions);

      // Bind to exchange with pattern
      await this.channel.bindQueue(queue, this.config.exchange, pattern);

      // Start consuming
      const consumerTag = await this.channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          const metadata = {
            routingKey: msg.fields.routingKey,
            exchange: msg.fields.exchange,
            timestamp: msg.properties.timestamp,
            messageId: msg.properties.messageId,
            headers: msg.properties.headers
          };

          await handler(event, metadata);
          this.channel.ack(msg);
          this.metrics.messagesConsumed++;
        } catch (error) {
          logger.error('Error processing message:', error);
          this.metrics.errors++;

          // Reject and potentially requeue based on options
          this.channel.reject(msg, options.requeue !== false);
        }
      }, {
        noAck: false,
        consumerTag: options.consumerTag
      });

      // Store consumer info
      this.consumers.set(consumerTag, {
        pattern,
        queue,
        handler,
        options
      });

      logger.info('Subscribed to events:', { pattern, queue, consumerTag });
      return consumerTag;
    } catch (error) {
      logger.error('Failed to subscribe to events:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(consumerTag) {
    if (!this.consumers.has(consumerTag)) {
      logger.warn('Consumer not found:', consumerTag);
      return false;
    }

    try {
      await this.channel.cancel(consumerTag);
      const consumer = this.consumers.get(consumerTag);
      this.consumers.delete(consumerTag);

      logger.info('Unsubscribed from events:', {
        pattern: consumer.pattern,
        consumerTag
      });
      return true;
    } catch (error) {
      logger.error('Failed to unsubscribe:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Publish event for replay
   */
  async publishForReplay(userId, event, retentionDays = 7) {
    const replayEvent = {
      ...event,
      userId,
      replayMetadata: {
        originalTimestamp: event.timestamp || Date.now(),
        retentionDays,
        createdAt: Date.now()
      }
    };

    return this.publishEvent(
      `replay.user.${userId}`,
      replayEvent,
      {
        expiration: retentionDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
        headers: {
          'x-replay-event': true,
          'x-user-id': userId
        }
      }
    );
  }

  /**
   * Get events for replay
   */
  async getReplayEvents(userId, since, limit = 1000) {
    if (!this.isConnected) {
      throw new Error('RabbitMQ not connected');
    }

    return new Promise((resolve, reject) => {
      const events = [];
      const queueName = `replay-fetch-${userId}-${Date.now()}`;

      // Create temporary queue for fetching replay events
      this.channel.assertQueue(queueName, { exclusive: true, autoDelete: true })
        .then(() => {
          return this.channel.bindQueue(queueName, this.config.exchange, `replay.user.${userId}`);
        })
        .then(() => {
          let messageCount = 0;
          const timeout = setTimeout(() => {
            resolve(events);
          }, 5000); // 5 second timeout

          return this.channel.consume(queueName, (msg) => {
            if (!msg) {
              clearTimeout(timeout);
              resolve(events);
              return;
            }

            try {
              const event = JSON.parse(msg.content.toString());

              // Filter by timestamp if specified
              if (!since || event.replayMetadata?.originalTimestamp >= since) {
                events.push(event);
                messageCount++;
              }

              this.channel.ack(msg);

              // Stop if we've reached the limit
              if (messageCount >= limit) {
                clearTimeout(timeout);
                resolve(events);
              }
            } catch (error) {
              logger.error('Error parsing replay event:', error);
              this.channel.ack(msg);
            }
          }, { noAck: false });
        })
        .catch(reject);
    });
  }

  /**
   * Process queued messages
   */
  async processQueuedMessages() {
    if (this.messageQueue.length === 0) return;

    logger.info(`Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        await this.publishEvent(message.routingKey, message.event, message.options);
      } catch (error) {
        logger.error('Failed to process queued message:', error);
        // Re-queue failed messages
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    logger.error('RabbitMQ connection error:', error);
    this.isConnected = false;
    this.metrics.errors++;

    // Attempt reconnection
    this.attemptReconnection();
  }

  /**
   * Handle connection close
   */
  handleConnectionClose() {
    logger.warn('RabbitMQ connection closed');
    this.isConnected = false;

    // Attempt reconnection
    this.attemptReconnection();
  }

  /**
   * Attempt to reconnect to RabbitMQ
   */
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.initialize();
        logger.info('RabbitMQ reconnected successfully');
      } catch (error) {
        logger.error('Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      activeConsumers: this.consumers.size,
      consumers: Array.from(this.consumers.values()).map(c => ({
        pattern: c.pattern,
        queue: c.queue
      }))
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down RabbitMQ manager...');

    try {
      // Cancel all consumers
      for (const [consumerTag] of this.consumers) {
        await this.unsubscribe(consumerTag);
      }

      // Close channels
      if (this.channel) {
        await this.channel.close();
      }
      if (this.publishChannel) {
        await this.publishChannel.close();
      }

      // Close connection
      if (this.connection) {
        await this.connection.close();
      }

      this.isConnected = false;
      logger.info('RabbitMQ manager shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}