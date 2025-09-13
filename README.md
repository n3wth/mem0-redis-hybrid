# Mem0-Redis Hybrid MCP Server

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/n3wth/mem0-redis-hybrid)](https://github.com/n3wth/mem0-redis-hybrid/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

**An intelligent hybrid memory system that combines [Mem0](https://mem0.ai) cloud storage with [Redis](https://redis.io) caching for optimal performance**

[Features](#key-features) • [Quick Start](#quick-install) • [Integration](#installation--integration) • [Documentation](#architecture) • [Contributing](#contributing)

</div>

## 🚀 Quick Start

**One-liner to try it out:**
```bash
MEM0_API_KEY="your-api-key" npx mem0-cli
```
*Get your API key from [mem0.ai](https://mem0.ai) (free tier available)*

**Full installation:**
```bash
# Install the package
npm install -g @n3wth/mem0-redis-hybrid

# Set up environment variables
export MEM0_API_KEY="your-mem0-api-key"  # Get from https://mem0.ai
export REDIS_URL="redis://localhost:6379"  # Optional

# Run the CLI to test
mem0-cli

# Or add to Claude Code (see Integration section below)
```

## Overview

The Mem0-Redis Hybrid MCP Server provides a high-performance memory layer for AI applications, combining the reliability of Mem0's cloud storage with the speed of Redis caching. It implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) for seamless integration with Claude, Gemini, and other AI tools.

## Key Features

### 🚀 Performance Optimizations
- **Two-tier caching**: L1 (hot data, 24h TTL) and L2 (warm data, 7d TTL)
- **Connection pooling**: Efficient Redis connection management with health checks
- **Async memory processing**: Non-blocking memory addition with background jobs
- **Search results caching**: 5-minute cache for search queries
- **Keyword indexing**: Fast cache-based search using extracted keywords
- **Background sync**: Automatic cache warming every 5 minutes

### 🧠 Intelligent Cache Management
- **Smart routing**: `prefer_cache` parameter for cache-first or cloud-first strategies
- **Access tracking**: Promotes frequently accessed memories to L1 cache
- **Cache invalidation**: Pub/Sub based invalidation on delete/update
- **Relevance scoring**: Search results include relevance scores from keyword matches
- **Circuit breaker**: Automatic failure detection and recovery

### 🛡️ Resilience Features
- **Graceful degradation**: Falls back to mem0-only mode if Redis unavailable
- **Advanced error handling**: Custom error classes with recovery strategies
- **Retry logic**: Exponential backoff with jitter for Redis reconnection
- **Error isolation**: Separate Redis clients for cache, pub/sub, and subscriptions
- **Job timeouts**: 30-second timeout for async operations

### 📦 Developer Experience
- **TypeScript support**: Full type definitions included
- **CLI tool**: Interactive command-line interface for testing and management
- **Comprehensive examples**: Ready-to-use integration patterns
- **Auto-release**: Automated versioning and npm publishing

## Architecture

```
┌─────────────────┐
│   Claude Code   │
└────────┬────────┘
         │ MCP Protocol
┌────────▼────────┐
│  Hybrid Server  │
├─────────────────┤
│ • Job Queue     │
│ • Pub/Sub       │
│ • Background    │
│   Sync Worker   │
└────┬────────┬───┘
     │        │
┌────▼───┐ ┌─▼────────┐
│  Redis │ │ Mem0 API │
│  Cache │ │  Cloud   │
└────────┘ └──────────┘
```

## Usage Scenarios & Edge Cases

### 1. Memory Addition Scenarios

#### Async Processing (Default)
```javascript
// High priority - immediate caching
add_memory({
  content: "Important fact",
  priority: "high",
  async: true
})
// Returns immediately with job ID
// Memory cached immediately and indexed

// Medium/Low priority - queued processing
add_memory({
  content: "Regular note",
  priority: "medium",
  async: true
})
// Queued for background processing after 1 minute
```

#### Sync Fallback
```javascript
add_memory({
  content: "Critical data",
  async: false
})
// Blocks until complete
// Used when Redis pub/sub unavailable
```

### 2. Search Strategies

#### Cache-First (Default)
```javascript
search_memory({
  query: "optimization",
  prefer_cache: true
})
// 1. Check search results cache (5 min TTL)
// 2. Search cache using keywords
// 3. Fallback to mem0 if insufficient results
// 4. Cache new results
```

#### Cloud-First
```javascript
search_memory({
  query: "latest updates",
  prefer_cache: false
})
// 1. Query mem0 cloud directly
// 2. Cache results for future
// 3. Update keyword indexes
```

### 3. Cache Invalidation Scenarios

#### Memory Deletion
```javascript
delete_memory({ memory_id: "abc123" })
// 1. Delete from mem0 cloud
// 2. Publish invalidation event
// 3. Remove from cache immediately
// 4. Clean keyword indexes
// 5. Clear search cache
```

#### External Updates (Handled via Background Sync)
- Every 5 minutes, top 50 accessed memories refreshed
- Stale detection via TTL expiration
- Automatic re-indexing on refresh

### 4. Edge Cases & Solutions

#### Race Conditions
**Problem**: Multiple async operations on same memory
**Solution**: Job queue with unique IDs, last-write-wins for cache

#### Cache Coherence
**Problem**: Mem0 updated externally, cache becomes stale
**Solution**:
- TTL-based expiration (24h L1, 7d L2)
- Background sync refreshes frequently accessed items
- Search always checks both cache and cloud

#### Network Partitions
**Problem**: Redis available but mem0 API down
**Solution**:
- Serve from cache with warning
- Queue writes for retry
- Background sync continues attempting

#### Cache Overflow
**Problem**: Cache grows too large
**Solution**:
- Max 1000 memories in cache
- LRU-style eviction based on access counts
- Two-tier system (L1/L2) for efficient space usage

#### Search Quality Degradation
**Problem**: Keyword search less accurate than semantic
**Solution**:
- Relevance scoring shows confidence
- Automatic fallback to mem0 for low-score results
- Can force cloud search with `prefer_cache: false`

#### Duplicate Prevention
**Problem**: Same content added multiple times
**Solution**: Mem0 handles deduplication on cloud side

#### TTL Expiration During Operations
**Problem**: Cache entry expires mid-operation
**Solution**:
- Re-fetch from mem0 on cache miss
- Update cache with fresh data
- Reset TTL on access

### 5. Migration Scenarios

#### From Old Mem0 to Hybrid
```javascript
// 1. Run optimize_cache to populate
optimize_cache({
  force_refresh: true,
  max_memories: 1000
})

// 2. Verify with cache_stats
cache_stats()
// Shows L1/L2 distribution, memory usage

// 3. Test search performance
search_memory({ query: "test" })
// Should show mix of cache/cloud results
```

## Performance Metrics

### Expected Performance
- **Cache hits**: <5ms response time
- **Cloud queries**: 200-500ms
- **Async memory addition**: Returns in <10ms
- **Background processing**: Complete within 1-2 minutes
- **Search cache**: 90%+ hit rate for common queries

### Monitoring
```javascript
// Check cache performance
cache_stats()
// Returns: hit rate, memory usage, top accessed

// Monitor async operations
sync_status()
// Returns: pending jobs, queue depth, processing times
```

## Installation & Integration

### Prerequisites
- Node.js 18+
- Redis server (local or remote)
- Mem0 API key from [mem0.ai](https://mem0.ai)

### Quick Install

#### NPM Package (Recommended)
```bash
# Install globally
npm install -g @n3wth/mem0-redis-hybrid

# Or install locally in your project
npm install @n3wth/mem0-redis-hybrid
```

#### From Source
```bash
# Clone the repository
git clone https://github.com/n3wth/mem0-redis-hybrid.git
cd mem0-redis-hybrid

# Install dependencies
npm install

# Set up environment variables
export MEM0_API_KEY="your-mem0-api-key"
export MEM0_USER_ID="your-user-id"
export REDIS_URL="redis://localhost:6379"  # or your Redis URL
```

### CLI Tool

The package includes an interactive CLI for testing and management:

```bash
# Run the CLI
npx mem0-cli

# Available commands:
# - add <content>     Add a memory
# - search <query>    Search memories
# - list              List all memories
# - stats             Show cache statistics
# - optimize          Optimize cache
# - health            Check server health
# - monitor           Real-time monitoring
# - help              Show available commands
```

### Integration with Claude Code

#### 1. Add to MCP Settings

##### Option A: Using NPM Package (Recommended)
Edit your Claude Code settings file (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mem0-hybrid": {
      "command": "npx",
      "args": ["@n3wth/mem0-redis-hybrid"],
      "env": {
        "MEM0_API_KEY": "your-mem0-api-key",
        "MEM0_USER_ID": "your-user-id",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

##### Option B: Using Local Installation
If you installed locally:

```json
{
  "mcpServers": {
    "mem0-hybrid": {
      "command": "node",
      "args": ["./node_modules/@n3wth/mem0-redis-hybrid/index.js"],
      "env": {
        "MEM0_API_KEY": "your-mem0-api-key",
        "MEM0_USER_ID": "your-user-id",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

#### 2. Restart Claude Code
After adding the configuration, restart Claude Code to load the MCP server.

#### 3. Use in Claude Code
```javascript
// Add a memory with caching
mcp__mem0-hybrid__add_memory({
  content: "Important fact to remember",
  priority: "high",
  async: true
})

// Search with cache-first strategy
mcp__mem0-hybrid__search_memory({
  query: "important fact",
  prefer_cache: true
})

// Get cache statistics
mcp__mem0-hybrid__cache_stats()
```

### Integration with Gemini CLI

The mem0-hybrid server can be used with Gemini CLI to enhance prompts with persistent memory context.

#### 1. Setup Gemini CLI with MCP Support
```bash
# Install Gemini CLI if not already installed
npm install -g @google/generative-ai-cli

# Configure Gemini API key
export GEMINI_API_KEY="your-gemini-api-key"
```

#### 2. Create Integration Script
Create a file `~/gm` (Gemini with mem0) with enhanced memory support:

```bash
#!/bin/bash
# Enhanced Gemini CLI with mem0-hybrid integration

# Start mem0-hybrid server if not running
if ! pgrep -f "mem0-redis-hybrid/index.js" > /dev/null; then
    node /path/to/mem0-redis-hybrid/index.js &
    sleep 2
fi

# Function to query mem0 for context
get_memory_context() {
    local query="$1"
    # Use MCP protocol to search memories
    echo "Searching memories for: $query" >&2

    # Call the MCP server via Node.js script
    node -e "
    const fetch = require('node-fetch');
    (async () => {
        const response = await fetch('http://localhost:3000/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'search_memory',
                params: { query: '$query', prefer_cache: true }
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data.memories || []));
    })();
    " 2>/dev/null
}

# Enhanced Gemini prompt with memory context
query="$*"
memory_context=$(get_memory_context "$query")

# Build enhanced prompt with memory context
enhanced_prompt="<context>
Personal Knowledge from mem0:
$memory_context
</context>

$query"

# Run Gemini with enhanced context
gemini "$enhanced_prompt"

# Optional: Save important responses back to mem0
read -p "Save this response to memory? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    node -e "
    const fetch = require('node-fetch');
    (async () => {
        await fetch('http://localhost:3000/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'add_memory',
                params: {
                    content: process.argv[1],
                    priority: 'medium',
                    async: true
                }
            })
        });
    })();
    " "$query: $enhanced_prompt"
    echo "Saved to mem0!"
fi
```

Make it executable:
```bash
chmod +x ~/gm
```

#### 3. Usage Examples with Gemini CLI

```bash
# Basic usage - automatically enriches with mem0 context
gm "What did we discuss about performance optimization?"

# Code analysis with memory context
gm -p "@./ analyze this codebase for security issues"

# Research mode with cached knowledge
gm --research "latest React 19 features"

# Save learnings back to mem0
gm --save "React 19 introduces use() hook for promises"
```

### Integration with Other AI Tools

#### LangChain Integration
```python
from langchain.memory import ConversationBufferMemory
import requests

class Mem0HybridMemory(ConversationBufferMemory):
    def __init__(self, server_url="http://localhost:3000"):
        super().__init__()
        self.server_url = server_url

    def save_context(self, inputs, outputs):
        # Save to mem0-hybrid
        requests.post(f"{self.server_url}/mcp", json={
            "method": "add_memory",
            "params": {
                "content": f"Q: {inputs['input']} A: {outputs['output']}",
                "priority": "medium",
                "async": True
            }
        })
        super().save_context(inputs, outputs)

    def load_memory_variables(self, inputs):
        # Search relevant memories
        response = requests.post(f"{self.server_url}/mcp", json={
            "method": "search_memory",
            "params": {
                "query": inputs.get('input', ''),
                "prefer_cache": True
            }
        })
        memories = response.json().get('memories', [])

        # Add to context
        context = super().load_memory_variables(inputs)
        context['mem0_context'] = memories
        return context

# Usage
memory = Mem0HybridMemory()
chain = ConversationChain(memory=memory, llm=llm)
```

#### OpenAI Assistant Integration
```javascript
const OpenAI = require('openai');
const fetch = require('node-fetch');

class Mem0EnhancedAssistant {
    constructor(apiKey, mem0ServerUrl = 'http://localhost:3000') {
        this.openai = new OpenAI({ apiKey });
        this.mem0Url = mem0ServerUrl;
    }

    async searchContext(query) {
        const response = await fetch(`${this.mem0Url}/mcp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'search_memory',
                params: { query, prefer_cache: true }
            })
        });
        const data = await response.json();
        return data.memories || [];
    }

    async saveMemory(content, priority = 'medium') {
        await fetch(`${this.mem0Url}/mcp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'add_memory',
                params: { content, priority, async: true }
            })
        });
    }

    async chat(message) {
        // Get relevant context from mem0
        const memories = await this.searchContext(message);

        // Build enhanced prompt
        const systemPrompt = memories.length > 0
            ? `Context from memory:\n${memories.map(m => m.memory).join('\n')}\n\n`
            : '';

        // Call OpenAI with context
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ]
        });

        const response = completion.choices[0].message.content;

        // Save important exchanges
        if (response.length > 100) {
            await this.saveMemory(`Q: ${message}\nA: ${response}`);
        }

        return response;
    }
}

// Usage
const assistant = new Mem0EnhancedAssistant(process.env.OPENAI_API_KEY);
const response = await assistant.chat("What's our deployment process?");
```

#### Shell Aliases for Quick Access
Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Mem0 quick commands
alias m0add='node -e "require(\"node-fetch\")(\"http://localhost:3000/mcp\", {method: \"POST\", headers: {\"Content-Type\": \"application/json\"}, body: JSON.stringify({method: \"add_memory\", params: {content: process.argv[1], priority: \"high\", async: true}})}).then(() => console.log(\"Added to memory!\"))"'

alias m0search='node -e "require(\"node-fetch\")(\"http://localhost:3000/mcp\", {method: \"POST\", headers: {\"Content-Type\": \"application/json\"}, body: JSON.stringify({method: \"search_memory\", params: {query: process.argv[1], prefer_cache: true}})}).then(r => r.json()).then(d => console.log(JSON.stringify(d.memories, null, 2)))"'

alias m0stats='node -e "require(\"node-fetch\")(\"http://localhost:3000/mcp\", {method: \"POST\", headers: {\"Content-Type\": \"application/json\"}, body: JSON.stringify({method: \"cache_stats\"})}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))"'

# Usage examples:
# m0add "Important meeting notes from today"
# m0search "meeting notes"
# m0stats
```

### Running as a Service

#### macOS (launchd)
Create `~/Library/LaunchAgents/com.mem0hybrid.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mem0hybrid</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/mem0-redis-hybrid/index.js</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>MEM0_API_KEY</key>
        <string>your-key</string>
        <key>MEM0_USER_ID</key>
        <string>your-id</string>
        <key>REDIS_URL</key>
        <string>redis://localhost:6379</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.mem0hybrid.plist
```

#### Linux (systemd)
Create `/etc/systemd/system/mem0-hybrid.service`:

```ini
[Unit]
Description=Mem0 Redis Hybrid MCP Server
After=network.target redis.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mem0-redis-hybrid
ExecStart=/usr/bin/node index.js
Restart=always
Environment="MEM0_API_KEY=your-key"
Environment="MEM0_USER_ID=your-id"
Environment="REDIS_URL=redis://localhost:6379"

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable mem0-hybrid
sudo systemctl start mem0-hybrid
```

## Configuration

### Environment Variables
```bash
MEM0_API_KEY=your-key        # Mem0 API key
MEM0_USER_ID=user-id         # User identifier
MEM0_BASE_URL=https://api.mem0.ai  # API endpoint
REDIS_URL=redis://localhost:6379   # Redis connection
```

### Tuning Parameters (in code)
```javascript
CACHE_TTL = 86400          // L1 cache: 24 hours
CACHE_TTL_L2 = 604800      // L2 cache: 7 days
MAX_CACHE_SIZE = 1000      // Max cached memories
FREQUENT_ACCESS_THRESHOLD = 3  // Accesses before L1 promotion
SYNC_INTERVAL = 300000     // Background sync: 5 minutes
SEARCH_CACHE_TTL = 300     // Search cache: 5 minutes
```

## Testing

### Run Tests
```bash
npm test
# or
node test.js
```

### Test Coverage
- ✅ Server initialization
- ✅ Sync/async memory addition
- ✅ Cache/cloud search strategies
- ✅ Cache statistics
- ✅ Sync status monitoring
- ✅ Cache optimization
- ✅ Memory deletion with invalidation
- ✅ Redis failure handling
- ✅ Get all memories with stats

## API Reference

### Available MCP Tools

#### `add_memory`
Add a new memory to the system.

```javascript
{
  content: string,           // Memory content (required if no messages)
  messages: Array,           // Array of {role, content} objects (alternative to content)
  metadata: object,          // Custom metadata
  priority: string,          // 'low' | 'normal' | 'high' | 'critical'
  async: boolean,           // Use async processing (default: true)
  user_id: string           // Override default user ID
}
```

#### `search_memory`
Search for memories.

```javascript
{
  query: string,            // Search query (required)
  limit: number,            // Max results (default: 10)
  user_id: string,          // User to search for
  prefer_cache: boolean,    // Use cache first (default: true)
  metadata_filter: object   // Filter by metadata
}
```

#### `get_all_memories`
Retrieve all memories for a user.

```javascript
{
  user_id: string          // User ID (optional, uses default)
}
```

#### `update_memory`
Update an existing memory.

```javascript
{
  memory_id: string,       // Memory ID (required)
  content: string,         // New content (required)
  metadata: object         // New metadata
}
```

#### `delete_memory`
Delete a specific memory.

```javascript
{
  memory_id: string        // Memory ID to delete (required)
}
```

#### `cache_stats`
Get cache performance statistics.

```javascript
// No parameters required
// Returns: hits, misses, hit_rate, size, memory_usage, etc.
```

#### `optimize_cache`
Optimize cache by promoting/demoting memories.

```javascript
{
  force_refresh: boolean,  // Force complete refresh
  max_memories: number     // Maximum memories to keep
}
```

#### `health`
Check system health status.

```javascript
// No parameters required
// Returns: redis status, mem0 status, cache stats, uptime
```

## Troubleshooting

### Redis Connection Issues
```
✗ Redis connection failed
Falling back to mem0-only mode
```
**Solution**: Check Redis is running, verify REDIS_URL

### Slow Search Performance
```javascript
// Force cloud search for accuracy
search_memory({
  query: "specific term",
  prefer_cache: false
})
```

### Memory Not Appearing in Search
- Wait 1-2 minutes for async processing
- Check `sync_status()` for pending items
- Verify with `get_all_memories()`

### High Memory Usage
```javascript
// Clear and rebuild cache
optimize_cache({
  force_refresh: true,
  max_memories: 500  // Reduce cache size
})
```

## Future Enhancements

### Planned Features
1. **Vector embeddings**: Replace keyword search with semantic search
2. **Memory updates**: Add update operation with smart diffing
3. **Batch operations**: Add/search multiple memories efficiently
4. **Compression**: Compress cached data to reduce memory usage
5. **Sharding**: Distribute cache across multiple Redis instances
6. **Observability**: Prometheus metrics, OpenTelemetry tracing

### API Stability
The current API is stable. Future versions will maintain backward compatibility.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repo
git clone https://github.com/n3wth/mem0-redis-hybrid.git
cd mem0-redis-hybrid

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Run the CLI tool
npm run cli
```

### Release Process

The package uses automated versioning and publishing:

```bash
# Automatic release with version bump
npm run release:patch  # Bug fixes (1.1.0 → 1.1.1)
npm run release:minor  # New features (1.1.0 → 1.2.0)
npm run release:major  # Breaking changes (1.1.0 → 2.0.0)

# Manual release
npm version patch -m "chore(release): %s"
git push origin main --follow-tags
npm publish
```

GitHub Actions automatically publishes to npm when you push a tag starting with `v`.

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Resources

### Official Documentation
- [Mem0 Documentation](https://docs.mem0.ai)
- [Redis Documentation](https://redis.io/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)

### Related Projects
- [MCP Servers](https://github.com/modelcontextprotocol/servers) - Official MCP server implementations
- [Mem0 Python SDK](https://github.com/mem0ai/mem0) - Official Mem0 Python client
- [Redis Node Client](https://github.com/redis/node-redis) - Official Redis Node.js client

### Tutorials & Guides
- [Getting Started with MCP](https://modelcontextprotocol.io/docs/getting-started)
- [Building AI Memory Systems](https://mem0.ai/blog/building-ai-memory-systems)
- [Redis Caching Best Practices](https://redis.io/docs/manual/patterns/)

## Support

- **Issues**: [GitHub Issues](https://github.com/n3wth/mem0-redis-hybrid/issues)
- **Discussions**: [GitHub Discussions](https://github.com/n3wth/mem0-redis-hybrid/discussions)
- **Security**: Please report security vulnerabilities to [security@example.com](mailto:security@example.com)

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and the MCP protocol
- [Mem0](https://mem0.ai) for the memory API
- [Redis Labs](https://redis.com) for Redis
- The open-source community for continuous support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ by the AI community

⭐ Star us on GitHub — it helps!

[Report Bug](https://github.com/n3wth/mem0-redis-hybrid/issues) • [Request Feature](https://github.com/n3wth/mem0-redis-hybrid/issues)
</div>