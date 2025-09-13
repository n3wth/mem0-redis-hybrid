#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';
import { createClient } from 'redis';
import fetch from 'node-fetch';

// CLI for mem0-redis-hybrid MCP server

const commands = {
  help: 'Show available commands',
  add: 'Add a memory (usage: add <content>)',
  search: 'Search memories (usage: search <query>)',
  list: 'List all memories',
  stats: 'Show cache statistics',
  optimize: 'Optimize cache',
  clear: 'Clear cache (usage: clear [pattern])',
  health: 'Check server health',
  export: 'Export memories (usage: export [format])',
  import: 'Import memories from file (usage: import <file>)',
  test: 'Run connection tests',
  monitor: 'Monitor real-time activity',
  quit: 'Exit the CLI'
};

class Mem0CLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'mem0> '
    });

    this.server = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  async start() {
    console.log('🚀 Mem0-Redis Hybrid CLI');
    console.log('Type "help" for available commands\n');

    // Start the MCP server
    await this.startServer();

    // Setup readline handlers
    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const [command, ...args] = line.trim().split(' ');

      if (command === '') {
        this.rl.prompt();
        return;
      }

      await this.handleCommand(command, args);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      this.cleanup();
    });
  }

  async startServer() {
    this.server = spawn('node', ['index.js'], {
      env: {
        ...process.env,
        MEM0_API_KEY: process.env.MEM0_API_KEY,
        MEM0_USER_ID: process.env.MEM0_USER_ID || 'cli-user',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle server output
    this.server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (e) {
          // Not JSON, probably a log
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      // Server logs, could be shown in verbose mode
    });

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Server started\n');
  }

  async sendRequest(method, params = {}) {
    const id = (++this.requestId).toString();
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.server.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  handleResponse(response) {
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        reject(new Error(response.error.message));
      } else {
        resolve(response.result);
      }
    }
  }

  async handleCommand(command, args) {
    try {
      switch (command) {
        case 'help':
          this.showHelp();
          break;

        case 'add':
          await this.addMemory(args.join(' '));
          break;

        case 'search':
          await this.searchMemories(args.join(' '));
          break;

        case 'list':
          await this.listMemories();
          break;

        case 'stats':
          await this.showStats();
          break;

        case 'optimize':
          await this.optimizeCache();
          break;

        case 'clear':
          await this.clearCache(args[0]);
          break;

        case 'health':
          await this.checkHealth();
          break;

        case 'export':
          await this.exportMemories(args[0] || 'json');
          break;

        case 'import':
          await this.importMemories(args[0]);
          break;

        case 'test':
          await this.runTests();
          break;

        case 'monitor':
          await this.startMonitor();
          break;

        case 'quit':
        case 'exit':
          this.rl.close();
          break;

        default:
          console.log(`Unknown command: ${command}`);
          console.log('Type "help" for available commands');
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }

  showHelp() {
    console.log('\nAvailable commands:');
    for (const [cmd, desc] of Object.entries(commands)) {
      console.log(`  ${cmd.padEnd(10)} - ${desc}`);
    }
    console.log();
  }

  async addMemory(content) {
    if (!content) {
      console.log('Usage: add <content>');
      return;
    }

    const result = await this.sendRequest('tools/call', {
      name: 'add_memory',
      arguments: {
        content,
        metadata: { source: 'cli', timestamp: new Date().toISOString() }
      }
    });

    const response = JSON.parse(result.content);
    console.log(`✓ Memory added (ID: ${response.memory_id})`);
  }

  async searchMemories(query) {
    if (!query) {
      console.log('Usage: search <query>');
      return;
    }

    const result = await this.sendRequest('tools/call', {
      name: 'search_memory',
      arguments: { query, limit: 5 }
    });

    const response = JSON.parse(result.content);
    if (response.results.length === 0) {
      console.log('No memories found');
    } else {
      console.log(`\nFound ${response.results.length} memories:`);
      response.results.forEach((mem, i) => {
        console.log(`\n${i + 1}. ${mem.memory}`);
        console.log(`   Score: ${mem.score.toFixed(3)}`);
        if (mem.metadata) {
          console.log(`   Metadata: ${JSON.stringify(mem.metadata)}`);
        }
      });
    }
  }

  async listMemories() {
    const result = await this.sendRequest('tools/call', {
      name: 'get_all_memories',
      arguments: {}
    });

    const response = JSON.parse(result.content);
    if (response.memories.length === 0) {
      console.log('No memories stored');
    } else {
      console.log(`\nTotal memories: ${response.memories.length}`);
      response.memories.forEach((mem, i) => {
        console.log(`\n${i + 1}. ${mem.memory}`);
        console.log(`   ID: ${mem.id}`);
        console.log(`   Created: ${mem.created_at}`);
      });
    }
  }

  async showStats() {
    const result = await this.sendRequest('tools/call', {
      name: 'cache_stats',
      arguments: {}
    });

    const stats = JSON.parse(result.content);
    console.log('\nCache Statistics:');
    console.log(`  Hits: ${stats.hits}`);
    console.log(`  Misses: ${stats.misses}`);
    console.log(`  Hit Rate: ${stats.hit_rate}`);
    console.log(`  Cache Size: ${stats.size}/${stats.max_size}`);
    console.log(`  Memory Usage: ${stats.memory_usage}`);
    console.log(`  Evictions: ${stats.evictions}`);
    console.log(`  Avg Response Time: ${stats.avg_response_time}`);

    if (stats.connection_pool) {
      console.log('\nConnection Pool:');
      console.log(`  Active: ${stats.connection_pool.active}`);
      console.log(`  Idle: ${stats.connection_pool.idle}`);
      console.log(`  Waiting: ${stats.connection_pool.waiting}`);
    }
  }

  async optimizeCache() {
    console.log('Optimizing cache...');
    const result = await this.sendRequest('tools/call', {
      name: 'optimize_cache',
      arguments: {}
    });

    const response = JSON.parse(result.content);
    console.log(`✓ Cache optimized`);
    console.log(`  Promoted: ${response.promoted} items`);
    console.log(`  Demoted: ${response.demoted} items`);
    console.log(`  Expired: ${response.expired} items`);
    console.log(`  Memory freed: ${response.memory_freed}`);
  }

  async clearCache(pattern) {
    const result = await this.sendRequest('tools/call', {
      name: 'clear_cache',
      arguments: { pattern }
    });

    const response = JSON.parse(result.content);
    console.log(`✓ Cleared ${response.cleared} cache entries`);
  }

  async checkHealth() {
    const result = await this.sendRequest('tools/call', {
      name: 'health',
      arguments: {}
    });

    const health = JSON.parse(result.content);
    console.log('\nHealth Status:');
    console.log(`  Redis: ${health.redis ? '✓ Connected' : '✗ Disconnected'}`);
    console.log(`  Mem0: ${health.mem0 ? '✓ Connected' : '✗ Disconnected'}`);
    console.log(`  Cache L1 Size: ${health.cache.l1_size}`);
    console.log(`  Cache L2 Size: ${health.cache.l2_size}`);
    console.log(`  Hit Rate: ${health.cache.hit_rate}`);
    console.log(`  Uptime: ${health.uptime}`);
    console.log(`  Memory: ${health.memory.used} (RSS: ${health.memory.rss})`);
  }

  async exportMemories(format) {
    console.log(`Exporting memories as ${format}...`);
    const result = await this.sendRequest('tools/call', {
      name: 'export_memories',
      arguments: { format }
    });

    const response = JSON.parse(result.content);
    const filename = `memories-export-${Date.now()}.${format}`;

    // In a real implementation, save to file
    console.log(`✓ Exported ${response.count} memories`);
    console.log(`  Would save to: ${filename}`);
  }

  async importMemories(file) {
    if (!file) {
      console.log('Usage: import <file>');
      return;
    }

    // In a real implementation, read from file
    console.log(`Would import memories from: ${file}`);
  }

  async runTests() {
    console.log('Running connection tests...\n');

    // Test Redis
    try {
      const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      await redis.connect();
      await redis.ping();
      console.log('✓ Redis connection successful');
      await redis.quit();
    } catch (error) {
      console.log('✗ Redis connection failed:', error.message);
    }

    // Test Mem0
    try {
      const response = await fetch('https://api.mem0.ai/v1/memories/', {
        headers: {
          'Authorization': `Token ${process.env.MEM0_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        console.log('✓ Mem0 API connection successful');
      } else {
        console.log('✗ Mem0 API connection failed:', response.status);
      }
    } catch (error) {
      console.log('✗ Mem0 API connection failed:', error.message);
    }

    // Test MCP server
    try {
      await this.sendRequest('tools/list');
      console.log('✓ MCP server connection successful');
    } catch (error) {
      console.log('✗ MCP server connection failed:', error.message);
    }
  }

  async startMonitor() {
    console.log('Starting monitor mode (press Ctrl+C to stop)...\n');

    const interval = setInterval(async () => {
      try {
        const result = await this.sendRequest('tools/call', {
          name: 'cache_stats',
          arguments: {}
        });

        const stats = JSON.parse(result.content);

        // Clear and update display
        console.clear();
        console.log('📊 Real-time Monitor\n');
        console.log(`Hit Rate: ${stats.hit_rate} | Hits: ${stats.hits} | Misses: ${stats.misses}`);
        console.log(`Cache: ${stats.size}/${stats.max_size} | Memory: ${stats.memory_usage}`);
        console.log(`Response Time: ${stats.avg_response_time}`);

        if (stats.connection_pool) {
          console.log(`\nConnections: Active ${stats.connection_pool.active} | Idle ${stats.connection_pool.idle}`);
        }

        console.log('\nPress Ctrl+C to stop monitoring');
      } catch (error) {
        console.error('Monitor error:', error.message);
      }
    }, 2000);

    // Handle Ctrl+C
    process.once('SIGINT', () => {
      clearInterval(interval);
      console.log('\nMonitor stopped');
      this.rl.prompt();
    });
  }

  cleanup() {
    if (this.server) {
      this.server.kill();
    }
    process.exit(0);
  }
}

// Run CLI
const cli = new Mem0CLI();
cli.start().catch(console.error);