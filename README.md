# Mem0-Redis Hybrid MCP Server v2.0

## Overview
An intelligent hybrid memory system that combines mem0 cloud storage with Redis caching for optimal performance, featuring async processing, smart cache invalidation, and keyword-based search.

## Key Features

### 🚀 Performance Optimizations
- **Two-tier caching**: L1 (hot data, 24h TTL) and L2 (warm data, 7d TTL)
- **Async memory processing**: Non-blocking memory addition with background jobs
- **Search results caching**: 5-minute cache for search queries
- **Keyword indexing**: Fast cache-based search using extracted keywords
- **Background sync**: Automatic cache warming every 5 minutes

### 🧠 Intelligent Cache Management
- **Smart routing**: `prefer_cache` parameter for cache-first or cloud-first strategies
- **Access tracking**: Promotes frequently accessed memories to L1 cache
- **Cache invalidation**: Pub/Sub based invalidation on delete/update
- **Relevance scoring**: Search results include relevance scores from keyword matches

### 🛡️ Resilience Features
- **Graceful degradation**: Falls back to mem0-only mode if Redis unavailable
- **Job timeouts**: 30-second timeout for async operations
- **Retry logic**: Exponential backoff with jitter for Redis reconnection
- **Error isolation**: Separate Redis clients for cache, pub/sub, and subscriptions

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

## License
MIT