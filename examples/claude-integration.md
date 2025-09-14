# Claude Integration Examples

## Setting up r3 with Claude Desktop

### 1. Install the package

```bash
npm install -g r3
```

### 2. Configure Claude Desktop

Add to your `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "r3": {
      "command": "npx",
      "args": ["r3"],
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
await use_mcp_tool("r3", "add_memory", {
  content: "User prefers Python over JavaScript for data science",
  metadata: { category: "preferences", domain: "programming" },
});

// Search memories
await use_mcp_tool("r3", "search_memory", {
  query: "programming preferences",
});

// Get all memories
await use_mcp_tool("r3", "get_all_memories", {});

// Delete a memory
await use_mcp_tool("r3", "delete_memory", {
  memoryId: "memory_id_to_delete",
});

// Get cache statistics
await use_mcp_tool("r3", "cache_stats", {});
```

## Advanced Integration Patterns

### Context Building

Before generating a response, you can search for relevant memories to build context.

```javascript
// Build context from memories before responding
const memories = await use_mcp_tool("r3", "search_memory", {
  query: "user project requirements",
  limit: 10,
});

// Use memories to enhance responses
const context = memories.results.map((m) => m.content).join("\n");
```

### Storing Conversation History

You can store the conversation history at the end of each interaction.

```javascript
// Store conversation history in batch
const messages = [
  { role: "user", content: "I'm working on a React project" },
  { role: "assistant", content: "React is great for UI development" },
  { role: "user", content: "I need help with state management" },
];

await use_mcp_tool("r3", "add_memory", {
  content: JSON.stringify(messages),
  metadata: { session: "tech-discussion", date: new Date().toISOString() },
});
```

## Performance Tips

1. **Use semantic search**: Semantic search is powerful, but can be slower than keyword search. Use it when you need to find memories by meaning, not just keywords.
2. **Batch related memories**: If you have multiple memories to add, consider adding them in a single call if the API supports it in the future.
3. **Monitor cache stats**: Use the `cache_stats` tool to understand usage patterns and optimize your caching strategy.

## Troubleshooting

### Redis Connection Issues

If Redis is not available, the server falls back to mem0-only mode. You can check the health of the server using the `health` tool if it's available.

```javascript
// Check health status
const health = await use_mcp_tool("r3", "health", {});
console.log(health.redis); // false if Redis is down
```

### Memory Limits

Be mindful of the number of memories you store. You can use the `get_all_memories` and `delete_memory` tools to manage your memories.

## Best Practices

1. **Categorize memories**: Use metadata to categorize memories for better organization and retrieval.
2. **Implement regular cleanup**: Periodically review and remove old or irrelevant memories.
3. **Monitor performance**: Use the `cache_stats` tool to monitor performance and identify bottlenecks.
4. **Handle errors gracefully**: Implement fallback strategies in case of errors.

```
