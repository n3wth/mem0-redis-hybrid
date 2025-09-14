#!/usr/bin/env node

import { spawn } from 'child_process';
import { database } from '../src/database.js';
import { logger } from '../src/utils/logger.js';

class TestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTest(testName, testFn) {
    try {
      logger.info(`Running test: ${testName}`);
      await testFn();
      this.testResults.passed++;
      logger.info(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
      logger.error(`❌ ${testName} - FAILED: ${error.message}`);
    }
  }

  async testDatabaseConnection() {
    await database.connect();
    const result = await database.runQuery('RETURN "Hello Neo4j" as greeting');
    if (result.records[0].greeting !== 'Hello Neo4j') {
      throw new Error('Unexpected database response');
    }
    await database.close();
  }

  async testNodeCreation() {
    await database.connect();

    const testNode = {
      id: 'test-node-' + Date.now(),
      type: 'test',
      properties: { name: 'Test Node' }
    };

    const query = `
      MERGE (n:Memory {id: $id})
      SET n.type = $type,
          n.properties = $properties,
          n.created_at = datetime()
      RETURN n
    `;

    const result = await database.runQuery(query, testNode);
    if (!result.records[0]?.n) {
      throw new Error('Node not created');
    }

    // Cleanup
    await database.runQuery('MATCH (n:Memory {id: $id}) DELETE n', { id: testNode.id });
    await database.close();
  }

  async testEdgeCreation() {
    await database.connect();

    const nodeId1 = 'test-node-1-' + Date.now();
    const nodeId2 = 'test-node-2-' + Date.now();

    // Create test nodes
    await database.runQuery(`
      MERGE (n1:Memory {id: $id1})
      SET n1.type = 'test'
      MERGE (n2:Memory {id: $id2})
      SET n2.type = 'test'
    `, { id1: nodeId1, id2: nodeId2 });

    // Create edge
    const result = await database.runQuery(`
      MATCH (n1:Memory {id: $id1}), (n2:Memory {id: $id2})
      MERGE (n1)-[r:TEST_RELATION]->(n2)
      SET r.weight = 1.0
      RETURN r
    `, { id1: nodeId1, id2: nodeId2 });

    if (!result.records[0]?.r) {
      throw new Error('Edge not created');
    }

    // Cleanup
    await database.runQuery(`
      MATCH (n1:Memory {id: $id1}), (n2:Memory {id: $id2})
      DETACH DELETE n1, n2
    `, { id1: nodeId1, id2: nodeId2 });

    await database.close();
  }

  async testGraphTraversal() {
    await database.connect();

    // Use existing sample data
    const result = await database.runQuery(`
      MATCH path = (start:Memory {id: 'concept-ai'})-[*1..2]-(connected:Memory)
      RETURN count(path) as pathCount
    `);

    if (result.records[0].pathCount < 1) {
      throw new Error('No paths found in traversal');
    }

    await database.close();
  }

  async testServerHealthCheck() {
    return new Promise((resolve, reject) => {
      // Start server in background
      const server = spawn('node', ['src/server.js'], {
        env: { ...process.env, PORT: '3002' },
        stdio: 'pipe'
      });

      let serverReady = false;

      server.stdout.on('data', (data) => {
        if (data.toString().includes('running on port')) {
          serverReady = true;
        }
      });

      // Wait for server to start
      setTimeout(async () => {
        if (!serverReady) {
          server.kill();
          reject(new Error('Server failed to start'));
          return;
        }

        try {
          // Test health endpoint
          const response = await fetch('http://localhost:3002/health');
          const data = await response.json();

          if (data.status !== 'healthy') {
            throw new Error('Server health check failed');
          }

          server.kill();
          resolve();
        } catch (error) {
          server.kill();
          reject(error);
        }
      }, 5000);

      server.on('error', (error) => {
        reject(new Error(`Server error: ${error.message}`));
      });
    });
  }

  async runAllTests() {
    logger.info('Starting Memory Graph Service Tests...');

    await this.runTest('Database Connection', () => this.testDatabaseConnection());
    await this.runTest('Node Creation', () => this.testNodeCreation());
    await this.runTest('Edge Creation', () => this.testEdgeCreation());
    await this.runTest('Graph Traversal', () => this.testGraphTraversal());
    await this.runTest('Server Health Check', () => this.testServerHealthCheck());

    // Results
    const total = this.testResults.passed + this.testResults.failed;
    logger.info(`\nTest Results: ${this.testResults.passed}/${total} passed`);

    if (this.testResults.failed > 0) {
      logger.error('Failed tests:');
      this.testResults.errors.forEach(error => {
        logger.error(`- ${error.test}: ${error.error}`);
      });
      process.exit(1);
    } else {
      logger.info('All tests passed!');
      process.exit(0);
    }
  }
}

// Only run if global fetch is not available (Node.js < 18)
if (typeof global.fetch === 'undefined') {
  import('node-fetch').then(fetch => {
    global.fetch = fetch.default;
    const runner = new TestRunner();
    runner.runAllTests();
  });
} else {
  const runner = new TestRunner();
  runner.runAllTests();
}