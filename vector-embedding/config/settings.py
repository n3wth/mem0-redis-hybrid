import os
from typing import Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    redis_url: str = "redis://localhost:6379/0"
    embedding_model_openai: str = "text-embedding-3-small"
    embedding_model_local: str = "all-MiniLM-L6-v2"
    cache_ttl: int = 86400  # 24 hours
    max_batch_size: int = 100
    vector_dimension: int = 1536
    faiss_index_path: str = "faiss_index.bin"

    class Config:
        env_file = ".env"

settings = Settings()