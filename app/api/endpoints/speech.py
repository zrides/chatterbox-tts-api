"""
Text-to-speech endpoint
"""

import io
import os
import asyncio
import tempfile
import torch
import torchaudio as ta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Form, File, UploadFile
from fastapi.responses import StreamingResponse

from app.models import TTSRequest, ErrorResponse
from app.config import Config
from app.core import (
    get_memory_info, cleanup_memory, safe_delete_tensors,
    split_text_into_chunks, concatenate_audio_chunks, add_route_aliases
)
from app.core.tts_model import get_model

# Create router with aliasing support
base_router = APIRouter()
router = add_route_aliases(base_router)

# Request counter for memory management
REQUEST_COUNTER = 0

# Supported audio formats for voice uploads
SUPPORTED_AUDIO_FORMATS = {'.mp3', '.wav', '.flac', '.m4a', '.ogg'}




def validate_audio_file(file: UploadFile) -> None:
    """Validate uploaded audio file"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"message": "No filename provided", "type": "invalid_request_error"}}
        )
    
    # Check file extension
    file_ext = os.path.splitext(file.filename.lower())[1]
    if file_ext not in SUPPORTED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": f"Unsupported audio format: {file_ext}. Supported formats: {', '.join(SUPPORTED_AUDIO_FORMATS)}",
                    "type": "invalid_request_error"
                }
            }
        )
    
    # Check file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if hasattr(file, 'size') and file.size and file.size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": f"File too large. Maximum size: {max_size // (1024*1024)}MB",
                    "type": "invalid_request_error"
                }
            }
        )


async def generate_speech_internal(
    text: str,
    voice_sample_path: str,
    exaggeration: Optional[float] = None,
    cfg_weight: Optional[float] = None,
    temperature: Optional[float] = None
) -> io.BytesIO:
    """Internal function to generate speech with given parameters"""
    global REQUEST_COUNTER
    REQUEST_COUNTER += 1
    
    model = get_model()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"message": "Model not loaded", "type": "model_error"}}
        )
    
    # Log memory usage before processing
    if Config.ENABLE_MEMORY_MONITORING:
        initial_memory = get_memory_info()
        print(f"📊 Request #{REQUEST_COUNTER} - Initial memory: CPU {initial_memory['cpu_memory_mb']:.1f}MB", end="")
        if torch.cuda.is_available():
            print(f", GPU {initial_memory['gpu_memory_allocated_mb']:.1f}MB allocated")
        else:
            print()
    
    # Validate total text length
    if len(text) > Config.MAX_TOTAL_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": f"Input text too long. Maximum {Config.MAX_TOTAL_LENGTH} characters allowed.",
                    "type": "invalid_request_error"
                }
            }
        )
    
    audio_chunks = []
    final_audio = None
    buffer = None
    
    try:
        # Get parameters with defaults
        exaggeration = exaggeration if exaggeration is not None else Config.EXAGGERATION
        cfg_weight = cfg_weight if cfg_weight is not None else Config.CFG_WEIGHT
        temperature = temperature if temperature is not None else Config.TEMPERATURE
        
        # Split text into chunks
        chunks = split_text_into_chunks(text, Config.MAX_CHUNK_LENGTH)
        
        voice_source = "uploaded file" if voice_sample_path != Config.VOICE_SAMPLE_PATH else "configured sample"
        print(f"Processing {len(chunks)} text chunks with {voice_source} and parameters:")
        print(f"  - Exaggeration: {exaggeration}")
        print(f"  - CFG Weight: {cfg_weight}")
        print(f"  - Temperature: {temperature}")
        
        # Generate audio for each chunk with memory management
        loop = asyncio.get_event_loop()
        
        for i, chunk in enumerate(chunks):
            print(f"Generating audio for chunk {i+1}/{len(chunks)}: '{chunk[:50]}{'...' if len(chunk) > 50 else ''}'")
            
            # Use torch.no_grad() to prevent gradient accumulation
            with torch.no_grad():
                # Run TTS generation in executor to avoid blocking
                audio_tensor = await loop.run_in_executor(
                    None,
                    lambda: model.generate(
                        text=chunk,
                        audio_prompt_path=voice_sample_path,
                        exaggeration=exaggeration,
                        cfg_weight=cfg_weight,
                        temperature=temperature
                    )
                )
                
                # Ensure tensor is on the correct device and detached
                if hasattr(audio_tensor, 'detach'):
                    audio_tensor = audio_tensor.detach()
                
                audio_chunks.append(audio_tensor)
            
            # Periodic memory cleanup during generation
            if i > 0 and i % 3 == 0:  # Every 3 chunks
                import gc
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
        
        # Concatenate all chunks with memory management
        if len(audio_chunks) > 1:
            print("Concatenating audio chunks...")
            with torch.no_grad():
                final_audio = concatenate_audio_chunks(audio_chunks, model.sr)
        else:
            final_audio = audio_chunks[0]
        
        # Convert to WAV format
        buffer = io.BytesIO()
        
        # Ensure final_audio is on CPU for saving
        if hasattr(final_audio, 'cpu'):
            final_audio_cpu = final_audio.cpu()
        else:
            final_audio_cpu = final_audio
            
        ta.save(buffer, final_audio_cpu, model.sr, format="wav")
        buffer.seek(0)
        
        print(f"✓ Audio generation completed. Size: {len(buffer.getvalue()):,} bytes")
        
        return buffer
        
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
    
    finally:
        # Comprehensive cleanup
        try:
            # Clean up all audio chunks
            for chunk in audio_chunks:
                safe_delete_tensors(chunk)
            
            # Clean up final audio tensor
            if final_audio is not None:
                safe_delete_tensors(final_audio)
                if 'final_audio_cpu' in locals():
                    safe_delete_tensors(final_audio_cpu)
            
            # Clear the list
            audio_chunks.clear()
            
            # Periodic memory cleanup
            if REQUEST_COUNTER % Config.MEMORY_CLEANUP_INTERVAL == 0:
                cleanup_memory()
            
            # Log memory usage after processing
            if Config.ENABLE_MEMORY_MONITORING:
                final_memory = get_memory_info()
                print(f"📊 Request #{REQUEST_COUNTER} - Final memory: CPU {final_memory['cpu_memory_mb']:.1f}MB", end="")
                if torch.cuda.is_available():
                    print(f", GPU {final_memory['gpu_memory_allocated_mb']:.1f}MB allocated")
                else:
                    print()
                
                # Calculate memory difference
                if 'initial_memory' in locals():
                    cpu_diff = final_memory['cpu_memory_mb'] - initial_memory['cpu_memory_mb']
                    print(f"📈 Memory change: CPU {cpu_diff:+.1f}MB", end="")
                    if torch.cuda.is_available():
                        gpu_diff = final_memory['gpu_memory_allocated_mb'] - initial_memory['gpu_memory_allocated_mb']
                        print(f", GPU {gpu_diff:+.1f}MB")
                    else:
                        print()
            
        except Exception as cleanup_error:
            print(f"⚠️ Warning during cleanup: {cleanup_error}")


@router.post(
    "/audio/speech",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"audio/wav": {}}},
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Generate speech from text",
    description="Generate speech audio from input text using configured voice sample (JSON only). For custom voice upload, use /audio/speech/upload endpoint."
)
async def text_to_speech(request: TTSRequest):
    """Generate speech from text using Chatterbox TTS with configured voice sample (JSON)"""
    
    # Generate speech using internal function
    buffer = await generate_speech_internal(
        text=request.input,
        voice_sample_path=Config.VOICE_SAMPLE_PATH,
        exaggeration=request.exaggeration,
        cfg_weight=request.cfg_weight,
        temperature=request.temperature
    )
    
    # Create response
    response = StreamingResponse(
        io.BytesIO(buffer.getvalue()),
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=speech.wav"}
    )
    
    return response


@router.post(
    "/audio/speech/upload",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"audio/wav": {}}},
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Generate speech with custom voice upload",
    description="Generate speech audio from input text with optional custom voice file upload"
)
async def text_to_speech_with_upload(
    input: str = Form(..., description="The text to generate audio for", min_length=1, max_length=3000),
    voice: Optional[str] = Form("alloy", description="Voice to use (ignored - uses voice sample)"),
    response_format: Optional[str] = Form("wav", description="Audio format (always returns WAV)"),
    speed: Optional[float] = Form(1.0, description="Speed of speech (ignored)"),
    exaggeration: Optional[float] = Form(None, description="Emotion intensity (0.25-2.0)", ge=0.25, le=2.0),
    cfg_weight: Optional[float] = Form(None, description="Pace control (0.0-1.0)", ge=0.0, le=1.0),
    temperature: Optional[float] = Form(None, description="Sampling temperature (0.05-5.0)", ge=0.05, le=5.0),
    voice_file: Optional[UploadFile] = File(None, description="Optional voice sample file for custom voice cloning")
):
    """Generate speech from text using Chatterbox TTS with optional voice file upload"""
    
    # Validate input text
    if not input or not input.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"message": "Input text cannot be empty", "type": "invalid_request_error"}}
        )
    
    input = input.strip()
    
    # Handle voice file upload
    temp_voice_path = None
    voice_sample_path = Config.VOICE_SAMPLE_PATH  # Default
    
    if voice_file:
        try:
            # Validate the uploaded file
            validate_audio_file(voice_file)
            
            # Create temporary file for the voice sample
            file_ext = os.path.splitext(voice_file.filename.lower())[1]
            temp_voice_fd, temp_voice_path = tempfile.mkstemp(suffix=file_ext, prefix="voice_sample_")
            
            # Read and save the uploaded file
            file_content = await voice_file.read()
            with os.fdopen(temp_voice_fd, 'wb') as temp_file:
                temp_file.write(file_content)
            
            voice_sample_path = temp_voice_path
            print(f"Using uploaded voice file: {voice_file.filename} ({len(file_content):,} bytes)")
            
        except HTTPException:
            raise
        except Exception as e:
            # Clean up temp file if it was created
            if temp_voice_path and os.path.exists(temp_voice_path):
                try:
                    os.unlink(temp_voice_path)
                except:
                    pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": {
                        "message": f"Failed to process voice file: {str(e)}",
                        "type": "file_processing_error"
                    }
                }
            )
    
    try:
        # Generate speech using internal function
        buffer = await generate_speech_internal(
            text=input,
            voice_sample_path=voice_sample_path,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature
        )
        
        # Create response
        response = StreamingResponse(
            io.BytesIO(buffer.getvalue()),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
        
        return response
        
    finally:
        # Clean up temporary voice file
        if temp_voice_path and os.path.exists(temp_voice_path):
            try:
                os.unlink(temp_voice_path)
                print(f"🗑️ Cleaned up temporary voice file: {temp_voice_path}")
            except Exception as e:
                print(f"⚠️ Warning: Failed to clean up temporary voice file: {e}")

# Export the base router for the main app to use
__all__ = ["base_router"] 