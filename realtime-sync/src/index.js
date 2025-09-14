#!/usr/bin/env node

import { config } from 'dotenv';
import Redis from 'ioredis';
import { EnhancedRealtimeSyncManager } from './enhanced-realtime-sync.js';
import { MonitoringServer } from './monitoring.js';
import { createLogger } from './logger.js';
import { CONFIG, validateConfig } from '../config/config.js';

// Load environment variables
config();

const logger = createLogger('Main');

/**
 * Main application entry point
 * Initializes and starts the enhanced realtime sync service
 */
class RealtimeSyncService {
  constructor() {
    this.redis = null;
    this.realtimeSync = null;
    this.monitoring = null;
    this.gracefulShutdown = false;
  }

  /**
   * Initialize all services
   */
  async initialize() {
    try {
      logger.info('Starting Mem0 Enhanced Realtime Sync Service...', {
        version: '2.0.0',
        environment: CONFIG.server.environment,
        features: {
          rabbitmq: !!CONFIG.rabbitmq.url,
          eventReplay: CONFIG.eventReplay.enabled,
          rateLimit: CONFIG.security.rateLimitEnabled,
          monitoring: CONFIG.monitoring.enabled
        }
      });

      // Validate configuration
      validateConfig();

      // Initialize Redis connection
      await this.initializeRedis();

      // Initialize enhanced realtime sync manager
      await this.initializeRealtimeSync();

      // Initialize monitoring server
      if (CONFIG.monitoring.enabled) {
        await this.initializeMonitoring();
      }

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      logger.info('Service initialization complete', {
        websocketPort: CONFIG.websocket.port,
        monitoringPort: CONFIG.monitoring.enabled ? CONFIG.monitoring.port : 'disabled',
        redisHost: CONFIG.redis.host,
        rabbitmqEnabled: !!this.realtimeSync.rabbitmq
      });

      return true;
    } catch (error) {
      logger.error('Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redis = new Redis({
        host: CONFIG.redis.host,
        port: CONFIG.redis.port,
        password: CONFIG.redis.password,
        db: CONFIG.redis.db,
        keyPrefix: CONFIG.redis.keyPrefix,
        maxRetriesPerRequest: CONFIG.redis.maxRetriesPerRequest,
        retryDelayOnFailover: CONFIG.redis.retryDelayOnFailover,
        lazyConnect: CONFIG.redis.lazyConnect,
        enableOfflineQueue: false,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        }
      });

      // Setup Redis event handlers
      this.redis.on('connect', () => {
        logger.info('Redis connected', {
          host: CONFIG.redis.host,
          port: CONFIG.redis.port,
          db: CONFIG.redis.db
        });
      });

      this.redis.on('error', (error) => {
        logger.error('Redis error:', error);
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', (delay) => {
        logger.info('Redis reconnecting', { delay });
      });

      // Test connection
      await this.redis.ping();
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Initialize enhanced realtime sync manager
   */
  async initializeRealtimeSync() {
    try {
      this.realtimeSync = new EnhancedRealtimeSyncManager(this.redis, {
        port: CONFIG.websocket.port,
        host: CONFIG.server.host
      });

      // Setup event handlers
      this.realtimeSync.on('connection', (data) => {
        logger.debug('New connection', {
          connectionId: data.connectionId,
          userId: data.userId
        });
      });

      this.realtimeSync.on('disconnect', (data) => {
        logger.debug('Connection disconnected', {
          connectionId: data.connectionId,
          userId: data.userId,
          duration: data.stats?.duration
        });
      });

      this.realtimeSync.on('error', (error) => {
        logger.error('Realtime sync error:', error);
      });

      this.realtimeSync.on('metrics', (metrics) => {
        logger.debug('Realtime sync metrics', metrics);
      });

      // Initialize the service
      await this.realtimeSync.initialize();
      logger.info('Enhanced Realtime Sync Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize realtime sync manager:', error);
      throw error;
    }
  }

  /**
   * Initialize monitoring server
   */
  async initializeMonitoring() {
    try {
      this.monitoring = new MonitoringServer(this.realtimeSync, {
        port: CONFIG.monitoring.port
      });

      await this.monitoring.start();
      logger.info('Monitoring server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize monitoring server:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.gracefulShutdown) {
        logger.warn('Forceful shutdown initiated');
        process.exit(1);
      }

      this.gracefulShutdown = true;
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        if (this.realtimeSync?.wss) {
          this.realtimeSync.wss.close();
        }

        // Give existing operations time to complete
        logger.info('Waiting for active operations to complete...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Shutdown services in order
        const shutdownPromises = [];

        if (this.monitoring) {
          shutdownPromises.push(
            this.monitoring.stop().catch(err =>
              logger.error('Error stopping monitoring:', err)
            )
          );
        }

        if (this.realtimeSync) {
          shutdownPromises.push(
            this.realtimeSync.shutdown().catch(err =>
              logger.error('Error stopping realtime sync:', err)
            )
          );
        }

        if (this.redis) {
          shutdownPromises.push(
            new Promise(resolve => {
              this.redis.disconnect();
              resolve();
            })
          );
        }

        await Promise.allSettled(shutdownPromises);

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { reason, promise });
      shutdown('UNHANDLED_REJECTION');
    });

    // Handle warnings
    process.on('warning', (warning) => {
      logger.warn('Process warning:', warning);
    });
  }

  /**
   * Start the service
   */
  async start() {
    try {
      await this.initialize();

      // Log startup success
      const memoryUsage = process.memoryUsage();
      logger.info('Service started successfully', {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      });

      // Keep the process alive
      return new Promise(() => {
        // This promise never resolves, keeping the service running
        // Shutdown is handled by signal handlers
      });
    } catch (error) {
      logger.error('Failed to start service:', error);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const service = new RealtimeSyncService();
    await service.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Startup failed:', error);
    process.exit(1);
  });
}

export { RealtimeSyncService };