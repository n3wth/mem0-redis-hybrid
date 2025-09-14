import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { database } from './database.js';
import { logger } from './utils/logger.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';

import graphRoutes from './routes/graph.js';
import visualizationRoutes from './routes/visualization.js';

class MemoryGraphServer {
  constructor() {
    this.app = express();
    this.apolloServer = null;
  }

  async initialize() {
    try {
      // Connect to Neo4j
      await database.connect();

      // Initialize Apollo Server
      this.apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }) => ({
          user: req.user // For future authentication
        }),
        introspection: true,
        playground: config.env !== 'production'
      });

      await this.apolloServer.start();

      // Configure middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Error handling
      this.setupErrorHandling();

      logger.info('Memory Graph Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: config.env === 'production' ? undefined : false
    }));

    // CORS
    this.app.use(cors(config.cors));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit(config.rateLimit);
    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          neo4j: 'connected'
        }
      });
    });

    // API routes
    this.app.use('/api/graph', graphRoutes);
    this.app.use('/api/visualization', visualizationRoutes);

    // GraphQL endpoint
    this.apolloServer.applyMiddleware({
      app: this.app,
      path: '/graphql',
      cors: false // Already handled above
    });

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Memory Graph API',
        version: '1.0.0',
        endpoints: {
          rest: {
            nodes: 'POST /api/graph/nodes',
            edges: 'POST /api/graph/edges',
            traverse: 'GET /api/graph/traverse',
            clusters: 'GET /api/graph/clusters',
            shortestPath: 'GET /api/graph/shortest-path',
            recommendations: 'GET /api/graph/recommendations',
            pagerank: 'GET /api/graph/pagerank',
            stats: 'GET /api/graph/stats'
          },
          visualization: {
            graphData: 'GET /api/visualization/graph-data',
            clusters: 'GET /api/visualization/clusters',
            hierarchy: 'GET /api/visualization/hierarchy',
            timeline: 'GET /api/visualization/timeline'
          },
          graphql: '/graphql'
        },
        documentation: 'Visit /graphql for GraphQL Playground'
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        error: config.env === 'production'
          ? 'Internal server error'
          : error.message,
        ...(config.env !== 'production' && { stack: error.stack })
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown();
    });
  }

  async start() {
    await this.initialize();

    const server = this.app.listen(config.port, () => {
      logger.info(`Memory Graph Server running on port ${config.port}`);
      logger.info(`GraphQL Playground: http://localhost:${config.port}/graphql`);
      logger.info(`REST API: http://localhost:${config.port}/api`);
      logger.info(`Health Check: http://localhost:${config.port}/health`);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    return server;
  }

  async shutdown() {
    logger.info('Shutting down Memory Graph Server...');

    try {
      if (this.apolloServer) {
        await this.apolloServer.stop();
      }

      await database.close();

      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MemoryGraphServer();
  server.start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default MemoryGraphServer;