from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import List, Dict, Any

from app.models import (
    EmbeddingRequest, BatchEmbeddingRequest, SearchRequest,
    EmbeddingResponse, BatchEmbeddingResponse, SearchResponse,
    ModelsResponse, ModelInfo, SearchResult
)
from app.embeddings import embedding_service
from app.vector_search import vector_search
from config.settings import settings

app = FastAPI(
    title="Vector Embedding Service",
    description="High-performance vector embeddings and semantic search API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "service": "Vector Embedding Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/embeddings/generate",
            "/embeddings/search",
            "/embeddings/batch",
            "/embeddings/models"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_available": embedding_service.openai_client is not None,
        "cache_available": embedding_service.cache_manager.available if hasattr(embedding_service, 'cache_manager') else False,
        "vector_stats": vector_search.get_stats()
    }

@app.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for a single text"""
    try:
        embedding, model_used = await embedding_service.get_embedding(
            request.text,
            request.model
        )

        return EmbeddingResponse(
            embedding=embedding,
            model=model_used,
            dimension=len(embedding)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

@app.post("/embeddings/batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """Generate embeddings for multiple texts"""
    if len(request.texts) > settings.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size {len(request.texts)} exceeds limit {settings.max_batch_size}"
        )

    try:
        embeddings, model_used = await embedding_service.get_batch_embeddings(
            request.texts,
            request.model
        )

        return BatchEmbeddingResponse(
            embeddings=embeddings,
            model=model_used,
            dimension=len(embeddings[0]) if embeddings else 0,
            count=len(embeddings)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch embedding generation failed: {str(e)}")

@app.post("/embeddings/search", response_model=SearchResponse)
async def search_vectors(request: SearchRequest):
    """Search for similar vectors"""
    try:
        # Generate embedding for query
        query_embedding, model_used = await embedding_service.get_embedding(
            request.query,
            request.model
        )

        # Search in vector index
        results = vector_search.search(
            query_embedding,
            request.top_k,
            request.threshold
        )

        # Convert to response format
        search_results = [
            SearchResult(
                text=result["text"],
                score=result["score"],
                index=result["index"],
                metadata=result.get("metadata")
            )
            for result in results
        ]

        return SearchResponse(
            results=search_results,
            query=request.query,
            model=model_used,
            total_results=len(search_results)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {str(e)}")

@app.get("/embeddings/models", response_model=ModelsResponse)
async def get_available_models():
    """Get list of available embedding models"""
    try:
        models = embedding_service.get_available_models()

        model_info = [
            ModelInfo(
                name=model["name"],
                type=model["type"],
                dimension=model["dimension"],
                available=model["available"]
            )
            for model in models
        ]

        return ModelsResponse(
            models=model_info,
            default_openai=settings.embedding_model_openai,
            default_local=settings.embedding_model_local
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

@app.post("/vectors/add")
async def add_vectors_to_index(
    texts: List[str],
    metadata: List[Dict[str, Any]] = None,
    model: str = None
):
    """Add texts to vector search index"""
    try:
        # Generate embeddings
        embeddings, model_used = await embedding_service.get_batch_embeddings(texts, model)

        # Add to vector search
        vector_search.add_vectors(embeddings, texts, metadata)

        return {
            "message": f"Added {len(texts)} vectors to index",
            "model_used": model_used,
            "total_vectors": vector_search.get_stats()["total_vectors"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add vectors: {str(e)}")

@app.post("/vectors/cluster")
async def cluster_vectors(n_clusters: int = 10):
    """Perform clustering on stored vectors"""
    try:
        results = vector_search.cluster_vectors(n_clusters)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")

@app.get("/vectors/similar-pairs")
async def get_similar_pairs(threshold: float = 0.8):
    """Find similar vector pairs"""
    try:
        pairs = vector_search.get_similar_pairs(threshold)
        return {
            "similar_pairs": pairs,
            "count": len(pairs),
            "threshold": threshold
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar pairs search failed: {str(e)}")

@app.get("/vectors/stats")
async def get_vector_stats():
    """Get vector index statistics"""
    return vector_search.get_stats()

@app.post("/vectors/save")
async def save_vector_index():
    """Save vector index to disk"""
    try:
        vector_search.save_index()
        return {"message": "Vector index saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save index: {str(e)}")

@app.post("/vectors/clear")
async def clear_vector_index():
    """Clear all vectors from index"""
    try:
        vector_search.clear_index()
        return {"message": "Vector index cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear index: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )