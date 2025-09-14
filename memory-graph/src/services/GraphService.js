import { database } from '../database.js';
import { logger } from '../utils/logger.js';

export class GraphService {
  async createNode(data) {
    const { id, type, properties = {}, metadata = {} } = data;

    const query = `
      MERGE (n:Memory {id: $id})
      SET n.type = $type,
          n += $properties,
          n += $metadata,
          n.created_at = datetime(),
          n.updated_at = datetime()
      RETURN n
    `;

    try {
      const result = await database.runQuery(query, {
        id,
        type,
        properties,
        metadata
      });
      return result.records[0]?.n;
    } catch (error) {
      logger.error('Error creating node:', error);
      throw error;
    }
  }

  async createEdge(data) {
    const { sourceId, targetId, relationshipType, weight = 1.0, properties = {} } = data;

    const query = `
      MATCH (source:Memory {id: $sourceId}), (target:Memory {id: $targetId})
      MERGE (source)-[r:${relationshipType}]->(target)
      SET r.weight = $weight,
          r += $properties,
          r.created_at = datetime(),
          r.updated_at = datetime()
      RETURN r, source, target
    `;

    try {
      const result = await database.runQuery(query, {
        sourceId,
        targetId,
        weight,
        properties
      });
      return result.records[0];
    } catch (error) {
      logger.error('Error creating edge:', error);
      throw error;
    }
  }

  async traverseGraph(startId, depth = 3, relationshipTypes = []) {
    const relationshipFilter = relationshipTypes.length > 0
      ? `:${relationshipTypes.join('|')}`
      : '';

    const query = `
      MATCH path = (start:Memory {id: $startId})-[r${relationshipFilter}*1..${depth}]-(connected:Memory)
      RETURN path,
             nodes(path) as nodes,
             relationships(path) as relationships,
             length(path) as depth
      ORDER BY depth
    `;

    try {
      const result = await database.runQuery(query, { startId });
      return this.formatTraversalResult(result.records);
    } catch (error) {
      logger.error('Error traversing graph:', error);
      throw error;
    }
  }

  async findCommunities(algorithm = 'louvain') {
    const query = `
      CALL gds.graph.project.cypher(
        'memory-graph',
        'MATCH (n:Memory) RETURN id(n) AS id, n.type AS type',
        'MATCH (n:Memory)-[r]->(m:Memory) RETURN id(n) AS source, id(m) AS target, r.weight AS weight'
      ) YIELD graphName

      CALL gds.${algorithm}.write('memory-graph', {
        writeProperty: 'community'
      }) YIELD communityCount, modularity

      MATCH (n:Memory)
      RETURN n.community as community,
             collect({id: n.id, type: n.type, properties: n.properties}) as members,
             count(n) as size
      ORDER BY size DESC
    `;

    try {
      const result = await database.runQuery(query);
      return result.records.map(record => ({
        community: record.community,
        members: record.members,
        size: record.size
      }));
    } catch (error) {
      logger.error('Error finding communities:', error);
      throw error;
    }
  }

  async findShortestPath(sourceId, targetId, relationshipTypes = []) {
    const relationshipFilter = relationshipTypes.length > 0
      ? `:${relationshipTypes.join('|')}`
      : '';

    const query = `
      MATCH (source:Memory {id: $sourceId}), (target:Memory {id: $targetId})
      MATCH path = shortestPath((source)-[r${relationshipFilter}*]-(target))
      RETURN path,
             nodes(path) as nodes,
             relationships(path) as relationships,
             length(path) as pathLength,
             reduce(totalWeight = 0, rel in relationships(path) | totalWeight + rel.weight) as totalWeight
    `;

    try {
      const result = await database.runQuery(query, { sourceId, targetId });
      if (result.records.length === 0) {
        return null;
      }
      return this.formatPathResult(result.records[0]);
    } catch (error) {
      logger.error('Error finding shortest path:', error);
      throw error;
    }
  }

  async getRecommendations(nodeId, limit = 10) {
    const query = `
      MATCH (n:Memory {id: $nodeId})-[r1]-(intermediate:Memory)-[r2]-(recommended:Memory)
      WHERE recommended.id <> $nodeId
        AND NOT (n)-[]-(recommended)
      WITH recommended,
           count(*) as commonConnections,
           avg(r1.weight + r2.weight) as avgWeight,
           collect(DISTINCT intermediate.type) as intermediateTypes
      RETURN recommended,
             commonConnections,
             avgWeight,
             intermediateTypes,
             (commonConnections * avgWeight) as score
      ORDER BY score DESC
      LIMIT $limit
    `;

    try {
      const result = await database.runQuery(query, { nodeId, limit });
      return result.records.map(record => ({
        node: record.recommended,
        score: record.score,
        commonConnections: record.commonConnections,
        avgWeight: record.avgWeight,
        intermediateTypes: record.intermediateTypes
      }));
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  async calculatePageRank(iterations = 20, dampingFactor = 0.85) {
    const query = `
      CALL gds.graph.project.cypher(
        'pagerank-graph',
        'MATCH (n:Memory) RETURN id(n) AS id',
        'MATCH (n:Memory)-[r]->(m:Memory) RETURN id(n) AS source, id(m) AS target, r.weight AS weight'
      ) YIELD graphName

      CALL gds.pageRank.write('pagerank-graph', {
        maxIterations: $iterations,
        dampingFactor: $dampingFactor,
        writeProperty: 'pagerank'
      }) YIELD nodePropertiesWritten

      MATCH (n:Memory)
      RETURN n.id as id, n.pagerank as pagerank, n.type as type
      ORDER BY n.pagerank DESC
    `;

    try {
      const result = await database.runQuery(query, { iterations, dampingFactor });
      return result.records.map(record => ({
        id: record.id,
        pagerank: record.pagerank,
        type: record.type
      }));
    } catch (error) {
      logger.error('Error calculating PageRank:', error);
      throw error;
    }
  }

  formatTraversalResult(records) {
    const nodes = new Map();
    const edges = [];

    records.forEach(record => {
      record.nodes.forEach(node => {
        nodes.set(node.id, node);
      });

      record.relationships.forEach(rel => {
        edges.push({
          source: rel.start,
          target: rel.end,
          type: rel.type,
          weight: rel.weight,
          properties: rel.properties
        });
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges,
      totalPaths: records.length
    };
  }

  formatPathResult(record) {
    return {
      path: record.nodes.map(node => ({
        id: node.id,
        type: node.type,
        properties: node.properties
      })),
      relationships: record.relationships.map(rel => ({
        type: rel.type,
        weight: rel.weight,
        properties: rel.properties
      })),
      pathLength: record.pathLength,
      totalWeight: record.totalWeight
    };
  }
}