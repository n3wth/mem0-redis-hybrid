import redis
import json
import hashlib
import pickle
from typing import Optional, List
from config.settings import settings

class CacheManager:
    def __init__(self):
        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=False)
            self.redis_client.ping()
            self.available = True
        except:
            self.redis_client = None
            self.available = False

    def _generate_key(self, text: str, model: str) -> str:
        """Generate cache key from text and model"""
        content = f"{text}:{model}"
        return f"embedding:{hashlib.md5(content.encode()).hexdigest()}"

    def get_embedding(self, text: str, model: str) -> Optional[List[float]]:
        """Get cached embedding"""
        if not self.available:
            return None

        try:
            key = self._generate_key(text, model)
            cached = self.redis_client.get(key)
            if cached:
                return pickle.loads(cached)
        except:
            pass
        return None

    def set_embedding(self, text: str, model: str, embedding: List[float]):
        """Cache embedding"""
        if not self.available:
            return

        try:
            key = self._generate_key(text, model)
            self.redis_client.setex(
                key,
                settings.cache_ttl,
                pickle.dumps(embedding)
            )
        except:
            pass

    def get_batch_embeddings(self, texts: List[str], model: str) -> List[Optional[List[float]]]:
        """Get batch of cached embeddings"""
        if not self.available:
            return [None] * len(texts)

        try:
            keys = [self._generate_key(text, model) for text in texts]
            cached_values = self.redis_client.mget(keys)

            results = []
            for value in cached_values:
                if value:
                    results.append(pickle.loads(value))
                else:
                    results.append(None)
            return results
        except:
            return [None] * len(texts)

    def set_batch_embeddings(self, texts: List[str], model: str, embeddings: List[List[float]]):
        """Cache batch of embeddings"""
        if not self.available:
            return

        try:
            pipe = self.redis_client.pipeline()
            for text, embedding in zip(texts, embeddings):
                key = self._generate_key(text, model)
                pipe.setex(key, settings.cache_ttl, pickle.dumps(embedding))
            pipe.execute()
        except:
            pass

cache_manager = CacheManager()