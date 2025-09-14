const express = require('express');
const Joi = require('joi');
const { insertEvents, getUserJourney, getTopEvents } = require('../lib/clickhouse');
const { incrementEventCounter, trackUniqueUser, updateSessionData, checkRateLimit } = require('../lib/redis');
const { trackAnalyticsEvent } = require('../lib/prometheus');
const logger = require('../lib/logger').getLogger();

const router = express.Router();

// Validation schemas
const trackEventSchema = Joi.object({
  event_type: Joi.string().required().max(100),
  user_id: Joi.string().optional().max(100),
  session_id: Joi.string().optional().max(100),
  properties: Joi.object().optional(),
  source: Joi.string().optional().max(50),
  timestamp: Joi.date().optional(),
});

const batchTrackSchema = Joi.object({
  events: Joi.array().items(trackEventSchema).min(1).max(100).required(),
});

const customQuerySchema = Joi.object({
  query: Joi.string().required().max(5000),
  format: Joi.string().valid('json', 'csv').default('json'),
  limit: Joi.number().integer().min(1).max(10000).default(1000),
});

// POST /analytics/track - Track single event
router.post('/track', async (req, res) => {
  const start = Date.now();

  try {
    // Rate limiting
    const clientId = req.ip || 'unknown';
    const rateLimitResult = await checkRateLimit(clientId, 1000, '1h');

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: rateLimitResult.limit,
        reset_time: rateLimitResult.reset_time
      });
    }

    // Validate input
    const { error, value } = trackEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid event data',
        details: error.details.map(d => d.message)
      });
    }

    // Enrich event data
    const event = {
      ...value,
      id: generateEventId(),
      timestamp: value.timestamp || new Date(),
      ip_address: req.ip || '',
      user_agent: req.get('User-Agent') || '',
      source: value.source || 'api',
    };

    // Store in ClickHouse
    await insertEvents([event]);

    // Update real-time counters in Redis
    await Promise.all([
      incrementEventCounter(event.event_type, event.source),
      event.user_id ? trackUniqueUser(event.event_type, event.user_id) : Promise.resolve(),
      event.session_id ? updateSessionData(event.session_id, {
        user_id: event.user_id || '',
        last_event_type: event.event_type,
        last_event_time: event.timestamp,
        source: event.source,
      }) : Promise.resolve(),
    ]);

    // Track metrics
    const duration = (Date.now() - start) / 1000;
    trackAnalyticsEvent(event.event_type, event.source, duration);

    res.status(200).json({
      success: true,
      event_id: event.id,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to track event:', error);
    res.status(500).json({
      error: 'Failed to track event',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /analytics/track/batch - Track multiple events
router.post('/track/batch', async (req, res) => {
  const start = Date.now();

  try {
    // Rate limiting
    const clientId = req.ip || 'unknown';
    const rateLimitResult = await checkRateLimit(clientId, 100, '1h');

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: rateLimitResult.limit,
        reset_time: rateLimitResult.reset_time
      });
    }

    // Validate input
    const { error, value } = batchTrackSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid batch data',
        details: error.details.map(d => d.message)
      });
    }

    // Enrich all events
    const events = value.events.map(event => ({
      ...event,
      id: generateEventId(),
      timestamp: event.timestamp || new Date(),
      ip_address: req.ip || '',
      user_agent: req.get('User-Agent') || '',
      source: event.source || 'api',
    }));

    // Store in ClickHouse
    await insertEvents(events);

    // Update real-time counters in Redis (batch)
    const redisPromises = [];
    const eventTypes = new Set();
    const userEvents = new Map();

    events.forEach(event => {
      eventTypes.add(`${event.event_type}:${event.source}`);
      if (event.user_id) {
        if (!userEvents.has(event.event_type)) {
          userEvents.set(event.event_type, new Set());
        }
        userEvents.get(event.event_type).add(event.user_id);
      }
    });

    // Batch increment counters
    eventTypes.forEach(typeSource => {
      const [eventType, source] = typeSource.split(':');
      const count = events.filter(e => e.event_type === eventType && e.source === source).length;
      for (let i = 0; i < count; i++) {
        redisPromises.push(incrementEventCounter(eventType, source));
      }
    });

    // Track unique users
    userEvents.forEach((users, eventType) => {
      users.forEach(userId => {
        redisPromises.push(trackUniqueUser(eventType, userId));
      });
    });

    await Promise.all(redisPromises);

    // Track metrics
    const duration = (Date.now() - start) / 1000;
    trackAnalyticsEvent('batch_track', 'api', duration);

    res.status(200).json({
      success: true,
      events_processed: events.length,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to track batch events:', error);
    res.status(500).json({
      error: 'Failed to track batch events',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/events/top - Get top events
router.get('/events/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeRange = req.query.time_range || '24h';

    if (limit > 100) {
      return res.status(400).json({
        error: 'Limit cannot exceed 100'
      });
    }

    const topEvents = await getTopEvents(limit, timeRange);

    res.status(200).json({
      success: true,
      data: topEvents,
      time_range: timeRange,
      limit
    });

  } catch (error) {
    logger.error('Failed to get top events:', error);
    res.status(500).json({
      error: 'Failed to get top events',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/users/:userId/journey - Get user journey
router.get('/users/:userId/journey', async (req, res) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit) || 100;

    if (limit > 1000) {
      return res.status(400).json({
        error: 'Limit cannot exceed 1000'
      });
    }

    const journey = await getUserJourney(userId, limit);

    res.status(200).json({
      success: true,
      data: journey,
      user_id: userId,
      limit
    });

  } catch (error) {
    logger.error('Failed to get user journey:', error);
    res.status(500).json({
      error: 'Failed to get user journey',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /analytics/query - Execute custom query
router.post('/query', async (req, res) => {
  try {
    // Rate limiting for custom queries
    const clientId = req.ip || 'unknown';
    const rateLimitResult = await checkRateLimit(`query:${clientId}`, 10, '1h');

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Query rate limit exceeded',
        limit: rateLimitResult.limit,
        reset_time: rateLimitResult.reset_time
      });
    }

    // Validate input
    const { error, value } = customQuerySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query data',
        details: error.details.map(d => d.message)
      });
    }

    // Security: Only allow SELECT queries
    const query = value.query.trim();
    if (!query.toLowerCase().startsWith('select')) {
      return res.status(400).json({
        error: 'Only SELECT queries are allowed'
      });
    }

    // Security: Prevent dangerous keywords
    const dangerousKeywords = ['drop', 'delete', 'insert', 'update', 'create', 'alter', 'truncate'];
    const lowerQuery = query.toLowerCase();

    for (const keyword of dangerousKeywords) {
      if (lowerQuery.includes(keyword)) {
        return res.status(400).json({
          error: `Query contains forbidden keyword: ${keyword}`
        });
      }
    }

    const { executeQuery } = require('../lib/clickhouse');
    const results = await executeQuery(query, 'SELECT', 'custom');

    res.status(200).json({
      success: true,
      data: results.slice(0, value.limit),
      query: query,
      executed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to execute custom query:', error);
    res.status(500).json({
      error: 'Failed to execute query',
      timestamp: new Date().toISOString()
    });
  }
});

// Utility function
function generateEventId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

module.exports = router;