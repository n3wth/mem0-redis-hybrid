#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';

// Example: Basic usage of mem0-redis-hybrid MCP server

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Start the MCP server
const server = spawn('node', ['../index.js'], {
  env: {
    ...process.env,
    MEM0_API_KEY: process.env.MEM0_API_KEY || 'm0-YOUR_API_KEY',
    MEM0_USER_ID: process.env.MEM0_USER_ID || 'example-user',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const response = JSON.parse(line);
      console.log('Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      // Not JSON, probably a log message
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server log:', data.toString());
});

// Send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substr(2, 9),
    method,
    params
  };

  console.log('\nSending request:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Example operations
async function runExamples() {
  console.log('🚀 Mem0-Redis Hybrid MCP Server - Basic Usage Example\n');

  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('1. Listing available tools...');
  sendRequest('tools/list');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n2. Adding a memory...');
  sendRequest('tools/call', {
    name: 'add_memory',
    arguments: {
      content: 'The user prefers dark mode themes and uses VS Code as their primary editor',
      metadata: { category: 'preferences', application: 'development' },
      priority: 'high'
    }
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n3. Searching memories...');
  sendRequest('tools/call', {
    name: 'search_memory',
    arguments: {
      query: 'user preferences editor',
      limit: 5,
      prefer_cache: true
    }
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n4. Getting cache statistics...');
  sendRequest('tools/call', {
    name: 'cache_stats',
    arguments: {}
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n5. Getting all memories...');
  sendRequest('tools/call', {
    name: 'get_all_memories',
    arguments: {}
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n6. Optimizing cache...');
  sendRequest('tools/call', {
    name: 'optimize_cache',
    arguments: {}
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ Examples completed!');

  // Cleanup
  server.kill();
  rl.close();
  process.exit(0);
}

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Run examples
runExamples().catch(console.error);