# Memory Graph Microservice

A high-performance graph-based memory management microservice built with Node.js, Neo4j, and GraphQL. Provides advanced graph algorithms, visualization APIs, and real-time memory relationship analysis.

## Features

### Core Functionality
- **Graph Database**: Neo4j 5.x with APOC and GDS plugins
- **REST API**: Complete CRUD operations for nodes and edges
- **GraphQL API**: Advanced querying with subscriptions
- **Graph Algorithms**: PageRank, community detection, shortest path
- **Visualization**: D3.js-compatible data structures and layouts
- **Real-time**: WebSocket support for live updates

### Graph Operations
- Node and edge creation with validation
- Graph traversal with configurable depth
- Community detection (Louvain, Leiden, Label Propagation)
- Shortest path algorithms
- Memory-based recommendations
- Hierarchical and timeline visualizations

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- 8GB+ RAM recommended

### Installation

```bash
# Clone and setup
git clone <repository>
cd memory-graph
npm install

# Start Neo4j database
npm run docker:up

# Initialize database with sample data
npm run init-db

# Start development server
npm run dev
```

### Verify Installation

```bash
# Check database health
curl http://localhost:3001/health

# View API documentation
curl http://localhost:3001/api

# Access GraphQL Playground
open http://localhost:3001/graphql
```

## API Reference

### REST Endpoints

#### Node Operations
```bash
# Create memory node
POST /api/graph/nodes
{
  "id": "unique-id",
  "type": "concept|entity|event|person|document",
  "properties": {},
  "metadata": {}
}

# Response: Created node object
```

#### Edge Operations
```bash
# Create relationship
POST /api/graph/edges
{
  "sourceId": "node-1",
  "targetId": "node-2",
  "relationshipType": "RELATES_TO",
  "weight": 0.8,
  "properties": {}
}
```

#### Graph Analysis
```bash
# Traverse graph from starting node
GET /api/graph/traverse?startId=node-1&depth=3&relationshipTypes=RELATES_TO,CONTAINS

# Find communities
GET /api/graph/clusters?algorithm=louvain

# Calculate shortest path
GET /api/graph/shortest-path?sourceId=node-1&targetId=node-2

# Get recommendations
GET /api/graph/recommendations?nodeId=node-1&limit=10

# Calculate PageRank importance
GET /api/graph/pagerank?iterations=20&dampingFactor=0.85

# Graph statistics
GET /api/graph/stats
```

### Visualization Endpoints

```bash
# Get visualization-ready graph data
GET /api/visualization/graph-data?nodeTypes=concept,entity&limit=500

# Cluster visualization
GET /api/visualization/clusters

# Hierarchical layout
GET /api/visualization/hierarchy

# Timeline visualization
GET /api/visualization/timeline
```

### GraphQL API

#### Sample Queries

```graphql
# Get node with relationships
query {
  node(id: "concept-ai") {
    id
    type
    properties
    pagerank
    community
  }
}

# Complex traversal
query {
  traverse(startId: "concept-ai", depth: 2, relationshipTypes: ["RELATES_TO"]) {
    nodes {
      id
      type
      properties
    }
    edges {
      source { id }
      target { id }
      relationship { type weight }
    }
    totalPaths
  }
}

# Community detection
query {
  communities(algorithm: "louvain") {
    id
    size
    members {
      id
      type
    }
  }
}
```

#### Sample Mutations

```graphql
# Create node
mutation {
  createNode(input: {
    id: "new-concept"
    type: "concept"
    properties: { name: "Machine Learning" }
  }) {
    id
    type
    properties
  }
}

# Bulk operations
mutation {
  createNodes(inputs: [
    { id: "node-1", type: "concept", properties: {} }
    { id: "node-2", type: "entity", properties: {} }
  ]) {
    id
    type
  }
}
```

## Graph Algorithms

### PageRank Implementation
- Measures node importance in the graph
- Configurable iterations and damping factor
- Results stored as node properties

### Community Detection
- **Louvain**: Fast, good quality communities
- **Leiden**: Improved version of Louvain
- **Label Propagation**: Simple, fast algorithm

### Path Finding
- Shortest path between any two nodes
- Weighted path calculations
- Support for relationship type filtering

### Recommendations
- Based on common neighbors and path weights
- Configurable scoring algorithms
- Excludes already connected nodes

## Visualization Support

### Graph Layouts
- **Force-directed**: Standard network layout
- **Hierarchical**: Tree-like structures
- **Circular**: Community-based circular layout
- **Timeline**: Temporal node arrangement

### Styling Options
- Node size based on degree centrality
- Color coding by type or community
- Edge width based on relationship weight
- Opacity based on importance scores

### D3.js Integration
```javascript
// Example D3.js usage
d3.json('/api/visualization/graph-data')
  .then(data => {
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
  });
```

## Configuration

### Environment Variables
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=memgraph123
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

### Database Configuration
- Connection pooling: 50 connections max
- Query timeout: 20 seconds
- Memory settings optimized for graph workloads

### Performance Tuning
- Indexes on id, type, created_at, pagerank, community
- Constraint on node id uniqueness
- Query result caching
- Connection keep-alive optimization

## Docker Deployment

### Production Setup
```yaml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15-enterprise  # For production
    environment:
      - NEO4J_AUTH=neo4j/secure_password
      - NEO4J_PLUGINS=["apoc", "graph-data-science"]
      - NEO4J_dbms_memory_heap_max__size=4G
      - NEO4J_dbms_memory_pagecache_size=2G
    volumes:
      - ./data:/data
      - ./backups:/backups

  memory-graph:
    build: .
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NODE_ENV=production
    depends_on:
      - neo4j
    ports:
      - "3001:3001"
```

### Health Monitoring
```bash
# Docker health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD curl -f http://localhost:3001/health || exit 1
```

## Development

### Running Tests
```bash
# Full test suite
npm test

# Individual test categories
node tests/database-tests.js
node tests/api-tests.js
node tests/algorithm-tests.js
```

### Debugging
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Neo4j query profiling
# Add PROFILE prefix to queries in development
```

### Performance Monitoring
- Request timing middleware included
- Memory usage tracking
- Query performance logging
- Graph algorithm benchmarking

## Advanced Usage

### Custom Algorithms
```javascript
// Example: Custom centrality measure
const customCentrality = await database.runQuery(`
  CALL gds.betweenness.write('graph-projection', {
    writeProperty: 'betweenness'
  }) YIELD centralityDistribution
  RETURN centralityDistribution
`);
```

### Batch Processing
```javascript
// Bulk node creation with transactions
const nodes = [...]; // Large array of nodes
const batchSize = 1000;

for (let i = 0; i < nodes.length; i += batchSize) {
  const batch = nodes.slice(i, i + batchSize);
  await database.runWriteTransaction(
    batch.map(node => ({ query: nodeCreationQuery, params: node }))
  );
}
```

### Real-time Updates
```javascript
// GraphQL subscription example
subscription {
  nodeCreated {
    id
    type
    properties
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check Neo4j status
   docker-compose ps
   docker-compose logs neo4j
   ```

2. **Memory Issues**
   ```bash
   # Increase Docker memory allocation
   # Or reduce batch sizes in operations
   ```

3. **Query Timeouts**
   ```bash
   # Check query complexity
   # Add indexes for frequent query patterns
   ```

### Performance Optimization
- Use EXPLAIN/PROFILE for query analysis
- Create appropriate indexes
- Batch operations when possible
- Monitor memory usage during large operations

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Documentation: [Full API Docs](https://your-docs-site.com)
- Community: [Discord/Slack Channel](https://your-community-link)