#!/usr/bin/env python3
"""
MCP Server for r3 Memory System
Provides search and fetch tools for ChatGPT integration via remote MCP
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from mem0 import Memory
import redis.asyncio as redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MEM0_API_KEY = os.getenv("MEM0_API_KEY")
AUTH_TOKEN = os.getenv("MCP_AUTH_TOKEN", "your-secure-token-here")
USER_ID = os.getenv("MCP_USER_ID", "oliver")

# Initialize Redis connection pool
redis_pool = None

# Initialize Mem0
memory = Memory.from_config({
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "temperature": 0
        }
    },
    "version": "v1.1"
}) if MEM0_API_KEY else None


# Pydantic models for MCP protocol
class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: str
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPError(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None


class MCPResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: str
    result: Optional[Any] = None
    error: Optional[MCPError] = None


class SearchParams(BaseModel):
    query: str


class FetchParams(BaseModel):
    id: str


# Helper functions
async def get_redis() -> redis.Redis:
    """Get Redis connection from pool"""
    global redis_pool
    if not redis_pool:
        redis_pool = redis.ConnectionPool.from_url(REDIS_URL)
    return redis.Redis(connection_pool=redis_pool)


async def search_memories(query: str, user_id: str = USER_ID) -> List[Dict]:
    """Search memories using both Redis cache and Mem0"""
    results = []

    try:
        # Try Redis first for cached results
        r = await get_redis()
        cache_key = f"r3:search:{user_id}:{query[:50]}"
        cached = await r.get(cache_key)

        if cached:
            logger.info(f"Cache hit for query: {query}")
            return json.loads(cached)

        # Search in Mem0
        if memory:
            mem_results = memory.search(query, user_id=user_id, limit=10)

            for idx, mem in enumerate(mem_results):
                result = {
                    "id": mem.get("id", f"mem_{idx}"),
                    "title": mem.get("memory", "")[:100],
                    "url": f"https://r3.memory/{mem.get('id', idx)}"
                }
                results.append(result)

            # Cache the results
            await r.setex(cache_key, 300, json.dumps(results))
            logger.info(f"Cached {len(results)} results for query: {query}")

    except Exception as e:
        logger.error(f"Search error: {e}")
        # Return empty results on error
        results = []

    return results


async def fetch_memory(memory_id: str, user_id: str = USER_ID) -> Optional[Dict]:
    """Fetch a specific memory by ID"""
    try:
        # Try Redis cache first
        r = await get_redis()
        cache_key = f"r3:memory:{user_id}:{memory_id}"
        cached = await r.get(cache_key)

        if cached:
            logger.info(f"Cache hit for memory: {memory_id}")
            return json.loads(cached)

        # Fetch from Mem0
        if memory:
            mem = memory.get(memory_id, user_id=user_id)

            if mem:
                result = {
                    "id": memory_id,
                    "title": mem.get("memory", "")[:100],
                    "text": mem.get("memory", ""),
                    "url": f"https://r3.memory/{memory_id}",
                    "metadata": {
                        "source": "r3_memory",
                        "user_id": user_id,
                        "created_at": mem.get("created_at", datetime.now().isoformat())
                    }
                }

                # Cache the result
                await r.setex(cache_key, 600, json.dumps(result))
                logger.info(f"Cached memory: {memory_id}")
                return result

    except Exception as e:
        logger.error(f"Fetch error: {e}")

    return None


# FastAPI app setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle"""
    logger.info("Starting MCP server...")
    yield
    logger.info("Shutting down MCP server...")
    if redis_pool:
        await redis_pool.disconnect()


app = FastAPI(
    title="r3 MCP Server",
    description="MCP server for r3 memory system integration with ChatGPT",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication dependency
async def verify_auth(authorization: Optional[str] = Header(None)):
    """Verify authentication token"""
    if AUTH_TOKEN and AUTH_TOKEN != "your-secure-token-here":
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization")

        token = authorization.replace("Bearer ", "")
        if token != AUTH_TOKEN:
            raise HTTPException(status_code=401, detail="Invalid token")


# MCP SSE endpoint
@app.get("/sse/")
async def mcp_sse_endpoint(request: Request, _: None = Depends(verify_auth)):
    """Server-Sent Events endpoint for MCP protocol"""

    async def event_generator():
        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connection', 'status': 'connected'})}\n\n"

        try:
            async for chunk in request.stream():
                if not chunk:
                    continue

                try:
                    # Parse MCP request
                    data = json.loads(chunk)
                    mcp_request = MCPRequest(**data)

                    # Handle different MCP methods
                    if mcp_request.method == "tools/list":
                        # Return available tools
                        result = {
                            "tools": [
                                {
                                    "name": "search",
                                    "description": "Search r3 memory system",
                                    "inputSchema": {
                                        "type": "object",
                                        "properties": {
                                            "query": {
                                                "type": "string",
                                                "description": "Search query"
                                            }
                                        },
                                        "required": ["query"]
                                    }
                                },
                                {
                                    "name": "fetch",
                                    "description": "Fetch a specific memory by ID",
                                    "inputSchema": {
                                        "type": "object",
                                        "properties": {
                                            "id": {
                                                "type": "string",
                                                "description": "Memory ID"
                                            }
                                        },
                                        "required": ["id"]
                                    }
                                }
                            ]
                        }

                    elif mcp_request.method == "tools/call":
                        tool_name = mcp_request.params.get("name")
                        arguments = mcp_request.params.get("arguments", {})

                        if tool_name == "search":
                            query = arguments.get("query", "")
                            results = await search_memories(query)

                            result = {
                                "content": [
                                    {
                                        "type": "text",
                                        "text": json.dumps({"results": results})
                                    }
                                ]
                            }

                        elif tool_name == "fetch":
                            memory_id = arguments.get("id", "")
                            memory = await fetch_memory(memory_id)

                            if memory:
                                result = {
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": json.dumps(memory)
                                        }
                                    ]
                                }
                            else:
                                result = {
                                    "error": {
                                        "code": -32602,
                                        "message": f"Memory not found: {memory_id}"
                                    }
                                }
                        else:
                            result = {
                                "error": {
                                    "code": -32601,
                                    "message": f"Unknown tool: {tool_name}"
                                }
                            }

                    else:
                        result = {
                            "error": {
                                "code": -32601,
                                "message": f"Method not found: {mcp_request.method}"
                            }
                        }

                    # Send response
                    response = MCPResponse(
                        jsonrpc="2.0",
                        id=mcp_request.id,
                        result=result if "error" not in result else None,
                        error=MCPError(**result["error"]) if "error" in result else None
                    )

                    yield f"data: {response.json()}\n\n"

                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {e}")
                    error_response = MCPResponse(
                        jsonrpc="2.0",
                        id="error",
                        error=MCPError(code=-32700, message="Parse error")
                    )
                    yield f"data: {error_response.json()}\n\n"

                except Exception as e:
                    logger.error(f"Request processing error: {e}")
                    error_response = MCPResponse(
                        jsonrpc="2.0",
                        id="error",
                        error=MCPError(code=-32603, message=str(e))
                    )
                    yield f"data: {error_response.json()}\n\n"

        except asyncio.CancelledError:
            logger.info("Client disconnected")
            raise
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        r = await get_redis()
        await r.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {e}"

    # Check Mem0
    mem0_status = "healthy" if memory else "not configured"

    return {
        "status": "healthy",
        "services": {
            "redis": redis_status,
            "mem0": mem0_status
        },
        "timestamp": datetime.now().isoformat()
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with server info"""
    return {
        "name": "r3 MCP Server",
        "version": "1.0.0",
        "description": "MCP server for r3 memory system",
        "endpoints": {
            "sse": "/sse/",
            "health": "/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)