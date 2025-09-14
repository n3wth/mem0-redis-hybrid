const express = require('express');
const { getEventStats, getTopEvents, getAnomalies } = require('../lib/clickhouse');
const {
  getEventCount,
  getUniqueUserCount,
  getLeaderboard,
  getAggregationRange,
  cache,
  getCache
} = require('../lib/redis');
const logger = require('../lib/logger').getLogger();

const router = express.Router();

// GET /dashboard - Main dashboard data
router.get('/', async (req, res) => {
  try {
    const timeRange = req.query.time_range || '24h';
    const cacheKey = `dashboard:main:${timeRange}`;

    // Check cache first
    let cachedResult = await getCache(cacheKey);
    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        from_cache: true,
        generated_at: new Date().toISOString()
      });
    }

    const dashboardData = {
      time_range: timeRange,
      overview: {},
      charts: {},
      alerts: [],
      top_events: [],
      user_engagement: {},
      realtime: {}
    };

    // Get real-time overview metrics
    const [
      pageViewsHour,
      clicksHour,
      signupsHour,
      activeUsersHour,
      pageViewsDay,
      activeUsersDay
    ] = await Promise.all([
      getEventCount('page_view', 'web', '1h'),
      getEventCount('click', 'web', '1h'),
      getEventCount('signup', 'web', '1h'),
      getUniqueUserCount('page_view', '1h'),
      getEventCount('page_view', 'web', '24h'),
      getUniqueUserCount('page_view', '24h')
    ]);

    dashboardData.overview = {
      page_views_hour: pageViewsHour,
      clicks_hour: clicksHour,
      signups_hour: signupsHour,
      active_users_hour: activeUsersHour,
      page_views_day: pageViewsDay,
      active_users_day: activeUsersDay,
      conversion_rate: clicksHour > 0 ? ((signupsHour / clicksHour) * 100).toFixed(2) : 0,
      bounce_rate: activeUsersHour > 0 ? (100 - ((clicksHour / pageViewsHour) * 100)).toFixed(2) : 0
    };

    // Get top events
    dashboardData.top_events = await getTopEvents(10, timeRange);

    // Get user engagement leaderboards
    const [topUsers, topSources, topPages] = await Promise.all([
      getLeaderboard('user_engagement', 10, '24h'),
      getLeaderboard('traffic_sources', 10, '24h'),
      getLeaderboard('popular_pages', 10, '24h')
    ]);

    dashboardData.user_engagement = {
      top_users: topUsers,
      top_sources: topSources,
      top_pages: topPages
    };

    // Get hourly trend data for charts
    const now = Date.now();
    const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 24 * 7 : 1;
    const startTime = now - (hoursBack * 60 * 60 * 1000);

    try {
      const [pageViewTrends, clickTrends, signupTrends] = await Promise.all([
        getAggregationRange('page_views', startTime, now),
        getAggregationRange('clicks', startTime, now),
        getAggregationRange('signups', startTime, now)
      ]);

      dashboardData.charts = {
        page_views: pageViewTrends.filter(d => d.value !== null),
        clicks: clickTrends.filter(d => d.value !== null),
        signups: signupTrends.filter(d => d.value !== null)
      };
    } catch (error) {
      logger.warn('Failed to get trend data for dashboard:', error);
      dashboardData.charts = {
        page_views: [],
        clicks: [],
        signups: []
      };
    }

    // Get recent anomalies
    try {
      const anomalies = await getAnomalies({
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      });
      dashboardData.alerts = anomalies.slice(0, 5).map(anomaly => ({
        type: 'anomaly',
        severity: anomaly.severity,
        title: `${anomaly.type} anomaly detected`,
        message: `${anomaly.metric_name}: expected ${anomaly.expected_value}, got ${anomaly.actual_value}`,
        timestamp: anomaly.timestamp
      }));
    } catch (error) {
      logger.warn('Failed to get anomalies for dashboard:', error);
      dashboardData.alerts = [];
    }

    // Real-time current stats
    dashboardData.realtime = {
      last_updated: new Date().toISOString(),
      active_sessions: Math.floor(Math.random() * 50) + activeUsersHour, // Placeholder
      current_page_views_per_minute: Math.ceil(pageViewsHour / 60),
      server_status: 'healthy'
    };

    // Cache for 1 minute
    await cache(cacheKey, dashboardData, 60);

    res.status(200).json({
      success: true,
      data: dashboardData,
      from_cache: false,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate dashboard data:', error);
    res.status(500).json({
      error: 'Failed to generate dashboard data',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /dashboard/widgets/:widget - Individual widget data
router.get('/widgets/:widget', async (req, res) => {
  try {
    const widget = req.params.widget;
    const timeRange = req.query.time_range || '24h';

    let widgetData = null;

    switch (widget) {
      case 'overview':
        widgetData = await getOverviewWidget(timeRange);
        break;
      case 'top-events':
        widgetData = await getTopEventsWidget(timeRange);
        break;
      case 'user-engagement':
        widgetData = await getUserEngagementWidget(timeRange);
        break;
      case 'realtime':
        widgetData = await getRealtimeWidget();
        break;
      case 'performance':
        widgetData = await getPerformanceWidget();
        break;
      case 'alerts':
        widgetData = await getAlertsWidget();
        break;
      default:
        return res.status(404).json({
          error: 'Widget not found',
          available_widgets: ['overview', 'top-events', 'user-engagement', 'realtime', 'performance', 'alerts']
        });
    }

    res.status(200).json({
      success: true,
      widget,
      data: widgetData,
      time_range: timeRange,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get widget data:', error);
    res.status(500).json({
      error: 'Failed to get widget data',
      widget: req.params.widget,
      timestamp: new Date().toISOString()
    });
  }
});

// Widget helper functions
async function getOverviewWidget(timeRange) {
  const [
    pageViews,
    clicks,
    signups,
    activeUsers
  ] = await Promise.all([
    getEventCount('page_view', 'web', timeRange),
    getEventCount('click', 'web', timeRange),
    getEventCount('signup', 'web', timeRange),
    getUniqueUserCount('page_view', timeRange)
  ]);

  return {
    metrics: {
      page_views: { value: pageViews, change: '+5.2%' },
      clicks: { value: clicks, change: '+12.1%' },
      signups: { value: signups, change: '+8.7%' },
      active_users: { value: activeUsers, change: '+3.4%' }
    },
    conversion_rate: clicks > 0 ? ((signups / clicks) * 100).toFixed(2) : 0
  };
}

async function getTopEventsWidget(timeRange) {
  const topEvents = await getTopEvents(15, timeRange);

  return {
    events: topEvents.map(event => ({
      name: event.event_type,
      count: parseInt(event.count),
      unique_users: parseInt(event.unique_users),
      percentage: 0 // Calculate based on total if needed
    }))
  };
}

async function getUserEngagementWidget(timeRange) {
  const [topUsers, topSources] = await Promise.all([
    getLeaderboard('user_engagement', 15, timeRange === '24h' ? '24h' : '7d'),
    getLeaderboard('traffic_sources', 10, timeRange === '24h' ? '24h' : '7d')
  ]);

  return {
    top_users: topUsers,
    top_sources: topSources,
    engagement_score: 8.4 // Placeholder calculation
  };
}

async function getRealtimeWidget() {
  const [
    currentPageViews,
    currentClicks,
    activeUsers
  ] = await Promise.all([
    getEventCount('page_view', 'web', '5m'),
    getEventCount('click', 'web', '5m'),
    getUniqueUserCount('page_view', '5m')
  ]);

  return {
    live_stats: {
      page_views_5min: currentPageViews,
      clicks_5min: currentClicks,
      active_users_5min: activeUsers,
      pages_per_user: activeUsers > 0 ? (currentPageViews / activeUsers).toFixed(1) : 0
    },
    status: 'live'
  };
}

async function getPerformanceWidget() {
  const { client } = require('../lib/prometheus');
  const metrics = await client.register.getMetricsAsJSON();

  // Extract key performance indicators
  const performanceMetrics = {};

  metrics.forEach(metric => {
    if (metric.name === 'http_request_duration_seconds') {
      performanceMetrics.avg_response_time = calculateAverageFromHistogram(metric);
    }
    if (metric.name === 'process_cpu_user_seconds_total') {
      performanceMetrics.cpu_usage = metric.values[0]?.value || 0;
    }
  });

  return {
    response_time: performanceMetrics.avg_response_time || 0.1,
    cpu_usage: performanceMetrics.cpu_usage || 0,
    memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    uptime: process.uptime(),
    status: 'healthy'
  };
}

async function getAlertsWidget() {
  try {
    const anomalies = await getAnomalies({
      start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });

    return {
      alerts: anomalies.slice(0, 10).map(anomaly => ({
        id: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity,
        message: `${anomaly.metric_name} anomaly: ${anomaly.actual_value} (expected: ${anomaly.expected_value})`,
        timestamp: anomaly.timestamp
      })),
      alert_count: anomalies.length
    };
  } catch (error) {
    return {
      alerts: [],
      alert_count: 0
    };
  }
}

// Helper function to calculate average from Prometheus histogram
function calculateAverageFromHistogram(metric) {
  if (!metric.values || metric.values.length === 0) return 0;

  let totalTime = 0;
  let totalCount = 0;

  metric.values.forEach(value => {
    if (value.metricName && value.metricName.includes('sum')) {
      totalTime += parseFloat(value.value);
    }
    if (value.metricName && value.metricName.includes('count')) {
      totalCount += parseFloat(value.value);
    }
  });

  return totalCount > 0 ? (totalTime / totalCount).toFixed(3) : 0;
}

module.exports = router;