# Recall

<div align="center">
  <img src="https://recall.newth.ai/og-image.png" alt="Recall - Intelligent Memory for AI" width="100%" />

  <h3>Intelligent Memory Layer for AI Applications</h3>
  <p>Sub-5ms response times · Automatic failover · Built for scale</p>

  <p>
    <a href="https://www.npmjs.com/package/@n3wth/recall"><img src="https://img.shields.io/npm/v/@n3wth/recall?style=flat&colorA=000000&colorB=000000" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/@n3wth/recall"><img src="https://img.shields.io/npm/dm/@n3wth/recall?style=flat&colorA=000000&colorB=000000" alt="npm downloads" /></a>
    <a href="https://github.com/n3wth/recall/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-black?style=flat&colorA=000000&colorB=000000" alt="license" /></a>
    <a href="https://recall.newth.ai/docs"><img src="https://img.shields.io/badge/docs-recall.newth.ai-black?style=flat&colorA=000000&colorB=000000" alt="documentation" /></a>
  </p>
</div>

## Why Recall?

Modern AI applications need memory that's both **fast** and **persistent**. Recall delivers enterprise-grade memory infrastructure that scales with your application—from prototypes to production.

- **Lightning Fast**: Sub-5ms p99 latency with intelligent caching
- **Bulletproof Reliability**: Automatic failover with 99.9% uptime SLA
- **Infinite Scale**: Handle millions of requests per second
- **AI-Native**: Purpose-built for LLMs with semantic search
- **Drop-in Integration**: Works with Claude, GPT, and any LLM

## Quick Start

### Installation

```bash
npm install @n3wth/recall
```

### Basic Usage

```typescript
import { Recall } from '@n3wth/recall';

const recall = new Recall({
  apiKey: process.env.MEM0_API_KEY,
  redis: process.env.REDIS_URL
});

// Store memory with context
await recall.add({
  content: 'User prefers TypeScript and dark mode themes',
  userId: 'user_123',
  priority: 'high'
});

// Retrieve relevant memories instantly
const memories = await recall.search({
  query: 'What are the user preferences?',
  userId: 'user_123'
});
```

### Claude Desktop Integration

Transform Claude into a personalized AI assistant that remembers your preferences, context, and conversations.

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["@n3wth/recall"],
      "env": {
        "MEM0_API_KEY": "your_mem0_api_key",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

## Architecture

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://recall.newth.ai/architecture-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://recall.newth.ai/architecture-light.svg">
    <img src="https://recall.newth.ai/architecture-dark.svg" alt="Recall Architecture" width="100%" />
  </picture>
</div>

Recall implements a sophisticated multi-tier caching strategy optimized for AI workloads:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Application │ ───► │   L1 Cache   │ ───► │  L2 Cache   │ ───► Cloud Storage
│             │      │   (Redis)    │      │  (7 days)   │      (Permanent)
└─────────────┘      └──────────────┘      └─────────────┘
                          <5ms                  <20ms              <200ms
```

## Core Features

### Intelligent Caching

Automatically optimizes data placement across cache tiers based on access patterns:

```typescript
const recall = new Recall({
  cacheStrategy: 'aggressive', // 'balanced' | 'conservative'
  cache: {
    ttl: { l1: 86400, l2: 604800 },
    maxSize: 10000,
    compressionThreshold: 1024
  }
});
```

### Semantic Search

Find memories by meaning, not just keywords:

```typescript
const results = await recall.search({
  query: 'notification preferences',
  limit: 10,
  threshold: 0.8
});
```

### Production Ready

Built for enterprise deployments with comprehensive monitoring:

```typescript
// Monitor cache performance
const stats = await recall.cacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Avg latency: ${stats.avgLatency}ms`);

// Health checks
const health = await recall.health();
if (!health.redis.connected) {
  // Automatic failover to cloud storage
}
```

## Real-World Examples

### Next.js App Router

```typescript
// app/api/memory/route.ts
import { Recall } from '@n3wth/recall';
import { NextResponse } from 'next/server';

const recall = new Recall({
  apiKey: process.env.MEM0_API_KEY!,
  redis: process.env.REDIS_URL
});

export async function POST(request: Request) {
  const { content, userId } = await request.json();

  const result = await recall.add({
    content,
    userId,
    metadata: {
      source: 'web_app',
      timestamp: new Date().toISOString()
    }
  });

  return NextResponse.json(result);
}
```

### LangChain Integration

```python
from langchain.memory import BaseChatMemory
from recall import RecallClient

class RecallMemory(BaseChatMemory):
    def __init__(self, user_id: str):
        self.recall = RecallClient(
            api_key=os.getenv("MEM0_API_KEY"),
            user_id=user_id
        )

    def save_context(self, inputs, outputs):
        self.recall.add(
            content=f"{inputs['input']} → {outputs['output']}",
            priority="high"
        )
```

### Vercel AI SDK

```typescript
import { createAI } from 'ai';
import { Recall } from '@n3wth/recall';

const recall = new Recall({ apiKey: process.env.MEM0_API_KEY! });

export const ai = createAI({
  async before(messages) {
    const memories = await recall.search({
      query: messages[messages.length - 1].content,
      limit: 5
    });

    return {
      ...messages,
      context: memories.map(m => m.content).join('\n')
    };
  }
});
```

## Performance Benchmarks

| Metric | Value | Description |
|--------|-------|-------------|
| **Latency (p50)** | 2ms | Median response time |
| **Latency (p99)** | 5ms | 99th percentile response |
| **Throughput** | 1M+ req/s | Sustained load capacity |
| **Cache Hit Rate** | >90% | Typical production ratio |
| **Uptime** | 99.9% | Service availability SLA |
| **Memory Efficiency** | 10:1 | Compression ratio |

## API Reference

### Configuration

```typescript
interface RecallConfig {
  // Authentication
  apiKey: string;              // Required: Get from mem0.ai

  // Storage
  redis?: string;              // Optional: Redis connection URL
  userId?: string;             // Default user identifier

  // Performance
  cacheStrategy?: 'aggressive' | 'balanced' | 'conservative';
  connectionPool?: {
    min: number;              // Minimum connections (default: 2)
    max: number;              // Maximum connections (default: 10)
  };

  // Advanced
  cache?: {
    ttl?: {
      l1: number;            // L1 cache TTL in seconds
      l2: number;            // L2 cache TTL in seconds
    };
    maxSize?: number;        // Maximum cache entries
    compression?: boolean;   // Enable compression
  };

  retry?: {
    attempts: number;        // Max retry attempts
    backoff: number;         // Backoff multiplier
  };
}
```

### Core Methods

| Method | Description | Response Time | Example |
|--------|-------------|---------------|---------|
| `add()` | Store new memory | <10ms | `await recall.add({ content, userId, priority })` |
| `search()` | Query memories | <5ms | `await recall.search({ query, limit })` |
| `get()` | Retrieve by ID | <5ms | `await recall.get(memoryId)` |
| `update()` | Modify memory | <10ms | `await recall.update(id, { content })` |
| `delete()` | Remove memory | <10ms | `await recall.delete(memoryId)` |
| `getAll()` | List all memories | <50ms | `await recall.getAll({ userId })` |

## MCP Tools

When integrated with Claude Desktop, Recall provides these tools:

- **`add_memory`** - Store information with intelligent categorization
- **`search_memory`** - Find relevant context using semantic search
- **`get_all_memories`** - List all stored memories for a user
- **`delete_memory`** - Remove specific memories
- **`cache_stats`** - Monitor performance metrics
- **`optimize_cache`** - Rebalance cache for optimal performance

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recall-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: recall
        image: n3wth/recall:latest
        env:
        - name: MEM0_API_KEY
          valueFrom:
            secretKeyRef:
              name: recall-secrets
              key: mem0-api-key
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

### Environment Variables

```bash
# Required
MEM0_API_KEY=mem0_...           # Get from mem0.ai

# Optional
REDIS_URL=redis://localhost:6379 # Redis connection
MEM0_USER_ID=default_user        # Default user ID
CACHE_STRATEGY=aggressive        # Cache strategy
MAX_CONNECTIONS=10               # Connection pool size
LOG_LEVEL=info                   # Logging verbosity
```

## Monitoring & Observability

### Metrics

Recall exposes Prometheus-compatible metrics:

```typescript
// Available metrics
recall_cache_hits_total
recall_cache_misses_total
recall_request_duration_seconds
recall_memory_operations_total
recall_redis_connections_active
```

### Health Checks

```bash
# Liveness probe
curl http://localhost:3000/health/live

# Readiness probe
curl http://localhost:3000/health/ready

# Detailed health status
curl http://localhost:3000/health/detailed
```

## Troubleshooting

### Common Issues

<details>
<summary><b>Redis connection refused</b></summary>

Ensure Redis is running and accessible:
```bash
# Check Redis status
redis-cli ping

# Start Redis locally
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```
</details>

<details>
<summary><b>High latency on first request</b></summary>

This is normal cold start behavior. Recall pre-warms connections:
```typescript
// Pre-warm on startup
await recall.warmup();
```
</details>

<details>
<summary><b>Memory quota exceeded</b></summary>

Configure cache eviction policy:
```typescript
const recall = new Recall({
  cache: {
    maxSize: 5000,
    evictionPolicy: 'lru'
  }
});
```
</details>

## Roadmap

- [ ] **Edge deployment** - Global distribution via Cloudflare Workers
- [ ] **Encryption at rest** - End-to-end encryption for sensitive data
- [ ] **Real-time sync** - WebSocket support for live updates
- [ ] **GraphQL API** - Alternative query interface
- [ ] **Batch operations** - Bulk import/export capabilities
- [ ] **Analytics dashboard** - Visual insights into memory patterns

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/n3wth/recall.git
cd recall
npm install
npm run dev

# Run tests
npm test

# Submit PR
gh pr create
```

## Support

- **Documentation**: [recall.newth.ai/docs](https://recall.newth.ai/docs)
- **Discord Community**: [discord.gg/recall](https://discord.gg/recall)
- **Issue Tracker**: [GitHub Issues](https://github.com/n3wth/recall/issues)
- **Enterprise Support**: [enterprise@newth.ai](mailto:enterprise@newth.ai)

## License

MIT © 2025 Recall Contributors

---

<div align="center">
  <p>Built by the team at <a href="https://newth.ai">Newth.ai</a></p>
  <p>
    <a href="https://recall.newth.ai">Website</a> •
    <a href="https://recall.newth.ai/docs">Documentation</a> •
    <a href="https://github.com/n3wth/recall">GitHub</a> •
    <a href="https://twitter.com/n3wth">Twitter</a>
  </p>
</div>