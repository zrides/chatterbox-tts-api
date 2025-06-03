"""
Request models for API validation
"""

from typing import Optional
from pydantic import BaseModel, Field, validator


class TTSRequest(BaseModel):
    """Text-to-speech request model"""
    
    input: str = Field(..., description="The text to generate audio for", min_length=1, max_length=3000)
    voice: Optional[str] = Field("alloy", description="Voice to use (ignored - uses voice sample)")
    response_format: Optional[str] = Field("wav", description="Audio format (always returns WAV)")
    speed: Optional[float] = Field(1.0, description="Speed of speech (ignored)")
    
    # Custom TTS parameters
    exaggeration: Optional[float] = Field(None, description="Emotion intensity", ge=0.25, le=2.0)
    cfg_weight: Optional[float] = Field(None, description="Pace control", ge=0.0, le=1.0)
    temperature: Optional[float] = Field(None, description="Sampling temperature", ge=0.05, le=5.0)
    
    @validator('input')
    def validate_input(cls, v):
        if not v or not v.strip():
            raise ValueError('Input text cannot be empty')
        return v.strip() 