import { GraphService } from '../services/GraphService.js';
import { database } from '../database.js';
import GraphQLJSON from 'graphql-type-json';

const graphService = new GraphService();

export const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    async node(_, { id }) {
      const query = 'MATCH (n:Memory {id: $id}) RETURN n';
      const result = await database.runQuery(query, { id });
      return result.records[0]?.n;
    },

    async nodes(_, { type, limit }) {
      const query = type
        ? 'MATCH (n:Memory {type: $type}) RETURN n LIMIT $limit'
        : 'MATCH (n:Memory) RETURN n LIMIT $limit';
      const result = await database.runQuery(query, { type, limit });
      return result.records.map(record => record.n);
    },

    async traverse(_, { startId, depth, relationshipTypes }) {
      return await graphService.traverseGraph(startId, depth, relationshipTypes);
    },

    async shortestPath(_, { sourceId, targetId, relationshipTypes }) {
      return await graphService.findShortestPath(sourceId, targetId, relationshipTypes);
    },

    async communities(_, { algorithm }) {
      return await graphService.findCommunities(algorithm);
    },

    async recommendations(_, { nodeId, limit }) {
      return await graphService.getRecommendations(nodeId, limit);
    },

    async pagerank(_, { iterations, dampingFactor }) {
      return await graphService.calculatePageRank(iterations, dampingFactor);
    },

    async stats() {
      const query = `
        MATCH (n:Memory)
        OPTIONAL MATCH (n)-[r]->()
        RETURN count(DISTINCT n) as nodeCount,
               count(r) as edgeCount,
               collect(DISTINCT n.type) as nodeTypes,
               collect(DISTINCT type(r)) as relationshipTypes
      `;
      const result = await database.runQuery(query);
      return result.records[0];
    }
  },

  Mutation: {
    async createNode(_, { input }) {
      return await graphService.createNode(input);
    },

    async updateNode(_, { id, input }) {
      const query = `
        MATCH (n:Memory {id: $id})
        SET n += $properties,
            n.metadata = $metadata,
            n.updated_at = datetime()
        RETURN n
      `;
      const result = await database.runQuery(query, {
        id,
        properties: input.properties || {},
        metadata: input.metadata || {}
      });
      return result.records[0]?.n;
    },

    async deleteNode(_, { id }) {
      const query = `
        MATCH (n:Memory {id: $id})
        DETACH DELETE n
        RETURN count(n) as deletedCount
      `;
      const result = await database.runQuery(query, { id });
      return result.records[0]?.deletedCount > 0;
    },

    async createEdge(_, { input }) {
      const edge = await graphService.createEdge(input);
      return {
        source: edge.source,
        target: edge.target,
        relationship: edge.r
      };
    },

    async deleteEdge(_, { sourceId, targetId, relationshipType }) {
      const query = `
        MATCH (source:Memory {id: $sourceId})-[r:${relationshipType}]->(target:Memory {id: $targetId})
        DELETE r
        RETURN count(r) as deletedCount
      `;
      const result = await database.runQuery(query, { sourceId, targetId });
      return result.records[0]?.deletedCount > 0;
    },

    async createNodes(_, { inputs }) {
      const nodes = [];
      for (const input of inputs) {
        const node = await graphService.createNode(input);
        nodes.push(node);
      }
      return nodes;
    },

    async createEdges(_, { inputs }) {
      const edges = [];
      for (const input of inputs) {
        const edge = await graphService.createEdge(input);
        edges.push({
          source: edge.source,
          target: edge.target,
          relationship: edge.r
        });
      }
      return edges;
    },

    async clearGraph() {
      const query = 'MATCH (n:Memory) DETACH DELETE n';
      await database.runQuery(query);
      return true;
    },

    async mergeGraph(_, { nodes, edges }) {
      // Create nodes first
      for (const nodeInput of nodes) {
        await graphService.createNode(nodeInput);
      }

      // Then create edges
      for (const edgeInput of edges) {
        await graphService.createEdge(edgeInput);
      }

      // Return updated stats
      const query = `
        MATCH (n:Memory)
        OPTIONAL MATCH (n)-[r]->()
        RETURN count(DISTINCT n) as nodeCount,
               count(r) as edgeCount,
               collect(DISTINCT n.type) as nodeTypes,
               collect(DISTINCT type(r)) as relationshipTypes
      `;
      const result = await database.runQuery(query);
      return result.records[0];
    }
  }
};