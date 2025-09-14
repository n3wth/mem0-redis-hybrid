import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Date

  type Document {
    id: ID!
    title: String!
    content: String
    summary: String
    tags: [String!]!
    category: String
    source: String
    author: String
    created_at: Date
    updated_at: Date
    importance_score: Float
    access_count: Int
    user_rating: Float
  }

  type SearchHit {
    id: ID!
    score: Float!
    source: Document!
    highlights: Highlights
    similarity_score: Float
  }

  type Highlights {
    title: [String!]
    content: [String!]
    summary: [String!]
  }

  type Aggregation {
    key: String!
    count: Int!
    key_as_string: String
  }

  type Facet {
    name: String!
    count: Int!
  }

  type FacetGroup {
    categories: [Facet!]!
    sources: [Facet!]!
    authors: [Facet!]!
    tags: [Facet!]!
  }

  type QueryInfo {
    execution_time: Int
    total_shards: Int
    filters_applied: Int
    threshold: Float
    parsed: ParsedQuery
  }

  type ParsedQuery {
    originalQuery: String!
    cleanedQuery: String!
    tokens: [String!]!
    searchType: String!
    entities: EntityGroup
    filters: QueryFilters
  }

  type EntityGroup {
    people: [String!]!
    places: [String!]!
    organizations: [String!]!
    topics: [String!]!
  }

  type QueryFilters {
    author: String
    source: String
    category: String
    importance: String
  }

  type SearchResult {
    total: Int!
    hits: [SearchHit!]!
    aggregations: [Aggregation!]!
    facets: FacetGroup
    query_info: QueryInfo
  }

  type SuggestionResult {
    suggestions: [String!]!
    query: String!
    total_found: Int!
  }

  input DateRangeInput {
    gte: String
    lte: String
  }

  input ImportanceRangeInput {
    gte: Float
    lte: Float
  }

  input AdvancedSearchInput {
    query: String
    filters: [FilterInput!]
    dateRange: DateRangeInput
    categories: [String!]
    tags: [String!]
    authorFilter: String
    sourceFilter: String
    importanceRange: ImportanceRangeInput
    sortBy: SortField = SCORE
    sortOrder: SortOrder = DESC
    from: Int = 0
    size: Int = 20
    useCache: Boolean = true
  }

  input FilterInput {
    field: String!
    value: String!
  }

  input DocumentInput {
    id: ID!
    title: String!
    content: String
    summary: String
    tags: [String!]!
    category: String
    source: String
    author: String
    importance_score: Float
    user_rating: Float
  }

  enum SortField {
    SCORE
    DATE
    IMPORTANCE
    TITLE
    RELEVANCE
  }

  enum SortOrder {
    ASC
    DESC
  }

  enum SearchType {
    FULLTEXT
    SEMANTIC
    ADVANCED
  }

  type Query {
    # Full-text search
    search(
      query: String!
      from: Int = 0
      size: Int = 20
      sort: SortField = SCORE
      order: SortOrder = DESC
      includeAggregations: Boolean = false
      useCache: Boolean = true
    ): SearchResult!

    # Semantic search with vector similarity
    semanticSearch(
      query: String!
      from: Int = 0
      size: Int = 20
      threshold: Float = 0.7
      useCache: Boolean = true
    ): SearchResult!

    # Advanced search with filters and facets
    advancedSearch(input: AdvancedSearchInput!): SearchResult!

    # Auto-complete suggestions
    suggestions(
      query: String!
      size: Int = 10
      useCache: Boolean = true
    ): SuggestionResult!

    # Get document by ID
    document(id: ID!): Document

    # Get multiple documents by IDs
    documents(ids: [ID!]!): [Document!]!

    # Search within specific categories
    searchByCategory(
      category: String!
      query: String
      from: Int = 0
      size: Int = 20
    ): SearchResult!

    # Search by tags
    searchByTags(
      tags: [String!]!
      query: String
      from: Int = 0
      size: Int = 20
    ): SearchResult!

    # Get facets for building search UI
    getFacets(query: String): FacetGroup!

    # Similar documents based on content
    similarDocuments(
      documentId: ID!
      size: Int = 10
      threshold: Float = 0.5
    ): SearchResult!
  }

  type Mutation {
    # Index a single document
    indexDocument(input: DocumentInput!): Document!

    # Bulk index multiple documents
    bulkIndexDocuments(inputs: [DocumentInput!]!): [Document!]!

    # Delete a document
    deleteDocument(id: ID!): Boolean!

    # Update document
    updateDocument(id: ID!, input: DocumentInput!): Document!

    # Clear search cache
    clearSearchCache: Boolean!

    # Reindex all documents
    reindexAll: Boolean!
  }

  type Subscription {
    # Real-time search results
    searchUpdates(query: String!): SearchResult!

    # Document indexing status
    indexingStatus: String!
  }
`;

export const resolvers = {
  Date: {
    serialize: (date) => date.toISOString(),
    parseValue: (value) => new Date(value),
    parseLiteral: (ast) => new Date(ast.value),
  },

  Query: {
    search: async (_, args, { searchService }) => {
      return await searchService.fullTextSearch(args.query, args);
    },

    semanticSearch: async (_, args, { searchService }) => {
      return await searchService.semanticSearch(args.query, args);
    },

    advancedSearch: async (_, { input }, { searchService }) => {
      return await searchService.advancedSearch(input);
    },

    suggestions: async (_, args, { searchService }) => {
      return await searchService.getSuggestions(args.query, args);
    },

    document: async (_, { id }, { searchService }) => {
      const result = await searchService.fullTextSearch(`_id:${id}`, { size: 1 });
      return result.hits[0]?.source || null;
    },

    documents: async (_, { ids }, { searchService }) => {
      const promises = ids.map(id =>
        searchService.fullTextSearch(`_id:${id}`, { size: 1 })
      );
      const results = await Promise.all(promises);
      return results.map(result => result.hits[0]?.source).filter(Boolean);
    },

    searchByCategory: async (_, args, { searchService }) => {
      const searchParams = {
        query: args.query || '*',
        filters: { category: args.category },
        from: args.from,
        size: args.size
      };
      return await searchService.advancedSearch(searchParams);
    },

    searchByTags: async (_, args, { searchService }) => {
      const searchParams = {
        query: args.query || '*',
        tags: args.tags,
        from: args.from,
        size: args.size
      };
      return await searchService.advancedSearch(searchParams);
    },

    getFacets: async (_, { query }, { searchService }) => {
      const result = await searchService.fullTextSearch(query || '*', {
        size: 0,
        includeAggregations: true
      });
      return result.facets || {
        categories: [],
        sources: [],
        authors: [],
        tags: []
      };
    },

    similarDocuments: async (_, { documentId, size, threshold }, { searchService }) => {
      // Get the document first
      const docResult = await searchService.fullTextSearch(`_id:${documentId}`, { size: 1 });
      if (!docResult.hits.length) {
        throw new Error('Document not found');
      }

      const doc = docResult.hits[0].source;
      const query = `${doc.title} ${doc.content || ''} ${doc.summary || ''}`;

      return await searchService.semanticSearch(query, { size, threshold });
    },
  },

  Mutation: {
    indexDocument: async (_, { input }, { searchService }) => {
      await searchService.indexDocument(input);
      return input;
    },

    bulkIndexDocuments: async (_, { inputs }, { searchService }) => {
      await searchService.bulkIndex(inputs);
      return inputs;
    },

    deleteDocument: async (_, { id }, { elasticsearchClient }) => {
      try {
        await elasticsearchClient.delete({
          index: 'recall-documents',
          id: id
        });
        return true;
      } catch (error) {
        console.error('Delete error:', error);
        return false;
      }
    },

    updateDocument: async (_, { id, input }, { searchService }) => {
      await searchService.indexDocument({ ...input, id });
      return input;
    },

    clearSearchCache: async (_, __, { redisCache }) => {
      try {
        await redisCache.flushCache();
        return true;
      } catch (error) {
        console.error('Cache clear error:', error);
        return false;
      }
    },

    reindexAll: async (_, __, { searchService, elasticsearchClient }) => {
      try {
        // This would typically rebuild the entire index
        // Implementation depends on your data source
        await elasticsearchClient.indices.refresh({
          index: 'recall-documents'
        });
        return true;
      } catch (error) {
        console.error('Reindex error:', error);
        return false;
      }
    }
  },

  // Add subscription resolvers if needed for real-time features
  Subscription: {
    searchUpdates: {
      // Implementation would depend on your real-time setup
      subscribe: () => {
        // Return an async iterator
      }
    },

    indexingStatus: {
      subscribe: () => {
        // Return an async iterator for indexing status updates
      }
    }
  }
};