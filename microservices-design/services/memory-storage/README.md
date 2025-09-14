# Memory Storage Service

## Overview

The Memory Storage Service is the core data persistence layer for Recall. It provides high-performance storage and retrieval of memories with intelligent caching, conflict resolution, and data integrity guarantees.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  Storage API    │───▶│   PostgreSQL    │
│                 │    │                 │    │   (Primary)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (L1 Cache)    │
                       └─────────────────┘
```

## Features

- **Multi-tier Storage**: PostgreSQL for persistence, Redis for speed
- **Intelligent Caching**: Automatic cache warming and invalidation
- **Conflict Resolution**: Smart merging of concurrent updates
- **Data Integrity**: ACID transactions with optimistic locking
- **Performance**: Sub-5ms read latency, <10ms write latency
- **Scalability**: Horizontal scaling with read replicas

## API Endpoints

### REST API

- `POST /memories` - Create new memory
- `GET /memories/{id}` - Retrieve memory by ID
- `PUT /memories/{id}` - Update memory
- `DELETE /memories/{id}` - Delete memory
- `GET /memories` - List memories with pagination
- `POST /memories/batch` - Batch operations

### GraphQL API

```graphql
type Memory {
  id: ID!
  content: String!
  metadata: JSON
  userId: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  version: String!
}

type Query {
  memory(id: ID!): Memory
  memories(filter: MemoryFilter, pagination: Pagination): MemoryConnection
}

type Mutation {
  createMemory(input: CreateMemoryInput!): Memory!
  updateMemory(id: ID!, input: UpdateMemoryInput!): Memory!
  deleteMemory(id: ID!): Boolean!
}
```

## Data Model

### PostgreSQL Schema

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB,
  user_id VARCHAR(255) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at);
CREATE INDEX idx_memories_content_gin ON memories USING gin(to_tsvector('english', content));
```

### Redis Cache Structure

```
memory:{id}                    # Memory data (TTL: 24h)
user:{userId}:memories         # User's memory list (TTL: 1h)
search:{queryHash}             # Search results cache (TTL: 5m)
batch:{batchId}                # Batch operation status
```

## Configuration

```yaml
database:
  postgres:
    host: localhost
    port: 5432
    database: recall
    username: recall_user
    password: ${POSTGRES_PASSWORD}
    pool:
      min: 2
      max: 10
      idle: 30000

cache:
  redis:
    host: localhost
    port: 6379
    password: ${REDIS_PASSWORD}
    ttl:
      memory: 86400      # 24 hours
      search: 300        # 5 minutes
      user_list: 3600    # 1 hour

performance:
  batch_size: 100
  cache_warming: true
  compression: true
  compression_threshold: 1024
```

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Setup

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate

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
```

## Monitoring

### Metrics

- `memory_operations_total` - Total memory operations
- `memory_cache_hits_total` - Cache hit count
- `memory_cache_misses_total` - Cache miss count
- `memory_operation_duration_seconds` - Operation latency
- `memory_database_connections_active` - Active DB connections

### Health Checks

- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- `/health/detailed` - Detailed health status

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-storage
spec:
  replicas: 3
  selector:
    matchLabels:
      app: memory-storage
  template:
    spec:
      containers:
      - name: memory-storage
        image: recall/memory-storage:latest
        ports:
        - containerPort: 3000
        env:
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: recall-secrets
              key: postgres-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: recall-secrets
              key: redis-url
```

## Performance Targets

- **Read Latency**: p50 < 2ms, p99 < 5ms
- **Write Latency**: p50 < 5ms, p99 < 10ms
- **Cache Hit Rate**: > 90%
- **Availability**: 99.9%
- **Throughput**: 10,000 ops/sec per instance

## Security

- Input validation and sanitization
- SQL injection prevention
- Rate limiting per user
- Audit logging
- Encryption at rest and in transit