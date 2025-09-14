# Vector Embedding Microservice

High-performance vector embeddings and semantic search API built with FastAPI, supporting both OpenAI and local models with FAISS indexing and Redis caching.

## Features

- **Multiple Embedding Models**
  - OpenAI: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
  - Local: Sentence-Transformers models (all-MiniLM-L6-v2, all-mpnet-base-v2)
  - Automatic fallback from OpenAI to local models

- **High Performance**
  - Redis caching to avoid re-computation
  - Batch processing for multiple texts
  - FAISS vector indexing for fast similarity search
  - Async/await throughout for non-blocking operations

- **Advanced Vector Operations**
  - Semantic similarity search
  - K-means clustering
  - Similar pairs detection
  - Vector index persistence

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone and setup
git clone <repository>
cd vector-embedding

# Set environment variables
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Start services
docker-compose up -d

# Test the service
python test_client.py
```

### Manual Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start Redis (required for caching)
redis-server

# Set environment variables
export OPENAI_API_KEY="your-api-key-here"

# Run the service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Generate Embeddings

```bash
# Single embedding
curl -X POST "http://localhost:8000/embeddings/generate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "model": "text-embedding-3-small"}'

# Batch embeddings
curl -X POST "http://localhost:8000/embeddings/batch" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello", "World"], "model": "text-embedding-3-small"}'
```

### Vector Search

```bash
# Add vectors to index
curl -X POST "http://localhost:8000/vectors/add" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Machine learning", "Artificial intelligence"]}'

# Search similar vectors
curl -X POST "http://localhost:8000/embeddings/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "AI and ML", "top_k": 5}'
```

### Other Operations

```bash
# Get available models
curl "http://localhost:8000/embeddings/models"

# Cluster vectors
curl -X POST "http://localhost:8000/vectors/cluster?n_clusters=5"

# Get statistics
curl "http://localhost:8000/vectors/stats"

# Health check
curl "http://localhost:8000/health"
```

## Configuration

Environment variables (set in `.env` file):

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
REDIS_URL=redis://localhost:6379/0
EMBEDDING_MODEL_OPENAI=text-embedding-3-small
EMBEDDING_MODEL_LOCAL=all-MiniLM-L6-v2
CACHE_TTL=86400
MAX_BATCH_SIZE=100
VECTOR_DIMENSION=1536
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI App   │    │  Embedding       │    │  Vector Search  │
│                 │    │  Service         │    │  (FAISS)       │
│  • REST API     ├────┤                  ├────┤                │
│  • Validation   │    │  • OpenAI API    │    │  • Similarity   │
│  • Error        │    │  • Local Models  │    │  • Clustering   │
│    Handling     │    │  • Fallback      │    │  • Persistence  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────┤  Redis Cache    │
                        │                 │
                        │  • Embeddings   │
                        │  • TTL Support  │
                        │  • Batch Ops    │
                        └─────────────────┘
```

## Performance Features

1. **Caching Strategy**
   - Redis caching with configurable TTL
   - Batch cache operations for efficiency
   - Cache key generation based on text + model

2. **Embedding Optimization**
   - Automatic fallback from OpenAI to local models
   - Batch API calls to reduce latency
   - Lazy loading of local models

3. **Vector Operations**
   - FAISS IndexFlatIP for cosine similarity
   - Normalized vectors for consistent scoring
   - Efficient clustering with K-means

## Development

```bash
# Install development dependencies
pip install -r requirements.txt

# Run tests
python test_client.py

# Format code
black app/ config/ tests/

# Type checking
mypy app/
```

## Production Deployment

1. **Docker Deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Environment Setup**
   - Set strong Redis password
   - Configure proper logging
   - Set up monitoring and alerting
   - Use load balancer for multiple instances

3. **Scaling Considerations**
   - Redis cluster for cache scaling
   - Multiple FastAPI workers
   - FAISS index sharding for large datasets
   - GPU support for local models

## Monitoring

The service provides several monitoring endpoints:

- `/health` - Service health and component status
- `/vectors/stats` - Vector index statistics
- `/` - Service information and available endpoints

## License

Copyright 2025 Newth.ai