# Cache Invalidation Validation Test

After restarting Claude Code, run this sequence to verify the cache invalidation fix is working:

## Test Sequence

1. **Add a memory with unique identifier:**
```
Please add this to memory: "Cache invalidation test 2025-01-13-1918 - Redis hybrid system now invalidates search cache immediately after async updates complete"
```

2. **Immediately search for it (within 2-3 seconds):**
```
Search memory for: "cache invalidation test 2025-01-13-1918"
```

3. **Check the source of results:**
- Look for `source: 'redis_cache'` or `source: 'mem0_cloud'` in the output
- If working correctly, you should see the memory even though it was just added

## Expected Behavior

### Before Fix:
- Search would miss recently added memories
- Cache would serve stale results
- Would need to wait for cache TTL to expire

### After Fix:
- Search finds recently added memories immediately
- Cache is invalidated when new memories are added
- Both async and sync additions trigger cache refresh

## Debug Commands

If validation fails, check:

1. **Cache stats:**
```
Check mem0 cache statistics
```

2. **Sync status:**
```
Check mem0 sync status
```

3. **Manual search with cache bypass:**
```
Search memory for "cache invalidation test 2025-01-13-1918" but prefer_cache: false
```

## Success Criteria

✅ Memory found immediately after async addition
✅ No stale cache results for recent changes
✅ Search results include newly added memories
✅ Cache invalidation happens automatically

## Failure Indicators

❌ "No memories found" for just-added content
❌ Search missing recent additions
❌ Need to wait before memories appear
❌ Cache serving outdated results