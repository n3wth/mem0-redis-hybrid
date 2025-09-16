# r3 (by n3wth)

[![npm version](https://badge.fury.io/js/%40n3wth%2Fr3.svg)](https://www.npmjs.com/package/@n3wth/r3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-r3.newth.ai-blue)](https://r3.newth.ai)

> Intelligent Memory Layer for AI Apps. Built for Gemini, Claude and all LLMs.

<img src="website/public/og-image.png" />

## Features

- 🚀 **Fast local caching** - Redis L1 cache for low-latency responses
- 🛡️ **Automatic failover** - Falls back to cloud storage when Redis is unavailable
- 🧠 **AI Intelligence (NEW)** - Real vector embeddings, entity extraction, knowledge graphs
- 🔌 **Easy integration** - Works with Gemini, Claude, GPT, and any LLM
- 💻 **100% TypeScript** - Full type safety and IntelliSense support
- 🏠 **Local-first** - Works offline with embedded Redis server
- 📦 **Zero configuration** - Just run `npx r3` to get started

### New AI Intelligence Features (v1.3.0)

- **Real Vector Embeddings** - 384-dimensional embeddings using transformers.js
- **Entity Extraction** - Automatically extract people, organizations, technologies, projects
- **Relationship Mapping** - Discover connections between entities with confidence scores
- **Knowledge Graph** - Build and query your personal knowledge graph
- **Semantic Search** - Find memories by meaning, not just keywords
- **Multi-factor Relevance** - Combines semantic, keyword, entity, and recency scoring

## Table of Contents

- [Quick Start](#quick-start)
- [Usage with Gemini CLI](#usage-with-gemini-cli)
- [Usage with Claude Code](#usage-with-claude-code)
- [Usage with Claude Desktop](#usage-with-claude-desktop)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Examples](#real-world-examples)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```bash
# Just run it! Zero configuration needed
npx @n3wth/r3
```

That's it! r3 automatically starts with an embedded Redis server. No setup required.

### Installation Options

```bash
# For frequent use, install globally:
npm install -g @n3wth/r3
r3

# Or add to your project:
npm install @n3wth/r3
```

### Basic Usage

```typescript
import { Recall } from "r3";

// Zero configuration - works immediately
const recall = new Recall();

// Store memory locally
await recall.add({
  content: "User prefers TypeScript and dark mode themes",
  userId: "user_123",
});

// Retrieve memories instantly
const memories = await recall.search({
  query: "What are the user preferences?",
  userId: "user_123",
});
```

### Optional: Enable Cloud Sync

```typescript
// Add Mem0 API key for cloud backup (get free at mem0.ai)
const recall = new Recall({
  apiKey: process.env.MEM0_API_KEY,
});
```

## Usage with Gemini CLI

Integrate r3 with Google's Gemini CLI for powerful memory-enhanced AI workflows:

```bash
# Set environment variables
export MEM0_API_KEY="your_mem0_api_key"
export REDIS_URL="redis://localhost:6379"

# Use with Gemini for context-aware responses
gemini "Remember: User prefers Python over JavaScript" | npx r3 add
gemini "What are my coding preferences?" | npx r3 search

# Advanced integration with piping
echo "Project uses TypeScript and React" | npx r3 add --userId project-123
gemini "Generate component based on project stack" --context "$(npx r3 get --userId project-123)"
```

## Usage with Claude Code

```bash
# Quick install via Claude Code CLI
claude mcp add @n3wth/r3 "npx @n3wth/r3"

# Claude Code will now remember context across sessions
# Available commands in Claude:
# - add_memory: Store information
# - search_memory: Query memories
# - get_all_memories: List all stored data
```

## Usage with Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "r3": {
      "command": "npx",
      "args": ["r3"],
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
    <source media="(prefers-color-scheme: dark)" srcset="https://r3.newth.ai/architecture-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://r3.newth.ai/architecture-light.svg">
    <img src="https://r3.newth.ai/architecture-dark.svg" alt="r3 Architecture" width="100%" />
  </picture>
</div>

r3 implements a multi-tier caching strategy designed for AI workloads:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Application │ ───► │   L1 Cache   │ ───► │  L2 Cache   │ ───► Cloud Storage
│             │      │   (Redis)    │      │  (Weekly)   │      (Permanent)
└─────────────┘      └──────────────┘      └─────────────┘
                          Fast                 Faster              Reliable
```

## Core Features

### Intelligent Caching

Automatically optimizes data placement across cache tiers based on access patterns:

```typescript
const recall = new Recall({
  cacheStrategy: "aggressive", // 'balanced' | 'conservative'
  cache: {
    ttl: { l1: 86400, l2: 604800 },
    maxSize: 10000,
    compressionThreshold: 1024,
  },
});
```

### Semantic Search

Find memories by meaning, not just keywords:

```typescript
const results = await recall.search({
  query: "notification preferences",
  limit: 10,
  threshold: 0.8,
});
```

### Monitoring Support

Includes basic monitoring capabilities:

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
import { Recall } from "r3";
import { NextResponse } from "next/server";

const recall = new Recall({
  apiKey: process.env.MEM0_API_KEY!,
  redis: process.env.REDIS_URL,
});

export async function POST(request: Request) {
  const { content, userId } = await request.json();

  const result = await recall.add({
    content,
    userId,
    metadata: {
      source: "web_app",
      timestamp: new Date().toISOString(),
    },
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
import { createAI } from "ai";
import { Recall } from "r3";

const recall = new Recall({ apiKey: process.env.MEM0_API_KEY! });

export const ai = createAI({
  async before(messages) {
    const memories = await recall.search({
      query: messages[messages.length - 1].content,
      limit: 5,
    });

    return {
      ...messages,
      context: memories.map((m) => m.content).join("\n"),
    };
  },
});
```

## Performance Characteristics

r3 is designed for speed with local Redis caching. In local development:

- Redis provides fast in-memory caching
- Automatic compression for larger entries
- Efficient connection pooling
- Falls back gracefully when Redis is unavailable

_Note: Actual performance depends on your Redis setup and network conditions._

## AI Intelligence Features

r3 now includes advanced AI capabilities that automatically enhance your memory storage:

### Automatic Entity Extraction

Every memory is analyzed to extract:

- **People** - Names and references to individuals
- **Organizations** - Companies, teams, groups
- **Technologies** - Programming languages, frameworks, tools
- **Projects** - Project names and initiatives
- **Dates** - Temporal references

### Knowledge Graph Construction

Build a connected knowledge graph from your memories:

```bash
# Extract entities from text
npx r3 extract-entities "Sarah from Marketing works on the Dashboard project with React"

# Query your knowledge graph
npx r3 get-knowledge-graph --entity-type "people"

# Find connections between entities
npx r3 find-connections --from "Sarah" --to "Dashboard"
```

### Semantic Search with Relevance Scoring

Search uses multiple factors for intelligent ranking:

- **Semantic similarity** (50%) - Meaning-based matching
- **Keyword overlap** (20%) - Traditional text matching
- **Entity matching** (15%) - Shared people, orgs, tech
- **Recency bonus** (10%) - Prefer recent memories
- **Access frequency** (5%) - Popular memories rank higher

### Performance

- **<5ms** embedding generation
- **<10ms** semantic search latency
- **100% local** - No external API calls
- **384-dim vectors** - Optimal balance of accuracy and speed

### Configuration

```typescript
// AI features are enabled by default
const recall = new Recall(); // Full AI intelligence

// Opt-out if needed (basic mode)
const recall = new Recall({
  intelligenceMode: "basic",
});
```

### MCP Tools for Claude/LLMs

When using r3 as an MCP server, these tools are available:

- `extract_entities` - Extract entities and relationships from text
- `get_knowledge_graph` - Retrieve knowledge graph nodes and edges
- `find_connections` - Find paths between entities

## API Reference

### Configuration

```typescript
interface RecallConfig {
  // Authentication
  apiKey: string; // Required: Get from mem0.ai

  // Storage
  redis?: string; // Optional: Redis connection URL
  userId?: string; // Default user identifier

  // Performance
  cacheStrategy?: "aggressive" | "balanced" | "conservative";
  connectionPool?: {
    min: number; // Minimum connections (default: 2)
    max: number; // Maximum connections (default: 10)
  };

  // Advanced
  cache?: {
    ttl?: {
      l1: number; // L1 cache TTL in seconds
      l2: number; // L2 cache TTL in seconds
    };
    maxSize?: number; // Maximum cache entries
    compression?: boolean; // Enable compression
  };

  retry?: {
    attempts: number; // Max retry attempts
    backoff: number; // Backoff multiplier
  };
}
```

### Core Methods

| Method     | Description       | Example                                           |
| ---------- | ----------------- | ------------------------------------------------- |
| `add()`    | Store new memory  | `await recall.add({ content, userId, priority })` |
| `search()` | Query memories    | `await recall.search({ query, limit })`           |
| `get()`    | Retrieve by ID    | `await recall.get(memoryId)`                      |
| `update()` | Modify memory     | `await recall.update(id, { content })`            |
| `delete()` | Remove memory     | `await recall.delete(memoryId)`                   |
| `getAll()` | List all memories | `await recall.getAll({ userId })`                 |

## MCP Tools

When integrated with Claude Desktop, r3 provides these tools:

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

## Monitoring

r3 includes basic monitoring capabilities through the `cacheStats()` and `health()` methods. Future versions may include more comprehensive metrics and health check endpoints.

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

This is normal cold start behavior. r3 pre-warms connections:

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
    evictionPolicy: "lru",
  },
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
git clone https://github.com/n3wth/r3.git
cd recall
npm install
npm run dev

# Run tests
npm test

# Submit PR
gh pr create
```

## Support

- **Documentation**: [r3.newth.ai](https://r3.newth.ai)
- **Issue Tracker**: [GitHub Issues](https://github.com/n3wth/r3/issues)

## License

MIT © 2025 r3 Contributors

---

<div align="center">
  <p>A personal project to solve my own Claude context problem</p>
  <p>
    <a href="https://r3.newth.ai">Website</a> •
    <a href="https://github.com/n3wth/r3">GitHub</a> •
    <a href="https://www.npmjs.com/package/r3">npm</a>
  </p>
</div>
