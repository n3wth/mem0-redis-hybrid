# Recall

High-performance memory layer for AI applications. Combines local Redis caching with cloud persistence for sub-5ms response times.

[![npm version](https://img.shields.io/npm/v/@n3wth/recall)](https://www.npmjs.com/package/@n3wth/recall)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-recall.newth.ai-blue)](https://recall.newth.ai/docs)

## Installation

```bash
npm install @n3wth/recall
```

## Quick Start

```typescript
import { Recall } from '@n3wth/recall';

const memory = new Recall({
  redis: 'redis://localhost:6379',
  apiKey: process.env.MEM0_API_KEY
});

// Add memory
await memory.add({
  content: 'User prefers dark mode',
  priority: 'high'
});

// Search memories
const results = await memory.search({
  query: 'user preferences',
  prefer_cache: true
});
```

## Features

- **Sub-5ms response times** with intelligent caching
- **Two-tier cache architecture** (L1: 24h, L2: 7d)
- **Automatic failover** between local and cloud storage
- **MCP compatible** for Claude Desktop integration
- **TypeScript support** with full type definitions

## Documentation

Visit [recall.newth.ai/docs](https://recall.newth.ai/docs) for:
- [Getting Started Guide](https://recall.newth.ai/docs/introduction)
- [API Reference](https://recall.newth.ai/docs/api-reference)
- [Installation & Setup](https://recall.newth.ai/docs/installation)
- [Integration Examples](https://recall.newth.ai/docs/integrations)

## Claude Desktop Integration

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["@n3wth/recall"],
      "env": {
        "MEM0_API_KEY": "your-api-key",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

## Requirements

- Node.js 18+
- Redis server
- Mem0 API key from [mem0.ai](https://mem0.ai)

## License

MIT

## Links

- [Website](https://recall.newth.ai)
- [Documentation](https://recall.newth.ai/docs)
- [NPM Package](https://www.npmjs.com/package/@n3wth/recall)
- [GitHub](https://github.com/n3wth/recall)