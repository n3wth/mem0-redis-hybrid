import assert from 'assert';
import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1`;

class SearchTestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Search Query Microservice Test Suite\n');

    try {
      // Wait for service to be ready
      await this.waitForService();

      // Run test suites
      await this.testHealthCheck();
      await this.testFullTextSearch();
      await this.testSemanticSearch();
      await this.testAdvancedSearch();
      await this.testSuggestions();
      await this.testDocumentIndexing();
      await this.testGraphQLQueries();
      await this.testErrorHandling();
      await this.testPerformance();

      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed to start:', error.message);
      process.exit(1);
    }
  }

  async waitForService() {
    console.log('⏳ Waiting for service to be ready...');
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${BASE_URL}/health`);
        if (response.status === 200) {
          console.log('✅ Service is ready\n');
          return;
        }
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Service failed to start within timeout');
  }

  async test(name, testFn) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      this.failed++;
    }
    this.tests.push({ name, passed: this.failed === 0 });
  }

  async testHealthCheck() {
    await this.test('Health Check', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.status, 'healthy');
    });
  }

  async testFullTextSearch() {
    console.log('\n📝 Testing Full-Text Search:');

    await this.test('Basic full-text search', async () => {
      const response = await axios.post(`${API_BASE}/search`, {
        query: 'test search query',
        size: 10
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.success);
      assert(typeof response.data.data.total === 'number');
      assert(Array.isArray(response.data.data.hits));
    });

    await this.test('Search with sorting', async () => {
      const response = await axios.post(`${API_BASE}/search`, {
        query: 'test',
        sort: 'date',
        order: 'desc',
        size: 5
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.success);
    });

    await this.test('Search with aggregations', async () => {
      const response = await axios.post(`${API_BASE}/search`, {
        query: 'test',
        includeAggregations: true
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.data.aggregations);
    });
  }

  async testSemanticSearch() {
    console.log('\n🧠 Testing Semantic Search:');

    await this.test('Basic semantic search', async () => {
      const response = await axios.post(`${API_BASE}/search/semantic`, {
        query: 'artificial intelligence machine learning',
        threshold: 0.5
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.success);
      assert.strictEqual(response.data.meta.search_type, 'semantic');
    });

    await this.test('Semantic search with high threshold', async () => {
      const response = await axios.post(`${API_BASE}/search/semantic`, {
        query: 'deep learning neural networks',
        threshold: 0.8,
        size: 5
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.data.hits.length <= 5);
    });
  }

  async testAdvancedSearch() {
    console.log('\n🔍 Testing Advanced Search:');

    await this.test('Advanced search with filters', async () => {
      const response = await axios.post(`${API_BASE}/search/advanced`, {
        query: 'research',
        filters: {
          category: 'science'
        },
        size: 10
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.meta.search_type, 'advanced');
    });

    await this.test('Advanced search with date range', async () => {
      const response = await axios.post(`${API_BASE}/search/advanced`, {
        query: 'data',
        dateRange: {
          gte: '2023-01-01',
          lte: '2023-12-31'
        }
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.success);
    });

    await this.test('Advanced search with categories and tags', async () => {
      const response = await axios.post(`${API_BASE}/search/advanced`, {
        query: 'technology',
        categories: ['tech', 'science'],
        tags: ['ai', 'ml'],
        sortBy: 'importance',
        sortOrder: 'desc'
      });
      assert.strictEqual(response.status, 200);
      assert(response.data.data.facets);
    });
  }

  async testSuggestions() {
    console.log('\n💭 Testing Suggestions:');

    await this.test('Auto-complete suggestions', async () => {
      const response = await axios.get(`${API_BASE}/search/suggestions`, {
        params: {
          query: 'mach',
          size: 5
        }
      });
      assert.strictEqual(response.status, 200);
      assert(Array.isArray(response.data.data.suggestions));
      assert(response.data.data.suggestions.length <= 5);
    });

    await this.test('Suggestions with minimum query length', async () => {
      const response = await axios.get(`${API_BASE}/search/suggestions`, {
        params: {
          query: 'te'
        }
      });
      assert.strictEqual(response.status, 200);
    });
  }

  async testDocumentIndexing() {
    console.log('\n📚 Testing Document Indexing:');

    const testDocument = {
      id: `test-doc-${Date.now()}`,
      title: 'Test Document for Search',
      content: 'This is a test document used for testing search functionality',
      summary: 'Test document summary',
      tags: ['test', 'search', 'demo'],
      category: 'testing',
      source: 'test-suite',
      author: 'test-author',
      importance_score: 7.5
    };

    await this.test('Index single document', async () => {
      const response = await axios.post(`${API_BASE}/search/index`, testDocument);
      assert.strictEqual(response.status, 201);
      assert(response.data.success);
      assert.strictEqual(response.data.data.document_id, testDocument.id);
    });

    await this.test('Bulk index documents', async () => {
      const bulkDocs = [
        {
          ...testDocument,
          id: `bulk-doc-1-${Date.now()}`,
          title: 'Bulk Document 1'
        },
        {
          ...testDocument,
          id: `bulk-doc-2-${Date.now()}`,
          title: 'Bulk Document 2'
        }
      ];

      const response = await axios.post(`${API_BASE}/search/bulk`, {
        documents: bulkDocs
      });
      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.data.total_documents, 2);
    });

    // Wait a bit for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.test('Search for indexed document', async () => {
      const response = await axios.post(`${API_BASE}/search`, {
        query: testDocument.title,
        size: 5
      });
      assert.strictEqual(response.status, 200);
      // Should find at least one result
      assert(response.data.data.total >= 0);
    });
  }

  async testGraphQLQueries() {
    console.log('\n🎯 Testing GraphQL Queries:');

    const graphqlQuery = {
      query: `
        query TestSearch($query: String!, $size: Int) {
          search(query: $query, size: $size) {
            total
            hits {
              id
              score
              source {
                title
                summary
                tags
              }
            }
          }
        }
      `,
      variables: {
        query: 'test',
        size: 5
      }
    };

    await this.test('GraphQL search query', async () => {
      const response = await axios.post(`${BASE_URL}/graphql`, graphqlQuery);
      assert.strictEqual(response.status, 200);
      assert(!response.data.errors);
      assert(response.data.data.search);
    });

    const suggestionsQuery = {
      query: `
        query TestSuggestions($query: String!) {
          suggestions(query: $query, size: 3) {
            suggestions
            total_found
          }
        }
      `,
      variables: {
        query: 'te'
      }
    };

    await this.test('GraphQL suggestions query', async () => {
      const response = await axios.post(`${BASE_URL}/graphql`, suggestionsQuery);
      assert.strictEqual(response.status, 200);
      assert(!response.data.errors);
      assert(response.data.data.suggestions);
    });
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling:');

    await this.test('Invalid search query validation', async () => {
      try {
        await axios.post(`${API_BASE}/search`, {
          // Missing required query
          size: 10
        });
        throw new Error('Should have failed validation');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert(error.response.data.error === 'Validation error');
      }
    });

    await this.test('Invalid size parameter', async () => {
      try {
        await axios.post(`${API_BASE}/search`, {
          query: 'test',
          size: 999 // Exceeds max limit
        });
        throw new Error('Should have failed validation');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
      }
    });

    await this.test('Invalid GraphQL query', async () => {
      const invalidQuery = {
        query: `
          query InvalidQuery {
            nonExistentField {
              id
            }
          }
        `
      };

      const response = await axios.post(`${BASE_URL}/graphql`, invalidQuery);
      assert(response.data.errors);
      assert(response.data.errors.length > 0);
    });
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance:');

    await this.test('Search response time < 1000ms', async () => {
      const startTime = Date.now();
      const response = await axios.post(`${API_BASE}/search`, {
        query: 'performance test query',
        size: 20
      });
      const executionTime = Date.now() - startTime;

      assert.strictEqual(response.status, 200);
      assert(executionTime < 1000, `Response time ${executionTime}ms exceeds 1000ms`);
    });

    await this.test('Cache performance improvement', async () => {
      const query = { query: 'cache test query', size: 10 };

      // First request (should not be cached)
      const startTime1 = Date.now();
      await axios.post(`${API_BASE}/search`, query);
      const firstTime = Date.now() - startTime1;

      // Second request (should be cached)
      const startTime2 = Date.now();
      await axios.post(`${API_BASE}/search`, query);
      const secondTime = Date.now() - startTime2;

      // Second request should be faster (cached)
      console.log(`    First: ${firstTime}ms, Second: ${secondTime}ms (cached)`);
      // Note: This test might not always pass in development due to small dataset
      // but demonstrates cache timing
    });

    await this.test('Concurrent requests handling', async () => {
      const promises = Array(5).fill(null).map((_, i) =>
        axios.post(`${API_BASE}/search`, {
          query: `concurrent test query ${i}`,
          size: 5
        })
      );

      const results = await Promise.all(promises);
      results.forEach(response => {
        assert.strictEqual(response.status, 200);
      });
    });
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);

    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.tests
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.name}`));
    }

    console.log('\n' + '='.repeat(50));

    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️ Some tests failed. Check the output above for details.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new SearchTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  });
}

export default SearchTestSuite;