#!/usr/bin/env python3
"""
Production runner for Vector Embedding Service
"""
import uvicorn
import os
from config.settings import settings

if __name__ == "__main__":
    # Production configuration
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        workers=int(os.getenv("WORKERS", 4)),
        loop="uvloop",
        http="httptools",
        log_level="info",
        access_log=True
    )