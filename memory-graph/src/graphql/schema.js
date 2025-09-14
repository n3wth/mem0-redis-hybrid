import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type MemoryNode {
    id: ID!
    type: String!
    properties: JSON
    metadata: JSON
    createdAt: String
    updatedAt: String
    pagerank: Float
    community: Int
  }

  type Relationship {
    type: String!
    weight: Float!
    properties: JSON
    createdAt: String
    updatedAt: String
  }

  type Edge {
    source: MemoryNode!
    target: MemoryNode!
    relationship: Relationship!
  }

  type Path {
    nodes: [MemoryNode!]!
    relationships: [Relationship!]!
    pathLength: Int!
    totalWeight: Float!
  }

  type TraversalResult {
    nodes: [MemoryNode!]!
    edges: [Edge!]!
    totalPaths: Int!
  }

  type Community {
    id: Int!
    members: [MemoryNode!]!
    size: Int!
  }

  type Recommendation {
    node: MemoryNode!
    score: Float!
    commonConnections: Int!
    avgWeight: Float!
    intermediateTypes: [String!]!
  }

  type PageRankResult {
    id: ID!
    pagerank: Float!
    type: String!
  }

  type GraphStats {
    nodeCount: Int!
    edgeCount: Int!
    nodeTypes: [String!]!
    relationshipTypes: [String!]!
  }

  input NodeInput {
    id: ID!
    type: String!
    properties: JSON
    metadata: JSON
  }

  input EdgeInput {
    sourceId: ID!
    targetId: ID!
    relationshipType: String!
    weight: Float = 1.0
    properties: JSON
  }

  scalar JSON

  type Query {
    # Node queries
    node(id: ID!): MemoryNode
    nodes(type: String, limit: Int = 100): [MemoryNode!]!

    # Graph traversal
    traverse(
      startId: ID!
      depth: Int = 3
      relationshipTypes: [String!] = []
    ): TraversalResult!

    # Path finding
    shortestPath(
      sourceId: ID!
      targetId: ID!
      relationshipTypes: [String!] = []
    ): Path

    # Community detection
    communities(algorithm: String = "louvain"): [Community!]!

    # Recommendations
    recommendations(nodeId: ID!, limit: Int = 10): [Recommendation!]!

    # Graph algorithms
    pagerank(iterations: Int = 20, dampingFactor: Float = 0.85): [PageRankResult!]!

    # Statistics
    stats: GraphStats!
  }

  type Mutation {
    # Node operations
    createNode(input: NodeInput!): MemoryNode!
    updateNode(id: ID!, input: NodeInput!): MemoryNode!
    deleteNode(id: ID!): Boolean!

    # Edge operations
    createEdge(input: EdgeInput!): Edge!
    deleteEdge(sourceId: ID!, targetId: ID!, relationshipType: String!): Boolean!

    # Bulk operations
    createNodes(inputs: [NodeInput!]!): [MemoryNode!]!
    createEdges(inputs: [EdgeInput!]!): [Edge!]!

    # Graph operations
    clearGraph: Boolean!
    mergeGraph(nodes: [NodeInput!]!, edges: [EdgeInput!]!): GraphStats!
  }

  type Subscription {
    nodeCreated: MemoryNode!
    edgeCreated: Edge!
    graphUpdated: GraphStats!
  }
`;