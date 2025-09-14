import { Client } from '@elastic/elasticsearch';

export class ElasticsearchClient {
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      requestTimeout: 30000,
      maxRetries: 3
    });
  }

  async initialize() {
    try {
      await this.client.ping();
      console.log('Elasticsearch connection established');
      await this.createIndices();
    } catch (error) {
      console.error('Elasticsearch connection failed:', error);
      throw error;
    }
  }

  async createIndices() {
    const indices = [
      {
        index: 'recall-documents',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              content: {
                type: 'text',
                analyzer: 'standard'
              },
              summary: { type: 'text' },
              tags: { type: 'keyword' },
              category: { type: 'keyword' },
              source: { type: 'keyword' },
              author: { type: 'keyword' },
              embedding: {
                type: 'dense_vector',
                dims: 384
              },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
              importance_score: { type: 'float' },
              access_count: { type: 'integer' },
              user_rating: { type: 'float' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                custom_text: {
                  type: 'standard',
                  stopwords: '_english_'
                }
              }
            }
          }
        }
      }
    ];

    for (const indexConfig of indices) {
      try {
        const exists = await this.client.indices.exists({ index: indexConfig.index });
        if (!exists) {
          await this.client.indices.create(indexConfig);
          console.log(`Created index: ${indexConfig.index}`);
        }
      } catch (error) {
        console.error(`Error creating index ${indexConfig.index}:`, error);
      }
    }
  }

  async search(params) {
    return await this.client.search(params);
  }

  async index(params) {
    return await this.client.index(params);
  }

  async bulk(params) {
    return await this.client.bulk(params);
  }

  async suggest(params) {
    return await this.client.search(params);
  }

  async aggregate(params) {
    return await this.client.search(params);
  }
}

export default new ElasticsearchClient();