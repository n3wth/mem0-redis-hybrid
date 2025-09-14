import { database } from '../database.js';
import { logger } from '../utils/logger.js';

export class VisualizationService {
  async getGraphData(filters = {}) {
    const { nodeTypes = [], relationshipTypes = [], limit = 1000, depth = 2 } = filters;

    const nodeFilter = nodeTypes.length > 0
      ? `WHERE n.type IN [${nodeTypes.map(t => `'${t}'`).join(', ')}]`
      : '';

    const relationshipFilter = relationshipTypes.length > 0
      ? `:${relationshipTypes.join('|')}`
      : '';

    const query = `
      MATCH (n:Memory) ${nodeFilter}
      WITH n LIMIT $limit
      OPTIONAL MATCH (n)-[r${relationshipFilter}*1..${depth}]-(connected:Memory)
      WITH collect(DISTINCT n) + collect(DISTINCT connected) as allNodes,
           collect(DISTINCT r) as allRels
      UNWIND allNodes as node
      UNWIND allRels as rel
      RETURN collect(DISTINCT {
        id: node.id,
        label: node.id,
        type: node.type,
        properties: node.properties,
        metadata: node.metadata,
        pagerank: coalesce(node.pagerank, 0),
        community: coalesce(node.community, 0)
      }) as nodes,
      collect(DISTINCT {
        source: startNode(rel).id,
        target: endNode(rel).id,
        type: type(rel),
        weight: rel.weight,
        properties: rel.properties
      }) as edges
    `;

    try {
      const result = await database.runQuery(query, { limit });
      const data = result.records[0] || { nodes: [], edges: [] };

      return this.processVisualizationData(data);
    } catch (error) {
      logger.error('Error getting graph data for visualization:', error);
      throw error;
    }
  }

  processVisualizationData(data) {
    const { nodes, edges } = data;

    // Calculate node sizes based on degree centrality
    const nodeDegrees = new Map();
    edges.forEach(edge => {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    });

    // Process nodes with visualization properties
    const processedNodes = nodes.map(node => {
      const degree = nodeDegrees.get(node.id) || 0;
      return {
        ...node,
        size: Math.max(5, Math.min(30, degree * 3)), // Scale node size by degree
        color: this.getNodeColor(node.type, node.community),
        borderWidth: node.pagerank > 0.1 ? 3 : 1, // Highlight important nodes
        fontSize: Math.max(8, Math.min(16, degree + 8))
      };
    });

    // Process edges with visualization properties
    const processedEdges = edges.map(edge => ({
      ...edge,
      width: Math.max(1, Math.min(8, edge.weight * 3)), // Scale edge width by weight
      color: this.getEdgeColor(edge.type),
      opacity: Math.max(0.3, Math.min(1, edge.weight))
    }));

    return {
      nodes: processedNodes,
      edges: processedEdges,
      stats: {
        nodeCount: processedNodes.length,
        edgeCount: processedEdges.length,
        nodeTypes: [...new Set(nodes.map(n => n.type))],
        relationshipTypes: [...new Set(edges.map(e => e.type))],
        communities: [...new Set(nodes.map(n => n.community).filter(c => c > 0))]
      }
    };
  }

  getNodeColor(type, community) {
    // Color by community if available, otherwise by type
    if (community > 0) {
      const communityColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
      ];
      return communityColors[community % communityColors.length];
    }

    // Default type-based colors
    const typeColors = {
      'concept': '#FF6B6B',
      'entity': '#4ECDC4',
      'event': '#45B7D1',
      'location': '#96CEB4',
      'person': '#FFEAA7',
      'organization': '#DDA0DD',
      'document': '#98D8C8',
      'topic': '#F7DC6F'
    };

    return typeColors[type] || '#95A5A6';
  }

  getEdgeColor(relationshipType) {
    const relationshipColors = {
      'RELATES_TO': '#34495E',
      'CONTAINS': '#3498DB',
      'MENTIONS': '#E74C3C',
      'LOCATED_IN': '#2ECC71',
      'PART_OF': '#9B59B6',
      'SIMILAR_TO': '#F39C12',
      'CONNECTED_TO': '#1ABC9C'
    };

    return relationshipColors[relationshipType] || '#BDC3C7';
  }

  async getClusterVisualization() {
    const query = `
      MATCH (n:Memory)
      WHERE n.community IS NOT NULL
      WITH n.community as community, collect(n) as members, count(n) as size
      ORDER BY size DESC
      RETURN community, members, size,
             collect({
               id: community,
               label: 'Community ' + community,
               size: size * 5,
               color: '#' + substring(md5(toString(community)), 0, 6),
               members: [member IN members | {
                 id: member.id,
                 type: member.type,
                 properties: member.properties
               }]
             }) as clusterData
    `;

    try {
      const result = await database.runQuery(query);
      return {
        clusters: result.records.map(record => record.clusterData[0]),
        totalClusters: result.records.length
      };
    } catch (error) {
      logger.error('Error getting cluster visualization:', error);
      throw error;
    }
  }

  async getHierarchicalLayout() {
    const query = `
      MATCH (root:Memory)
      WHERE NOT (root)<-[:CONTAINS|PART_OF]-(:Memory)
      CALL apoc.path.subgraphAll(root, {
        relationshipFilter: "CONTAINS>|PART_OF>",
        maxLevel: 5
      }) YIELD nodes, relationships
      RETURN collect({
        root: root.id,
        hierarchy: [node IN nodes | {
          id: node.id,
          type: node.type,
          level: size(apoc.path.create(root, [rel IN relationships WHERE startNode(rel) = node OR endNode(rel) = node]))
        }],
        connections: [rel IN relationships | {
          source: startNode(rel).id,
          target: endNode(rel).id,
          type: type(rel)
        }]
      }) as hierarchies
    `;

    try {
      const result = await database.runQuery(query);
      return result.records[0]?.hierarchies || [];
    } catch (error) {
      logger.error('Error getting hierarchical layout:', error);
      throw error;
    }
  }

  async getTimelineVisualization() {
    const query = `
      MATCH (n:Memory)
      WHERE n.created_at IS NOT NULL
      WITH n, date(n.created_at) as dateCreated
      ORDER BY dateCreated
      RETURN collect({
        date: toString(dateCreated),
        nodes: collect({
          id: n.id,
          type: n.type,
          properties: n.properties,
          timestamp: n.created_at
        })
      }) as timeline
    `;

    try {
      const result = await database.runQuery(query);
      return result.records[0]?.timeline || [];
    } catch (error) {
      logger.error('Error getting timeline visualization:', error);
      throw error;
    }
  }
}