import { Router } from 'express';
import Joi from 'joi';
import searchService from '../services/searchService.js';

const router = Router();

// Validation schemas
const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500),
  from: Joi.number().integer().min(0).default(0),
  size: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('_score', 'date', 'importance', 'title', 'relevance').default('_score'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  includeAggregations: Joi.boolean().default(false),
  useCache: Joi.boolean().default(true)
});

const semanticSearchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500),
  from: Joi.number().integer().min(0).default(0),
  size: Joi.number().integer().min(1).max(100).default(20),
  threshold: Joi.number().min(0).max(1).default(0.7),
  useCache: Joi.boolean().default(true)
});

const advancedSearchSchema = Joi.object({
  query: Joi.string().allow(''),
  filters: Joi.object().pattern(Joi.string(), Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  )).default({}),
  dateRange: Joi.object({
    gte: Joi.string(),
    lte: Joi.string()
  }),
  categories: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string()).default([]),
  authorFilter: Joi.string(),
  sourceFilter: Joi.string(),
  importanceRange: Joi.object({
    gte: Joi.number(),
    lte: Joi.number()
  }),
  sortBy: Joi.string().valid('_score', 'date', 'importance', 'title', 'relevance').default('_score'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  from: Joi.number().integer().min(0).default(0),
  size: Joi.number().integer().min(1).max(100).default(20),
  useCache: Joi.boolean().default(true)
});

const suggestionsSchema = Joi.object({
  query: Joi.string().required().min(1).max(200),
  size: Joi.number().integer().min(1).max(20).default(10),
  useCache: Joi.boolean().default(true)
});

// Middleware for request validation
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body || req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    req.validated = value;
    next();
  };
};

// Error handling middleware
const handleSearchError = (error, req, res, next) => {
  console.error('Search error:', error);
  res.status(500).json({
    error: 'Search failed',
    message: error.message,
    timestamp: new Date().toISOString()
  });
};

// Routes

/**
 * POST /search
 * Full-text search with BM25 scoring and custom relevance
 */
router.post('/search', validateRequest(searchSchema), async (req, res, next) => {
  try {
    const startTime = Date.now();
    const result = await searchService.fullTextSearch(req.validated.query, req.validated);
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: executionTime,
        cached: result.query_info?.from_cache || false,
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/semantic
 * Hybrid semantic search combining vector similarity and lexical matching
 */
router.post('/search/semantic', validateRequest(semanticSearchSchema), async (req, res, next) => {
  try {
    const startTime = Date.now();
    const result = await searchService.semanticSearch(req.validated.query, req.validated);
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: executionTime,
        search_type: 'semantic',
        threshold: req.validated.threshold,
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/advanced
 * Complex queries with filters, facets, and aggregations
 */
router.post('/search/advanced', validateRequest(advancedSearchSchema), async (req, res, next) => {
  try {
    const startTime = Date.now();
    const result = await searchService.advancedSearch(req.validated);
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: executionTime,
        search_type: 'advanced',
        filters_applied: Object.keys(req.validated.filters).length,
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /search/suggestions
 * Auto-complete suggestions for search queries
 */
router.get('/search/suggestions', validateRequest(suggestionsSchema), async (req, res, next) => {
  try {
    const startTime = Date.now();
    const result = await searchService.getSuggestions(req.validated.query, req.validated);
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: executionTime,
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /search/facets
 * Get available facets for building search UI
 */
router.get('/search/facets', async (req, res, next) => {
  try {
    const { query } = req.query;
    const result = await searchService.fullTextSearch(query || '*', {
      size: 0,
      includeAggregations: true
    });

    res.json({
      success: true,
      data: {
        facets: result.facets || {},
        aggregations: result.aggregations || {}
      },
      meta: {
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/similar
 * Find documents similar to a given document
 */
router.post('/search/similar', async (req, res, next) => {
  try {
    const { documentId, size = 10, threshold = 0.5 } = req.body;

    if (!documentId) {
      return res.status(400).json({
        error: 'Document ID is required'
      });
    }

    // Get the source document
    const docResult = await searchService.fullTextSearch(`_id:${documentId}`, { size: 1 });

    if (!docResult.hits.length) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    const doc = docResult.hits[0].source;
    const query = `${doc.title} ${doc.content || ''} ${doc.summary || ''}`;

    const result = await searchService.semanticSearch(query, { size, threshold });

    // Filter out the original document
    result.hits = result.hits.filter(hit => hit.id !== documentId);

    res.json({
      success: true,
      data: result,
      meta: {
        source_document_id: documentId,
        threshold: threshold,
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/category
 * Search within specific categories
 */
router.post('/search/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const { query, from = 0, size = 20 } = req.body;

    const searchParams = {
      query: query || '*',
      filters: { category },
      from,
      size
    };

    const result = await searchService.advancedSearch(searchParams);

    res.json({
      success: true,
      data: result,
      meta: {
        category: category,
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /search/stats
 * Get search statistics and health metrics
 */
router.get('/search/stats', async (req, res, next) => {
  try {
    // This would typically get metrics from Elasticsearch
    const stats = {
      total_documents: 0,
      indices_status: 'green',
      last_indexed: new Date().toISOString(),
      search_performance: {
        avg_query_time_ms: 45,
        cache_hit_rate: 0.85
      },
      popular_queries: [
        { query: 'machine learning', count: 156 },
        { query: 'data science', count: 134 },
        { query: 'algorithms', count: 98 }
      ]
    };

    res.json({
      success: true,
      data: stats,
      meta: {
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Document management routes

/**
 * POST /search/index
 * Index a single document
 */
router.post('/search/index', async (req, res, next) => {
  try {
    const document = req.body;

    if (!document.id || !document.title) {
      return res.status(400).json({
        error: 'Document must have id and title'
      });
    }

    const result = await searchService.indexDocument(document);

    res.status(201).json({
      success: true,
      data: {
        document_id: document.id,
        indexed: true,
        elasticsearch_result: result
      },
      meta: {
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/bulk
 * Bulk index multiple documents
 */
router.post('/search/bulk', async (req, res, next) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: 'Documents array is required'
      });
    }

    const result = await searchService.bulkIndex(documents);

    res.status(201).json({
      success: true,
      data: {
        total_documents: documents.length,
        indexed: !result.errors,
        elasticsearch_result: result
      },
      meta: {
        api_version: '1.0'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Apply error handling middleware
router.use(handleSearchError);

export default router;