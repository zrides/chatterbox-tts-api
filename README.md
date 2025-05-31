# Chatterbox TTS API

A Flask-based REST API for [ChatterboxTTS](https://github.com/resemble-ai/chatterbox), providing OpenAI-compatible text-to-speech endpoints with voice cloning capabilities.

## Features

🚀 **OpenAI-Compatible API** - Drop-in replacement for OpenAI's TTS API  
🎭 **Voice Cloning** - Use your own voice samples for personalized speech  
📝 **Smart Text Processing** - Automatic chunking for long texts  
🐳 **Docker Ready** - Full containerization support  
⚙️ **Configurable** - Extensive environment variable configuration  
🎛️ **Parameter Control** - Real-time adjustment of speech characteristics

## Quick Start

### 1. Local Installation

```bash
# Clone the repository
git clone https://github.com/travisvn/chatterbox-tts-api
cd chatterbox-tts-api

# Setup environment — using Python 3.11
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and customize environment variables
cp .env.example .env

# Add your voice sample (or use the provided one)
# cp your-voice.mp3 voice-sample.mp3

# Start the API
python api.py
```

### 2. Docker (Recommended)

```bash
# Clone and start with Docker Compose
git clone https://github.com/travisvn/chatterbox-tts-api
cd chatterbox-tts-api
cp .env.example .env  # Customize as needed
docker compose up -d

# If you have nvidia/CUDA, you might have better luck with this
docker compose -f docker-compose.gpu.yml up -d --build

# Watch the logs as it initializes (the first use of TTS takes the longest)
docker logs chatterbox-tts-api -f

# Test the API
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello from ChatterboxTTS!"}' \
  --output test.wav
```

## API Usage

### Basic Text-to-Speech

```bash
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Your text here"}' \
  --output speech.wav
```

### With Custom Parameters

```bash
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Dramatic speech!",
    "exaggeration": 1.2,
    "cfg_weight": 0.3,
    "temperature": 0.9
  }' \
  --output dramatic.wav
```

### Python Example

```python
import requests

response = requests.post(
    "http://localhost:5123/v1/audio/speech",
    json={
        "input": "Hello world!",
        "exaggeration": 0.8  # More expressive
    }
)

with open("output.wav", "wb") as f:
    f.write(response.content)
```

## Configuration

Key environment variables (see `.env.example` for full list):

| Variable            | Default              | Description                    |
| ------------------- | -------------------- | ------------------------------ |
| `PORT`              | `5123`               | API server port                |
| `EXAGGERATION`      | `0.5`                | Emotion intensity (0.25-2.0)   |
| `CFG_WEIGHT`        | `0.5`                | Pace control (0.0-1.0)         |
| `TEMPERATURE`       | `0.8`                | Sampling randomness (0.05-5.0) |
| `VOICE_SAMPLE_PATH` | `./voice-sample.mp3` | Voice sample for cloning       |
| `DEVICE`            | `auto`               | Device (auto/cuda/mps/cpu)     |

## Voice Cloning

Replace the default voice sample:

```bash
# Replace the default voice sample
cp your-voice.mp3 voice-sample.mp3

# Or set a custom path
echo "VOICE_SAMPLE_PATH=/path/to/your/voice.mp3" >> .env
```

For best results:

- Use 10-30 seconds of clear speech
- Avoid background noise
- Prefer WAV or high-quality MP3

## Docker Deployment

### Development

```bash
docker compose up
```

### Production

```bash
# Create production environment
cp .env.example .env
nano .env  # Set FLASK_DEBUG=false, etc.

# Deploy
docker compose -f docker-compose.yml up -d
```

### With GPU Support

```bash
# Uncomment GPU section in docker-compose.yml
# Ensure NVIDIA Container Toolkit is installed
docker compose up -d
```

## API Endpoints

| Endpoint           | Method | Description                      |
| ------------------ | ------ | -------------------------------- |
| `/v1/audio/speech` | POST   | Generate speech from text        |
| `/health`          | GET    | Health check and status          |
| `/config`          | GET    | Current configuration            |
| `/v1/models`       | GET    | Available models (OpenAI compat) |

## Parameters Reference

### Speech Generation Parameters

**Exaggeration (0.25-2.0)**

- `0.3-0.4`: Professional, neutral
- `0.5`: Default balanced
- `0.7-0.8`: More expressive
- `1.0+`: Very dramatic

**CFG Weight (0.0-1.0)**

- `0.2-0.3`: Faster speech
- `0.5`: Default pace
- `0.7-0.8`: Slower, deliberate

**Temperature (0.05-5.0)**

- `0.4-0.6`: More consistent
- `0.8`: Default balance
- `1.0+`: More creative/random

## Testing

Run the test suite:

```bash
python test_api.py
```

## Performance

- **CPU**: Works but slower, reduce chunk size for better memory usage
- **GPU**: Recommended for production, significantly faster
- **Memory**: 4GB minimum, 8GB+ recommended
- **Concurrency**: Single request processing for stability

## Troubleshooting

### Common Issues

**CUDA/CPU Compatibility Error**

```
RuntimeError: Attempting to deserialize object on a CUDA device but torch.cuda.is_available() is False
```

This happens because `chatterbox-tts` models require PyTorch with CUDA support, even when running on CPU. Solutions:

```bash
# Option 1: Use default setup (now includes CUDA-enabled PyTorch (maybe))
docker compose up -d

# Option 2: Use explicit CUDA setup
docker compose -f docker-compose.gpu.yml up -d

# Option 3: Use CPU-only setup (may have compatibility issues)
docker compose -f docker-compose.cpu.yml up -d

# Option 4: Clear model cache and retry with CUDA-enabled setup
docker volume rm chatterbox-tts-api_chatterbox-models
docker compose up -d --build
```

**For local development**, install PyTorch with CUDA support:

```bash
pip uninstall torch torchvision torchaudio
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu126
pip install chatterbox-tts
```

**Port conflicts**

```bash
# Change port
echo "PORT=5002" >> .env
```

**GPU not detected**

```bash
# Force CPU mode
echo "DEVICE=cpu" >> .env
```

**Out of memory**

```bash
# Reduce chunk size
echo "MAX_CHUNK_LENGTH=200" >> .env
```

**Model download fails**

```bash
# Clear cache and retry
rm -rf models/
python api.py
```

## Development

### Local Development

```bash
# Install in development mode
pip install -e .

# Enable debug mode
export FLASK_DEBUG=true
python api.py
```

### Testing

```bash
# Run API tests
python test_api.py

# Test specific endpoint
curl http://localhost:5123/health
```

## License

This API wrapper is provided under the same license terms as the underlying ChatterboxTTS model. See the [ChatterboxTTS repository](https://github.com/resemble-ai/chatterbox) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Related Projects

- [ChatterboxTTS](https://github.com/resemble-ai/chatterbox) - The core TTS model
- [Resemble AI](https://resemble.ai) - Production TTS services

## Support

- 📖 **Documentation**: See [API_README.md](API_README.md) and [DOCKER_README.md](DOCKER_README.md)
- 🐛 **Issues**: Report bugs and feature requests via GitHub issues
- 💬 **Discord**: Join the [ChatterboxTTS Discord](https://discord.gg/XqS7RxUp) or the [Discord for this project](https://readaloudai.com/discord)

---

Made with ♥️ for the open source community
