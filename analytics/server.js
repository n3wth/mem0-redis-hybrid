const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { setupPrometheusMetrics } = require('./lib/prometheus');
const { setupClickHouse } = require('./lib/clickhouse');
const { setupRedis } = require('./lib/redis');
const { setupLogger } = require('./lib/logger');
const analyticsRoutes = require('./routes/analytics');
const metricsRoutes = require('./routes/metrics');
const reportsRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize logger
const logger = setupLogger();

// Security and performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/analytics', limiter);

// Initialize services
async function initializeServices() {
  try {
    // Setup Prometheus metrics
    setupPrometheusMetrics();
    logger.info('Prometheus metrics initialized');

    // Setup ClickHouse connection
    await setupClickHouse();
    logger.info('ClickHouse connection established');

    // Setup Redis connection
    await setupRedis();
    logger.info('Redis connection established');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Routes
app.use('/analytics', analyticsRoutes);
app.use('/metrics', metricsRoutes);
app.use('/reports', reportsRoutes);
app.use('/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'analytics-dashboard'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Scheduled tasks for real-time aggregations
cron.schedule('*/1 * * * *', async () => {
  // Run real-time aggregations every minute
  const { processRealtimeAggregations } = require('./lib/aggregations');
  try {
    await processRealtimeAggregations();
    logger.debug('Realtime aggregations processed');
  } catch (error) {
    logger.error('Failed to process realtime aggregations:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const { closeConnections } = require('./lib/connections');
  await closeConnections();
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();

  app.listen(PORT, () => {
    logger.info(`Analytics Dashboard running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Metrics: http://localhost:${PORT}/metrics`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;