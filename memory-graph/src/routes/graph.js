import express from 'express';
import { GraphController } from '../controllers/GraphController.js';

const router = express.Router();
const controller = new GraphController();

// Node operations
router.post('/nodes', controller.createNode.bind(controller));

// Edge operations
router.post('/edges', controller.createEdge.bind(controller));

// Graph traversal and analysis
router.get('/traverse', controller.traverseGraph.bind(controller));
router.get('/clusters', controller.findCommunities.bind(controller));
router.get('/shortest-path', controller.findShortestPath.bind(controller));
router.get('/recommendations', controller.getRecommendations.bind(controller));

// Graph algorithms
router.get('/pagerank', controller.calculatePageRank.bind(controller));

// Graph statistics
router.get('/stats', controller.getGraphStats.bind(controller));

export default router;