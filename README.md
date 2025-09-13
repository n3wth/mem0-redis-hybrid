# Recall

Lightning-fast memory layer for AI applications. Sub-5ms response times with automatic failover between Redis and cloud storage.

```typescript
import { Recall } from '@n3wth/recall';

const recall = new Recall({ apiKey: 'mem0_...' });

await recall.add('User prefers dark mode');
const memories = await recall.search('user preferences');
```

[![npm](https://img.shields.io/npm/v/@n3wth/recall)](https://www.npmjs.com/package/@n3wth/recall)
[![Documentation](https://img.shields.io/badge/docs-recall.newth.ai-blue)](https://recall.newth.ai/docs)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## Documentation

**[View full documentation →](https://recall.newth.ai/docs)**

## Installation

```bash
npm install @n3wth/recall
```

## Features

**Performance** — Sub-5ms p99 latency with intelligent caching
**Reliability** — Automatic failover and 99.9% uptime SLA
**Scale** — Handle millions of requests per second
**AI-Native** — Built for LLMs with semantic search

## Quick Start

### Basic Usage

```typescript
import { Recall } from '@n3wth/recall';

const recall = new Recall({
  apiKey: process.env.MEM0_API_KEY,
  redis: process.env.REDIS_URL
});

// Store memory
await recall.add({
  content: 'User prefers notifications at 9am PST',
  userId: 'user_123',
  priority: 'high'
});

// Search memories
const results = await recall.search({
  query: 'notification preferences',
  userId: 'user_123'
});
```

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["@n3wth/recall"],
      "env": {
        "MEM0_API_KEY": "mem0_...",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

## Architecture

Recall uses a multi-tier caching system optimized for AI workloads:

```
Application → L1 Cache (24h) → L2 Cache (7d) → Cloud Storage
               ↓                ↓                ↓
            <5ms latency    <20ms latency    <200ms latency
```

## API Reference

### Core Methods

| Method | Description | Response Time |
|--------|-------------|---------------|
| `add()` | Store new memory | <10ms |
| `search()` | Query memories | <5ms (cache) |
| `get()` | Retrieve by ID | <5ms |
| `update()` | Modify memory | <10ms |
| `delete()` | Remove memory | <10ms |

### Configuration

```typescript
new Recall({
  // Required
  apiKey: string,              // Get from mem0.ai

  // Optional
  redis: string,               // Redis connection URL
  userId: string,              // Default user ID
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative',

  // Advanced
  cache: {
    ttl: { l1: 86400, l2: 604800 },
    maxSize: 10000
  }
});
```

## Examples

### Next.js App Router

```typescript
// app/api/memory/route.ts
import { Recall } from '@n3wth/recall';

const recall = new Recall({
  apiKey: process.env.MEM0_API_KEY
});

export async function POST(request: Request) {
  const { content, userId } = await request.json();

  const result = await recall.add({
    content,
    userId,
    priority: 'high'
  });

  return Response.json(result);
}
```

### LangChain Integration

```python
from langchain.memory import BaseChatMemory
import requests

class RecallMemory(BaseChatMemory):
    def save_context(self, inputs, outputs):
        requests.post("http://localhost:3000/memory", json={
            "content": f"{inputs['input']} → {outputs['output']}"
        })
```

## Performance

| Metric | Value | Description |
|--------|-------|-------------|
| **Latency (p99)** | <5ms | Cache hit response time |
| **Throughput** | 1M+ req/s | At scale capacity |
| **Cache Hit Rate** | >90% | Typical production ratio |
| **Uptime** | 99.9% | Service availability |

## Support

- **Documentation**: [recall.newth.ai/docs](https://recall.newth.ai/docs)
- **Issues**: [GitHub Issues](https://github.com/n3wth/recall/issues)
- **Discord**: [Join our community](https://discord.gg/recall)

## License

MIT © 2024 Recall Contributors