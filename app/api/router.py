"""
Main API router combining all endpoints
"""

from fastapi import APIRouter

from app.api.endpoints import speech, health, models, memory, config

# Create main router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(speech.router, tags=["Text-to-Speech"])
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(models.router, tags=["Models"])
api_router.include_router(memory.router, tags=["Memory Management"])
api_router.include_router(config.router, tags=["Configuration"]) 