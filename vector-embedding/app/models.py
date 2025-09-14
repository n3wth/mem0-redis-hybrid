from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class EmbeddingRequest(BaseModel):
    text: str
    model: Optional[str] = None

class BatchEmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    model: Optional[str] = None
    top_k: int = 10
    threshold: Optional[float] = None

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model: str
    dimension: int

class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimension: int
    count: int

class SearchResult(BaseModel):
    text: str
    score: float
    index: int
    metadata: Optional[Dict[str, Any]] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    model: str
    total_results: int

class ModelInfo(BaseModel):
    name: str
    type: str  # "openai" or "local"
    dimension: int
    available: bool

class ModelsResponse(BaseModel):
    models: List[ModelInfo]
    default_openai: str
    default_local: str