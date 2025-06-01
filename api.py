import os
import io
import re
import torch
import numpy as np
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from werkzeug.exceptions import BadRequest
import torchaudio as ta

from chatterbox.tts import ChatterboxTTS

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

# Global model instance
model = None
DEVICE = None

# Configuration from environment variables
class Config:
    # Server settings
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5123))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
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
        errors = []
        
        if not (0.25 <= cls.EXAGGERATION <= 2.0):
            errors.append(f"EXAGGERATION must be between 0.25 and 2.0, got {cls.EXAGGERATION}")
        
        if not (0.0 <= cls.CFG_WEIGHT <= 1.0):
            errors.append(f"CFG_WEIGHT must be between 0.0 and 1.0, got {cls.CFG_WEIGHT}")
        
        if not (0.05 <= cls.TEMPERATURE <= 5.0):
            errors.append(f"TEMPERATURE must be between 0.05 and 5.0, got {cls.TEMPERATURE}")
        
        if cls.MAX_CHUNK_LENGTH < 50:
            errors.append(f"MAX_CHUNK_LENGTH must be at least 50, got {cls.MAX_CHUNK_LENGTH}")
        
        if cls.MAX_TOTAL_LENGTH < cls.MAX_CHUNK_LENGTH:
            errors.append(f"MAX_TOTAL_LENGTH must be >= MAX_CHUNK_LENGTH")
        
        if cls.DEVICE_OVERRIDE not in ['auto', 'cuda', 'mps', 'cpu']:
            errors.append(f"DEVICE must be one of: auto, cuda, mps, cpu, got {cls.DEVICE_OVERRIDE}")
        
        if not os.path.exists(cls.VOICE_SAMPLE_PATH):
            errors.append(f"Voice sample file not found: {cls.VOICE_SAMPLE_PATH}")
        
        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(f"  - {error}" for error in errors))

# Validate configuration on startup
try:
    Config.validate()
    print("✓ Configuration validation passed")
except ValueError as e:
    print(f"✗ Configuration error: {e}")
    exit(1)

def initialize_model():
    """Initialize the TTS model once at startup"""
    global model, DEVICE
    
    # Create model cache directory
    os.makedirs(Config.MODEL_CACHE_DIR, exist_ok=True)
    
    # Set cache directories for HuggingFace and PyTorch
    if 'HF_HOME' not in os.environ:
        os.environ['HF_HOME'] = os.path.join(Config.MODEL_CACHE_DIR, 'huggingface')
    if 'TORCH_HOME' not in os.environ:
        os.environ['TORCH_HOME'] = os.path.join(Config.MODEL_CACHE_DIR, 'torch')
    
    # Determine device
    if Config.DEVICE_OVERRIDE == 'auto':
        if torch.cuda.is_available():
            DEVICE = "cuda"
        elif torch.backends.mps.is_available():
            DEVICE = "mps"
        else:
            DEVICE = "cpu"
    else:
        DEVICE = Config.DEVICE_OVERRIDE
        
        # Validate device availability (only warn for explicit device requests)
        if DEVICE == 'cuda' and not torch.cuda.is_available():
            print("Warning: CUDA explicitly requested but not available, falling back to CPU")
            DEVICE = 'cpu'
        elif DEVICE == 'mps' and not torch.backends.mps.is_available():
            print("Warning: MPS explicitly requested but not available, falling back to CPU")
            DEVICE = 'cpu'
    
    print(f"Initializing Chatterbox TTS model on device: {DEVICE}")
    print(f"Model cache directory: {Config.MODEL_CACHE_DIR}")
    print(f"Voice sample: {Config.VOICE_SAMPLE_PATH}")
    
    # Force CPU mapping for all torch.load operations
    # This is a more aggressive approach to handle CUDA->CPU model loading
    import safetensors.torch
    original_torch_load = torch.load
    original_load_file = safetensors.torch.load_file
    
    def force_cpu_torch_load(f, map_location=None, **kwargs):
        # Always force CPU mapping if we're on a CPU device
        if DEVICE in ['cpu', 'mps']:
            map_location = torch.device('cpu')
        return original_torch_load(f, map_location=map_location, **kwargs)
    
    def force_cpu_load_file(filename, device=None):
        # Force CPU for safetensors loading too
        if DEVICE in ['cpu', 'mps']:
            device = torch.device('cpu')
        return original_load_file(filename, device=device)
    
    # Apply comprehensive monkey-patching
    torch.load = force_cpu_torch_load
    safetensors.torch.load_file = force_cpu_load_file
    
    try:
        print("Loading Chatterbox TTS model with CPU compatibility fixes...")
        model = ChatterboxTTS.from_pretrained(device=DEVICE)
        print("✅ Model initialized successfully!")
    except Exception as e:
        print(f"❌ Error initializing model: {e}")
        print("🔄 Attempting fallback initialization...")
        
        # Additional fallback: try forcing CPU device explicitly
        if DEVICE != 'cpu':
            print("Trying with explicit CPU device...")
            DEVICE = 'cpu'
            model = ChatterboxTTS.from_pretrained(device=DEVICE)
            print("✅ Model initialized successfully on CPU fallback!")
        else:
            # If still failing on CPU, there might be a deeper issue
            print("❌ Model initialization failed even on CPU.")
            print("This might indicate a compatibility issue with the chatterbox-tts package.")
            raise
    finally:
        # Restore original functions
        torch.load = original_torch_load
        safetensors.torch.load_file = original_load_file

def split_text_into_chunks(text: str, max_length: int = None) -> list:
    """Split text into smaller chunks while preserving sentence boundaries"""
    if max_length is None:
        max_length = Config.MAX_CHUNK_LENGTH
        
    if len(text) <= max_length:
        return [text]
    
    # First, try to split by sentences
    sentence_endings = r'[.!?]+(?:\s|$)'
    sentences = re.split(f'({sentence_endings})', text)
    
    # Recombine sentences with their punctuation
    combined_sentences = []
    for i in range(0, len(sentences), 2):
        if i + 1 < len(sentences):
            combined_sentences.append(sentences[i] + sentences[i + 1])
        else:
            combined_sentences.append(sentences[i])
    
    chunks = []
    current_chunk = ""
    
    for sentence in combined_sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # If adding this sentence would exceed max length, start a new chunk
        if current_chunk and len(current_chunk) + len(sentence) + 1 > max_length:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
    
    # Add the last chunk if it exists
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    # If we still have chunks that are too long, split them more aggressively
    final_chunks = []
    for chunk in chunks:
        if len(chunk) <= max_length:
            final_chunks.append(chunk)
        else:
            # Split by commas or other natural breaks
            parts = re.split(r'([,;:\-]+\s*)', chunk)
            temp_chunk = ""
            
            for part in parts:
                if temp_chunk and len(temp_chunk) + len(part) > max_length:
                    if temp_chunk.strip():
                        final_chunks.append(temp_chunk.strip())
                    temp_chunk = part
                else:
                    temp_chunk += part
            
            if temp_chunk.strip():
                final_chunks.append(temp_chunk.strip())
    
    return final_chunks

def concatenate_audio_chunks(audio_chunks: list, sample_rate: int) -> torch.Tensor:
    """Concatenate multiple audio chunks into a single tensor"""
    if len(audio_chunks) == 1:
        return audio_chunks[0]
    
    # Convert all chunks to numpy if they aren't already
    numpy_chunks = []
    for chunk in audio_chunks:
        if torch.is_tensor(chunk):
            numpy_chunks.append(chunk.squeeze().numpy())
        else:
            numpy_chunks.append(chunk.squeeze())
    
    # Concatenate along the time axis
    concatenated = np.concatenate(numpy_chunks, axis=0)
    
    # Convert back to tensor with proper shape
    return torch.from_numpy(concatenated).unsqueeze(0)

@app.route('/v1/audio/speech', methods=['POST'])
@app.route('/audio/speech', methods=['POST'])
def text_to_speech():
    """
    Convert text to speech using Chatterbox TTS
    
    Expected JSON payload:
    {
        "input": "Text to convert to speech",
        "voice": "alloy",  # Ignored - we use the predefined voice sample
        "response_format": "mp3",  # Ignored - we always return WAV
        "speed": 1.0,  # Ignored - use temperature and cfg_weight instead
        "exaggeration": 0.5,  # Optional - override default exaggeration
        "cfg_weight": 0.5,  # Optional - override default cfg_weight
        "temperature": 0.8  # Optional - override default temperature
    }
    
    Returns audio file as binary data
    """
    try:
        if not request.is_json:
            raise BadRequest("Request must be JSON")
        
        data = request.get_json()
        
        # Validate required fields
        if 'input' not in data:
            raise BadRequest("Missing required field: 'input'")
        
        text = data['input'].strip()
        if not text:
            raise BadRequest("Input text cannot be empty")
        
        # Validate text length
        if len(text) > Config.MAX_TOTAL_LENGTH:
            raise BadRequest(f"Input text too long. Maximum {Config.MAX_TOTAL_LENGTH} characters.")
        
        # Get optional parameters from request, fall back to config defaults
        exaggeration = float(data.get('exaggeration', Config.EXAGGERATION))
        cfg_weight = float(data.get('cfg_weight', Config.CFG_WEIGHT))
        temperature = float(data.get('temperature', Config.TEMPERATURE))
        
        # Validate parameter ranges
        if not (0.25 <= exaggeration <= 2.0):
            raise BadRequest("exaggeration must be between 0.25 and 2.0")
        if not (0.0 <= cfg_weight <= 1.0):
            raise BadRequest("cfg_weight must be between 0.0 and 1.0")
        if not (0.05 <= temperature <= 5.0):
            raise BadRequest("temperature must be between 0.05 and 5.0")
        
        print(f"Generating speech for text: {text[:100]}{'...' if len(text) > 100 else ''}")
        print(f"Parameters: exaggeration={exaggeration}, cfg_weight={cfg_weight}, temperature={temperature}")
        
        # Split text into manageable chunks
        text_chunks = split_text_into_chunks(text)
        print(f"Split into {len(text_chunks)} chunks")
        
        # Generate audio for each chunk
        audio_chunks = []
        for i, chunk in enumerate(text_chunks):
            print(f"Processing chunk {i+1}/{len(text_chunks)}: {chunk[:50]}{'...' if len(chunk) > 50 else ''}")
            
            wav = model.generate(
                text=chunk,
                audio_prompt_path=Config.VOICE_SAMPLE_PATH,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight,
                temperature=temperature
            )
            
            audio_chunks.append(wav)
        
        # Concatenate all audio chunks
        if len(audio_chunks) > 1:
            final_audio = concatenate_audio_chunks(audio_chunks, model.sr)
        else:
            final_audio = audio_chunks[0]
        
        # Save to temporary buffer
        buffer = io.BytesIO()
        ta.save(buffer, final_audio, model.sr, format="wav")
        buffer.seek(0)
        
        duration = final_audio.shape[-1] / model.sr
        print(f"Successfully generated {duration:.2f} seconds of audio")
        
        return send_file(
            buffer,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='speech.wav'
        )
        
    except BadRequest:
        raise
    except Exception as e:
        print(f"Error in text_to_speech: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "model_loaded": model is not None,
        "device": DEVICE,
        "config": {
            "max_chunk_length": Config.MAX_CHUNK_LENGTH,
            "max_total_length": Config.MAX_TOTAL_LENGTH,
            "voice_sample_path": Config.VOICE_SAMPLE_PATH,
            "default_exaggeration": Config.EXAGGERATION,
            "default_cfg_weight": Config.CFG_WEIGHT,
            "default_temperature": Config.TEMPERATURE
        }
    })

@app.route('/v1/models', methods=['GET'])
@app.route('/models', methods=['GET'])
def list_models():
    """List available models (OpenAI API compatibility)"""
    return jsonify({
        "object": "list",
        "data": [
            {
                "id": "chatterbox-tts-1",
                "object": "model",
                "created": 1677649963,
                "owned_by": "resemble-ai"
            }
        ]
    })

@app.route('/config', methods=['GET'])
def get_config():
    """Get current configuration (for debugging/monitoring)"""
    return jsonify({
        "server": {
            "host": Config.HOST,
            "port": Config.PORT,
            "debug": Config.FLASK_DEBUG
        },
        "model": {
            "device": DEVICE,
            "device_override": Config.DEVICE_OVERRIDE,
            "voice_sample_path": Config.VOICE_SAMPLE_PATH,
            "model_cache_dir": Config.MODEL_CACHE_DIR
        },
        "defaults": {
            "exaggeration": Config.EXAGGERATION,
            "cfg_weight": Config.CFG_WEIGHT,
            "temperature": Config.TEMPERATURE,
            "max_chunk_length": Config.MAX_CHUNK_LENGTH,
            "max_total_length": Config.MAX_TOTAL_LENGTH
        }
    })

@app.errorhandler(400)
def handle_bad_request(e):
    return jsonify({"error": {"message": str(e.description), "type": "invalid_request_error"}}), 400

@app.errorhandler(500)
def handle_internal_error(e):
    return jsonify({"error": {"message": "Internal server error", "type": "server_error"}}), 500

def main():
    """Main entry point for console script"""
    print("=" * 60)
    print("Chatterbox TTS API Server")
    print("=" * 60)
    print(f"Host: {Config.HOST}")
    print(f"Port: {Config.PORT}")
    print(f"Debug: {Config.FLASK_DEBUG}")
    print(f"Voice sample: {Config.VOICE_SAMPLE_PATH}")
    print(f"Model cache: {Config.MODEL_CACHE_DIR}")
    print("=" * 60)
    
    # Initialize model at startup
    initialize_model()
    
    # Run the Flask app
    app.run(
        host=Config.HOST, 
        port=Config.PORT, 
        debug=Config.FLASK_DEBUG
    )

if __name__ == '__main__':
    main()
