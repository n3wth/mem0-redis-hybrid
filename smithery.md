# Smithery Registry Setup for r3call

## What is Smithery?

Smithery is a third-party registry for MCP servers that simplifies installation. Once your server is listed on Smithery, users can install it with:

```bash
npx @smithery/cli install r3call --client claude
```

Instead of:
```bash
claude mcp add r3call "npx r3call"
```

## How to Submit r3call to Smithery

1. **Visit Smithery Registry**: https://smithery.ai/

2. **Submit Your Server**: Look for "Submit Server" or "Add Server" button

3. **Required Information**:
   - **Package Name**: `r3call`
   - **NPM Package**: `r3call`
   - **Description**: Intelligent memory API with hybrid caching - Redis for speed, Mem0 for permanence
   - **Category**: AI Memory / Tools
   - **GitHub**: https://github.com/n3wth/r3call
   - **Documentation**: https://r3call.newth.ai
   - **Author**: n3wth / Newth.ai

4. **MCP Configuration** (what Smithery will use):
   ```json
   {
     "command": "npx",
     "args": ["r3call"],
     "env": {
       "MEM0_API_KEY": {
         "description": "API key for Mem0 service",
         "required": true
       },
       "REDIS_URL": {
         "description": "Redis connection URL",
         "required": true,
         "default": "redis://localhost:6379"
       }
     }
   }
   ```

5. **Features to Highlight**:
   - Sub-5ms response times with Redis L1 cache
   - Automatic failover to cloud storage
   - Semantic search capabilities
   - Works with Claude, GPT, and any LLM
   - Production-ready with monitoring

## Benefits of Smithery Listing

- Easier installation for users
- Increased discoverability
- Automatic configuration handling
- Part of the MCP ecosystem

## Testing Smithery Installation

Once listed, users can:

```bash
# Install via Smithery
npx @smithery/cli install r3call --client claude

# Or inspect the server
npx @smithery/cli inspect r3call

# Or run directly
npx @smithery/cli run r3call --config '{"MEM0_API_KEY":"...", "REDIS_URL":"..."}'
```

## Alternative: Direct Installation

For users who prefer direct installation:

```bash
claude mcp add r3call "npx r3call"
```

Both methods work and achieve the same result.