import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import configurations and services
import elasticsearchClient from './config/elasticsearch.js';
import redisCache from './config/redis.js';
import searchService from './services/searchService.js';

// Import GraphQL schema and routes
import { typeDefs, resolvers } from './graphql/schema.js';
import searchRoutes from './routes/searchRoutes.js';

class SearchQueryServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.apolloServer = null;
  }

  async initialize() {
    console.log('🚀 Starting Search Query Microservice...');

    // Connect to services
    await this.connectServices();

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Setup GraphQL
    await this.setupGraphQL();

    // Start server
    await this.startServer();

    console.log('✅ Search Query Microservice ready!');
  }

  async connectServices() {
    console.log('📡 Connecting to services...');

    try {
      // Initialize Elasticsearch
      await elasticsearchClient.initialize();
      console.log('✅ Elasticsearch connected');

      // Connect to Redis
      await redisCache.connect();
      console.log('✅ Redis connected');

    } catch (error) {
      console.error('❌ Service connection failed:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    console.log('⚙️ Setting up middleware...');

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.RATE_LIMIT || 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests',
        retry_after: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/api/', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        // Check Elasticsearch
        await elasticsearchClient.client.ping();
        const esHealth = 'connected';

        // Check Redis
        const redisHealth = redisCache.connected ? 'connected' : 'disconnected';

        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            elasticsearch: esHealth,
            redis: redisHealth
          },
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  setupRoutes() {
    console.log('🛣️ Setting up routes...');

    // API routes
    this.app.use('/api/v1', searchRoutes);

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        service: 'Search Query Microservice',
        version: '1.0.0',
        endpoints: {
          rest_api: {
            base_url: '/api/v1',
            endpoints: [
              'POST /search - Full-text search',
              'POST /search/semantic - Semantic search',
              'POST /search/advanced - Advanced search with filters',
              'GET /search/suggestions - Auto-complete suggestions',
              'GET /search/facets - Available facets',
              'POST /search/similar - Similar documents',
              'POST /search/category/:category - Category search',
              'GET /search/stats - Search statistics',
              'POST /search/index - Index document',
              'POST /search/bulk - Bulk index documents'
            ]
          },
          graphql: {
            endpoint: '/graphql',
            playground: process.env.NODE_ENV !== 'production'
          },
          health: '/health'
        },
        authentication: 'Not required (configure as needed)',
        rate_limits: '1000 requests per 15 minutes per IP'
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Recall Search Query Microservice',
        status: 'running',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health',
        graphql: '/graphql'
      });
    });
  }

  async setupGraphQL() {
    console.log('🎯 Setting up GraphQL...');

    this.apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => ({
        searchService,
        elasticsearchClient,
        redisCache,
        req
      }),
      introspection: process.env.NODE_ENV !== 'production',
      playground: process.env.NODE_ENV !== 'production',
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          code: error.extensions?.code,
          path: error.path
        };
      }
    });

    await this.apolloServer.start();
    this.apolloServer.applyMiddleware({
      app: this.app,
      path: '/graphql',
      cors: false // CORS already configured
    });

    console.log('✅ GraphQL server ready at /graphql');
  }

  async startServer() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🌟 Search Query Microservice running on http://localhost:${this.port}`);
        console.log(`📊 GraphQL Playground: http://localhost:${this.port}/graphql`);
        console.log(`📚 API Documentation: http://localhost:${this.port}/api/docs`);
        console.log(`❤️ Health Check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  async shutdown() {
    console.log('🛑 Shutting down Search Query Microservice...');

    if (this.apolloServer) {
      await this.apolloServer.stop();
      console.log('✅ GraphQL server stopped');
    }

    if (this.server) {
      this.server.close(() => {
        console.log('✅ HTTP server stopped');
      });
    }

    // Close service connections
    try {
      await redisCache.client?.quit();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis:', error);
    }

    try {
      await elasticsearchClient.client?.close();
      console.log('✅ Elasticsearch connection closed');
    } catch (error) {
      console.error('❌ Error closing Elasticsearch:', error);
    }

    console.log('👋 Search Query Microservice shut down complete');
  }
}

// Handle graceful shutdown
const server = new SearchQueryServer();

process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
server.initialize().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default server;