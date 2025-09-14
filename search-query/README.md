# Recall Search Query Microservice

High-performance search microservice with Elasticsearch, GraphQL, and advanced query processing capabilities.

## Features

- **Full-text Search**: BM25 scoring with custom relevance boosting
- **Semantic Search**: Vector similarity with hybrid lexical matching
- **Advanced Search**: Complex queries with filters, facets, and aggregations
- **Auto-complete**: Real-time search suggestions
- **GraphQL API**: Flexible query interface
- **REST API**: RESTful endpoints for all search operations
- **Caching**: Redis-based result caching for performance
- **Natural Language Processing**: Query parsing with entity extraction

## Quick Start

```bash
# Install dependencies
npm install

# Start services (Elasticsearch + Redis + Kibana)
npm run docker:up

# Start development server
npm run dev

# Or start production server
npm start
```

## API Endpoints

### REST API

- `POST /api/v1/search` - Full-text search
- `POST /api/v1/search/semantic` - Semantic search
- `POST /api/v1/search/advanced` - Advanced search with filters
- `GET /api/v1/search/suggestions` - Auto-complete suggestions
- `GET /api/v1/search/facets` - Available facets
- `POST /api/v1/search/similar` - Similar documents
- `POST /api/v1/search/category/:category` - Category search
- `GET /api/v1/search/stats` - Search statistics
- `POST /api/v1/search/index` - Index document
- `POST /api/v1/search/bulk` - Bulk index documents

### GraphQL

Access the GraphQL playground at `http://localhost:3001/graphql`

## Example Usage

### Full-text Search

```bash
curl -X POST http://localhost:3001/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning algorithms",
    "size": 10,
    "includeAggregations": true
  }'
```

### Semantic Search

```bash
curl -X POST http://localhost:3001/api/v1/search/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence and neural networks",
    "threshold": 0.7,
    "size": 15
  }'
```

### Advanced Search

```bash
curl -X POST http://localhost:3001/api/v1/search/advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "data science",
    "filters": {
      "category": "research",
      "source": "arxiv"
    },
    "dateRange": {
      "gte": "2023-01-01"
    },
    "tags": ["python", "tensorflow"],
    "sortBy": "date",
    "sortOrder": "desc"
  }'
```

### GraphQL Query

```graphql
query SearchDocuments($query: String!, $size: Int) {
  search(query: $query, size: $size, includeAggregations: true) {
    total
    hits {
      id
      score
      source {
        title
        summary
        tags
        category
        created_at
      }
      highlights {
        title
        content
      }
    }
    facets {
      categories {
        name
        count
      }
      tags {
        name
        count
      }
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# Service configuration
PORT=3001
NODE_ENV=development

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Redis
REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=*
RATE_LIMIT=1000
```

### Docker Services

The included `docker-compose.yml` provides:

- **Elasticsearch 8.11.0** - Search engine and document storage
- **Redis 7.2** - Caching layer
- **Kibana 8.11.0** - Elasticsearch management UI

Access Kibana at `http://localhost:5601`

## Query Parser Features

The service includes a sophisticated natural language query parser:

### Special Operators

- `author:john` - Filter by author
- `source:email` - Filter by source
- `category:work` - Filter by category
- `importance:>5` - Filter by importance score
- `after:2023-01-01` - Date range filters
- `before:2023-12-31` - Date range filters
- `#tag` - Tag filters
- `"exact phrase"` - Phrase search

### Entity Recognition

Automatically extracts:
- People names
- Places
- Organizations
- Topics

### Search Types

- **Fulltext**: Standard BM25 search
- **Phrase**: Exact phrase matching
- **Entity**: Entity-focused search
- **Semantic**: Vector similarity search
- **Filtered**: Advanced filtering

## Performance Features

### Caching Strategy

- **Query Results**: 5-minute cache for search results
- **Suggestions**: 15-minute cache for auto-complete
- **Semantic Results**: 10-minute cache for vector searches

### Elasticsearch Optimizations

- Custom analyzers for better text processing
- Function scoring for recency and popularity
- Index-time embedding generation
- Optimized mapping for performance

### Scoring Algorithm

Custom relevance scoring combines:
- BM25 base score
- Recency boost (30-day decay)
- Popularity boost (access count)
- Field-specific boosts (title: 3x, tags: 2x)
- Importance score weighting

## Development

### Project Structure

```
search-query/
├── config/           # Service configurations
├── services/         # Core business logic
├── routes/           # REST API routes
├── graphql/          # GraphQL schema and resolvers
├── test/             # Test files
├── docker-compose.yml # Docker services
└── server.js         # Main server file
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Monitoring

Health check endpoint: `GET /health`

Returns service status and connection health for all dependencies.

## Production Deployment

### Docker Deployment

```bash
# Build and deploy
docker-compose up -d

# Scale services
docker-compose up -d --scale search-query=3
```

### Environment Setup

1. Configure production Elasticsearch cluster
2. Set up Redis cluster for high availability
3. Configure proper CORS origins
4. Set appropriate rate limits
5. Enable authentication if required

### Monitoring & Logging

- Service logs available via Docker logs
- Elasticsearch cluster monitoring via Kibana
- Redis monitoring via Redis CLI
- Custom metrics endpoint at `/api/v1/search/stats`

## Architecture Notes

This microservice is designed to be:

- **Stateless**: All state stored in Elasticsearch and Redis
- **Scalable**: Horizontal scaling via load balancer
- **Resilient**: Graceful degradation when services unavailable
- **Fast**: Multi-level caching and optimized queries
- **Flexible**: Both REST and GraphQL interfaces

The service integrates seamlessly with the broader Recall ecosystem and can be deployed independently or as part of a larger microservices architecture.