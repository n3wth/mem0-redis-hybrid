import elasticsearchClient from '../config/elasticsearch.js';
import redisCache from '../config/redis.js';
import queryParser from './queryParser.js';
import Fuse from 'fuse.js';

export class SearchService {
  constructor() {
    this.defaultIndex = 'recall-documents';
  }

  async fullTextSearch(query, options = {}) {
    const {
      from = 0,
      size = 20,
      sort = '_score',
      order = 'desc',
      includeAggregations = false,
      useCache = true
    } = options;

    // Check cache first
    const cacheKey = redisCache.generateCacheKey('fulltext', { query, from, size, sort, order });
    if (useCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Parse the query
      const parsedQuery = queryParser.parseQuery(query);
      const esQuery = queryParser.buildElasticsearchQuery(parsedQuery);

      // Build Elasticsearch request
      const searchParams = {
        index: this.defaultIndex,
        body: {
          query: esQuery,
          from,
          size,
          sort: this.buildSort(sort, order),
          highlight: {
            fields: {
              title: { fragment_size: 100, number_of_fragments: 1 },
              content: { fragment_size: 150, number_of_fragments: 3 },
              summary: { fragment_size: 200, number_of_fragments: 1 }
            },
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          },
          _source: ['id', 'title', 'summary', 'tags', 'category', 'source', 'author', 'created_at', 'importance_score']
        }
      };

      // Add aggregations if requested
      if (includeAggregations) {
        searchParams.body.aggs = this.buildAggregations();
      }

      const response = await elasticsearchClient.search(searchParams);

      const result = {
        total: response.hits.total.value,
        hits: response.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight || {}
        })),
        aggregations: response.aggregations || {},
        query_info: {
          parsed: parsedQuery,
          execution_time: response.took,
          shard_info: response._shards
        }
      };

      // Cache the result
      if (useCache) {
        await redisCache.set(cacheKey, result, 300);
      }

      return result;

    } catch (error) {
      console.error('Full-text search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async semanticSearch(query, options = {}) {
    const {
      from = 0,
      size = 20,
      threshold = 0.7,
      useCache = true
    } = options;

    const cacheKey = redisCache.generateCacheKey('semantic', { query, from, size, threshold });
    if (useCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Generate embedding for the query (mock implementation)
      const queryEmbedding = await this.generateEmbedding(query);

      // Hybrid approach: combine semantic and lexical search
      const semanticQuery = {
        bool: {
          should: [
            {
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                  params: { query_vector: queryEmbedding }
                },
                min_score: threshold
              }
            },
            {
              multi_match: {
                query: query,
                type: 'best_fields',
                fields: ['title^3', 'content^1', 'summary^2'],
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      };

      const searchParams = {
        index: this.defaultIndex,
        body: {
          query: semanticQuery,
          from,
          size,
          sort: ['_score'],
          _source: ['id', 'title', 'summary', 'tags', 'category', 'source', 'author', 'created_at']
        }
      };

      const response = await elasticsearchClient.search(searchParams);

      const result = {
        total: response.hits.total.value,
        hits: response.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          similarity_score: hit._score > 1 ? (hit._score - 1) : hit._score
        })),
        query_info: {
          threshold,
          execution_time: response.took
        }
      };

      if (useCache) {
        await redisCache.set(cacheKey, result, 600);
      }

      return result;

    } catch (error) {
      console.error('Semantic search error:', error);
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }

  async advancedSearch(searchParams) {
    const {
      query,
      filters = {},
      dateRange,
      categories = [],
      tags = [],
      authorFilter,
      sourceFilter,
      importanceRange,
      sortBy = '_score',
      sortOrder = 'desc',
      from = 0,
      size = 20,
      useCache = true
    } = searchParams;

    const cacheKey = redisCache.generateCacheKey('advanced', searchParams);
    if (useCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const advancedQuery = {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: []
        }
      };

      // Add main query
      if (query && query.trim()) {
        advancedQuery.bool.must.push({
          multi_match: {
            query: query,
            type: 'best_fields',
            fields: ['title^3', 'content^1', 'summary^2', 'tags^2'],
            fuzziness: 'AUTO',
            minimum_should_match: '75%'
          }
        });
      } else {
        advancedQuery.bool.must.push({ match_all: {} });
      }

      // Apply filters
      if (categories.length > 0) {
        advancedQuery.bool.filter.push({
          terms: { category: categories }
        });
      }

      if (tags.length > 0) {
        advancedQuery.bool.filter.push({
          terms: { tags: tags }
        });
      }

      if (authorFilter) {
        advancedQuery.bool.filter.push({
          term: { author: authorFilter }
        });
      }

      if (sourceFilter) {
        advancedQuery.bool.filter.push({
          term: { source: sourceFilter }
        });
      }

      // Date range filter
      if (dateRange) {
        advancedQuery.bool.filter.push({
          range: {
            created_at: dateRange
          }
        });
      }

      // Importance range filter
      if (importanceRange) {
        advancedQuery.bool.filter.push({
          range: {
            importance_score: importanceRange
          }
        });
      }

      // Add custom filters
      Object.entries(filters).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          advancedQuery.bool.filter.push({
            terms: { [field]: value }
          });
        } else {
          advancedQuery.bool.filter.push({
            term: { [field]: value }
          });
        }
      });

      const searchRequest = {
        index: this.defaultIndex,
        body: {
          query: advancedQuery,
          from,
          size,
          sort: this.buildSort(sortBy, sortOrder),
          highlight: {
            fields: {
              title: {},
              content: { fragment_size: 150, number_of_fragments: 3 },
              summary: {}
            }
          },
          aggs: this.buildAggregations(),
          _source: true
        }
      };

      const response = await elasticsearchClient.search(searchRequest);

      const result = {
        total: response.hits.total.value,
        hits: response.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight || {}
        })),
        aggregations: this.processAggregations(response.aggregations),
        facets: this.buildFacets(response.aggregations),
        query_info: {
          execution_time: response.took,
          total_shards: response._shards.total,
          filters_applied: Object.keys(filters).length + (dateRange ? 1 : 0) + (categories.length > 0 ? 1 : 0)
        }
      };

      if (useCache) {
        await redisCache.set(cacheKey, result, 300);
      }

      return result;

    } catch (error) {
      console.error('Advanced search error:', error);
      throw new Error(`Advanced search failed: ${error.message}`);
    }
  }

  async getSuggestions(query, options = {}) {
    const { size = 10, useCache = true } = options;

    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    const cacheKey = redisCache.generateCacheKey('suggestions', { query, size });
    if (useCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Completion suggester
      const completionSuggest = {
        index: this.defaultIndex,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: size
              }
            }
          },
          query: {
            multi_match: {
              query: query,
              type: 'bool_prefix',
              fields: ['title^3', 'tags^2', 'category'],
              fuzziness: 'AUTO'
            }
          },
          size: size / 2,
          _source: ['title', 'category', 'tags']
        }
      };

      const response = await elasticsearchClient.search(completionSuggest);

      // Process suggestions
      const suggestions = new Set();

      // Add completion suggestions
      if (response.suggest && response.suggest.title_suggest) {
        response.suggest.title_suggest.forEach(suggestion => {
          suggestion.options.forEach(option => {
            suggestions.add(option.text);
          });
        });
      }

      // Add query suggestions from search results
      response.hits.hits.forEach(hit => {
        suggestions.add(hit._source.title);
        if (hit._source.tags) {
          hit._source.tags.forEach(tag => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
              suggestions.add(tag);
            }
          });
        }
      });

      const result = {
        suggestions: Array.from(suggestions).slice(0, size),
        query: query,
        total_found: suggestions.size
      };

      if (useCache) {
        await redisCache.set(cacheKey, result, 900); // Cache for 15 minutes
      }

      return result;

    } catch (error) {
      console.error('Suggestions error:', error);
      throw new Error(`Suggestions failed: ${error.message}`);
    }
  }

  buildSort(sort, order = 'desc') {
    const sortOptions = {
      '_score': ['_score'],
      'date': [{ 'created_at': { 'order': order } }],
      'importance': [{ 'importance_score': { 'order': order } }],
      'title': [{ 'title.keyword': { 'order': order } }],
      'relevance': ['_score', { 'created_at': { 'order': 'desc' } }]
    };

    return sortOptions[sort] || ['_score'];
  }

  buildAggregations() {
    return {
      categories: {
        terms: {
          field: 'category',
          size: 10
        }
      },
      sources: {
        terms: {
          field: 'source',
          size: 10
        }
      },
      authors: {
        terms: {
          field: 'author',
          size: 10
        }
      },
      tags: {
        terms: {
          field: 'tags',
          size: 15
        }
      },
      date_histogram: {
        date_histogram: {
          field: 'created_at',
          calendar_interval: 'month'
        }
      },
      importance_stats: {
        stats: {
          field: 'importance_score'
        }
      }
    };
  }

  processAggregations(aggs) {
    if (!aggs) return {};

    const processed = {};

    Object.entries(aggs).forEach(([key, value]) => {
      if (value.buckets) {
        processed[key] = value.buckets.map(bucket => ({
          key: bucket.key,
          count: bucket.doc_count,
          key_as_string: bucket.key_as_string
        }));
      } else if (value.value !== undefined) {
        processed[key] = value;
      }
    });

    return processed;
  }

  buildFacets(aggs) {
    if (!aggs) return {};

    return {
      categories: aggs.categories?.buckets.map(b => ({
        name: b.key,
        count: b.doc_count
      })) || [],
      sources: aggs.sources?.buckets.map(b => ({
        name: b.key,
        count: b.doc_count
      })) || [],
      authors: aggs.authors?.buckets.map(b => ({
        name: b.key,
        count: b.doc_count
      })) || [],
      tags: aggs.tags?.buckets.map(b => ({
        name: b.key,
        count: b.doc_count
      })) || []
    };
  }

  async generateEmbedding(text) {
    // Mock embedding generation - in production, use actual embedding service
    // This would typically call OpenAI, Sentence Transformers, or similar
    const mockEmbedding = new Array(384).fill(0).map(() => Math.random() - 0.5);
    return mockEmbedding;
  }

  async indexDocument(document) {
    try {
      const embedding = await this.generateEmbedding(`${document.title} ${document.content}`);

      const doc = {
        ...document,
        embedding,
        created_at: document.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        access_count: document.access_count || 0,
        importance_score: document.importance_score || 5.0
      };

      const response = await elasticsearchClient.index({
        index: this.defaultIndex,
        id: document.id,
        body: doc
      });

      return response;
    } catch (error) {
      console.error('Document indexing error:', error);
      throw error;
    }
  }

  async bulkIndex(documents) {
    try {
      const body = [];

      for (const doc of documents) {
        const embedding = await this.generateEmbedding(`${doc.title} ${doc.content || ''}`);

        body.push({ index: { _index: this.defaultIndex, _id: doc.id } });
        body.push({
          ...doc,
          embedding,
          created_at: doc.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          access_count: doc.access_count || 0,
          importance_score: doc.importance_score || 5.0
        });
      }

      const response = await elasticsearchClient.bulk({ body });
      return response;
    } catch (error) {
      console.error('Bulk indexing error:', error);
      throw error;
    }
  }
}

export default new SearchService();