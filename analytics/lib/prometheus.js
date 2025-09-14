const client = require('prom-client');

// Create custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const analyticsEventsTotal = new client.Counter({
  name: 'analytics_events_total',
  help: 'Total number of analytics events processed',
  labelNames: ['event_type', 'source']
});

const analyticsEventsDuration = new client.Histogram({
  name: 'analytics_events_duration_seconds',
  help: 'Duration of analytics event processing',
  labelNames: ['event_type', 'source']
});

const realtimeAggregationsTotal = new client.Counter({
  name: 'realtime_aggregations_total',
  help: 'Total number of realtime aggregations processed',
  labelNames: ['type']
});

const anomalyDetections = new client.Counter({
  name: 'anomaly_detections_total',
  help: 'Total number of anomalies detected',
  labelNames: ['type', 'severity']
});

const clickhouseQueries = new client.Counter({
  name: 'clickhouse_queries_total',
  help: 'Total number of ClickHouse queries executed',
  labelNames: ['operation', 'table']
});

const clickhouseQueryDuration = new client.Histogram({
  name: 'clickhouse_query_duration_seconds',
  help: 'Duration of ClickHouse queries',
  labelNames: ['operation', 'table']
});

const redisOperations = new client.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation']
});

const redisOperationDuration = new client.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['operation']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type']
});

const memoryUsage = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

function setupPrometheusMetrics() {
  // Register default metrics (CPU, memory, etc.)
  client.register.setDefaultLabels({
    service: 'analytics-dashboard',
    version: process.env.npm_package_version || '1.0.0'
  });

  // Collect default metrics every 10 seconds
  client.collectDefaultMetrics({
    timeout: 10000,
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
  });

  // Update memory usage every 30 seconds
  setInterval(() => {
    const usage = process.memoryUsage();
    memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
    memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
    memoryUsage.set({ type: 'rss' }, usage.rss);
    memoryUsage.set({ type: 'external' }, usage.external);
  }, 30000);
}

// Middleware to track HTTP requests
function trackHttpRequests(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
}

// Analytics event tracking
function trackAnalyticsEvent(eventType, source, duration = null) {
  analyticsEventsTotal.labels(eventType, source).inc();

  if (duration !== null) {
    analyticsEventsDuration.labels(eventType, source).observe(duration);
  }
}

// Realtime aggregation tracking
function trackRealtimeAggregation(type) {
  realtimeAggregationsTotal.labels(type).inc();
}

// Anomaly detection tracking
function trackAnomalyDetection(type, severity) {
  anomalyDetections.labels(type, severity).inc();
}

// ClickHouse operation tracking
function trackClickHouseQuery(operation, table, duration) {
  clickhouseQueries.labels(operation, table).inc();
  clickhouseQueryDuration.labels(operation, table).observe(duration);
}

// Redis operation tracking
function trackRedisOperation(operation, duration) {
  redisOperations.labels(operation).inc();
  redisOperationDuration.labels(operation).observe(duration);
}

// Connection tracking
function updateActiveConnections(type, count) {
  activeConnections.set({ type }, count);
}

module.exports = {
  client,
  setupPrometheusMetrics,
  trackHttpRequests,
  trackAnalyticsEvent,
  trackRealtimeAggregation,
  trackAnomalyDetection,
  trackClickHouseQuery,
  trackRedisOperation,
  updateActiveConnections,
  metrics: {
    httpRequestDuration,
    httpRequestsTotal,
    analyticsEventsTotal,
    analyticsEventsDuration,
    realtimeAggregationsTotal,
    anomalyDetections,
    clickhouseQueries,
    clickhouseQueryDuration,
    redisOperations,
    redisOperationDuration,
    activeConnections,
    memoryUsage
  }
};