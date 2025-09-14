#!/usr/bin/env node

/**
 * Vector Embedding Service Test Suite
 * Tests embedding generation, search, and clustering functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const TEST_TEXTS = [
  'The user prefers dark mode themes and TypeScript',
  'User likes React development and modern JavaScript',
  'Prefers Python for data science and machine learning',
  'Enjoys working with databases and SQL queries',
  'Interested in AI and natural language processing'
];

async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  
  try {
    const response = await fetch(`${BASE_URL}/health/ready`);
    const health = await response.json();
    
    if (health.ready) {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', health);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testEmbeddingGeneration() {
  console.log('🔍 Testing embedding generation...');
  
  try {
    const response = await fetch(`${BASE_URL}/embeddings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: TEST_TEXTS[0],
        provider: 'openai',
        metadata: { test: true }
      })
    });
    
    const embedding = await response.json();
    
    if (embedding.id && embedding.vector && embedding.vector.length > 0) {
      console.log('✅ Embedding generation passed');
      console.log(`   Dimensions: ${embedding.dimensions}`);
      console.log(`   Provider: ${embedding.provider}`);
      return embedding;
    } else {
      console.log('❌ Embedding generation failed:', embedding);
      return null;
    }
  } catch (error) {
    console.log('❌ Embedding generation error:', error.message);
    return null;
  }
}

async function testBatchEmbeddingGeneration() {
  console.log('🔍 Testing batch embedding generation...');
  
  try {
    const response = await fetch(`${BASE_URL}/embeddings/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: TEST_TEXTS.slice(0, 3),
        provider: 'openai',
        batch_size: 2
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.results && result.results.length > 0) {
      console.log('✅ Batch embedding generation passed');
      console.log(`   Generated: ${result.generated} embeddings`);
      return result.results;
    } else {
      console.log('❌ Batch embedding generation failed:', result);
      return null;
    }
  } catch (error) {
    console.log('❌ Batch embedding generation error:', error.message);
    return null;
  }
}

async function testSemanticSearch() {
  console.log('🔍 Testing semantic search...');
  
  try {
    const response = await fetch(`${BASE_URL}/embeddings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What are the user preferences?',
        limit: 5,
        threshold: 0.7,
        include_metadata: true
      })
    });
    
    const searchResult = await response.json();
    
    if (searchResult.results && Array.isArray(searchResult.results)) {
      console.log('✅ Semantic search passed');
      console.log(`   Found: ${searchResult.results.length} results`);
      console.log(`   Search time: ${searchResult.searchTime}ms`);
      return searchResult;
    } else {
      console.log('❌ Semantic search failed:', searchResult);
      return null;
    }
  } catch (error) {
    console.log('❌ Semantic search error:', error.message);
    return null;
  }
}

async function testSimilarEmbeddings() {
  console.log('🔍 Testing similar embeddings...');
  
  try {
    // First generate an embedding
    const embedding = await testEmbeddingGeneration();
    if (!embedding) return null;
    
    const response = await fetch(`${BASE_URL}/embeddings/similar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embedding_id: embedding.id,
        limit: 3,
        threshold: 0.5,
        include_metadata: true
      })
    });
    
    const similarResult = await response.json();
    
    if (similarResult.results && Array.isArray(similarResult.results)) {
      console.log('✅ Similar embeddings search passed');
      console.log(`   Found: ${similarResult.results.length} similar embeddings`);
      return similarResult;
    } else {
      console.log('❌ Similar embeddings search failed:', similarResult);
      return null;
    }
  } catch (error) {
    console.log('❌ Similar embeddings search error:', error.message);
    return null;
  }
}

async function testClustering() {
  console.log('🔍 Testing embedding clustering...');
  
  try {
    // Generate multiple embeddings first
    const embeddings = await testBatchEmbeddingGeneration();
    if (!embeddings || embeddings.length < 3) {
      console.log('❌ Not enough embeddings for clustering test');
      return null;
    }
    
    const embeddingIds = embeddings.map(e => e.id);
    
    const response = await fetch(`${BASE_URL}/embeddings/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embedding_ids: embeddingIds,
        algorithm: 'kmeans',
        num_clusters: 2,
        min_cluster_size: 2
      })
    });
    
    const clusterResult = await response.json();
    
    if (clusterResult.clusters && Array.isArray(clusterResult.clusters)) {
      console.log('✅ Embedding clustering passed');
      console.log(`   Created: ${clusterResult.clusters.length} clusters`);
      console.log(`   Algorithm: ${clusterResult.algorithm}`);
      return clusterResult;
    } else {
      console.log('❌ Embedding clustering failed:', clusterResult);
      return null;
    }
  } catch (error) {
    console.log('❌ Embedding clustering error:', error.message);
    return null;
  }
}

async function testModelManagement() {
  console.log('🔍 Testing model management...');
  
  try {
    // Test list models
    const modelsResponse = await fetch(`${BASE_URL}/embeddings/models`);
    const models = await modelsResponse.json();
    
    if (models.openai && models.local) {
      console.log('✅ Model listing passed');
      console.log(`   OpenAI models: ${models.openai.models.length}`);
      console.log(`   Local models: ${models.local.models.length}`);
    } else {
      console.log('❌ Model listing failed:', models);
      return false;
    }
    
    // Test model status
    const statusResponse = await fetch(`${BASE_URL}/embeddings/models/status`);
    const status = await statusResponse.json();
    
    if (status.currentProvider && status.providers) {
      console.log('✅ Model status check passed');
      console.log(`   Current provider: ${status.currentProvider}`);
      return true;
    } else {
      console.log('❌ Model status check failed:', status);
      return false;
    }
  } catch (error) {
    console.log('❌ Model management error:', error.message);
    return false;
  }
}

async function testMetrics() {
  console.log('🔍 Testing metrics endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/metrics`);
    const metrics = await response.json();
    
    if (metrics.counters && metrics.operations) {
      console.log('✅ Metrics endpoint passed');
      console.log(`   Total operations: ${metrics.counters.totalOperations}`);
      console.log(`   Embeddings generated: ${metrics.counters.embeddingsGenerated}`);
      console.log(`   Cache hit rate: ${metrics.counters.cacheHitRate}`);
      return true;
    } else {
      console.log('❌ Metrics endpoint failed:', metrics);
      return false;
    }
  } catch (error) {
    console.log('❌ Metrics endpoint error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Vector Embedding Service Tests');
  console.log('==========================================');
  console.log('');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Embedding Generation', fn: testEmbeddingGeneration },
    { name: 'Batch Embedding Generation', fn: testBatchEmbeddingGeneration },
    { name: 'Semantic Search', fn: testSemanticSearch },
    { name: 'Similar Embeddings', fn: testSimilarEmbeddings },
    { name: 'Embedding Clustering', fn: testClustering },
    { name: 'Model Management', fn: testModelManagement },
    { name: 'Metrics', fn: testMetrics }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result !== false && result !== null) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
    console.log('');
  }
  
  console.log('📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('');
    console.log('🎉 All tests passed! Vector Embedding Service is working correctly.');
  } else {
    console.log('');
    console.log('⚠️  Some tests failed. Check the service configuration and try again.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export {
  testHealthCheck,
  testEmbeddingGeneration,
  testBatchEmbeddingGeneration,
  testSemanticSearch,
  testSimilarEmbeddings,
  testClustering,
  testModelManagement,
  testMetrics,
  runAllTests
};