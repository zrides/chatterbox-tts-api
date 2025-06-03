"""
Response models for API validation
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Health check response model"""
    
    status: str
    model_loaded: bool
    device: str
    config: Dict[str, Any]
    memory_info: Optional[Dict[str, float]] = None


class ModelInfo(BaseModel):
    """Individual model information"""
    
    id: str
    object: str
    created: int
    owned_by: str


class ModelsResponse(BaseModel):
    """Models listing response"""
    
    object: str
    data: List[ModelInfo]


class ConfigResponse(BaseModel):
    """Configuration response model"""
    
    server: Dict[str, Any]
    model: Dict[str, Any]
    defaults: Dict[str, Any]
    memory_management: Dict[str, Any]


class ErrorResponse(BaseModel):
    """Error response model"""
    
    error: Dict[str, str] 