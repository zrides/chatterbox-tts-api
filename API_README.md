# Chatterbox TTS Flask API

This API provides a Flask-based web service for the ChatterboxTTS text-to-speech system, designed to be compatible with OpenAI's TTS API format.

## Features

- **OpenAI-compatible API**: Uses similar endpoint structure to OpenAI's text-to-speech API
- **Automatic text chunking**: Automatically breaks long text into manageable chunks to handle character limits
- **Voice cloning**: Uses the pre-specified `voice-sample.mp3` file for voice conditioning
- **Error handling**: Comprehensive error handling with appropriate HTTP status codes
- **Health monitoring**: Health check endpoint for monitoring service status
- **Environment-based configuration**: Fully configurable via environment variables
- **Docker support**: Ready for containerized deployment

## Setup

### Prerequisites

1. Ensure you have the ChatterboxTTS package installed:

   ```bash
   pip install chatterbox-tts
   ```

2. Install Flask and other required dependencies:

   ```bash
   pip install flask torchaudio requests python-dotenv
   ```

3. Ensure you have a `voice-sample.mp3` file in the project root directory for voice conditioning

### Configuration

Copy the example environment file and customize it:

```bash
cp env.example .env
nano .env  # Edit with your preferred settings
```

Key environment variables:

- `PORT=5123` - API server port
- `EXAGGERATION=0.5` - Default emotion intensity (0.25-2.0)
- `CFG_WEIGHT=0.5` - Default pace control (0.0-1.0)
- `TEMPERATURE=0.8` - Default sampling temperature (0.05-5.0)
- `VOICE_SAMPLE_PATH=./voice-sample.mp3` - Path to voice sample file
- `DEVICE=auto` - Device selection (auto/cuda/mps/cpu)

See `env.example` for all available options.

### Running the API

Start the API server:

```bash
python api.py
```

The server will:

- Automatically detect the best available device (CUDA, MPS, or CPU)
- Load the ChatterboxTTS model
- Start the Flask server on `http://localhost:5123` (or your configured port)

## API Endpoints

### 1. Text-to-Speech Generation

**POST** `/v1/audio/speech`

Generate speech from text using the ChatterboxTTS model.

**Request Body:**

```json
{
  "input": "Text to convert to speech",
  "voice": "alloy", // Ignored - uses voice-sample.mp3
  "response_format": "mp3", // Ignored - always returns WAV
  "speed": 1.0, // Ignored - use model's built-in parameters
  "exaggeration": 0.7, // Optional - override default (0.25-2.0)
  "cfg_weight": 0.4, // Optional - override default (0.0-1.0)
  "temperature": 0.9 // Optional - override default (0.05-5.0)
}
```

**Response:**

- Content-Type: `audio/wav`
- Binary audio data in WAV format

**Example:**

```bash
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, this is a test of the text to speech system."}' \
  --output speech.wav
```

**With custom parameters:**

```bash
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Dramatic speech!", "exaggeration": 1.2, "cfg_weight": 0.3}' \
  --output dramatic.wav
```

### 2. Health Check

**GET** `/health`

Check if the API is running and the model is loaded.

**Response:**

```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda",
  "config": {
    "max_chunk_length": 280,
    "max_total_length": 3000,
    "voice_sample_path": "./voice-sample.mp3",
    "default_exaggeration": 0.5,
    "default_cfg_weight": 0.5,
    "default_temperature": 0.8
  }
}
```

### 3. List Models

**GET** `/v1/models`

List available models (OpenAI API compatibility).

**Response:**

```json
{
  "object": "list",
  "data": [
    {
      "id": "chatterbox-tts-1",
      "object": "model",
      "created": 1677649963,
      "owned_by": "resemble-ai"
    }
  ]
}
```

### 4. Configuration Info

**GET** `/config`

Get current configuration (useful for debugging).

**Response:**

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 5123,
    "debug": false
  },
  "model": {
    "device": "cuda",
    "voice_sample_path": "./voice-sample.mp3",
    "model_cache_dir": "./models"
  },
  "defaults": {
    "exaggeration": 0.5,
    "cfg_weight": 0.5,
    "temperature": 0.8,
    "max_chunk_length": 280,
    "max_total_length": 3000
  }
}
```

## Text Processing

### Automatic Chunking

The API automatically handles long text inputs by:

1. **Character limit**: Splits text longer than the configured chunk size (default: 280 characters)
2. **Sentence preservation**: Attempts to split at sentence boundaries (`.`, `!`, `?`)
3. **Fallback splitting**: If sentences are too long, splits at commas, semicolons, or other natural breaks
4. **Audio concatenation**: Seamlessly combines audio from multiple chunks

### Maximum Limits

- **Soft limit**: Configurable characters per chunk (default: 280)
- **Hard limit**: Configurable total characters (default: 3000)
- **Automatic processing**: No manual intervention required

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- **400 Bad Request**: Invalid input (missing text, empty text, parameter out of range, etc.)
- **500 Internal Server Error**: Model or processing errors

**Error Response Format:**

```json
{
  "error": {
    "message": "Missing required field: 'input'",
    "type": "invalid_request_error"
  }
}
```

## Testing

Use the provided test script to verify the API functionality:

```bash
python test_api.py
```

The test script will:

- Test health check endpoint
- Test models endpoint
- Generate speech for various text lengths
- Test error handling
- Save generated audio files as `test_output_*.wav`

## Configuration

You can configure the API through environment variables or by modifying `env.example`:

```bash
# Server Configuration
PORT=5123
HOST=0.0.0.0
FLASK_DEBUG=false

# TTS Model Settings
EXAGGERATION=0.5          # Emotion intensity (0.25-2.0)
CFG_WEIGHT=0.5            # Pace control (0.0-1.0)
TEMPERATURE=0.8           # Sampling temperature (0.05-5.0)

# Text Processing
MAX_CHUNK_LENGTH=280      # Characters per chunk
MAX_TOTAL_LENGTH=3000     # Total character limit

# Voice and Model Settings
VOICE_SAMPLE_PATH=./voice-sample.mp3
DEVICE=auto               # auto/cuda/mps/cpu
MODEL_CACHE_DIR=./models
```

### Parameter Effects

**Exaggeration (0.25-2.0):**

- `0.3-0.4`: Very neutral, professional
- `0.5`: Neutral (default)
- `0.7-0.8`: More expressive
- `1.0+`: Very dramatic (may be unstable)

**CFG Weight (0.0-1.0):**

- `0.2-0.3`: Faster speech
- `0.5`: Balanced (default)
- `0.7-0.8`: Slower, more deliberate

**Temperature (0.05-5.0):**

- `0.4-0.6`: More consistent
- `0.8`: Balanced (default)
- `1.0+`: More creative/random

## Docker Deployment

For Docker deployment, see [DOCKER_README.md](DOCKER_README.md) for complete instructions.

**Quick start with Docker Compose:**

```bash
cp env.example .env  # Customize as needed
docker compose up -d
```

**Quick start with Docker:**

```bash
docker build -t chatterbox-tts .
docker run -d -p 5123:5123 \
  -v ./voice-sample.mp3:/app/voice-sample.mp3:ro \
  -e EXAGGERATION=0.7 \
  chatterbox-tts
```

## Performance Notes

- **Model loading**: The model is loaded once at startup (can take 30-60 seconds)
- **First request**: May be slower due to initial model warm-up
- **Subsequent requests**: Should be faster due to model caching
- **Memory usage**: Varies by device (GPU recommended for best performance)
- **Concurrent requests**: The API handles one request at a time for stability

## Integration Examples

### Python with requests

```python
import requests

# Basic request
response = requests.post(
    "http://localhost:5123/v1/audio/speech",
    json={"input": "Hello world!"}
)

with open("output.wav", "wb") as f:
    f.write(response.content)

# With custom parameters
response = requests.post(
    "http://localhost:5123/v1/audio/speech",
    json={
        "input": "Exciting news!",
        "exaggeration": 0.8,
        "cfg_weight": 0.4,
        "temperature": 1.0
    }
)
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:5123/v1/audio/speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: 'Hello world!',
    exaggeration: 0.7,
  }),
});

const audioBuffer = await response.arrayBuffer();
// Save or play the audio buffer
```

### cURL

```bash
# Basic usage
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Your text here"}' \
  --output output.wav

# With custom parameters
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Dramatic text!", "exaggeration": 1.0, "cfg_weight": 0.3}' \
  --output dramatic.wav
```

## Troubleshooting

### Common Issues

1. **Model not loading**: Ensure ChatterboxTTS is properly installed
2. **Voice sample missing**: Verify `voice-sample.mp3` exists at the configured path
3. **CUDA out of memory**: Try using CPU device (`DEVICE=cpu`)
4. **Slow performance**: GPU recommended; ensure CUDA/MPS is available
5. **Port conflicts**: Change `PORT` environment variable to an available port

### Debug Mode

For debugging, you can enable Flask's debug mode:

```bash
export FLASK_DEBUG=true
python api.py
```

**Note**: Never use debug mode in production!

### Checking Configuration

```bash
# Check if API is running
curl http://localhost:5123/health

# View current configuration
curl http://localhost:5123/config

# Test with simple text
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Test"}' \
  --output test.wav
```
