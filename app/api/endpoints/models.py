"""
Model listing endpoints (OpenAI compatibility)
"""

from fastapi import APIRouter

from app.models import ModelsResponse, ModelInfo

router = APIRouter()


@router.get(
    "/v1/models",
    response_model=ModelsResponse,
    summary="List models",
    description="List available models (OpenAI API compatibility)"
)
@router.get("/models", response_model=ModelsResponse, include_in_schema=False)  # Legacy endpoint
async def list_models():
    """List available models (OpenAI API compatibility)"""
    return ModelsResponse(
        object="list",
        data=[
            ModelInfo(
                id="chatterbox-tts-1",
                object="model", 
                created=1677649963,
                owned_by="resemble-ai"
            )
        ]
    ) 