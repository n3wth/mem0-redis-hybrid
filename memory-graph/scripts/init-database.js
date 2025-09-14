#!/usr/bin/env node

import { database } from '../src/database.js';
import { logger } from '../src/utils/logger.js';

async function initializeDatabase() {
  try {
    logger.info('Initializing Neo4j database...');

    await database.connect();

    // Create constraints and indexes
    const constraints = [
      'CREATE CONSTRAINT memory_id_unique IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE',
      'CREATE INDEX memory_type_index IF NOT EXISTS FOR (m:Memory) ON (m.type)',
      'CREATE INDEX memory_created_at_index IF NOT EXISTS FOR (m:Memory) ON (m.created_at)',
      'CREATE INDEX memory_pagerank_index IF NOT EXISTS FOR (m:Memory) ON (m.pagerank)',
      'CREATE INDEX memory_community_index IF NOT EXISTS FOR (m:Memory) ON (m.community)'
    ];

    for (const constraint of constraints) {
      try {
        await database.runQuery(constraint);
        logger.info(`Applied: ${constraint.split(' ')[1]}_${constraint.split(' ')[2]}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.error(`Error applying constraint: ${error.message}`);
        }
      }
    }

    // Create sample data for testing
    const sampleNodes = [
      {
        id: 'concept-ai',
        type: 'concept',
        properties: { name: 'Artificial Intelligence', description: 'Machine learning and AI systems' }
      },
      {
        id: 'concept-memory',
        type: 'concept',
        properties: { name: 'Memory Systems', description: 'Data storage and retrieval mechanisms' }
      },
      {
        id: 'concept-graph',
        type: 'concept',
        properties: { name: 'Graph Databases', description: 'Node-edge data structures' }
      },
      {
        id: 'person-researcher',
        type: 'person',
        properties: { name: 'AI Researcher', role: 'Research Scientist' }
      },
      {
        id: 'document-paper',
        type: 'document',
        properties: { title: 'Graph-Based Memory Systems', type: 'research paper' }
      }
    ];

    const sampleEdges = [
      { sourceId: 'concept-ai', targetId: 'concept-memory', relationshipType: 'RELATES_TO', weight: 0.8 },
      { sourceId: 'concept-memory', targetId: 'concept-graph', relationshipType: 'IMPLEMENTS', weight: 0.9 },
      { sourceId: 'person-researcher', targetId: 'concept-ai', relationshipType: 'STUDIES', weight: 0.7 },
      { sourceId: 'document-paper', targetId: 'concept-graph', relationshipType: 'DESCRIBES', weight: 0.85 },
      { sourceId: 'person-researcher', targetId: 'document-paper', relationshipType: 'AUTHORED', weight: 1.0 }
    ];

    // Create sample nodes
    for (const node of sampleNodes) {
      const query = `
        MERGE (n:Memory {id: $id})
        SET n.type = $type,
            n += $properties,
            n.created_at = datetime(),
            n.updated_at = datetime()
      `;
      await database.runQuery(query, node);
    }

    // Create sample edges
    for (const edge of sampleEdges) {
      const query = `
        MATCH (source:Memory {id: $sourceId}), (target:Memory {id: $targetId})
        MERGE (source)-[r:${edge.relationshipType}]->(target)
        SET r.weight = $weight,
            r.created_at = datetime(),
            r.updated_at = datetime()
      `;
      await database.runQuery(query, edge);
    }

    logger.info('Sample data created successfully');

    // Verify setup
    const stats = await database.runQuery(`
      MATCH (n:Memory)
      OPTIONAL MATCH (n)-[r]->()
      RETURN count(DISTINCT n) as nodeCount,
             count(r) as edgeCount,
             collect(DISTINCT n.type) as nodeTypes
    `);

    const result = stats.records[0];
    logger.info('Database initialization complete:', {
      nodes: result.nodeCount,
      edges: result.edgeCount,
      types: result.nodeTypes
    });

  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

initializeDatabase();