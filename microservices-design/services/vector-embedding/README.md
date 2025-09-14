# Vector Embedding Service

## Overview

The Vector Embedding Service transforms text into mathematical representations that capture semantic meaning. It provides intelligent embedding generation, vector similarity search, and semantic clustering capabilities for the Recall platform.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OpenAI API    │    │  Local Models   │    │   FAISS Index   │
│   (Cloud)       │    │ (Sentence-     │    │   (Vector DB)    │
│                 │    │  Transformers)  │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   Embedding Service       │
                    │   (Orchestration)         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Redis Cache            │
                    │   (Embedding Storage)     │
                    └──────────────────────────┘
```

## Features

- **Multi-Provider Embeddings**: OpenAI API and local Sentence-Transformers models
- **Intelligent Caching**: Redis-based embedding storage with compression
- **Vector Similarity Search**: FAISS-powered semantic search
- **Semantic Clustering**: Automatic grouping of similar content
- **Batch Processing**: Efficient bulk embedding generation
- **Performance Optimization**: Sub-100ms embedding generation
- **Cost Management**: Usage tracking and optimization

## API Endpoints

### Embedding Generation

- `POST /embeddings/generate` - Generate embeddings for text
- `POST /embeddings/batch` - Batch embedding generation
- `GET /embeddings/{id}` - Retrieve cached embedding

### Vector Search

- `POST /embeddings/search` - Semantic similarity search
- `POST /embeddings/similar` - Find similar embeddings
- `GET /embeddings/nearest/{id}` - Find nearest neighbors

### Clustering & Analysis

- `POST /embeddings/cluster` - Cluster embeddings by similarity
- `GET /embeddings/clusters` - List semantic clusters
- `GET /embeddings/clusters/{id}` - Get cluster details

### Model Management

- `GET /embeddings/models` - List available models
- `POST /embeddings/models/switch` - Switch embedding model
- `GET /embeddings/models/status` - Model status and performance

## Configuration

```yaml
embedding:
  providers:
    openai:
      api_key: ${OPENAI_API_KEY}
      model: text-embedding-3-small
      dimensions: 1536
      max_tokens: 8191
      rate_limit: 3000  # requests per minute
    
    local:
      model: sentence-transformers/all-MiniLM-L6-v2
      dimensions: 384
      device: cpu  # cpu, cuda, mps
      batch_size: 32

  cache:
    redis:
      host: localhost
      port: 6379
      ttl: 86400  # 24 hours
      compression: true
    
  search:
    faiss:
      index_type: IndexFlatIP  # Inner Product
      dimension: 1536
      batch_size: 1000
    
  clustering:
    algorithm: kmeans
    max_clusters: 50
    min_cluster_size: 3
    similarity_threshold: 0.7
```

## Usage Examples

### Generate Embedding

```bash
curl -X POST http://localhost:3001/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The user prefers dark mode themes and TypeScript",
    "provider": "openai",
    "metadata": {
      "user_id": "user_123",
      "source": "preference"
    }
  }'
```

### Semantic Search

```bash
curl -X POST http://localhost:3001/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the user preferences?",
    "limit": 10,
    "threshold": 0.8,
    "include_metadata": true
  }'
```

### Batch Processing

```bash
curl -X POST http://localhost:3001/embeddings/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "User likes React and TypeScript",
      "Prefers dark mode interfaces",
      "Works primarily on frontend development"
    ],
    "provider": "openai",
    "batch_size": 10
  }'
```

### Clustering

```bash
curl -X POST http://localhost:3001/embeddings/cluster \
  -H "Content-Type: application/json" \
  -d '{
    "embedding_ids": ["emb_1", "emb_2", "emb_3"],
    "algorithm": "kmeans",
    "num_clusters": 5
  }'
```

## Performance Targets

- **Embedding Generation**: < 100ms per request
- **Batch Processing**: 1000+ embeddings per minute
- **Search Latency**: < 50ms for similarity search
- **Cache Hit Rate**: > 95% for repeated queries
- **Model Loading**: < 5 seconds for local models
- **Memory Usage**: < 2GB for local models

## Development

### Prerequisites

- Node.js 18+
- Python 3.8+ (for local models)
- Redis 6+
- OpenAI API key (optional)

### Setup

```bash
# Install dependencies
npm install

# Install Python dependencies for local models
pip install sentence-transformers faiss-cpu numpy

# Set environment variables
export OPENAI_API_KEY="your-api-key"

# Start development server
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Test embedding generation
curl http://localhost:3001/health/ready
```

## Monitoring

### Metrics

- `embedding_generation_total` - Total embeddings generated
- `embedding_generation_duration_seconds` - Generation latency
- `embedding_cache_hits_total` - Cache hit count
- `embedding_search_total` - Search operations
- `embedding_model_usage_total` - Model usage statistics

### Health Checks

- `/health/live` - Service liveness
- `/health/ready` - Service readiness
- `/health/detailed` - Detailed health status

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-embedding
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vector-embedding
  template:
    spec:
      containers:
      - name: vector-embedding
        image: recall/vector-embedding:latest
        ports:
        - containerPort: 3001
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: recall-secrets
              key: openai-api-key
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

## Security

- **API Key Management**: Secure OpenAI API key storage
- **Rate Limiting**: Prevent abuse and manage costs
- **Input Validation**: Sanitize text inputs
- **Access Control**: User-based embedding isolation
- **Audit Logging**: Track embedding generation and usage

## Cost Optimization

- **Intelligent Caching**: Reduce redundant API calls
- **Batch Processing**: Optimize API usage
- **Local Models**: Reduce cloud API dependency
- **Compression**: Minimize storage costs
- **Usage Tracking**: Monitor and optimize costs

## Future Enhancements

- **Multi-language Support**: Embeddings for multiple languages
- **Domain-specific Models**: Specialized models for different domains
- **Real-time Updates**: Live embedding index updates
- **Advanced Clustering**: Hierarchical and density-based clustering
- **Embedding Visualization**: Dimensionality reduction and visualization