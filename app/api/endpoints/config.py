"""
Configuration endpoint
"""

from fastapi import APIRouter

from app.models import ConfigResponse
from app.config import Config
from app.core.tts_model import get_device
from app.core import add_route_aliases, get_endpoint_info

# Create router with aliasing support
base_router = APIRouter()
router = add_route_aliases(base_router)


@router.get(
    "/config",
    response_model=ConfigResponse,
    summary="Get configuration",
    description="Get current API configuration"
)
async def get_config():
    """Get current configuration"""
    device = get_device()
    
    return ConfigResponse(
        server={
            "host": Config.HOST,
            "port": Config.PORT
        },
        model={
            "device": device or "unknown",
            "voice_sample_path": Config.VOICE_SAMPLE_PATH,
            "model_cache_dir": Config.MODEL_CACHE_DIR
        },
        defaults={
            "exaggeration": Config.EXAGGERATION,
            "cfg_weight": Config.CFG_WEIGHT,
            "temperature": Config.TEMPERATURE,
            "max_chunk_length": Config.MAX_CHUNK_LENGTH,
            "max_total_length": Config.MAX_TOTAL_LENGTH
        },
        memory_management={
            "memory_cleanup_interval": Config.MEMORY_CLEANUP_INTERVAL,
            "cuda_cache_clear_interval": Config.CUDA_CACHE_CLEAR_INTERVAL,
            "enable_memory_monitoring": Config.ENABLE_MEMORY_MONITORING
        }
    )


@router.get(
    "/endpoints",
    summary="List all endpoints",
    description="Get information about all available endpoints and their aliases"
)
async def list_endpoints():
    """List all available endpoints and their aliases"""
    endpoint_info = get_endpoint_info()
    
    # Add some helpful information
    result = {
        **endpoint_info,
        "description": "This API supports multiple endpoint formats for compatibility",
        "usage": {
            "primary_endpoints": "Clean, short paths (recommended for new integrations)",
            "v1_aliases": "OpenAI-compatible paths (for compatibility with existing tools)",
            "example": {
                "primary": "/audio/speech",
                "aliases": ["/v1/audio/speech"],
                "note": "Both paths work identically"
            }
        }
    }
    
    return result

# Export the base router for the main app to use
__all__ = ["base_router"] 