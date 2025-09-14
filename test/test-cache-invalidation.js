#!/usr/bin/env node

import fetch from 'node-fetch';
import { createClient } from 'redis';

const MEM0_API_KEY = 'm0-gnCuvpqLGpFS0yHit5rubtU0Fqa0z7rZxotNoKP9';
const MEM0_USER_ID = 'oliver';
const MEM0_BASE_URL = 'https://api.mem0.ai';
const REDIS_URL = 'redis://localhost:6379';

async function testCacheInvalidation() {
  console.log('🧪 Cache Invalidation Test Starting...\n');

  // Connect to Redis
  const redisClient = createClient({ url: REDIS_URL });
  await redisClient.connect();
  console.log('✓ Connected to Redis\n');

  // Generate unique test identifier
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testId = `cache-test-${timestamp}`;
  const testContent = `Cache invalidation test ${testId} - Validating immediate cache refresh after async updates`;

  console.log(`📝 Test ID: ${testId}`);
  console.log(`📝 Test Content: ${testContent}\n`);

  // Step 1: Add memory to mem0
  console.log('Step 1: Adding memory to mem0...');
  const addResponse = await fetch(`${MEM0_BASE_URL}/v1/memories/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${MEM0_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: testContent
      }],
      user_id: MEM0_USER_ID
    })
  });

  const addResult = await addResponse.json();
  console.log('Add API Response:', JSON.stringify(addResult, null, 2));
  console.log(`✓ Memory added with ${addResult.results?.length || addResult.length || 0} items\n`);

  // Wait a bit for async processing
  console.log('⏱️  Waiting 5 seconds for async processing...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 2: Check Redis cache for search results
  console.log('Step 2: Checking Redis cache...');
  const searchKeys = await redisClient.keys('search:*');
  console.log(`Found ${searchKeys.length} cached search entries`);

  // Step 3: Search for the memory
  console.log('\nStep 3: Searching for the test memory...');
  const searchResponse = await fetch(`${MEM0_BASE_URL}/v1/memories/search/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${MEM0_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: testId,
      user_id: MEM0_USER_ID,
      limit: 10
    })
  });

  const searchResult = await searchResponse.json();
  console.log('Search API Response:', JSON.stringify(searchResult, null, 2));
  const found = searchResult.results?.find(r => r.memory?.includes(testId));

  // Step 4: Check cache again
  console.log('\nStep 4: Checking cache after search...');
  const newSearchKeys = await redisClient.keys('search:*');
  console.log(`Now have ${newSearchKeys.length} cached search entries`);

  // Results
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS:');
  console.log('='.repeat(60));

  if (found) {
    console.log('✅ SUCCESS: Memory found in search results!');
    console.log(`   Memory ID: ${found.id}`);
    console.log(`   Content: ${found.memory.substring(0, 50)}...`);
  } else {
    console.log('❌ FAILURE: Memory NOT found in search results');
    console.log('   This indicates cache invalidation is not working properly');
  }

  console.log('\nCache Status:');
  console.log(`   Search cache entries: ${newSearchKeys.length}`);

  // Check if any memories are cached
  const memoryKeys = await redisClient.keys('memory:*');
  console.log(`   Cached memories: ${memoryKeys.length}`);

  // Cleanup
  await redisClient.quit();
  console.log('\n✓ Test complete');

  process.exit(found ? 0 : 1);
}

testCacheInvalidation().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});