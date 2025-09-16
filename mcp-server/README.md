# r3 MCP Server

Remote MCP server for integrating r3 memory system with ChatGPT connectors and API.

## Features

- **Search Tool**: Search through r3 memories with Redis caching
- **Fetch Tool**: Retrieve specific memories by ID
- **Redis L1 Cache**: Sub-5ms response times for cached queries
- **Mem0 Integration**: Persistent memory storage and retrieval
- **Cloudflare Tunnel**: Secure external access without port forwarding
- **Docker Deployment**: Containerized for easy deployment
- **Authentication**: Bearer token authentication for security

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Cloudflare account (free tier works)
- Mem0 API key
- OpenAI API key

### Setup

1. **Clone and navigate to MCP server directory:**
   ```bash
   cd /path/to/r3/mcp-server
   ```

2. **Run Cloudflare setup:**
   ```bash
   ./setup-cloudflare.sh
   ```
   This will:
   - Install cloudflared if needed
   - Create a Cloudflare tunnel
   - Configure DNS routing
   - Generate authentication tokens
   - Create .env file

3. **Configure API keys:**
   Edit `.env` file and add your actual API keys:
   ```bash
   MEM0_API_KEY=your_actual_mem0_key
   OPENAI_API_KEY=your_actual_openai_key
   ```

4. **Deploy the server:**
   ```bash
   ./deploy.sh
   ```

## Manual Docker Deployment

If you prefer manual deployment or need to deploy on a remote server:

1. **Copy files to your server:**
   ```bash
   scp -r mcp-server/ user@your-server:/home/user/
   ```

2. **SSH into your server:**
   ```bash
   ssh user@your-server
   cd mcp-server
   ```

3. **Create .env file:**
   ```bash
   cat > .env << EOF
   CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token
   MCP_AUTH_TOKEN=your_secure_token
   MCP_USER_ID=oliver
   MEM0_API_KEY=your_mem0_key
   OPENAI_API_KEY=your_openai_key
   REDIS_URL=redis://redis:6379
   EOF
   ```

4. **Start services:**
   ```bash
   docker-compose up -d
   ```

## ChatGPT Integration

### For ChatGPT Connectors:

1. Go to ChatGPT Settings → Connectors
2. Click "Add connector"
3. Enter your MCP server details:
   - Name: r3 Memory
   - Server URL: `https://your-domain.com/sse/`
   - Authentication: Bearer token (from .env file)

### For API Integration:

```python
import requests
import json

# Using with o1-deep-research or other models
response = requests.post(
    "https://api.openai.com/v1/responses",
    headers={
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "o4-mini-deep-research",
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "Search my r3 memories for information about project setup"
                    }
                ]
            }
        ],
        "tools": [
            {
                "type": "mcp",
                "server_label": "r3_memory",
                "server_url": "https://your-domain.com/sse/",
                "allowed_tools": ["search", "fetch"],
                "require_approval": "never"
            }
        ]
    }
)
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   ChatGPT   │────▶│  Cloudflare  │────▶│ MCP Server  │
└─────────────┘     │    Tunnel    │     └─────────────┘
                    └──────────────┘            │
                                                │
                                          ┌─────┴─────┐
                                          │           │
                                    ┌─────▼───┐ ┌────▼────┐
                                    │  Redis  │ │  Mem0   │
                                    │  Cache  │ │   API   │
                                    └─────────┘ └─────────┘
```

## API Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /sse/` - MCP SSE endpoint (main integration point)

## Available MCP Tools

### search
Search through r3 memories.

**Parameters:**
- `query` (string, required): Search query

**Returns:**
```json
{
  "results": [
    {
      "id": "memory_id",
      "title": "Memory title",
      "url": "https://r3.memory/memory_id"
    }
  ]
}
```

### fetch
Retrieve a specific memory by ID.

**Parameters:**
- `id` (string, required): Memory ID

**Returns:**
```json
{
  "id": "memory_id",
  "title": "Memory title",
  "text": "Full memory content",
  "url": "https://r3.memory/memory_id",
  "metadata": {
    "source": "r3_memory",
    "user_id": "oliver",
    "created_at": "2025-01-14T..."
  }
}
```

## Monitoring

### View logs:
```bash
docker-compose logs -f
```

### Check service status:
```bash
docker-compose ps
```

### Test health endpoint:
```bash
curl http://localhost:8000/health
```

### Monitor Redis:
```bash
docker-compose exec redis redis-cli
> INFO stats
> KEYS r3:*
```

## Troubleshooting

### MCP server not responding:
```bash
# Check logs
docker-compose logs mcp-server

# Restart service
docker-compose restart mcp-server
```

### Cloudflare tunnel issues:
```bash
# Check tunnel status
docker-compose logs cloudflared

# Restart tunnel
docker-compose restart cloudflared
```

### Redis connection errors:
```bash
# Test Redis
docker-compose exec redis redis-cli ping

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHDB
```

## Security Considerations

1. **Authentication**: Always use strong bearer tokens
2. **HTTPS Only**: Cloudflare tunnel provides encryption
3. **Rate Limiting**: Consider adding rate limiting for production
4. **Monitoring**: Watch for unusual access patterns
5. **Updates**: Keep Docker images updated

## Development

### Local testing without Cloudflare:
```bash
# Start only Redis and MCP server
docker-compose up redis mcp-server
```

### Run server directly (for development):
```bash
pip install -r requirements.txt
python server.py
```

### Test MCP protocol:
```bash
# Test search
curl -X POST http://localhost:8000/sse/ \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {"query": "test"}
    }
  }'
```

## License

Part of the r3 project - see main repository for license details.