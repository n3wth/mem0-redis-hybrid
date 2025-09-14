# Recall Microservices Architecture

## Overview

This directory contains the complete microservices architecture for Recall, transforming it from a monolithic memory system into a distributed, scalable platform for augmented human cognition.

## Architecture Vision

Recall is evolving into a comprehensive intelligence platform with specialized microservices that can be developed and deployed independently. Each service is designed for specific capabilities while maintaining loose coupling and high cohesion.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                              │
│                    (Kong + Auth + Rate Limiting)                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐    ┌───────▼───────┐    ┌─────▼─────┐
│Memory │    │   Vector      │    │  Search   │
│Storage│    │  Embedding    │    │  Query    │
│Service│    │   Service     │    │  Service  │
└───┬───┘    └───────┬───────┘    └─────┬─────┘
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
            ┌─────────▼─────────┐
            │   Event Bus       │
            │   (Kafka + CDC)   │
            └─────────┬─────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐    ┌───────▼───────┐    ┌─────▼─────┐
│Memory │    │  Real-time    │    │Analytics  │
│ Graph │    │    Sync       │    │& Metrics  │
│Service│    │   Service     │    │ Service   │
└───────┘    └───────────────┘    └───────────┘
```

## Implemented Services

### ✅ Memory Storage Service
**Status**: Complete Implementation
**Location**: `services/memory-storage/`

**Features**:
- PostgreSQL primary storage with Redis caching
- Intelligent conflict resolution and versioning
- Batch operations and performance optimization
- Comprehensive health checks and metrics
- Docker Compose development environment

**Quick Start**:
```bash
cd services/memory-storage
./scripts/setup-dev.sh
```

**Endpoints**:
- `POST /memories` - Create memory
- `GET /memories/{id}` - Get memory
- `PUT /memories/{id}` - Update memory
- `DELETE /memories/{id}` - Delete memory
- `GET /memories` - List memories
- `POST /memories/search` - Search memories
- `GET /health/ready` - Health check
- `GET /metrics` - Performance metrics

## Planned Services

### 🔄 Vector Embedding Service
**Status**: Design Phase
**Location**: `services/vector-embedding/`

**Features**:
- OpenAI and local embedding generation
- FAISS vector similarity search
- Semantic clustering and relationship mapping
- Embedding caching and optimization

### 🔄 Search Query Service
**Status**: Design Phase
**Location**: `services/search-query/`

**Features**:
- Elasticsearch full-text search
- GraphQL query interface
- Advanced ranking algorithms
- Query optimization and caching

### 🔄 Memory Graph Service
**Status**: Design Phase
**Location**: `services/memory-graph/`

**Features**:
- Neo4j relationship mapping
- Graph traversal algorithms
- Community detection
- Visualization endpoints

### 🔄 Real-time Sync Service
**Status**: Partial Implementation
**Location**: `services/realtime-sync/`

**Features**:
- WebSocket connections
- Event broadcasting
- Subscription management
- RabbitMQ integration

### 🔄 Analytics & Metrics Service
**Status**: Design Phase
**Location**: `services/analytics/`

**Features**:
- Prometheus metrics collection
- Grafana dashboards
- Usage analytics
- Anomaly detection

## Development Workflow

### 1. Service Development
Each service follows a consistent structure:
```
service-name/
├── README.md              # Service documentation
├── package.json           # Dependencies and scripts
├── server.js              # Main service entry point
├── src/                   # Source code
│   ├── ServiceName.js     # Core service class
│   ├── DatabaseManager.js # Database operations
│   ├── CacheManager.js    # Caching layer
│   └── HealthChecker.js   # Health monitoring
├── schema.sql             # Database schema
├── docker-compose.yml     # Development environment
├── Dockerfile             # Container definition
└── scripts/               # Utility scripts
```

### 2. API Contracts
All services define their APIs using:
- **OpenAPI 3.0** specifications
- **AsyncAPI** for event schemas
- **GraphQL** schemas where applicable

### 3. Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **Performance Tests**: Load and stress testing
- **Contract Tests**: API compatibility testing

### 4. Deployment
- **Docker**: Containerized services
- **Kubernetes**: Orchestration and scaling
- **Helm**: Package management
- **CI/CD**: Automated deployment pipeline

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Quick Start
```bash
# Clone the repository
git clone https://github.com/n3wth/recall.git
cd recall/microservices-design

# Start Memory Storage Service
cd services/memory-storage
./scripts/setup-dev.sh
```

### Development Environment
Each service includes a complete development environment:
- **Docker Compose**: Infrastructure services
- **Hot Reload**: Automatic code reloading
- **Health Checks**: Service monitoring
- **Metrics**: Performance tracking
- **Admin UIs**: pgAdmin, Redis Commander

## Service Communication

### Synchronous Communication
- **REST APIs**: Direct service-to-service calls
- **GraphQL**: Flexible query interface
- **gRPC**: High-performance internal communication

### Asynchronous Communication
- **Event Bus**: Kafka for event streaming
- **Message Queues**: RabbitMQ for task processing
- **WebSockets**: Real-time updates

### Data Flow
```
Client Request → API Gateway → Service → Database
                     ↓
                Event Bus → Other Services
```

## Monitoring & Observability

### Metrics Collection
- **Prometheus**: Metrics aggregation
- **Grafana**: Visualization dashboards
- **Custom Metrics**: Service-specific monitoring

### Logging
- **Structured Logging**: JSON format
- **Centralized Logging**: ELK Stack
- **Correlation IDs**: Request tracing

### Health Checks
- **Liveness Probes**: Service availability
- **Readiness Probes**: Service readiness
- **Detailed Health**: Comprehensive status

## Security

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **RBAC**: Role-based access control
- **API Keys**: Service-to-service authentication

### Data Protection
- **Encryption**: At rest and in transit
- **Input Validation**: Request sanitization
- **Rate Limiting**: Abuse prevention

### Network Security
- **mTLS**: Mutual TLS between services
- **Network Policies**: Kubernetes security
- **Firewall Rules**: Network isolation

## Performance Targets

### Latency Requirements
- **Read Operations**: p50 < 2ms, p99 < 5ms
- **Write Operations**: p50 < 5ms, p99 < 10ms
- **Search Operations**: p50 < 10ms, p99 < 50ms

### Throughput Requirements
- **Memory Operations**: 10,000 ops/sec per instance
- **Search Operations**: 1,000 queries/sec per instance
- **Event Processing**: 100,000 events/sec

### Availability Requirements
- **Service Uptime**: 99.9%
- **Data Durability**: 99.999%
- **Recovery Time**: < 5 minutes

## Contributing

### Development Process
1. **Design First**: Define API contracts
2. **Implement**: Build the service
3. **Test**: Comprehensive testing
4. **Document**: Update documentation
5. **Deploy**: Automated deployment

### Code Standards
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **JSDoc**: Documentation
- **Conventional Commits**: Commit messages

### Pull Request Process
1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request
6. Code review
7. Merge to main

## Roadmap

### Phase 1: Foundation (Current)
- ✅ Memory Storage Service
- 🔄 Vector Embedding Service
- 🔄 Search Query Service
- 🔄 API Gateway

### Phase 2: Intelligence
- Memory Graph Service
- Clustering & Classification
- Summarization Service
- Real-time Sync Enhancement

### Phase 3: Scale
- Edge Distribution
- Analytics Dashboard
- Workflow Orchestration
- Advanced Monitoring

### Phase 4: Evolution
- AI-Powered Features
- Multi-tenancy
- Global Distribution
- Advanced Security

## Support

### Documentation
- **Service Docs**: Individual service documentation
- **API Reference**: OpenAPI specifications
- **Architecture Guide**: System design documentation
- **Deployment Guide**: Production deployment

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Community discussions
- **Documentation**: Comprehensive guides
- **Examples**: Code samples and tutorials

### Enterprise Support
- **Professional Services**: Custom implementations
- **Training**: Team education
- **Support**: Priority assistance
- **Consulting**: Architecture guidance

---

## The Vision

Recall is not just a memory system—it's the infrastructure for augmented human cognition. Every service we build, every optimization we make, every feature we add contributes to the enhancement of human intelligence and the evolution of our species.

**Welcome to the future of human memory. Welcome to Recall.**

---

*Built with ❤️ by the Recall team at Newth.ai*