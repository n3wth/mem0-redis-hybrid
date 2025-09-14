const { createClient } = require('@clickhouse/client');
const { trackClickHouseQuery } = require('./prometheus');
const logger = require('./logger').getLogger();

let clickhouseClient = null;

async function setupClickHouse() {
  const config = {
    host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DB || 'analytics',
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
    },
    request_timeout: 30000,
    max_open_connections: 10,
  };

  try {
    clickhouseClient = createClient(config);

    // Test connection
    await clickhouseClient.ping();
    logger.info('ClickHouse connection successful');

    // Initialize tables
    await initializeTables();

  } catch (error) {
    logger.error('Failed to connect to ClickHouse:', error);
    throw error;
  }
}

async function initializeTables() {
  // Events table for raw analytics events
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS events (
      id String,
      event_type String,
      user_id String,
      session_id String,
      timestamp DateTime64(3),
      properties Map(String, String),
      source String,
      ip_address String,
      user_agent String,
      created_at DateTime64(3) DEFAULT now64()
    ) ENGINE = MergeTree()
    ORDER BY (event_type, timestamp)
    PARTITION BY toYYYYMM(timestamp)
    SETTINGS index_granularity = 8192
  `, 'CREATE', 'events');

  // Aggregated metrics table
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS metrics_hourly (
      event_type String,
      source String,
      hour DateTime,
      count UInt64,
      unique_users UInt64,
      unique_sessions UInt64,
      created_at DateTime DEFAULT now()
    ) ENGINE = SummingMergeTree(count, unique_users, unique_sessions)
    ORDER BY (event_type, source, hour)
    PARTITION BY toYYYYMM(hour)
  `, 'CREATE', 'metrics_hourly');

  // User sessions table
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id String,
      user_id String,
      start_time DateTime64(3),
      end_time DateTime64(3),
      page_views UInt32,
      events UInt32,
      source String,
      ip_address String,
      user_agent String,
      created_at DateTime64(3) DEFAULT now64()
    ) ENGINE = ReplacingMergeTree(created_at)
    ORDER BY session_id
    PARTITION BY toYYYYMM(start_time)
  `, 'CREATE', 'user_sessions');

  // Anomalies table
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id String,
      type String,
      severity String,
      metric_name String,
      expected_value Float64,
      actual_value Float64,
      threshold Float64,
      timestamp DateTime64(3),
      details Map(String, String),
      created_at DateTime64(3) DEFAULT now64()
    ) ENGINE = MergeTree()
    ORDER BY (type, timestamp)
    PARTITION BY toYYYYMM(timestamp)
  `, 'CREATE', 'anomalies');

  logger.info('ClickHouse tables initialized');
}

async function executeQuery(query, operation = 'SELECT', table = 'unknown') {
  const start = Date.now();

  try {
    const result = await clickhouseClient.query({
      query,
      format: 'JSONEachRow',
    });

    const duration = (Date.now() - start) / 1000;
    trackClickHouseQuery(operation, table, duration);

    if (operation === 'SELECT') {
      return await result.json();
    }

    return result;

  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    trackClickHouseQuery(operation + '_ERROR', table, duration);

    logger.error(`ClickHouse query failed: ${query}`, error);
    throw error;
  }
}

async function insertEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return;
  }

  const formattedEvents = events.map(event => ({
    id: event.id || generateId(),
    event_type: event.event_type,
    user_id: event.user_id || '',
    session_id: event.session_id || '',
    timestamp: new Date(event.timestamp || Date.now()).toISOString(),
    properties: event.properties || {},
    source: event.source || 'unknown',
    ip_address: event.ip_address || '',
    user_agent: event.user_agent || '',
  }));

  await clickhouseClient.insert({
    table: 'events',
    values: formattedEvents,
    format: 'JSONEachRow',
  });

  trackClickHouseQuery('INSERT', 'events', 0);
  return formattedEvents.length;
}

async function getEventStats(filters = {}) {
  const whereConditions = [];

  if (filters.event_type) {
    whereConditions.push(`event_type = '${filters.event_type}'`);
  }

  if (filters.source) {
    whereConditions.push(`source = '${filters.source}'`);
  }

  if (filters.start_date) {
    whereConditions.push(`timestamp >= '${filters.start_date}'`);
  }

  if (filters.end_date) {
    whereConditions.push(`timestamp <= '${filters.end_date}'`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT
      event_type,
      source,
      count() as total_events,
      uniq(user_id) as unique_users,
      uniq(session_id) as unique_sessions,
      toStartOfHour(timestamp) as hour
    FROM events
    ${whereClause}
    GROUP BY event_type, source, hour
    ORDER BY hour DESC
    LIMIT 1000
  `;

  return await executeQuery(query, 'SELECT', 'events');
}

async function getTopEvents(limit = 10, timeRange = '24h') {
  const timeCondition = getTimeCondition(timeRange);

  const query = `
    SELECT
      event_type,
      count() as count,
      uniq(user_id) as unique_users
    FROM events
    WHERE ${timeCondition}
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return await executeQuery(query, 'SELECT', 'events');
}

async function getUserJourney(userId, limit = 100) {
  const query = `
    SELECT
      event_type,
      timestamp,
      properties,
      session_id
    FROM events
    WHERE user_id = '${userId}'
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return await executeQuery(query, 'SELECT', 'events');
}

async function insertAnomalies(anomalies) {
  if (!Array.isArray(anomalies) || anomalies.length === 0) {
    return;
  }

  const formattedAnomalies = anomalies.map(anomaly => ({
    id: anomaly.id || generateId(),
    type: anomaly.type,
    severity: anomaly.severity,
    metric_name: anomaly.metric_name,
    expected_value: anomaly.expected_value,
    actual_value: anomaly.actual_value,
    threshold: anomaly.threshold,
    timestamp: new Date(anomaly.timestamp || Date.now()).toISOString(),
    details: anomaly.details || {},
  }));

  await clickhouseClient.insert({
    table: 'anomalies',
    values: formattedAnomalies,
    format: 'JSONEachRow',
  });

  trackClickHouseQuery('INSERT', 'anomalies', 0);
  return formattedAnomalies.length;
}

async function getAnomalies(filters = {}) {
  const whereConditions = [];

  if (filters.type) {
    whereConditions.push(`type = '${filters.type}'`);
  }

  if (filters.severity) {
    whereConditions.push(`severity = '${filters.severity}'`);
  }

  if (filters.start_date) {
    whereConditions.push(`timestamp >= '${filters.start_date}'`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT *
    FROM anomalies
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT 100
  `;

  return await executeQuery(query, 'SELECT', 'anomalies');
}

function getTimeCondition(timeRange) {
  const now = new Date();
  let startTime;

  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return `timestamp >= '${startTime.toISOString()}'`;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

async function closeConnection() {
  if (clickhouseClient) {
    await clickhouseClient.close();
    logger.info('ClickHouse connection closed');
  }
}

module.exports = {
  setupClickHouse,
  executeQuery,
  insertEvents,
  insertAnomalies,
  getEventStats,
  getTopEvents,
  getUserJourney,
  getAnomalies,
  closeConnection,
  getClient: () => clickhouseClient
};