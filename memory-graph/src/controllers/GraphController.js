import { GraphService } from '../services/GraphService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const graphService = new GraphService();

// Validation schemas
const nodeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().required(),
  properties: Joi.object().default({}),
  metadata: Joi.object().default({})
});

const edgeSchema = Joi.object({
  sourceId: Joi.string().required(),
  targetId: Joi.string().required(),
  relationshipType: Joi.string().required(),
  weight: Joi.number().min(0).default(1.0),
  properties: Joi.object().default({})
});

const traversalSchema = Joi.object({
  startId: Joi.string().required(),
  depth: Joi.number().integer().min(1).max(10).default(3),
  relationshipTypes: Joi.array().items(Joi.string()).default([])
});

const pathSchema = Joi.object({
  sourceId: Joi.string().required(),
  targetId: Joi.string().required(),
  relationshipTypes: Joi.array().items(Joi.string()).default([])
});

const recommendationSchema = Joi.object({
  nodeId: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export class GraphController {
  async createNode(req, res) {
    try {
      const { error, value } = nodeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const node = await graphService.createNode(value);
      res.status(201).json({ success: true, data: node });
    } catch (error) {
      logger.error('Error in createNode:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createEdge(req, res) {
    try {
      const { error, value } = edgeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const edge = await graphService.createEdge(value);
      res.status(201).json({ success: true, data: edge });
    } catch (error) {
      logger.error('Error in createEdge:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async traverseGraph(req, res) {
    try {
      const { error, value } = traversalSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const result = await graphService.traverseGraph(
        value.startId,
        value.depth,
        value.relationshipTypes
      );
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error in traverseGraph:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async findCommunities(req, res) {
    try {
      const algorithm = req.query.algorithm || 'louvain';
      const validAlgorithms = ['louvain', 'leiden', 'labelPropagation'];

      if (!validAlgorithms.includes(algorithm)) {
        return res.status(400).json({
          error: `Invalid algorithm. Must be one of: ${validAlgorithms.join(', ')}`
        });
      }

      const communities = await graphService.findCommunities(algorithm);
      res.json({ success: true, data: communities });
    } catch (error) {
      logger.error('Error in findCommunities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async findShortestPath(req, res) {
    try {
      const { error, value } = pathSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const path = await graphService.findShortestPath(
        value.sourceId,
        value.targetId,
        value.relationshipTypes
      );

      if (!path) {
        return res.status(404).json({ error: 'No path found between nodes' });
      }

      res.json({ success: true, data: path });
    } catch (error) {
      logger.error('Error in findShortestPath:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRecommendations(req, res) {
    try {
      const { error, value } = recommendationSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const recommendations = await graphService.getRecommendations(
        value.nodeId,
        value.limit
      );
      res.json({ success: true, data: recommendations });
    } catch (error) {
      logger.error('Error in getRecommendations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async calculatePageRank(req, res) {
    try {
      const iterations = parseInt(req.query.iterations) || 20;
      const dampingFactor = parseFloat(req.query.dampingFactor) || 0.85;

      if (iterations < 1 || iterations > 100) {
        return res.status(400).json({
          error: 'Iterations must be between 1 and 100'
        });
      }

      if (dampingFactor < 0 || dampingFactor > 1) {
        return res.status(400).json({
          error: 'Damping factor must be between 0 and 1'
        });
      }

      const rankings = await graphService.calculatePageRank(iterations, dampingFactor);
      res.json({ success: true, data: rankings });
    } catch (error) {
      logger.error('Error in calculatePageRank:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getGraphStats(req, res) {
    try {
      const query = `
        MATCH (n:Memory)
        OPTIONAL MATCH (n)-[r]->()
        RETURN count(DISTINCT n) as nodeCount,
               count(r) as edgeCount,
               collect(DISTINCT n.type) as nodeTypes,
               collect(DISTINCT type(r)) as relationshipTypes
      `;

      const result = await graphService.database.runQuery(query);
      const stats = result.records[0];

      res.json({
        success: true,
        data: {
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          nodeTypes: stats.nodeTypes,
          relationshipTypes: stats.relationshipTypes
        }
      });
    } catch (error) {
      logger.error('Error in getGraphStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}