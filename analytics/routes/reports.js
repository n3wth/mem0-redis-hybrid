const express = require('express');
const Joi = require('joi');
const { getEventStats, getTopEvents } = require('../lib/clickhouse');
const { getEventCount, getUniqueUserCount, getAggregationRange } = require('../lib/redis');
const { cache, getCache } = require('../lib/redis');
const logger = require('../lib/logger').getLogger();

const router = express.Router();

// Validation schemas
const reportFiltersSchema = Joi.object({
  event_type: Joi.string().optional(),
  source: Joi.string().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  time_range: Joi.string().valid('1h', '24h', '7d', '30d').default('24h'),
  limit: Joi.number().integer().min(1).max(1000).default(100),
});

const summaryReportSchema = Joi.object({
  time_range: Joi.string().valid('1h', '24h', '7d', '30d').default('24h'),
  include_top_events: Joi.boolean().default(true),
  top_events_limit: Joi.number().integer().min(1).max(50).default(10),
});

// GET /reports/events - Event analytics report
router.get('/events', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = reportFiltersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid filter parameters',
        details: error.details.map(d => d.message)
      });
    }

    // Check cache first
    const cacheKey = `report:events:${JSON.stringify(value)}`;
    let cachedResult = await getCache(cacheKey);

    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        from_cache: true,
        generated_at: new Date().toISOString()
      });
    }

    // Generate filters for ClickHouse query
    const filters = {};
    if (value.event_type) filters.event_type = value.event_type;
    if (value.source) filters.source = value.source;
    if (value.start_date) filters.start_date = value.start_date.toISOString();
    if (value.end_date) filters.end_date = value.end_date.toISOString();

    // If no specific dates but time_range is provided, calculate dates
    if (!value.start_date && !value.end_date && value.time_range) {
      const now = new Date();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      filters.start_date = new Date(now.getTime() - timeRanges[value.time_range]).toISOString();
      filters.end_date = now.toISOString();
    }

    // Get event statistics
    const eventStats = await getEventStats(filters);

    // Process and aggregate data
    const processedData = {
      summary: {
        total_events: eventStats.reduce((sum, stat) => sum + parseInt(stat.total_events), 0),
        unique_users: eventStats.reduce((sum, stat) => sum + parseInt(stat.unique_users), 0),
        unique_sessions: eventStats.reduce((sum, stat) => sum + parseInt(stat.unique_sessions), 0),
        time_range: value.time_range,
        filters: filters
      },
      events_by_type: {},
      events_by_source: {},
      hourly_breakdown: []
    };

    // Aggregate by event type
    eventStats.forEach(stat => {
      if (!processedData.events_by_type[stat.event_type]) {
        processedData.events_by_type[stat.event_type] = {
          total_events: 0,
          unique_users: 0,
          unique_sessions: 0
        };
      }

      processedData.events_by_type[stat.event_type].total_events += parseInt(stat.total_events);
      processedData.events_by_type[stat.event_type].unique_users += parseInt(stat.unique_users);
      processedData.events_by_type[stat.event_type].unique_sessions += parseInt(stat.unique_sessions);
    });

    // Aggregate by source
    eventStats.forEach(stat => {
      if (!processedData.events_by_source[stat.source]) {
        processedData.events_by_source[stat.source] = {
          total_events: 0,
          unique_users: 0,
          unique_sessions: 0
        };
      }

      processedData.events_by_source[stat.source].total_events += parseInt(stat.total_events);
      processedData.events_by_source[stat.source].unique_users += parseInt(stat.unique_users);
      processedData.events_by_source[stat.source].unique_sessions += parseInt(stat.unique_sessions);
    });

    // Hourly breakdown
    const hourlyData = {};
    eventStats.forEach(stat => {
      const hour = stat.hour;
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          total_events: 0,
          unique_users: 0,
          unique_sessions: 0
        };
      }

      hourlyData[hour].total_events += parseInt(stat.total_events);
      hourlyData[hour].unique_users += parseInt(stat.unique_users);
      hourlyData[hour].unique_sessions += parseInt(stat.unique_sessions);
    });

    processedData.hourly_breakdown = Object.values(hourlyData)
      .sort((a, b) => new Date(b.hour) - new Date(a.hour))
      .slice(0, value.limit);

    // Cache the result for 5 minutes
    await cache(cacheKey, processedData, 300);

    res.status(200).json({
      success: true,
      data: processedData,
      from_cache: false,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate events report:', error);
    res.status(500).json({
      error: 'Failed to generate events report',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /reports/summary - High-level summary report
router.get('/summary', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = summaryReportSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.details.map(d => d.message)
      });
    }

    // Check cache first
    const cacheKey = `report:summary:${value.time_range}`;
    let cachedResult = await getCache(cacheKey);

    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        from_cache: true,
        generated_at: new Date().toISOString()
      });
    }

    const summaryData = {
      time_range: value.time_range,
      overview: {},
      top_events: [],
      realtime_stats: {}
    };

    // Get top events from ClickHouse
    if (value.include_top_events) {
      summaryData.top_events = await getTopEvents(value.top_events_limit, value.time_range);
    }

    // Get real-time stats from Redis for key metrics
    const realtimePromises = [
      getEventCount('page_view', 'web', '1h'),
      getEventCount('click', 'web', '1h'),
      getEventCount('purchase', 'web', '1h'),
      getUniqueUserCount('page_view', '1h'),
    ];

    const [pageViews, clicks, purchases, activeUsers] = await Promise.all(realtimePromises);

    summaryData.realtime_stats = {
      last_hour: {
        page_views: pageViews,
        clicks: clicks,
        purchases: purchases,
        active_users: activeUsers
      }
    };

    // Calculate overview metrics
    summaryData.overview = {
      total_events_last_hour: pageViews + clicks + purchases,
      active_users_last_hour: activeUsers,
      click_through_rate: clicks > 0 ? ((purchases / clicks) * 100).toFixed(2) : 0,
      pages_per_user: activeUsers > 0 ? (pageViews / activeUsers).toFixed(2) : 0
    };

    // Cache for 2 minutes (frequent updates for summary)
    await cache(cacheKey, summaryData, 120);

    res.status(200).json({
      success: true,
      data: summaryData,
      from_cache: false,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate summary report:', error);
    res.status(500).json({
      error: 'Failed to generate summary report',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /reports/realtime - Real-time dashboard data
router.get('/realtime', async (req, res) => {
  try {
    const timeWindows = ['5m', '15m', '1h'];
    const eventTypes = ['page_view', 'click', 'purchase', 'signup'];

    const realtimeData = {
      current_time: new Date().toISOString(),
      metrics: {}
    };

    // Get current counts for different time windows
    for (const window of timeWindows) {
      realtimeData.metrics[window] = {};

      const promises = eventTypes.map(async eventType => {
        const [count, uniqueUsers] = await Promise.all([
          getEventCount(eventType, 'web', window),
          getUniqueUserCount(eventType, window)
        ]);

        return {
          eventType,
          count,
          unique_users: uniqueUsers
        };
      });

      const results = await Promise.all(promises);

      results.forEach(({ eventType, count, unique_users }) => {
        realtimeData.metrics[window][eventType] = {
          count,
          unique_users
        };
      });
    }

    // Get aggregation trends (last 10 minutes)
    const endTime = Date.now();
    const startTime = endTime - (10 * 60 * 1000); // 10 minutes ago

    try {
      const trendData = await getAggregationRange('page_views', startTime, endTime);
      realtimeData.trends = {
        page_views: trendData.filter(d => d.value !== null)
      };
    } catch (error) {
      logger.warn('Failed to get trend data:', error);
      realtimeData.trends = { page_views: [] };
    }

    res.status(200).json({
      success: true,
      data: realtimeData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate realtime report:', error);
    res.status(500).json({
      error: 'Failed to generate realtime report',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /reports/performance - Performance metrics report
router.get('/performance', async (req, res) => {
  try {
    const performanceData = {
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        node_version: process.version,
      },
      metrics: {}
    };

    // Get Prometheus metrics for performance analysis
    const { client } = require('../lib/prometheus');
    const metrics = await client.register.getMetricsAsJSON();

    // Extract key performance metrics
    metrics.forEach(metric => {
      if (metric.name.includes('duration') || metric.name.includes('operations')) {
        performanceData.metrics[metric.name] = {
          help: metric.help,
          type: metric.type,
          values: metric.values
        };
      }
    });

    res.status(200).json({
      success: true,
      data: performanceData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate performance report:', error);
    res.status(500).json({
      error: 'Failed to generate performance report',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;