# Smithery Deployment Guide for r3call

## Status

r3call is published on Smithery: https://smithery.ai/server/@n3wth/r3call

## Installation

Users can install r3call via Smithery:

```bash
# Install via Smithery CLI
npx @smithery/cli install @n3wth/r3call --client claude

# Or directly via Claude
claude mcp add r3call "npx @newth.ai/r3call"
```

## Environment Variables

The following environment variables are required:

- `MEM0_API_KEY`: Your Mem0 API key (get from https://mem0.ai/dashboard/api-keys)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)

Optional:
- `DEBUG`: Enable debug logging (true/false)
- `USER_ID`: Override default user ID

## Publishing Updates

To publish updates to Smithery:

1. Update version in package.json
2. Build the project: `npm run build`
3. Publish to npm: `npm publish`
4. Smithery will automatically pick up the new version

## Local Development

For local testing:

```bash
# Set environment variables
export MEM0_API_KEY="your-mem0-api-key"
export REDIS_URL="redis://localhost:6379"

# Run the server
node dist/index.js

# Or use demo mode (no API key needed)
node dist/index.js --demo
```

## API Keys Security

- Never commit API keys to the repository
- Use environment variables or .env files (not tracked in git)
- The Smithery API key is stored in your shell config: `~/.zshrc`
- The .gitignore file excludes all sensitive files

## Testing the Server

```bash
# Build first
npm run build

# Test with proper environment
MEM0_API_KEY="your-key" REDIS_URL="redis://localhost:6379" node dist/index.js

# Should output:
# Mem0-Redis Hybrid MCP Server starting...
# ✓ Redis connected successfully with pub/sub
# ✓ Mem0-Redis Hybrid MCP Server v2.0 running with async processing
```

## Troubleshooting

1. If you see "MEM0_API_KEY environment variable is required":
   - Ensure you have set the MEM0_API_KEY environment variable
   - Check it's the correct format: starts with "m0-"

2. If Redis connection fails:
   - Ensure Redis is running: `redis-server`
   - Check the REDIS_URL is correct

3. If Smithery CLI has issues:
   - Try updating: `npm install -g @smithery/cli@latest`
   - Check your Smithery API key is set if publishing