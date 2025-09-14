import faiss
import numpy as np
import pickle
import os
from typing import List, Tuple, Optional, Dict, Any
from sklearn.cluster import KMeans
from config.settings import settings

class VectorSearchEngine:
    def __init__(self):
        self.index = None
        self.texts = []
        self.metadata = []
        self.dimension = settings.vector_dimension
        self.index_path = settings.faiss_index_path

        # Initialize FAISS index
        self._initialize_index()

    def _initialize_index(self):
        """Initialize or load FAISS index"""
        if os.path.exists(self.index_path):
            self.load_index()
        else:
            # Create new index with Inner Product (for cosine similarity with normalized vectors)
            self.index = faiss.IndexFlatIP(self.dimension)

    def add_vectors(self, embeddings: List[List[float]], texts: List[str], metadata: Optional[List[Dict[str, Any]]] = None):
        """Add vectors to the index"""
        if not embeddings or not texts:
            return

        if len(embeddings) != len(texts):
            raise ValueError("Number of embeddings must match number of texts")

        # Convert to numpy and normalize for cosine similarity
        vectors = np.array(embeddings).astype('float32')

        # Normalize vectors for cosine similarity
        faiss.normalize_L2(vectors)

        # Add to FAISS index
        self.index.add(vectors)

        # Store texts and metadata
        self.texts.extend(texts)
        if metadata:
            self.metadata.extend(metadata)
        else:
            self.metadata.extend([{} for _ in texts])

    def search(self, query_embedding: List[float], top_k: int = 10, threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """Search for similar vectors"""
        if self.index.ntotal == 0:
            return []

        # Normalize query vector
        query_vector = np.array([query_embedding]).astype('float32')
        faiss.normalize_L2(query_vector)

        # Search
        scores, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))

        # Format results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for invalid indices
                continue

            if threshold is not None and score < threshold:
                continue

            results.append({
                "text": self.texts[idx],
                "score": float(score),
                "index": int(idx),
                "metadata": self.metadata[idx] if idx < len(self.metadata) else {}
            })

        return results

    def batch_search(self, query_embeddings: List[List[float]], top_k: int = 10) -> List[List[Dict[str, Any]]]:
        """Batch search for multiple queries"""
        if self.index.ntotal == 0:
            return [[] for _ in query_embeddings]

        # Normalize query vectors
        query_vectors = np.array(query_embeddings).astype('float32')
        faiss.normalize_L2(query_vectors)

        # Batch search
        scores, indices = self.index.search(query_vectors, min(top_k, self.index.ntotal))

        # Format results
        all_results = []
        for query_scores, query_indices in zip(scores, indices):
            results = []
            for score, idx in zip(query_scores, query_indices):
                if idx == -1:
                    continue

                results.append({
                    "text": self.texts[idx],
                    "score": float(score),
                    "index": int(idx),
                    "metadata": self.metadata[idx] if idx < len(self.metadata) else {}
                })
            all_results.append(results)

        return all_results

    def cluster_vectors(self, n_clusters: int = 10) -> Dict[str, Any]:
        """Perform K-means clustering on stored vectors"""
        if self.index.ntotal == 0:
            return {"clusters": [], "centroids": []}

        # Get all vectors from index
        vectors = self.index.reconstruct_n(0, self.index.ntotal)

        # Perform clustering
        kmeans = KMeans(n_clusters=min(n_clusters, self.index.ntotal), random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(vectors)

        # Group texts by cluster
        clusters = {}
        for i, label in enumerate(cluster_labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append({
                "text": self.texts[i],
                "index": i,
                "metadata": self.metadata[i] if i < len(self.metadata) else {}
            })

        return {
            "clusters": [{"id": k, "items": v} for k, v in clusters.items()],
            "centroids": kmeans.cluster_centers_.tolist(),
            "n_clusters": len(clusters)
        }

    def get_similar_pairs(self, threshold: float = 0.8) -> List[Tuple[int, int, float]]:
        """Find pairs of similar vectors above threshold"""
        if self.index.ntotal < 2:
            return []

        similar_pairs = []

        # Search each vector against all others
        for i in range(self.index.ntotal):
            vector = self.index.reconstruct(i).reshape(1, -1)
            faiss.normalize_L2(vector)

            scores, indices = self.index.search(vector, min(10, self.index.ntotal))

            for score, idx in zip(scores[0], indices[0]):
                if idx > i and score >= threshold:  # Avoid duplicates and self-matches
                    similar_pairs.append((i, int(idx), float(score)))

        return similar_pairs

    def save_index(self, path: Optional[str] = None):
        """Save FAISS index and metadata to disk"""
        save_path = path or self.index_path

        # Save FAISS index
        faiss.write_index(self.index, save_path)

        # Save metadata
        metadata_path = save_path + ".metadata"
        with open(metadata_path, 'wb') as f:
            pickle.dump({
                'texts': self.texts,
                'metadata': self.metadata,
                'dimension': self.dimension
            }, f)

    def load_index(self, path: Optional[str] = None):
        """Load FAISS index and metadata from disk"""
        load_path = path or self.index_path
        metadata_path = load_path + ".metadata"

        try:
            # Load FAISS index
            self.index = faiss.read_index(load_path)

            # Load metadata
            if os.path.exists(metadata_path):
                with open(metadata_path, 'rb') as f:
                    data = pickle.load(f)
                    self.texts = data.get('texts', [])
                    self.metadata = data.get('metadata', [])
                    self.dimension = data.get('dimension', self.dimension)
        except Exception as e:
            print(f"Failed to load index: {e}")
            # Create new index if loading fails
            self.index = faiss.IndexFlatIP(self.dimension)
            self.texts = []
            self.metadata = []

    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "dimension": self.dimension,
            "index_type": type(self.index).__name__ if self.index else "None",
            "memory_usage_mb": self.index.ntotal * self.dimension * 4 / (1024 * 1024) if self.index else 0
        }

    def clear_index(self):
        """Clear all vectors from index"""
        self.index = faiss.IndexFlatIP(self.dimension)
        self.texts = []
        self.metadata = []

# Global instance
vector_search = VectorSearchEngine()