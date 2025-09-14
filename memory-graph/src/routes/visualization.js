import express from 'express';
import { VisualizationService } from '../services/VisualizationService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const visualizationService = new VisualizationService();

// Get graph data for visualization
router.get('/graph-data', async (req, res) => {
  try {
    const filters = {
      nodeTypes: req.query.nodeTypes ? req.query.nodeTypes.split(',') : [],
      relationshipTypes: req.query.relationshipTypes ? req.query.relationshipTypes.split(',') : [],
      limit: parseInt(req.query.limit) || 1000,
      depth: parseInt(req.query.depth) || 2
    };

    const data = await visualizationService.getGraphData(filters);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting graph visualization data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cluster visualization
router.get('/clusters', async (req, res) => {
  try {
    const data = await visualizationService.getClusterVisualization();
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting cluster visualization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hierarchical layout
router.get('/hierarchy', async (req, res) => {
  try {
    const data = await visualizationService.getHierarchicalLayout();
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting hierarchical layout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get timeline visualization
router.get('/timeline', async (req, res) => {
  try {
    const data = await visualizationService.getTimelineVisualization();
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting timeline visualization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;