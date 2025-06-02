import os
import io
import re
import torch
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, validator
import torchaudio as ta
import uvicorn

from chatterbox.tts import ChatterboxTTS

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Global model instance
model = None
DEVICE = None

# Pydantic models for request/response validation
class TTSRequest(BaseModel):
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

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    config: Dict[str, Any]

class ModelInfo(BaseModel):
    id: str
    object: str
    created: int
    owned_by: str

class ModelsResponse(BaseModel):
    object: str
    data: List[ModelInfo]

class ConfigResponse(BaseModel):
    server: Dict[str, Any]
    model: Dict[str, Any]
    defaults: Dict[str, Any]

class ErrorResponse(BaseModel):
    error: Dict[str, str]

class Config:
    # Server settings
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5123))
    
    # TTS Model settings
    EXAGGERATION = float(os.getenv('EXAGGERATION', 0.5))
    CFG_WEIGHT = float(os.getenv('CFG_WEIGHT', 0.5))
    TEMPERATURE = float(os.getenv('TEMPERATURE', 0.8))
    
    # Text processing
    MAX_CHUNK_LENGTH = int(os.getenv('MAX_CHUNK_LENGTH', 280))
    MAX_TOTAL_LENGTH = int(os.getenv('MAX_TOTAL_LENGTH', 3000))
    
    # Voice and model settings
    VOICE_SAMPLE_PATH = os.getenv('VOICE_SAMPLE_PATH', './voice-sample.mp3')
    DEVICE_OVERRIDE = os.getenv('DEVICE', 'auto')
    MODEL_CACHE_DIR = os.getenv('MODEL_CACHE_DIR', './models')
    
    @classmethod
    def validate(cls):
        """Validate configuration values"""
        if not (0.25 <= cls.EXAGGERATION <= 2.0):
            raise ValueError(f"EXAGGERATION must be between 0.25 and 2.0, got {cls.EXAGGERATION}")
        if not (0.0 <= cls.CFG_WEIGHT <= 1.0):
            raise ValueError(f"CFG_WEIGHT must be between 0.0 and 1.0, got {cls.CFG_WEIGHT}")
        if not (0.05 <= cls.TEMPERATURE <= 5.0):
            raise ValueError(f"TEMPERATURE must be between 0.05 and 5.0, got {cls.TEMPERATURE}")
        if cls.MAX_CHUNK_LENGTH <= 0:
            raise ValueError(f"MAX_CHUNK_LENGTH must be positive, got {cls.MAX_CHUNK_LENGTH}")
        if cls.MAX_TOTAL_LENGTH <= 0:
            raise ValueError(f"MAX_TOTAL_LENGTH must be positive, got {cls.MAX_TOTAL_LENGTH}")

def detect_device():
    """Detect the best available device"""
    if Config.DEVICE_OVERRIDE.lower() != 'auto':
        return Config.DEVICE_OVERRIDE.lower()
    
    if torch.cuda.is_available():
        return 'cuda'
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return 'mps'
    else:
        return 'cpu'
    
ascii_art = r"""
  ____ _           _   _            _               
 / ___| |__   __ _| |_| |_ ___ _ __| |__   _____  __
| |   | '_ \ / _` | __| __/ _ \ '__| '_ \ / _ \ \/ /
| |___| | | | (_| | |_| ||  __/ |  | |_) | (_) >  < 
 \____|_| |_|\__,_|\__|\__\___|_|  |_.__/ \___/_/\_\
                                                    
"""

async def initialize_model():
    """Initialize the Chatterbox TTS model"""
    global model, DEVICE
    
    try:
        Config.validate()
        DEVICE = detect_device()
        
        print(f"Initializing Chatterbox TTS model...")
        print(f"Device: {DEVICE}")
        print(f"Voice sample: {Config.VOICE_SAMPLE_PATH}")
        print(f"Model cache: {Config.MODEL_CACHE_DIR}")
        
        # Ensure model cache directory exists
        os.makedirs(Config.MODEL_CACHE_DIR, exist_ok=True)
        
        # Check voice sample exists
        if not os.path.exists(Config.VOICE_SAMPLE_PATH):
            raise FileNotFoundError(f"Voice sample not found: {Config.VOICE_SAMPLE_PATH}")
        
        # Patch torch.load for CPU compatibility if needed
        if DEVICE == 'cpu':
            import torch
            original_load = torch.load
            original_load_file = None
            
            # Try to patch safetensors if available
            try:
                import safetensors.torch
                original_load_file = safetensors.torch.load_file
            except ImportError:
                pass
            
            def force_cpu_torch_load(f, map_location=None, **kwargs):
                # Always force CPU mapping if we're on a CPU device
                return original_load(f, map_location='cpu', **kwargs)
            
            def force_cpu_load_file(filename, device=None):
                # Force CPU for safetensors loading too
                return original_load_file(filename, device='cpu')
            
            torch.load = force_cpu_torch_load
            if original_load_file:
                safetensors.torch.load_file = force_cpu_load_file
        
        # Initialize model with run_in_executor for non-blocking
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(
            None, 
            lambda: ChatterboxTTS.from_pretrained(device=DEVICE)
        )
        
        print(f"✓ Model initialized successfully on {DEVICE}")
        return model
        
    except Exception as e:
        print(f"✗ Failed to initialize model: {e}")
        raise e

def split_text_into_chunks(text: str, max_length: int = None) -> list:
    """Split text into manageable chunks for TTS processing"""
    if max_length is None:
        max_length = Config.MAX_CHUNK_LENGTH
    
    if len(text) <= max_length:
        return [text]
    
    # Try to split at sentence boundaries first
    sentence_endings = ['. ', '! ', '? ', '.\n', '!\n', '?\n']
    chunks = []
    current_chunk = ""
    
    # Split into sentences
    sentences = []
    temp_text = text
    
    while temp_text:
        best_split = len(temp_text)
        best_ending = ""
        
        for ending in sentence_endings:
            pos = temp_text.find(ending)
            if pos != -1 and pos < best_split:
                best_split = pos + len(ending)
                best_ending = ending
        
        if best_split == len(temp_text):
            # No sentence ending found, take the rest
            sentences.append(temp_text)
            break
        else:
            sentences.append(temp_text[:best_split])
            temp_text = temp_text[best_split:]
    
    # Group sentences into chunks
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += (" " if current_chunk else "") + sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            
            # If single sentence is too long, split it further
            if len(sentence) > max_length:
                # Split at commas, semicolons, etc.
                sub_delimiters = [', ', '; ', ' - ', ' — ']
                sub_chunks = [sentence]
                
                for delimiter in sub_delimiters:
                    new_sub_chunks = []
                    for chunk in sub_chunks:
                        if len(chunk) <= max_length:
                            new_sub_chunks.append(chunk)
                        else:
                            parts = chunk.split(delimiter)
                            current_part = ""
                            for part in parts:
                                if len(current_part) + len(delimiter) + len(part) <= max_length:
                                    current_part += (delimiter if current_part else "") + part
                                else:
                                    if current_part:
                                        new_sub_chunks.append(current_part)
                                    current_part = part
                            if current_part:
                                new_sub_chunks.append(current_part)
                    sub_chunks = new_sub_chunks
                
                # Add sub-chunks
                for sub_chunk in sub_chunks:
                    if len(sub_chunk) <= max_length:
                        chunks.append(sub_chunk.strip())
                    else:
                        # Last resort: split by words
                        words = sub_chunk.split()
                        current_word_chunk = ""
                        for word in words:
                            if len(current_word_chunk) + len(word) + 1 <= max_length:
                                current_word_chunk += (" " if current_word_chunk else "") + word
                            else:
                                if current_word_chunk:
                                    chunks.append(current_word_chunk)
                                current_word_chunk = word
                        if current_word_chunk:
                            chunks.append(current_word_chunk)
                current_chunk = ""
            else:
                current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # Filter out empty chunks
    chunks = [chunk for chunk in chunks if chunk.strip()]
    
    return chunks

def concatenate_audio_chunks(audio_chunks: list, sample_rate: int) -> torch.Tensor:
    """Concatenate multiple audio tensors"""
    if len(audio_chunks) == 1:
        return audio_chunks[0]
    
    # Add small silence between chunks (0.1 seconds)
    silence_samples = int(0.1 * sample_rate)
    silence = torch.zeros(1, silence_samples)
    
    concatenated = audio_chunks[0]
    for chunk in audio_chunks[1:]:
        concatenated = torch.cat([concatenated, silence, chunk], dim=1)
    
    return concatenated

# Application lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(ascii_art)
    await initialize_model()
    yield
    # Shutdown (cleanup if needed)
    pass

# Create FastAPI app
app = FastAPI(
    title="Chatterbox TTS API",
    description="REST API for Chatterbox TTS with OpenAI-compatible endpoints",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

@app.post(
    "/v1/audio/speech",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"audio/wav": {}}},
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Generate speech from text",
    description="Generate speech audio from input text using voice cloning"
)
@app.post("/audio/speech", include_in_schema=False)  # Legacy endpoint
async def text_to_speech(request: TTSRequest):
    """Generate speech from text using Chatterbox TTS"""
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"message": "Model not loaded", "type": "model_error"}}
        )
    
    # Validate total text length
    if len(request.input) > Config.MAX_TOTAL_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": f"Input text too long. Maximum {Config.MAX_TOTAL_LENGTH} characters allowed.",
                    "type": "invalid_request_error"
                }
            }
        )
    
    try:
        # Get parameters with defaults
        exaggeration = request.exaggeration if request.exaggeration is not None else Config.EXAGGERATION
        cfg_weight = request.cfg_weight if request.cfg_weight is not None else Config.CFG_WEIGHT
        temperature = request.temperature if request.temperature is not None else Config.TEMPERATURE
        
        # Split text into chunks
        chunks = split_text_into_chunks(request.input, Config.MAX_CHUNK_LENGTH)
        
        print(f"Processing {len(chunks)} text chunks with parameters:")
        print(f"  - Exaggeration: {exaggeration}")
        print(f"  - CFG Weight: {cfg_weight}")
        print(f"  - Temperature: {temperature}")
        
        # Generate audio for each chunk
        audio_chunks = []
        loop = asyncio.get_event_loop()
        
        for i, chunk in enumerate(chunks):
            print(f"Generating audio for chunk {i+1}/{len(chunks)}: '{chunk[:50]}{'...' if len(chunk) > 50 else ''}'")
            
            # Run TTS generation in executor to avoid blocking
            audio_tensor = await loop.run_in_executor(
                None,
                lambda: model.generate(
                    text=chunk,
                    audio_prompt_path=Config.VOICE_SAMPLE_PATH,
                    exaggeration=exaggeration,
                    cfg_weight=cfg_weight,
                    temperature=temperature
                )
            )
            audio_chunks.append(audio_tensor)
        
        # Concatenate all chunks
        if len(audio_chunks) > 1:
            print("Concatenating audio chunks...")
            final_audio = concatenate_audio_chunks(audio_chunks, model.sr)
        else:
            final_audio = audio_chunks[0]
        
        # Convert to WAV format
        buffer = io.BytesIO()
        ta.save(buffer, final_audio, model.sr, format="wav")
        buffer.seek(0)
        
        print(f"✓ Audio generation completed. Size: {len(buffer.getvalue()):,} bytes")
        
        return StreamingResponse(
            io.BytesIO(buffer.getvalue()),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
        
    except Exception as e:
        print(f"✗ TTS generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "message": f"TTS generation failed: {str(e)}",
                    "type": "generation_error"
                }
            }
        )

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check API health and model status"
)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        device=DEVICE or "unknown",
        config={
            "max_chunk_length": Config.MAX_CHUNK_LENGTH,
            "max_total_length": Config.MAX_TOTAL_LENGTH,
            "voice_sample_path": Config.VOICE_SAMPLE_PATH,
            "default_exaggeration": Config.EXAGGERATION,
            "default_cfg_weight": Config.CFG_WEIGHT,
            "default_temperature": Config.TEMPERATURE
        }
    )

@app.get(
    "/v1/models",
    response_model=ModelsResponse,
    summary="List models",
    description="List available models (OpenAI API compatibility)"
)
@app.get("/models", response_model=ModelsResponse, include_in_schema=False)  # Legacy endpoint
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

@app.get(
    "/config",
    response_model=ConfigResponse,
    summary="Get configuration",
    description="Get current API configuration"
)
async def get_config():
    """Get current configuration"""
    return ConfigResponse(
        server={
            "host": Config.HOST,
            "port": Config.PORT
        },
        model={
            "device": DEVICE or "unknown",
            "voice_sample_path": Config.VOICE_SAMPLE_PATH,
            "model_cache_dir": Config.MODEL_CACHE_DIR
        },
        defaults={
            "exaggeration": Config.EXAGGERATION,
            "cfg_weight": Config.CFG_WEIGHT,
            "temperature": Config.TEMPERATURE,
            "max_chunk_length": Config.MAX_CHUNK_LENGTH,
            "max_total_length": Config.MAX_TOTAL_LENGTH
        }
    )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "message": f"Internal server error: {str(exc)}",
                "type": "internal_error"
            }
        }
    )

def main():
    """Main entry point"""
    try:
        Config.validate()
        print(f"Starting Chatterbox TTS API server...")
        print(f"Server will run on http://{Config.HOST}:{Config.PORT}")
        print(f"API documentation available at http://{Config.HOST}:{Config.PORT}/docs")
        
        uvicorn.run(
            "api:app",
            host=Config.HOST,
            port=Config.PORT,
            reload=False,
            access_log=True
        )
    except Exception as e:
        print(f"Failed to start server: {e}")
        exit(1)

if __name__ == "__main__":
    main()
