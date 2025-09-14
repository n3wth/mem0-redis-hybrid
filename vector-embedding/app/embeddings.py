import asyncio
import numpy as np
from typing import List, Optional
from openai import AsyncOpenAI
from sentence_transformers import SentenceTransformer
from tenacity import retry, stop_after_attempt, wait_exponential
from config.settings import settings
from app.cache import cache_manager

class EmbeddingService:
    def __init__(self):
        self.openai_client = None
        self.local_model = None
        self.local_model_name = None

        # Initialize OpenAI client if API key available
        if settings.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

        # Load local model on first use (lazy loading)

    async def _load_local_model(self):
        """Lazy load local model"""
        if self.local_model is None:
            try:
                self.local_model = SentenceTransformer(settings.embedding_model_local)
                self.local_model_name = settings.embedding_model_local
            except Exception as e:
                print(f"Failed to load local model: {e}")
                self.local_model = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def _get_openai_embedding(self, text: str, model: str = None) -> List[float]:
        """Get embedding from OpenAI API"""
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")

        model = model or settings.embedding_model_openai

        try:
            response = await self.openai_client.embeddings.create(
                input=text,
                model=model
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"OpenAI embedding failed: {e}")
            raise

    async def _get_local_embedding(self, text: str) -> List[float]:
        """Get embedding from local model"""
        await self._load_local_model()

        if self.local_model is None:
            raise ValueError("Local model not available")

        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                lambda: self.local_model.encode([text])[0]
            )
            return embedding.tolist()
        except Exception as e:
            print(f"Local embedding failed: {e}")
            raise

    async def get_embedding(self, text: str, model: str = None, use_cache: bool = True) -> tuple[List[float], str]:
        """Get embedding with fallback strategy"""
        # Determine model type and name
        if model and model.startswith("text-embedding"):
            model_type = "openai"
            model_name = model
        elif model:
            model_type = "local"
            model_name = model
        else:
            # Default: try OpenAI first, fallback to local
            model_type = "openai" if self.openai_client else "local"
            model_name = settings.embedding_model_openai if model_type == "openai" else settings.embedding_model_local

        # Check cache first
        if use_cache:
            cached = cache_manager.get_embedding(text, model_name)
            if cached:
                return cached, model_name

        try:
            if model_type == "openai":
                embedding = await self._get_openai_embedding(text, model_name)
            else:
                embedding = await self._get_local_embedding(text)

            # Cache the result
            if use_cache:
                cache_manager.set_embedding(text, model_name, embedding)

            return embedding, model_name

        except Exception as e:
            # Fallback strategy
            if model_type == "openai" and self.local_model is not None:
                print(f"OpenAI failed, falling back to local model: {e}")
                try:
                    embedding = await self._get_local_embedding(text)
                    fallback_model = settings.embedding_model_local

                    if use_cache:
                        cache_manager.set_embedding(text, fallback_model, embedding)

                    return embedding, fallback_model
                except:
                    pass

            raise ValueError(f"All embedding methods failed: {e}")

    async def get_batch_embeddings(self, texts: List[str], model: str = None, use_cache: bool = True) -> tuple[List[List[float]], str]:
        """Get batch embeddings efficiently"""
        if len(texts) > settings.max_batch_size:
            raise ValueError(f"Batch size {len(texts)} exceeds limit {settings.max_batch_size}")

        # Determine model
        if model and model.startswith("text-embedding"):
            model_type = "openai"
            model_name = model
        elif model:
            model_type = "local"
            model_name = model
        else:
            model_type = "openai" if self.openai_client else "local"
            model_name = settings.embedding_model_openai if model_type == "openai" else settings.embedding_model_local

        embeddings = []

        # Check cache for all texts
        if use_cache:
            cached_embeddings = cache_manager.get_batch_embeddings(texts, model_name)
            uncached_indices = []
            uncached_texts = []

            for i, (text, cached) in enumerate(zip(texts, cached_embeddings)):
                if cached:
                    embeddings.append(cached)
                else:
                    embeddings.append(None)
                    uncached_indices.append(i)
                    uncached_texts.append(text)
        else:
            uncached_indices = list(range(len(texts)))
            uncached_texts = texts
            embeddings = [None] * len(texts)

        # Process uncached texts
        if uncached_texts:
            try:
                if model_type == "openai" and self.openai_client:
                    # Batch API call to OpenAI
                    response = await self.openai_client.embeddings.create(
                        input=uncached_texts,
                        model=model_name
                    )
                    new_embeddings = [data.embedding for data in response.data]
                else:
                    # Local model batch processing
                    await self._load_local_model()
                    if self.local_model is None:
                        raise ValueError("Local model not available")

                    loop = asyncio.get_event_loop()
                    batch_result = await loop.run_in_executor(
                        None,
                        lambda: self.local_model.encode(uncached_texts)
                    )
                    new_embeddings = [emb.tolist() for emb in batch_result]

                # Update results and cache
                for idx, new_emb in zip(uncached_indices, new_embeddings):
                    embeddings[idx] = new_emb

                if use_cache and new_embeddings:
                    cache_manager.set_batch_embeddings(uncached_texts, model_name, new_embeddings)

            except Exception as e:
                # Fallback strategy for batch
                if model_type == "openai":
                    print(f"OpenAI batch failed, falling back to local: {e}")
                    try:
                        await self._load_local_model()
                        if self.local_model:
                            loop = asyncio.get_event_loop()
                            batch_result = await loop.run_in_executor(
                                None,
                                lambda: self.local_model.encode(uncached_texts)
                            )
                            new_embeddings = [emb.tolist() for emb in batch_result]

                            for idx, new_emb in zip(uncached_indices, new_embeddings):
                                embeddings[idx] = new_emb

                            model_name = settings.embedding_model_local

                            if use_cache:
                                cache_manager.set_batch_embeddings(uncached_texts, model_name, new_embeddings)
                        else:
                            raise ValueError("Local model fallback failed")
                    except Exception as fallback_error:
                        raise ValueError(f"All batch embedding methods failed: {e}, {fallback_error}")
                else:
                    raise ValueError(f"Batch embedding failed: {e}")

        return embeddings, model_name

    def get_available_models(self) -> List[dict]:
        """Get list of available models"""
        models = []

        # OpenAI models
        if self.openai_client:
            models.extend([
                {
                    "name": "text-embedding-3-small",
                    "type": "openai",
                    "dimension": 1536,
                    "available": True
                },
                {
                    "name": "text-embedding-3-large",
                    "type": "openai",
                    "dimension": 3072,
                    "available": True
                },
                {
                    "name": "text-embedding-ada-002",
                    "type": "openai",
                    "dimension": 1536,
                    "available": True
                }
            ])

        # Local models
        models.extend([
            {
                "name": "all-MiniLM-L6-v2",
                "type": "local",
                "dimension": 384,
                "available": True
            },
            {
                "name": "all-mpnet-base-v2",
                "type": "local",
                "dimension": 768,
                "available": True
            }
        ])

        return models

embedding_service = EmbeddingService()