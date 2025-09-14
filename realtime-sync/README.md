# Enhanced Real-time Sync Service

A high-performance, feature-rich WebSocket service for real-time memory synchronization with advanced capabilities including RabbitMQ message queuing, event replay, pattern matching, rate limiting, and comprehensive monitoring.

## Features

- **WebSocket Server**: High-performance WebSocket connections with compression
- **RabbitMQ Integration**: Message queuing and distributed event handling
- **Event Replay System**: Store and replay missed events for reconnecting clients
- **Advanced Pattern Matching**: Wildcard, regex, and hierarchical pattern subscriptions
- **Rate Limiting**: Per-connection, per-user, and global rate limiting
- **Message Compression**: Automatic compression for large messages
- **Monitoring & Health Checks**: Comprehensive metrics and health endpoints
- **Docker Support**: Complete Docker setup with RabbitMQ, Redis, and monitoring
- **Graceful Shutdown**: Proper connection cleanup and service shutdown

## Quick Start

### Using Docker (Recommended)

1. **Start all services**:
```bash
cd realtime-sync
docker-compose up -d
```

2. **View logs**:
```bash
docker-compose logs -f realtime-sync
```

3. **Access services**:
   - WebSocket Server: `ws://localhost:3001`
   - Monitoring API: `http://localhost:3002`
   - RabbitMQ Management: `http://localhost:15672` (admin/password123)

### Manual Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Start Redis and RabbitMQ**:
```bash
# Using Docker for dependencies only
docker run -d --name redis -p 6379:6379 redis:alpine
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password123 \
  rabbitmq:management-alpine
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env file as needed
```

4. **Start the service**:
```bash
npm start
```

## Architecture

### Core Components

- **EnhancedRealtimeSyncManager**: Main WebSocket server with advanced features
- **RabbitMQManager**: Message queue integration and event distribution
- **EventReplayManager**: Event storage and replay functionality
- **PatternMatcher**: Advanced pattern matching for subscriptions
- **RateLimitManager**: Multi-level rate limiting system
- **MonitoringServer**: Health checks and metrics endpoints

### Message Flow

```
Client → WebSocket → Rate Limiter → Pattern Matcher → RabbitMQ → Event Replay
                                                            ↓
Redis ← Event Storage ← Compression ← Message Processing ←
```

## API Reference

### WebSocket Messages

#### Connection
```json
// Sent by server on connection
{
  "type": "connection",
  "connectionId": "uuid",
  "userId": "user-123",
  "timestamp": 1634567890123,
  "server": {
    "features": {
      "compression": true,
      "patterns": true,
      "replay": true,
      "rateLimit": true,
      "messageQueue": true
    }
  }
}
```

#### Subscribe to Channels and Patterns
```json
{
  "type": "subscribe",
  "channels": ["memory:created", "memory:updated"],
  "patterns": ["user:*", "memory:*.important"],
  "options": {
    "sendInitialState": true,
    "replayEvents": true,
    "replaySince": 1634567890000
  }
}
```

#### Broadcast Message
```json
{
  "type": "broadcast",
  "channel": "notifications",
  "data": {
    "message": "Hello, world!",
    "priority": "high"
  },
  "targetUsers": ["user-1", "user-2"] // Optional
}
```

#### Event Replay Request
```json
{
  "type": "replay",
  "since": 1634567890000,
  "categories": ["memory", "user"],
  "priority": "high",
  "limit": 100
}
```

#### Compression Configuration
```json
{
  "type": "compression",
  "enable": true,
  "level": 6
}
```

### HTTP Monitoring Endpoints

#### Health Check
```bash
GET /health
```
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600000,
  "checks": {
    "websocket": true,
    "redis": true,
    "rabbitmq": true,
    "memory": true
  }
}
```

#### Metrics (Prometheus format)
```bash
GET /metrics
GET /metrics?format=json
```

#### System Status
```bash
GET /status
```

#### Connection Details
```bash
GET /connections
```

## Pattern Matching

The service supports advanced pattern matching for subscriptions:

### Wildcard Patterns
- `*` - Matches any single segment
- `**` - Matches zero or more segments
- `?` - Matches any single character

Examples:
- `memory:*` - Matches `memory:created`, `memory:updated`
- `user:*:settings` - Matches `user:123:settings`, `user:456:settings`
- `**:important` - Matches any channel ending with `:important`

### Regex Patterns
```javascript
// Subscribe to regex pattern
{
  "type": "subscribe",
  "patterns": ["/memory:(created|updated)/", "/user:\\d+:login/"]
}
```

### Hierarchical Patterns
- `memory.created` - Exact match
- `memory.*` - All direct children of memory
- `memory.**` - All descendants of memory

## Rate Limiting

Multiple rate limiting strategies are supported:

### Configuration
```javascript
// Per connection: 1000 requests per 60 seconds
// Per user: 3000 requests per 60 seconds (across all connections)
// Global: 10000 requests per 60 seconds
// Message type specific limits
```

### Rate Limit Headers
Rate limit information is included in error responses:
```json
{
  "type": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: user",
    "retryAfter": 30000,
    "type": "user"
  }
}
```

## Event Replay

### Features
- Automatic event storage with compression
- User-specific event buffers
- Configurable retention periods
- Category and priority filtering
- Batch processing for performance

### Configuration
```bash
EVENT_REPLAY_ENABLED=true
EVENT_REPLAY_RETENTION_DAYS=7
EVENT_REPLAY_BATCH_SIZE=100
EVENT_REPLAY_MAX_EVENTS=10000
EVENT_REPLAY_COMPRESSION=6
```

## Testing

### Interactive Test Client
```bash
npm test
# or
node test/test-client.js --url ws://localhost:3001 --user test-user
```

#### Test Client Commands
```
connect                          - Connect to server
sub memory:* user:*             - Subscribe to patterns
broadcast test:channel "hello"   - Send broadcast message
stress 1000 10                  - Send 1000 messages with 10ms delay
metrics                         - Show client metrics
status                          - Get server status
help                           - Show all commands
```

### Load Testing
```bash
# Start multiple test clients
for i in {1..10}; do
  node test/test-client.js --user "load-test-$i" &
done
```

## Docker Configuration

### Services Included
- **realtime-sync**: Main WebSocket service
- **rabbitmq**: Message broker with management UI
- **redis**: Caching and session storage
- **nginx**: Load balancer and reverse proxy (optional)
- **prometheus**: Metrics collection (optional)
- **grafana**: Monitoring dashboard (optional)

### Docker Compose Profiles
```bash
# Basic setup
docker-compose up -d

# With monitoring
docker-compose --profile monitoring up -d

# Production with load balancer
docker-compose --profile production up -d
```

## Monitoring & Observability

### Metrics Available
- Connection counts and durations
- Message throughput and latency
- Memory usage and performance
- Rate limit statistics
- Event replay metrics
- RabbitMQ queue statistics

### Health Checks
- WebSocket server responsiveness
- Redis connection status
- RabbitMQ connectivity
- Memory usage thresholds
- Event loop delay

### Logging
Structured JSON logging with configurable levels:
```bash
LOG_LEVEL=debug  # trace, debug, info, warn, error, fatal
```

## Performance Tuning

### WebSocket Optimization
```bash
WS_COMPRESSION_THRESHOLD=1024    # Compress messages > 1KB
WS_MAX_MESSAGE_SIZE=1048576      # 1MB max message size
WS_HEARTBEAT_INTERVAL=30000      # 30 second heartbeat
```

### Rate Limiting Tuning
```bash
RATE_LIMIT_POINTS=1000           # Requests per duration
RATE_LIMIT_DURATION=60           # Duration in seconds
RATE_LIMIT_BLOCK_DURATION=60     # Block duration in seconds
```

### Memory Management
```bash
EVENT_REPLAY_MAX_EVENTS=10000    # Max events per user
PATTERN_CACHE_SIZE=1000          # Pattern cache entries
RABBITMQ_PREFETCH=100            # RabbitMQ prefetch count
```

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_ENABLED=true
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
```

### Security Considerations
- Use strong RabbitMQ credentials
- Configure Redis authentication
- Set appropriate CORS origins
- Enable Helmet security headers
- Use HTTPS in production (configure Nginx)

### Scaling
- Horizontal scaling with multiple service instances
- Load balancing with Nginx
- Redis clustering for high availability
- RabbitMQ clustering for message queue scaling

## Troubleshooting

### Common Issues

1. **Connection refused**
   - Check if Redis and RabbitMQ are running
   - Verify environment variables
   - Check firewall settings

2. **Rate limiting too aggressive**
   - Adjust rate limit configuration
   - Add users to whitelist for testing

3. **Memory usage high**
   - Reduce event replay retention
   - Lower pattern cache size
   - Enable compression

4. **Messages not received**
   - Check subscription patterns
   - Verify RabbitMQ connectivity
   - Review error logs

### Debug Mode
```bash
LOG_LEVEL=debug npm start
```

### Health Check
```bash
curl http://localhost:3002/health
curl http://localhost:3002/metrics
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review logs with debug level
- Open an issue with reproduction steps