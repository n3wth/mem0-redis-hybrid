import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { createLogger } from './logger.js';
import { CONFIG } from '../config/config.js';

const logger = createLogger('Monitoring');

/**
 * Monitoring and health check server for the realtime sync service
 * Provides endpoints for metrics, health checks, and service status
 */
export class MonitoringServer {
  constructor(realtimeSyncManager, options = {}) {
    this.realtimeSync = realtimeSyncManager;
    this.options = {
      ...CONFIG.monitoring,
      ...options
    };

    this.app = express();
    this.server = null;
    this.startTime = Date.now();

    this.metrics = {
      httpRequests: 0,
      healthChecks: 0,
      errors: 0,
      uptime: 0,
      memoryUsage: {},
      systemLoad: {}
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.startMetricsCollection();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API endpoints
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: CONFIG.security.corsOrigins,
      credentials: true
    }));

    // Compression
    if (CONFIG.security.compressionEnabled) {
      this.app.use(compression());
    }

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      this.metrics.httpRequests++;
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug('HTTP request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          userAgent: req.headers['user-agent']
        });
      });

      next();
    });

    // Error handling
    this.app.use((err, req, res, next) => {
      this.metrics.errors++;
      logger.error('Express error:', err);

      res.status(500).json({
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    });
  }

  /**
   * Setup monitoring routes
   */
  setupRoutes() {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'mem0-realtime-sync-monitoring',
        version: '2.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime
      });
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      this.metrics.healthChecks++;

      try {
        const health = await this.getHealthStatus();
        const status = health.status === 'healthy' ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Detailed health check
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const health = await this.getDetailedHealth();
        const status = health.status === 'healthy' ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Metrics endpoint (Prometheus format)
    this.app.get('/metrics', async (req, res) => {
      try {
        const format = req.query.format || 'prometheus';
        const metrics = await this.getMetrics();

        if (format === 'json') {
          res.json(metrics);
        } else {
          // Prometheus format
          const prometheusMetrics = this.formatPrometheusMetrics(metrics);
          res.setHeader('Content-Type', 'text/plain');
          res.send(prometheusMetrics);
        }
      } catch (error) {
        logger.error('Metrics collection failed:', error);
        res.status(500).json({
          error: 'Failed to collect metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // System status endpoint
    this.app.get('/status', async (req, res) => {
      try {
        const status = await this.getSystemStatus();
        res.json(status);
      } catch (error) {
        logger.error('Status collection failed:', error);
        res.status(500).json({
          error: 'Failed to collect status',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Connection details
    this.app.get('/connections', async (req, res) => {
      try {
        const connections = await this.getConnectionDetails();
        res.json(connections);
      } catch (error) {
        logger.error('Connection details failed:', error);
        res.status(500).json({
          error: 'Failed to get connection details',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Performance metrics
    this.app.get('/performance', async (req, res) => {
      try {
        const performance = await this.getPerformanceMetrics();
        res.json(performance);
      } catch (error) {
        logger.error('Performance metrics failed:', error);
        res.status(500).json({
          error: 'Failed to get performance metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Configuration endpoint (non-sensitive parts only)
    this.app.get('/config', (req, res) => {
      res.json({
        websocket: {
          port: CONFIG.websocket.port || this.options.port,
          compressionThreshold: CONFIG.websocket.compressionThreshold,
          maxConnectionsPerUser: CONFIG.websocket.maxConnectionsPerUser,
          heartbeatInterval: CONFIG.websocket.heartbeatInterval
        },
        features: {
          rabbitmq: !!this.realtimeSync.rabbitmq,
          eventReplay: CONFIG.eventReplay.enabled,
          rateLimit: CONFIG.security.rateLimitEnabled,
          monitoring: CONFIG.monitoring.enabled
        },
        environment: CONFIG.server.environment
      });
    });

    // Logs endpoint (last N lines)
    this.app.get('/logs', (req, res) => {
      const lines = parseInt(req.query.lines) || 100;
      const level = req.query.level || 'info';

      // In production, you might want to read from log files
      res.json({
        message: 'Log streaming not implemented in this demo',
        suggestion: 'Use docker logs or file-based logging',
        parameters: { lines, level }
      });
    });

    // Force garbage collection (development only)
    if (CONFIG.server.environment === 'development') {
      this.app.post('/gc', (req, res) => {
        if (global.gc) {
          global.gc();
          res.json({
            message: 'Garbage collection triggered',
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(400).json({
            error: 'Garbage collection not available',
            suggestion: 'Start with --expose-gc flag'
          });
        }
      });
    }
  }

  /**
   * Get basic health status
   */
  async getHealthStatus() {
    const checks = await Promise.allSettled([
      this.checkWebSocketServer(),
      this.checkRedisConnection(),
      this.checkRabbitMQConnection(),
      this.checkMemoryUsage()
    ]);

    const results = {
      websocket: checks[0].status === 'fulfilled' && checks[0].value,
      redis: checks[1].status === 'fulfilled' && checks[1].value,
      rabbitmq: checks[2].status === 'fulfilled' && checks[2].value,
      memory: checks[3].status === 'fulfilled' && checks[3].value
    };

    const isHealthy = Object.values(results).every(check => check === true);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: results
    };
  }

  /**
   * Get detailed health information
   */
  async getDetailedHealth() {
    const basic = await this.getHealthStatus();
    const metrics = await this.getMetrics();
    const performance = await this.getPerformanceMetrics();

    return {
      ...basic,
      metrics: {
        connections: metrics.realtime?.activeConnections || 0,
        totalRequests: this.metrics.httpRequests,
        errors: this.metrics.errors
      },
      performance: {
        memoryUsage: performance.memory,
        cpuUsage: performance.cpu,
        eventLoopDelay: performance.eventLoop
      },
      subsystems: metrics.subsystems || {}
    };
  }

  /**
   * Individual health checks
   */
  async checkWebSocketServer() {
    return this.realtimeSync && this.realtimeSync.wss &&
           this.realtimeSync.wss.readyState !== 3;
  }

  async checkRedisConnection() {
    try {
      await this.realtimeSync.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkRabbitMQConnection() {
    return this.realtimeSync.rabbitmq?.isConnected || false;
  }

  async checkMemoryUsage() {
    const usage = process.memoryUsage();
    const maxMemory = 512 * 1024 * 1024; // 512MB threshold
    return usage.heapUsed < maxMemory;
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics() {
    const processMetrics = this.getProcessMetrics();
    const realtimeMetrics = await this.realtimeSync.getServerStatus();

    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      process: processMetrics,
      realtime: realtimeMetrics.metrics || {},
      subsystems: realtimeMetrics.subsystems || {},
      monitoring: {
        httpRequests: this.metrics.httpRequests,
        healthChecks: this.metrics.healthChecks,
        errors: this.metrics.errors
      }
    };
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    const connections = this.realtimeSync.connections.size;
    const subscriptions = this.realtimeSync.subscriptions.size;
    const userConnections = this.realtimeSync.userConnections.size;

    return {
      timestamp: new Date().toISOString(),
      service: {
        status: 'running',
        uptime: Date.now() - this.startTime,
        version: '2.0.0',
        environment: CONFIG.server.environment
      },
      connections: {
        active: connections,
        subscriptions,
        users: userConnections,
        maxPerUser: CONFIG.websocket.maxConnectionsPerUser
      },
      features: {
        rabbitmq: {
          enabled: !!this.realtimeSync.rabbitmq,
          connected: this.realtimeSync.rabbitmq?.isConnected || false
        },
        eventReplay: {
          enabled: CONFIG.eventReplay.enabled,
          retentionDays: CONFIG.eventReplay.retentionDays
        },
        rateLimit: {
          enabled: CONFIG.security.rateLimitEnabled,
          points: CONFIG.rateLimit.points,
          duration: CONFIG.rateLimit.duration
        }
      }
    };
  }

  /**
   * Get connection details
   */
  async getConnectionDetails() {
    const connections = Array.from(this.realtimeSync.connections.values())
      .map(conn => ({
        id: conn.id,
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        uptime: Date.now() - conn.connectedAt,
        messageCount: conn.messageCount,
        subscriptions: conn.subscriptions.size,
        patterns: conn.patterns.size,
        bytesReceived: conn.bytesReceived,
        bytesSent: conn.bytesSent,
        compressionEnabled: conn.compressionEnabled,
        lastActivity: conn.lastActivity,
        metadata: {
          ip: conn.metadata.ip,
          userAgent: conn.metadata.userAgent?.substring(0, 50) + '...'
        }
      }));

    return {
      timestamp: new Date().toISOString(),
      totalConnections: connections.length,
      connections: connections.slice(0, 100), // Limit to 100 for performance
      summary: {
        averageUptime: connections.length > 0 ?
          connections.reduce((sum, conn) => sum + conn.uptime, 0) / connections.length : 0,
        totalMessages: connections.reduce((sum, conn) => sum + conn.messageCount, 0),
        totalBytes: {
          received: connections.reduce((sum, conn) => sum + conn.bytesReceived, 0),
          sent: connections.reduce((sum, conn) => sum + conn.bytesSent, 0)
        }
      }
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    const memory = process.memoryUsage();
    const usage = process.cpuUsage();

    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers,
        heapUtilization: (memory.heapUsed / memory.heapTotal * 100).toFixed(2) + '%'
      },
      cpu: {
        user: usage.user,
        system: usage.system,
        total: usage.user + usage.system
      },
      eventLoop: {
        delay: await this.measureEventLoopDelay()
      },
      uptime: process.uptime(),
      platform: {
        arch: process.arch,
        platform: process.platform,
        nodeVersion: process.version
      }
    };
  }

  /**
   * Get process metrics
   */
  getProcessMetrics() {
    const memory = process.memoryUsage();
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external
      },
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform
    };
  }

  /**
   * Format metrics for Prometheus
   */
  formatPrometheusMetrics(metrics) {
    const lines = [];

    // Add metadata
    lines.push('# HELP mem0_realtime_connections_active Number of active WebSocket connections');
    lines.push('# TYPE mem0_realtime_connections_active gauge');
    lines.push(`mem0_realtime_connections_active ${metrics.realtime.activeConnections || 0}`);

    lines.push('# HELP mem0_realtime_connections_total Total number of connections since startup');
    lines.push('# TYPE mem0_realtime_connections_total counter');
    lines.push(`mem0_realtime_connections_total ${metrics.realtime.totalConnections || 0}`);

    lines.push('# HELP mem0_realtime_messages_per_second Messages processed per second');
    lines.push('# TYPE mem0_realtime_messages_per_second gauge');
    lines.push(`mem0_realtime_messages_per_second ${metrics.realtime.messagesPerSecond || 0}`);

    lines.push('# HELP mem0_realtime_bytes_transmitted Total bytes transmitted');
    lines.push('# TYPE mem0_realtime_bytes_transmitted counter');
    lines.push(`mem0_realtime_bytes_transmitted ${metrics.realtime.bytesTransmitted || 0}`);

    lines.push('# HELP mem0_process_memory_heap_used Process heap memory used in bytes');
    lines.push('# TYPE mem0_process_memory_heap_used gauge');
    lines.push(`mem0_process_memory_heap_used ${metrics.process.memory.heapUsed}`);

    lines.push('# HELP mem0_http_requests_total Total HTTP requests to monitoring server');
    lines.push('# TYPE mem0_http_requests_total counter');
    lines.push(`mem0_http_requests_total ${metrics.monitoring.httpRequests}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Measure event loop delay
   */
  measureEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(delay);
      });
    });
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    setInterval(() => {
      this.metrics.uptime = Date.now() - this.startTime;
      this.metrics.memoryUsage = process.memoryUsage();

      // Emit metrics event
      if (this.realtimeSync) {
        this.realtimeSync.emit('monitoring-metrics', this.metrics);
      }
    }, this.options.metricsInterval);
  }

  /**
   * Start the monitoring server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, (error) => {
        if (error) {
          logger.error('Failed to start monitoring server:', error);
          reject(error);
          return;
        }

        logger.info('Monitoring server started', {
          port: this.options.port,
          environment: CONFIG.server.environment
        });

        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Monitoring server error:', error);
        this.metrics.errors++;
      });
    });
  }

  /**
   * Stop the monitoring server
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('Monitoring server stopped');
          resolve();
        });
      });
    }
  }
}