#!/usr/bin/env python3
"""
Quick test client for the Vector Embedding Service
"""
import asyncio
import httpx
import json
from typing import List

BASE_URL = "http://localhost:8000"

async def test_service():
    """Test all endpoints of the vector embedding service"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        print("🚀 Testing Vector Embedding Service")
        print("=" * 50)

        # Test health check
        print("\n1. Health Check")
        try:
            response = await client.get(f"{BASE_URL}/health")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")

        # Test available models
        print("\n2. Available Models")
        try:
            response = await client.get(f"{BASE_URL}/embeddings/models")
            models_data = response.json()
            print(f"Status: {response.status_code}")
            print(f"Available models: {len(models_data['models'])}")
            for model in models_data['models']:
                print(f"  - {model['name']} ({model['type']}, {model['dimension']}D)")
        except Exception as e:
            print(f"Error: {e}")

        # Test single embedding
        print("\n3. Single Embedding Generation")
        try:
            test_text = "This is a test sentence for embedding generation."
            response = await client.post(f"{BASE_URL}/embeddings/generate",
                json={"text": test_text})

            if response.status_code == 200:
                data = response.json()
                print(f"Status: {response.status_code}")
                print(f"Model used: {data['model']}")
                print(f"Dimension: {data['dimension']}")
                print(f"Embedding preview: {data['embedding'][:5]}...")
            else:
                print(f"Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

        # Test batch embedding
        print("\n4. Batch Embedding Generation")
        try:
            test_texts = [
                "Machine learning is fascinating.",
                "Natural language processing enables understanding.",
                "Vector embeddings capture semantic meaning.",
                "FAISS provides efficient similarity search."
            ]

            response = await client.post(f"{BASE_URL}/embeddings/batch",
                json={"texts": test_texts})

            if response.status_code == 200:
                data = response.json()
                print(f"Status: {response.status_code}")
                print(f"Model used: {data['model']}")
                print(f"Generated {data['count']} embeddings")
                print(f"Dimension: {data['dimension']}")

                # Add vectors to search index for testing
                print("\n5. Adding Vectors to Index")
                response = await client.post(f"{BASE_URL}/vectors/add",
                    json={"texts": test_texts})
                if response.status_code == 200:
                    add_data = response.json()
                    print(f"Added vectors: {add_data['message']}")
                    print(f"Total vectors in index: {add_data['total_vectors']}")
            else:
                print(f"Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

        # Test vector search
        print("\n6. Vector Search")
        try:
            search_query = "artificial intelligence and machine learning"
            response = await client.post(f"{BASE_URL}/embeddings/search",
                json={
                    "query": search_query,
                    "top_k": 3
                })

            if response.status_code == 200:
                data = response.json()
                print(f"Status: {response.status_code}")
                print(f"Query: {data['query']}")
                print(f"Found {data['total_results']} results:")

                for i, result in enumerate(data['results'], 1):
                    print(f"  {i}. Score: {result['score']:.4f}")
                    print(f"     Text: {result['text']}")
            else:
                print(f"Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

        # Test vector statistics
        print("\n7. Vector Index Statistics")
        try:
            response = await client.get(f"{BASE_URL}/vectors/stats")
            if response.status_code == 200:
                stats = response.json()
                print(f"Status: {response.status_code}")
                print(f"Total vectors: {stats['total_vectors']}")
                print(f"Dimension: {stats['dimension']}")
                print(f"Index type: {stats['index_type']}")
                print(f"Memory usage: {stats['memory_usage_mb']:.2f} MB")
        except Exception as e:
            print(f"Error: {e}")

        # Test clustering
        print("\n8. Vector Clustering")
        try:
            response = await client.post(f"{BASE_URL}/vectors/cluster",
                params={"n_clusters": 2})
            if response.status_code == 200:
                cluster_data = response.json()
                print(f"Status: {response.status_code}")
                print(f"Created {cluster_data['n_clusters']} clusters:")
                for cluster in cluster_data['clusters']:
                    print(f"  Cluster {cluster['id']}: {len(cluster['items'])} items")
        except Exception as e:
            print(f"Error: {e}")

        print("\n" + "=" * 50)
        print("✅ Testing completed!")

if __name__ == "__main__":
    asyncio.run(test_service())