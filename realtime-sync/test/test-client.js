#!/usr/bin/env node

import WebSocket from 'ws';
import { createLogger } from '../src/logger.js';
import { createReadline } from 'readline';

const logger = createLogger('TestClient');

/**
 * Interactive test client for the Enhanced Realtime Sync Service
 * Provides comprehensive testing capabilities for all service features
 */
class RealtimeSyncTestClient {
  constructor(options = {}) {
    this.options = {
      url: options.url || 'ws://localhost:3001',
      userId: options.userId || 'test-user-' + Math.random().toString(36).substr(2, 9),
      reconnectDelay: options.reconnectDelay || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      ...options
    };

    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.connectionId = null;
    this.subscriptions = new Set();
    this.patterns = new Set();
    this.messageCount = 0;
    this.startTime = Date.now();

    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesReceived: 0,
      bytesSent: 0,
      reconnections: 0,
      errors: 0
    };

    this.readline = null;
    this.setupReadline();
  }

  /**
   * Setup readline interface for interactive commands
   */
  setupReadline() {
    this.readline = createReadline({
      input: process.stdin,
      output: process.stdout
    });

    this.readline.setPrompt('realtime-test> ');
  }

  /**
   * Connect to the WebSocket server
   */
  async connect() {
    try {
      const url = new URL(this.options.url);
      url.searchParams.set('userId', this.options.userId);

      logger.info('Connecting to server...', {
        url: url.toString(),
        userId: this.options.userId
      });

      this.ws = new WebSocket(url.toString(), {
        headers: {
          'User-Agent': 'Mem0-RealtimeSync-TestClient/2.0.0'
        }
      });

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.once('open', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          logger.info('Connected successfully');
          resolve();
        });

        this.ws.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.ws.on('open', () => {
      this.connected = true;
      logger.info('WebSocket connection opened');
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });

    this.ws.on('close', (code, reason) => {
      this.connected = false;
      logger.warn('WebSocket connection closed', {
        code,
        reason: reason.toString()
      });

      // Attempt reconnection if not intentional
      if (code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.attemptReconnection();
      }
    });

    this.ws.on('error', (error) => {
      this.metrics.errors++;
      logger.error('WebSocket error:', error);
    });

    this.ws.on('ping', (data) => {
      logger.debug('Received ping:', data.toString());
    });

    this.ws.on('pong', (data) => {
      logger.debug('Received pong:', data.toString());
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    this.messageCount++;
    this.metrics.messagesReceived++;
    this.metrics.bytesReceived += data.length;

    try {
      const message = JSON.parse(data.toString());
      this.processMessage(message);
    } catch (error) {
      logger.error('Failed to parse message:', error);
      console.log('Raw data:', data.toString());
    }
  }

  /**
   * Process parsed messages
   */
  processMessage(message) {
    const timestamp = new Date().toISOString();

    switch (message.type) {
      case 'connection':
        this.connectionId = message.connectionId;
        logger.info('Connection established', {
          connectionId: message.connectionId,
          userId: message.userId,
          serverFeatures: message.server?.features
        });
        break;

      case 'subscribed':
        logger.info('Subscription confirmed', {
          channels: message.channels,
          patterns: message.patterns,
          totalSubscriptions: message.totalSubscriptions
        });
        break;

      case 'event':
        console.log(`\n📨 [${timestamp}] EVENT on '${message.channel}':`, message.event);
        break;

      case 'broadcast':
        console.log(`\n📢 [${timestamp}] BROADCAST from '${message.fromUser}':`, message.data);
        break;

      case 'replay_response':
        console.log(`\n🔄 [${timestamp}] REPLAY (${message.replayed} events):`,
                   message.events.slice(0, 3)); // Show first 3 events
        if (message.events.length > 3) {
          console.log(`   ... and ${message.events.length - 3} more events`);
        }
        break;

      case 'status_response':
        console.log(`\n📊 [${timestamp}] STATUS:`,
                   JSON.stringify(message.status, null, 2));
        break;

      case 'error':
        console.log(`\n❌ [${timestamp}] ERROR:`, message.error);
        this.metrics.errors++;
        break;

      case 'pong':
        console.log(`\n🏓 [${timestamp}] PONG (server time: ${message.serverTime})`);
        break;

      case 'compression_response':
        logger.info('Compression settings updated', {
          enabled: message.enabled,
          level: message.level,
          threshold: message.threshold
        });
        break;

      default:
        console.log(`\n📋 [${timestamp}] ${message.type.toUpperCase()}:`, message);
    }
  }

  /**
   * Send message to server
   */
  async sendMessage(message) {
    if (!this.connected || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const data = JSON.stringify(message);
    this.ws.send(data);
    this.metrics.messagesSent++;
    this.metrics.bytesSent += data.length;

    logger.debug('Message sent', { type: message.type });
  }

  /**
   * Subscribe to channels and patterns
   */
  async subscribe(channels = [], patterns = [], options = {}) {
    channels.forEach(channel => this.subscriptions.add(channel));
    patterns.forEach(pattern => this.patterns.add(pattern));

    await this.sendMessage({
      type: 'subscribe',
      channels,
      patterns,
      options
    });

    console.log(`📡 Subscribed to ${channels.length} channels and ${patterns.length} patterns`);
  }

  /**
   * Unsubscribe from channels and patterns
   */
  async unsubscribe(channels = [], patterns = []) {
    channels.forEach(channel => this.subscriptions.delete(channel));
    patterns.forEach(pattern => this.patterns.delete(pattern));

    await this.sendMessage({
      type: 'unsubscribe',
      channels,
      patterns
    });

    console.log(`📡 Unsubscribed from ${channels.length} channels and ${patterns.length} patterns`);
  }

  /**
   * Send broadcast message
   */
  async broadcast(channel, data, targetUsers = []) {
    await this.sendMessage({
      type: 'broadcast',
      channel,
      data,
      targetUsers
    });

    console.log(`📢 Broadcast sent to channel '${channel}'`);
  }

  /**
   * Request event replay
   */
  async requestReplay(since = 0, options = {}) {
    await this.sendMessage({
      type: 'replay',
      since,
      ...options
    });

    console.log(`🔄 Event replay requested since ${since}`);
  }

  /**
   * Send ping
   */
  async ping() {
    await this.sendMessage({
      type: 'ping',
      timestamp: Date.now()
    });

    console.log('🏓 Ping sent');
  }

  /**
   * Request status
   */
  async status() {
    await this.sendMessage({
      type: 'status'
    });

    console.log('📊 Status requested');
  }

  /**
   * Configure compression
   */
  async setCompression(enable = true, level = 6) {
    await this.sendMessage({
      type: 'compression',
      enable,
      level
    });

    console.log(`🗜️ Compression ${enable ? 'enabled' : 'disabled'} (level: ${level})`);
  }

  /**
   * Attempt reconnection
   */
  async attemptReconnection() {
    this.reconnectAttempts++;
    this.metrics.reconnections++;

    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}...`);

    setTimeout(async () => {
      try {
        await this.connect();

        // Restore subscriptions after reconnection
        if (this.subscriptions.size > 0 || this.patterns.size > 0) {
          await this.subscribe(
            Array.from(this.subscriptions),
            Array.from(this.patterns),
            { replayEvents: true, sendInitialState: true }
          );
        }
      } catch (error) {
        logger.error('Reconnection failed:', error);
      }
    }, this.options.reconnectDelay);
  }

  /**
   * Display help menu
   */
  showHelp() {
    console.log(`
🚀 Enhanced Realtime Sync Test Client Commands:

Connection:
  connect                          - Connect to server
  disconnect                       - Disconnect from server
  status                          - Get server status
  ping                           - Send ping to server

Subscriptions:
  sub <channels...>              - Subscribe to channels
  psub <patterns...>             - Subscribe to patterns
  unsub <channels...>            - Unsubscribe from channels
  punsub <patterns...>           - Unsubscribe from patterns
  subs                          - List current subscriptions

Messaging:
  broadcast <channel> <message>  - Broadcast message to channel
  replay [since]                 - Request event replay
  compress <on|off> [level]      - Configure compression

Testing:
  stress <count> [delay]         - Send stress test messages
  monitor                       - Show live metrics
  metrics                       - Show current metrics

Utility:
  help                          - Show this help
  clear                         - Clear screen
  exit                          - Exit client

Examples:
  sub memory:created memory:updated    - Subscribe to memory events
  psub memory:* user:*                - Subscribe to patterns
  broadcast test:channel "Hello World" - Send broadcast message
  stress 1000 10                       - Send 1000 messages with 10ms delay
`);
  }

  /**
   * Show current metrics
   */
  showMetrics() {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);

    console.log(`
📊 Client Metrics:
  Connection ID: ${this.connectionId || 'N/A'}
  User ID: ${this.options.userId}
  Connected: ${this.connected ? '✅' : '❌'}
  Uptime: ${uptimeSeconds}s

  Messages Sent: ${this.metrics.messagesSent}
  Messages Received: ${this.metrics.messagesReceived}
  Bytes Sent: ${this.formatBytes(this.metrics.bytesSent)}
  Bytes Received: ${this.formatBytes(this.metrics.bytesReceived)}

  Reconnections: ${this.metrics.reconnections}
  Errors: ${this.metrics.errors}

  Subscriptions: ${this.subscriptions.size}
  Patterns: ${this.patterns.size}
`);
  }

  /**
   * Run stress test
   */
  async runStressTest(count = 100, delay = 10) {
    console.log(`🔥 Starting stress test: ${count} messages with ${delay}ms delay`);

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < count; i++) {
      const promise = this.sendMessage({
        type: 'broadcast',
        channel: 'stress-test',
        data: {
          messageId: i,
          timestamp: Date.now(),
          payload: 'A'.repeat(100) // 100 byte payload
        }
      }).then(() => {
        if (delay > 0) {
          return new Promise(resolve => setTimeout(resolve, delay));
        }
      });

      promises.push(promise);
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const messagesPerSecond = Math.round((count / duration) * 1000);

    console.log(`✅ Stress test completed: ${count} messages in ${duration}ms (${messagesPerSecond} msg/s)`);
  }

  /**
   * Start interactive mode
   */
  async startInteractive() {
    console.log('🚀 Enhanced Realtime Sync Test Client');
    console.log('Type "help" for available commands\n');

    this.readline.prompt();

    this.readline.on('line', async (input) => {
      const [command, ...args] = input.trim().split(' ');

      try {
        switch (command.toLowerCase()) {
          case 'connect':
            if (!this.connected) {
              await this.connect();
            } else {
              console.log('Already connected');
            }
            break;

          case 'disconnect':
            if (this.ws) {
              this.ws.close(1000, 'Client disconnect');
            }
            break;

          case 'sub':
            await this.subscribe(args);
            break;

          case 'psub':
            await this.subscribe([], args);
            break;

          case 'unsub':
            await this.unsubscribe(args);
            break;

          case 'punsub':
            await this.unsubscribe([], args);
            break;

          case 'subs':
            console.log('Subscriptions:', Array.from(this.subscriptions));
            console.log('Patterns:', Array.from(this.patterns));
            break;

          case 'broadcast':
            if (args.length >= 2) {
              const channel = args[0];
              const message = args.slice(1).join(' ');
              await this.broadcast(channel, message);
            } else {
              console.log('Usage: broadcast <channel> <message>');
            }
            break;

          case 'replay':
            const since = args[0] ? parseInt(args[0]) : 0;
            await this.requestReplay(since);
            break;

          case 'ping':
            await this.ping();
            break;

          case 'status':
            await this.status();
            break;

          case 'compress':
            const enable = args[0]?.toLowerCase() === 'on';
            const level = args[1] ? parseInt(args[1]) : 6;
            await this.setCompression(enable, level);
            break;

          case 'stress':
            const count = args[0] ? parseInt(args[0]) : 100;
            const delay = args[1] ? parseInt(args[1]) : 10;
            await this.runStressTest(count, delay);
            break;

          case 'metrics':
            this.showMetrics();
            break;

          case 'monitor':
            console.log('Live monitoring not implemented yet');
            break;

          case 'help':
            this.showHelp();
            break;

          case 'clear':
            console.clear();
            break;

          case 'exit':
            console.log('👋 Goodbye!');
            process.exit(0);
            break;

          case '':
            // Empty command, do nothing
            break;

          default:
            console.log(`Unknown command: ${command}. Type "help" for available commands.`);
        }
      } catch (error) {
        console.log(`❌ Error executing command: ${error.message}`);
      }

      this.readline.prompt();
    });

    this.readline.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    if (this.readline) {
      this.readline.close();
    }
  }
}

/**
 * CLI execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--url':
        options.url = value;
        break;
      case '--user':
        options.userId = value;
        break;
      case '--reconnect-delay':
        options.reconnectDelay = parseInt(value);
        break;
      case '--help':
        console.log(`
Usage: node test-client.js [options]

Options:
  --url <url>              WebSocket URL (default: ws://localhost:3001)
  --user <userId>          User ID for connection
  --reconnect-delay <ms>   Reconnection delay in milliseconds
  --help                   Show this help message
`);
        process.exit(0);
    }
  }

  const client = new RealtimeSyncTestClient(options);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down client...');
    await client.disconnect();
    process.exit(0);
  });

  // Auto-connect and start interactive mode
  try {
    await client.connect();
    await client.startInteractive();
  } catch (error) {
    logger.error('Failed to start client:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Client startup failed:', error);
    process.exit(1);
  });
}

export { RealtimeSyncTestClient };