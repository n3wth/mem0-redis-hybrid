const express = require('express');
const { client } = require('../lib/prometheus');

const router = express.Router();

// GET /metrics - Prometheus metrics endpoint
router.get('/', (req, res) => {
  res.set('Content-Type', client.register.contentType);
  client.register.metrics()
    .then(metrics => {
      res.end(metrics);
    })
    .catch(error => {
      res.status(500).json({
        error: 'Failed to generate metrics',
        message: error.message
      });
    });
});

// GET /metrics/json - JSON format metrics for debugging
router.get('/json', async (req, res) => {
  try {
    const metrics = await client.register.getMetricsAsJSON();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics as JSON',
      message: error.message
    });
  }
});

module.exports = router;