#!/usr/bin/env node

import { spawn } from 'child_process';
import { createClient } from 'redis';

// Test configuration
const TEST_TIMEOUT = 10000;
const MCP_SERVER_PATH = './index.js';

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.redisClient = null;
  }

  async setup() {
    // Initialize Redis client for test verification
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await this.redisClient.connect();
      console.log(`${colors.blue}✓ Redis connected for testing${colors.reset}`);

      // Clean up test data
      const testKeys = await this.redisClient.keys('test:*');
      if (testKeys.length > 0) {
        await this.redisClient.del(...testKeys);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Redis not available - some tests will be skipped${colors.reset}`);
    }
  }

  async teardown() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n${colors.blue}Running mem0-redis-hybrid MCP Server Tests${colors.reset}\n`);

    await this.setup();

    for (const test of this.tests) {
      try {
        await test.fn.call(this);
        this.passed++;
        console.log(`${colors.green}✓${colors.reset} ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`${colors.red}✗${colors.reset} ${test.name}`);
        console.log(`  ${colors.red}${error.message}${colors.reset}`);
      }
    }

    await this.teardown();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests: ${colors.green}${this.passed} passed${colors.reset}, ${colors.red}${this.failed} failed${colors.reset}, ${this.passed + this.failed} total`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }

  async sendMCPRequest(method, params) {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [MCP_SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, REDIS_URL: 'redis://localhost:6379' }
      });

      let responseData = '';
      let errorData = '';
      let resolved = false;

      // Timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          server.kill();
          reject(new Error('Request timeout'));
        }
      }, TEST_TIMEOUT);

      server.stdout.on('data', (data) => {
        responseData += data.toString();

        // Try to parse complete JSON-RPC response
        try {
          const lines = responseData.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('"jsonrpc"')) {
              const response = JSON.parse(line);
              if (response.result && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                server.kill();
                resolve(response.result);
              }
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      });

      server.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      server.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}: ${errorData}`));
        }
      });

      // Send JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      };

      // Send initialization first
      const init = {
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      server.stdin.write(JSON.stringify(init) + '\n');

      // Then send actual request
      setTimeout(() => {
        server.stdin.write(JSON.stringify(request) + '\n');
      }, 100);
    });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected to contain "${needle}"`);
    }
  }
}

// Test suite
const runner = new TestRunner();

// Test 1: Server initialization
runner.test('Server should initialize and list tools', async function() {
  const result = await this.sendMCPRequest('tools/list', {});
  this.assert(result.tools, 'Should return tools array');
  this.assert(result.tools.length > 0, 'Should have at least one tool');

  const toolNames = result.tools.map(t => t.name);
  this.assertContains(toolNames, 'add_memory', 'Should have add_memory tool');
  this.assertContains(toolNames, 'search_memory', 'Should have search_memory tool');
  this.assertContains(toolNames, 'delete_memory', 'Should have delete_memory tool');
  this.assertContains(toolNames, 'cache_stats', 'Should have cache_stats tool');
  this.assertContains(toolNames, 'sync_status', 'Should have sync_status tool');
});

// Test 2: Add memory functionality
runner.test('Should add memory (sync mode)', async function() {
  const result = await this.sendMCPRequest('tools/call', {
    name: 'add_memory',
    arguments: {
      content: 'Test memory content for unit testing',
      priority: 'high',
      async: false
    }
  });

  this.assert(result.content, 'Should return content');
  this.assertContains(result.content[0].text, '✓', 'Should indicate success');
});

// Test 3: Add memory async
runner.test('Should add memory asynchronously', async function() {
  const result = await this.sendMCPRequest('tools/call', {
    name: 'add_memory',
    arguments: {
      content: 'Async test memory',
      priority: 'medium',
      async: true
    }
  });

  this.assert(result.content, 'Should return content');
  this.assertContains(result.content[0].text, 'queued', 'Should indicate async processing');
  this.assertContains(result.content[0].text, 'job:', 'Should return job ID');
});

// Test 4: Search functionality with prefer_cache
runner.test('Should search memories with cache preference', async function() {
  // First add a memory
  await this.sendMCPRequest('tools/call', {
    name: 'add_memory',
    arguments: {
      content: 'Searchable test memory about optimization',
      priority: 'high',
      async: false
    }
  });

  // Wait a bit for indexing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test cache-first search
  const cacheResult = await this.sendMCPRequest('tools/call', {
    name: 'search_memory',
    arguments: {
      query: 'optimization',
      prefer_cache: true,
      limit: 5
    }
  });

  this.assert(cacheResult.content, 'Should return search results');
  this.assertContains(cacheResult.content[0].text, 'Found', 'Should indicate results found');

  // Test cloud-first search
  const cloudResult = await this.sendMCPRequest('tools/call', {
    name: 'search_memory',
    arguments: {
      query: 'optimization',
      prefer_cache: false,
      limit: 5
    }
  });

  this.assert(cloudResult.content, 'Should return search results');
});

// Test 5: Cache stats
runner.test('Should return cache statistics', async function() {
  const result = await this.sendMCPRequest('tools/call', {
    name: 'cache_stats',
    arguments: {}
  });

  this.assert(result.content, 'Should return content');
  const text = result.content[0].text;

  if (this.redisClient) {
    this.assertContains(text, 'cached_memories', 'Should show cached memories count');
    this.assertContains(text, 'redis_memory_usage', 'Should show Redis memory usage');
    this.assertContains(text, 'top_accessed', 'Should show top accessed memories');
  } else {
    this.assertContains(text, 'not available', 'Should indicate Redis not available');
  }
});

// Test 6: Sync status
runner.test('Should return sync status', async function() {
  const result = await this.sendMCPRequest('tools/call', {
    name: 'sync_status',
    arguments: {}
  });

  this.assert(result.content, 'Should return content');
  const text = result.content[0].text;

  this.assertContains(text, 'redis_connected', 'Should show Redis connection status');
  this.assertContains(text, 'active_jobs', 'Should show active jobs count');
  this.assertContains(text, 'pending_memories', 'Should show pending memories count');
});

// Test 7: Cache optimization
runner.test('Should optimize cache', async function() {
  const result = await this.sendMCPRequest('tools/call', {
    name: 'optimize_cache',
    arguments: {
      force_refresh: false,
      max_memories: 100
    }
  });

  this.assert(result.content, 'Should return content');

  if (this.redisClient) {
    this.assertContains(result.content[0].text, 'Cache optimized', 'Should indicate optimization complete');
    this.assertContains(result.content[0].text, 'L1', 'Should show L1 cache info');
    this.assertContains(result.content[0].text, 'L2', 'Should show L2 cache info');
  } else {
    this.assertContains(result.content[0].text, 'not available', 'Should indicate Redis not available');
  }
});

// Test 8: Delete memory with cache invalidation
runner.test('Should delete memory and invalidate cache', async function() {
  // Note: This test would need a valid memory ID
  // For now, test error handling
  const result = await this.sendMCPRequest('tools/call', {
    name: 'delete_memory',
    arguments: {
      memory_id: 'test-memory-id-12345'
    }
  });

  this.assert(result.content || result.isError, 'Should return result or error');
});

// Test 9: Get all memories
runner.test('Should retrieve all memories with stats', async function() {
  const result = await this.sendMCPRequest('tools/call', {
    name: 'get_all_memories',
    arguments: {
      limit: 10,
      include_cache_stats: true
    }
  });

  this.assert(result.content, 'Should return content');
  this.assertContains(result.content[0].text, 'Total memories:', 'Should show total memories');

  if (this.redisClient) {
    this.assertContains(result.content[0].text, 'Cache Stats:', 'Should include cache stats');
  }
});

// Test 10: Redis connection resilience
runner.test('Should handle Redis connection failures gracefully', async function() {
  // Test with invalid Redis URL
  const server = spawn('node', [MCP_SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, REDIS_URL: 'redis://invalid:6379' }
  });

  let errorOutput = '';

  await new Promise((resolve) => {
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    setTimeout(() => {
      server.kill();
      resolve();
    }, 2000);
  });

  this.assertContains(errorOutput, 'Falling back to mem0-only mode', 'Should fallback gracefully');
});

// Run all tests
runner.run().catch(error => {
  console.error(`${colors.red}Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});