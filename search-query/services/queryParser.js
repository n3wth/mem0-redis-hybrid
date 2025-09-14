import natural from 'natural';
import compromise from 'compromise';

export class QueryParser {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
  }

  parseQuery(query, options = {}) {
    const parsed = {
      originalQuery: query,
      cleanedQuery: this.cleanQuery(query),
      tokens: [],
      stems: [],
      entities: [],
      filters: {},
      searchType: 'fulltext',
      boost: {},
      dateRange: null,
      categories: [],
      tags: []
    };

    // Extract special operators and filters
    parsed.filters = this.extractFilters(query);
    parsed.dateRange = this.extractDateRange(query);
    parsed.categories = this.extractCategories(query);
    parsed.tags = this.extractTags(query);

    // Clean query after filter extraction
    let cleanQuery = this.removeFilters(query);

    // Tokenize and process
    parsed.tokens = this.tokenizer.tokenize(cleanQuery.toLowerCase())
      .filter(token => !this.stopWords.has(token) && token.length > 1);

    parsed.stems = parsed.tokens.map(token => this.stemmer.stem(token));

    // Extract entities using compromise
    const doc = compromise(cleanQuery);
    parsed.entities = {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      topics: doc.topics().out('array')
    };

    // Determine search type
    parsed.searchType = this.determineSearchType(query, parsed);

    // Generate boost factors
    parsed.boost = this.generateBoostFactors(parsed);

    return parsed;
  }

  cleanQuery(query) {
    return query
      .replace(/[^\w\s\-"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractFilters(query) {
    const filters = {};

    // Extract author filter: author:john
    const authorMatch = query.match(/author:(\w+)/i);
    if (authorMatch) filters.author = authorMatch[1];

    // Extract source filter: source:email
    const sourceMatch = query.match(/source:(\w+)/i);
    if (sourceMatch) filters.source = sourceMatch[1];

    // Extract category filter: category:work
    const categoryMatch = query.match(/category:(\w+)/i);
    if (categoryMatch) filters.category = categoryMatch[1];

    // Extract importance filter: importance:>5
    const importanceMatch = query.match(/importance:([><]=?\d+)/i);
    if (importanceMatch) filters.importance = importanceMatch[1];

    return filters;
  }

  extractDateRange(query) {
    const datePatterns = [
      /after:(\d{4}-\d{2}-\d{2})/i,
      /before:(\d{4}-\d{2}-\d{2})/i,
      /date:(\d{4}-\d{2}-\d{2})/i,
      /(last|past)\s+(week|month|year)/i,
      /(today|yesterday)/i
    ];

    for (const pattern of datePatterns) {
      const match = query.match(pattern);
      if (match) {
        return this.parseDateFilter(match);
      }
    }

    return null;
  }

  parseDateFilter(match) {
    const fullMatch = match[0];

    if (fullMatch.includes('after:')) {
      return { gte: match[1] };
    }
    if (fullMatch.includes('before:')) {
      return { lte: match[1] };
    }
    if (fullMatch.includes('date:')) {
      return { gte: match[1], lte: match[1] };
    }
    if (fullMatch.includes('last week') || fullMatch.includes('past week')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { gte: weekAgo.toISOString().split('T')[0] };
    }
    if (fullMatch.includes('today')) {
      const today = new Date().toISOString().split('T')[0];
      return { gte: today, lte: today };
    }

    return null;
  }

  extractCategories(query) {
    const categoryPattern = /category:(\w+)/gi;
    const categories = [];
    let match;

    while ((match = categoryPattern.exec(query)) !== null) {
      categories.push(match[1]);
    }

    return categories;
  }

  extractTags(query) {
    const tagPattern = /#(\w+)/g;
    const tags = [];
    let match;

    while ((match = tagPattern.exec(query)) !== null) {
      tags.push(match[1]);
    }

    return tags;
  }

  removeFilters(query) {
    return query
      .replace(/\w+:[^\s]+/g, '')
      .replace(/#\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  determineSearchType(query, parsed) {
    if (query.includes('"')) return 'phrase';
    if (parsed.entities.people.length > 0 || parsed.entities.places.length > 0) return 'entity';
    if (parsed.filters.author || parsed.filters.source) return 'filtered';
    if (query.includes('similar:') || query.includes('like:')) return 'semantic';
    return 'fulltext';
  }

  generateBoostFactors(parsed) {
    const boost = {
      title: 2.0,
      content: 1.0,
      summary: 1.5,
      tags: 3.0
    };

    // Boost based on entities
    if (parsed.entities.people.length > 0) boost.author = 2.5;
    if (parsed.entities.organizations.length > 0) boost.source = 2.0;

    // Boost recent documents
    boost.recency = 1.2;

    // Boost frequently accessed documents
    boost.popularity = 1.1;

    return boost;
  }

  buildElasticsearchQuery(parsedQuery, options = {}) {
    const { searchType, tokens, stems, filters, dateRange, boost } = parsedQuery;

    const query = {
      bool: {
        must: [],
        should: [],
        filter: []
      }
    };

    // Main search query based on type
    switch (searchType) {
      case 'phrase':
        query.bool.must.push({
          multi_match: {
            query: parsedQuery.originalQuery.replace(/"/g, ''),
            type: 'phrase',
            fields: [`title^${boost.title}`, `content^${boost.content}`, `summary^${boost.summary}`]
          }
        });
        break;

      case 'semantic':
        // For semantic search, we'll use vector search
        if (options.embedding) {
          query.bool.must.push({
            script_score: {
              query: { match_all: {} },
              script: {
                source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                params: { query_vector: options.embedding }
              }
            }
          });
        }
        break;

      default:
        query.bool.must.push({
          multi_match: {
            query: parsedQuery.cleanedQuery,
            type: 'best_fields',
            fields: [`title^${boost.title}`, `content^${boost.content}`, `summary^${boost.summary}`, `tags^${boost.tags}`],
            fuzziness: 'AUTO'
          }
        });
    }

    // Add filters
    if (filters.author) {
      query.bool.filter.push({ term: { author: filters.author } });
    }
    if (filters.source) {
      query.bool.filter.push({ term: { source: filters.source } });
    }
    if (filters.category) {
      query.bool.filter.push({ term: { category: filters.category } });
    }

    // Add date range filter
    if (dateRange) {
      query.bool.filter.push({
        range: {
          created_at: dateRange
        }
      });
    }

    // Add recency boost
    query.bool.should.push({
      function_score: {
        query: { match_all: {} },
        functions: [
          {
            gauss: {
              created_at: {
                origin: "now",
                scale: "30d",
                decay: 0.5
              }
            },
            weight: boost.recency
          },
          {
            field_value_factor: {
              field: "access_count",
              factor: 0.1,
              modifier: "log1p",
              missing: 0
            },
            weight: boost.popularity
          }
        ],
        score_mode: "sum",
        boost_mode: "multiply"
      }
    });

    return query;
  }
}

export default new QueryParser();