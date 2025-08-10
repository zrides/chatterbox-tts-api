"""
Health check and status endpoints
"""

from fastapi import APIRouter

from app.models import HealthResponse
from app.config import Config
from app.core import get_memory_info, add_route_aliases
from app.core.tts_model import (
    get_model, 
    get_device, 
    get_initialization_state,
    get_initialization_progress,
    get_initialization_error,
    is_ready,
    is_initializing
)

# Create router with aliasing support
base_router = APIRouter()
router = add_route_aliases(base_router)


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check API health and model status"
)
async def health_check():
    """Health check endpoint - always responds even during initialization"""
    model = get_model()
    device = get_device()
    init_state = get_initialization_state()
    init_progress = get_initialization_progress()
    init_error = get_initialization_error()
    
    # Determine status based on initialization state
    if init_state == "ready":
        status = "healthy"
    elif init_state == "initializing":
        status = "initializing"
    elif init_state == "error":
        status = "error"
    else:
        status = "starting"
    
    return HealthResponse(
        status=status,
        model_loaded=model is not None,
        device=device or "unknown",
        config={
            "max_chunk_length": Config.MAX_CHUNK_LENGTH,
            "max_total_length": Config.MAX_TOTAL_LENGTH,
            "voice_sample_path": Config.VOICE_SAMPLE_PATH,
            "default_exaggeration": Config.EXAGGERATION,
            "default_cfg_weight": Config.CFG_WEIGHT,
            "default_temperature": Config.TEMPERATURE
        },
        memory_info=get_memory_info(),
        initialization_state=init_state,
        initialization_progress=init_progress,
        initialization_error=init_error
    )


@router.get(
    "/ping",
    summary="Simple connectivity check",
    description="Basic connectivity test - always responds immediately"
)
async def ping():
    """Simple ping endpoint for connectivity testing"""
    return {"status": "ok", "message": "Server is running"}

# Export the base router for the main app to use
__all__ = ["base_router"] 