"""
Text-to-speech endpoint
"""

import io
import asyncio
import torch
import torchaudio as ta
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models import TTSRequest, ErrorResponse
from app.config import Config
from app.core import (
    get_memory_info, cleanup_memory, safe_delete_tensors,
    split_text_into_chunks, concatenate_audio_chunks
)
from app.core.tts_model import get_model

router = APIRouter()

# Request counter for memory management
REQUEST_COUNTER = 0


@router.post(
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
@router.post("/audio/speech", include_in_schema=False)  # Legacy endpoint
async def text_to_speech(request: TTSRequest):
    """Generate speech from text using Chatterbox TTS with memory management"""
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
    
    audio_chunks = []
    final_audio = None
    buffer = None
    
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
                        audio_prompt_path=Config.VOICE_SAMPLE_PATH,
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
        
        # Create response
        response = StreamingResponse(
            io.BytesIO(buffer.getvalue()),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
        
        return response
        
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