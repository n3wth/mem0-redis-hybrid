import neo4j from 'neo4j-driver';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

class Neo4jDatabase {
  constructor() {
    this.driver = null;
    this.session = null;
  }

  async connect() {
    try {
      this.driver = neo4j.driver(
        config.neo4j.uri,
        neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
        {
          maxConnectionLifetime: 30000,
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 20000,
          disableLosslessIntegers: true
        }
      );

      await this.driver.verifyConnectivity();
      logger.info('Connected to Neo4j database');
      return this.driver;
    } catch (error) {
      logger.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  getSession() {
    if (!this.driver) {
      throw new Error('Database not connected');
    }
    return this.driver.session();
  }

  async runQuery(query, params = {}) {
    const session = this.getSession();
    try {
      const result = await session.run(query, params);
      return {
        records: result.records.map(record => record.toObject()),
        summary: result.summary
      };
    } finally {
      await session.close();
    }
  }

  async runWriteTransaction(queries) {
    const session = this.getSession();
    try {
      return await session.executeWrite(async tx => {
        const results = [];
        for (const { query, params } of queries) {
          const result = await tx.run(query, params);
          results.push({
            records: result.records.map(record => record.toObject()),
            summary: result.summary
          });
        }
        return results;
      });
    } finally {
      await session.close();
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
      logger.info('Neo4j connection closed');
    }
  }
}

export const database = new Neo4jDatabase();