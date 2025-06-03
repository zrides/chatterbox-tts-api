"""
Configuration endpoint
"""

from fastapi import APIRouter

from app.models import ConfigResponse
from app.config import Config
from app.core.tts_model import get_device

router = APIRouter()


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