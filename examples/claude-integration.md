# Claude Integration Examples

## Setting up mem0-redis-hybrid with Claude Desktop

### 1. Install the package

```bash
npm install -g @n3wth/mem0-redis-hybrid
```

### 2. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

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

### 3. Using in Claude

Once configured, you can use these commands in Claude:

```javascript
// Add a memory
await use_mcp_tool("mem0-hybrid", "add_memory", {
  content: "User prefers Python over JavaScript for data science",
  metadata: { category: "preferences", domain: "programming" },
  priority: "high"
});

// Search memories
await use_mcp_tool("mem0-hybrid", "search_memory", {
  query: "programming preferences",
  prefer_cache: true
});

// Get cache statistics
await use_mcp_tool("mem0-hybrid", "cache_stats", {});
```

## Advanced Integration Patterns

### Pattern 1: Context Building

```javascript
// Build context from memories before responding
const memories = await use_mcp_tool("mem0-hybrid", "search_memory", {
  query: "user project requirements",
  limit: 10
});

// Use memories to enhance responses
const context = memories.results.map(m => m.memory).join('\n');
```

### Pattern 2: Async Memory Storage

```javascript
// Store memories asynchronously for better performance
await use_mcp_tool("mem0-hybrid", "add_memory", {
  content: "Complex technical discussion about microservices",
  async: true,
  priority: "normal"
});
```

### Pattern 3: Batch Operations

```javascript
// Store conversation history in batch
const messages = [
  { role: "user", content: "I'm working on a React project" },
  { role: "assistant", content: "React is great for UI development" },
  { role: "user", content: "I need help with state management" }
];

await use_mcp_tool("mem0-hybrid", "add_memory", {
  messages: messages,
  metadata: { session: "tech-discussion", date: new Date().toISOString() }
});
```

### Pattern 4: Cache Optimization

```javascript
// Periodically optimize cache for frequently accessed memories
await use_mcp_tool("mem0-hybrid", "optimize_cache", {});

// Warm up cache with common queries
await use_mcp_tool("mem0-hybrid", "warmup_cache", {
  queries: [
    "user preferences",
    "project requirements",
    "technical stack"
  ]
});
```

### Pattern 5: Export and Backup

```javascript
// Export memories for backup
const backup = await use_mcp_tool("mem0-hybrid", "export_memories", {
  format: "json"
});

// Save to file or external storage
// ...

// Later, import memories
await use_mcp_tool("mem0-hybrid", "import_memories", {
  data: backup.data,
  format: "json"
});
```

## Performance Tips

1. **Use `prefer_cache: true`** for frequently accessed queries
2. **Enable async mode** for non-critical memory additions
3. **Batch related memories** to reduce API calls
4. **Optimize cache regularly** to maintain performance
5. **Monitor cache stats** to understand usage patterns

## Troubleshooting

### Redis Connection Issues

If Redis is not available, the server falls back to mem0-only mode:

```javascript
// Check health status
const health = await use_mcp_tool("mem0-hybrid", "health", {});
console.log(health.redis); // false if Redis is down
```

### Memory Limits

Monitor memory usage and clean up when needed:

```javascript
// Clear specific cache patterns
await use_mcp_tool("mem0-hybrid", "clear_cache", {
  pattern: "search:*old-queries*"
});

// Delete old memories
const allMemories = await use_mcp_tool("mem0-hybrid", "get_all_memories", {});
// Filter and delete old ones
```

## Best Practices

1. **Categorize memories** with metadata for better organization
2. **Use priority levels** to optimize cache placement
3. **Implement regular cleanup** for old or irrelevant memories
4. **Monitor performance** through cache statistics
5. **Handle errors gracefully** with fallback strategies