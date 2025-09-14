# r3 CLI Usage Guide

The `r3` command provides a powerful interface for interacting with your memory system. This guide covers installation, configuration, and advanced usage patterns for maximizing the effectiveness of r3 in your development workflow.

## Installation

```bash
# For frequent use, install globally:
npm install -g r3
r3

# Or use directly with npx
npx r3
```

## Commands

### Start MCP Server (Default)

```bash
# Just run it! Zero configuration needed
npx r3
```

That's it! r3 automatically starts with an embedded Redis server. No setup required.

This starts the Model Context Protocol (MCP) server for use with Claude, Cursor, or other MCP-compatible tools.

## Configuration

### Environment Variables

You can configure r3 through environment variables:

```bash
# Required for cloud sync
export MEM0_API_KEY="your_mem0_api_key" # Get from mem0.ai

# Optional
export REDIS_URL="redis://localhost:6379" # Redis connection
export MEM0_USER_ID="default_user"        # Default user ID
export CACHE_STRATEGY="aggressive"        # Cache strategy
export MAX_CONNECTIONS=10               # Connection pool size
export LOG_LEVEL="info"                   # Logging verbosity
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

## Usage with Claude

### Claude Code

```bash
# Quick install via Claude Code CLI
claude mcp add r3 "npx r3"

# Claude Code will now remember context across sessions
# Available commands in Claude:
# - add_memory: Store information
# - search_memory: Query memories
# - get_all_memories: List all stored data
```

### Claude Desktop

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

## Advanced Usage Patterns

### Batch Operations

Process multiple memories efficiently:

```bash
# Import memories from a file
cat memories.json | npx r3 import --format json

# Export memories for backup
npx r3 export --userId project-123 > backup.json

# Bulk add memories from code documentation
find . -name "*.md" -exec cat {} \; | npx r3 extract-and-add
```

### Pipeline Integration

Integrate r3 into your development pipelines:

```bash
# CI/CD pipeline example
#!/bin/bash
# Store build context
echo "Build #$BUILD_NUMBER on branch $BRANCH" | npx r3 add --tag ci-build

# Store test results
npm test 2>&1 | npx r3 add --tag test-results --userId "build-$BUILD_NUMBER"

# Query previous build issues
npx r3 search "failed tests" --tag ci-build --limit 5
```

### Scripting and Automation

Automate memory management with scripts:

```bash
#!/bin/bash
# Daily standup helper
DATE=$(date +%Y-%m-%d)

# Store today's tasks
echo "Tasks for $DATE:" > /tmp/standup.txt
todo list >> /tmp/standup.txt
cat /tmp/standup.txt | npx r3 add --tag standup --userId "standup-$DATE"

# Retrieve yesterday's progress
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
npx r3 search --userId "standup-$YESTERDAY" --tag standup
```

### Advanced Filtering and Search

```bash
# Search with multiple filters
npx r3 search "authentication" \
  --userId project-123 \
  --tag security \
  --date-range "2025-01-01:2025-01-31" \
  --limit 10

# Semantic search with embeddings
npx r3 search "how to implement OAuth" \
  --semantic \
  --threshold 0.8

# Find related memories
npx r3 find-similar --memoryId abc123 --limit 5
```

## AI Intelligence CLI Commands

r3's CLI includes commands to interact with its AI features directly from your terminal.

### Entity Extraction

Analyze text to extract key entities like people, organizations, and technologies.

```bash
# Extract entities from a string of text
npx r3 extract-entities "Sarah from Marketing is working on the new Dashboard project using React and TypeScript."
```

### Knowledge Graph

Build and query a connected knowledge graph from your memories.

```bash
# Get all entities of a specific type
npx r3 get-knowledge-graph --entity-type "people"

# Find connections and relationships between two entities
npx r3 find-connections --from "Sarah" --to "Dashboard"

# Visualize knowledge graph (outputs DOT format)
npx r3 graph-export --format dot | dot -Tpng -o knowledge-graph.png

# Query graph with natural language
npx r3 graph-query "Who worked on the authentication feature?"
```

### Smart Context Building

```bash
# Build context for code review
npx r3 build-context \
  --scope "authentication" \
  --include "decisions,patterns,issues" \
  --output review-context.md

# Generate project summary
npx r3 summarize \
  --userId project-123 \
  --period "last-week" \
  --format markdown
```

## Performance Optimization

### Cache Management

```bash
# Warm up cache for better performance
npx r3 cache-warm --userId project-123

# Monitor cache statistics
npx r3 cache-stats --detailed

# Clear specific cache entries
npx r3 cache-clear --pattern "user:*:temp"

# Optimize cache for memory constraints
npx r3 cache-optimize --max-memory 512MB
```

### Connection Pooling

```bash
# Configure connection pool
export R3CALL_POOL_SIZE=20
export R3CALL_POOL_MIN=5
export R3CALL_POOL_IDLE_TIMEOUT=30000

# Monitor connection health
npx r3 connection-status --watch
```

## Integration Examples

### VS Code Integration

Add to your VS Code tasks.json:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Store Code Context",
      "type": "shell",
      "command": "npx r3 add --tag vscode --userId ${workspaceFolder}",
      "problemMatcher": []
    },
    {
      "label": "Search Project Memory",
      "type": "shell",
      "command": "npx r3 search '${input:searchQuery}' --userId ${workspaceFolder}",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "searchQuery",
      "type": "promptString",
      "description": "Enter search query"
    }
  ]
}
```

### Git Hooks Integration

Add to .git/hooks/post-commit:

```bash
#!/bin/bash
# Store commit context in r3
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_HASH=$(git rev-parse HEAD)
BRANCH=$(git branch --show-current)

echo "Commit: $COMMIT_HASH on $BRANCH - $COMMIT_MSG" | \
  npx r3 add --tag git-commit --userId "$(basename $(pwd))"
```

### Docker Integration

Dockerfile for r3-enabled development:

```dockerfile
FROM node:20-alpine

# Install r3 globally
RUN npm install -g r3

# Set environment variables
ENV MEM0_API_KEY=${MEM0_API_KEY}
ENV REDIS_URL=redis://redis:6379

# Your application setup
WORKDIR /app
COPY . .
RUN npm install

# Initialize r3 on container start
CMD ["sh", "-c", "npx r3 cache-warm && npm start"]
```

## Best Practices

### Memory Organization

1. **Use Consistent User IDs**: Organize memories by project, feature, or team
2. **Tag Strategically**: Use tags for categorization (e.g., "bug", "feature", "decision")
3. **Regular Cleanup**: Remove outdated memories periodically
4. **Backup Important Data**: Export critical memories regularly

### Security Considerations

1. **API Key Management**: Never commit API keys to version control
2. **Access Control**: Use different user IDs for different access levels
3. **Data Sanitization**: Clean sensitive data before storing
4. **Audit Trails**: Log all memory operations for compliance

### Performance Tips

1. **Batch Operations**: Group multiple operations when possible
2. **Cache Strategy**: Choose appropriate cache strategies for your use case
3. **Connection Reuse**: Maintain persistent connections in long-running processes
4. **Index Optimization**: Use appropriate indexes for your query patterns

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

This is normal cold start behavior. r3 pre-warms connections. You can also manually warm up the connection:

```typescript
// Pre-warm on startup
await recall.warmup();
```

</details>

<details>
<summary><b>Memory quota exceeded</b></summary>

Configure cache eviction policy in your code:

```typescript
const recall = new Recall({
  cache: {
    maxSize: 5000,
    evictionPolicy: "lru",
  },
});
```

</details>

<details>
<summary><b>Connection pool exhausted</b></summary>

Increase pool size or optimize connection usage:

```bash
# Increase pool size
export R3CALL_POOL_SIZE=50

# Or implement connection throttling
npx r3 config set connection.throttle true
```

</details>

<details>
<summary><b>Slow semantic search</b></summary>

Optimize embedding generation and caching:

```bash
# Pre-generate embeddings
npx r3 index --rebuild

# Use approximate nearest neighbor search
npx r3 config set search.algorithm "hnsw"
```

</details>

## Environment-Specific Configurations

### Development

```bash
# .env.development
MEM0_API_KEY=dev_key_here
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
CACHE_TTL=300
```

### Production

```bash
# .env.production
MEM0_API_KEY=${SECRET_MEM0_KEY}
REDIS_URL=${REDIS_CLUSTER_URL}
LOG_LEVEL=error
CACHE_TTL=3600
MAX_CONNECTIONS=100
ENABLE_METRICS=true
```

### Testing

```bash
# .env.test
MEM0_API_KEY=test_key
REDIS_URL=redis://localhost:6380
LOG_LEVEL=warn
CACHE_DISABLED=true
```

## Monitoring and Debugging

### Debug Mode

```bash
# Enable verbose logging
DEBUG=r3:* npx r3

# Trace specific operations
DEBUG=r3:cache,r3:search npx r3 search "query"

# Performance profiling
NODE_OPTIONS="--inspect" npx r3
```

### Metrics Collection

```bash
# Enable metrics endpoint
npx r3 --metrics-port 9090

# Query metrics
curl http://localhost:9090/metrics

# Export to Prometheus
npx r3 metrics-export --format prometheus
```

### Health Checks

```bash
# Check service health
npx r3 health

# Detailed diagnostics
npx r3 diagnose --verbose

# Continuous monitoring
npx r3 monitor --interval 5s
```

## Additional Resources

- [API Documentation](https://r3.newth.ai/docs/api)
- [GitHub Repository](https://github.com/n3wth/r3)
- [Discord Community](https://discord.gg/r3)
- [Video Tutorials](https://r3.newth.ai/tutorials)

For more examples and use cases, visit the [r3 website](https://r3.newth.ai).
