<p align="center">
  <img src="https://lm17s1uz51.ufs.sh/f/EsgO8cDHBTOU5bjcd6giJaPhnlpTZysr24u6k9WGqwIjNgQo" alt="Chatterbox API TTS header">
</p>

# Chatterbox TTS API

<p align="center">
	<a href="https://github.com/travisvn/chatterbox-tts-api">
		<img src="https://img.shields.io/github/stars/travisvn/chatterbox-tts-api?style=social" alt="GitHub stars"></a>
	<a href="https://github.com/travisvn/chatterbox-tts-api">
		<img alt="GitHub forks" src="https://img.shields.io/github/forks/travisvn/chatterbox-tts-api"></a>
	<a href="https://github.com/travisvn/chatterbox-tts-api/issues">
	  <img src="https://img.shields.io/github/issues/travisvn/chatterbox-tts-api" alt="GitHub issues"></a>
	<img src="https://img.shields.io/github/last-commit/travisvn/chatterbox-tts-api?color=red" alt="GitHub last commit">
  <a href="http://chatterboxtts.com/discord">
    <img src="https://img.shields.io/badge/Discord-Voice_AI_%26_TTS_Tools-blue?logo=discord&logoColor=white" alt="Discord">
  </a>
</p>

**FastAPI**-powered REST API for [Chatterbox TTS](https://github.com/resemble-ai/chatterbox), providing OpenAI-compatible text-to-speech endpoints with voice cloning capabilities

## Features

🚀 **OpenAI-Compatible API** - Drop-in replacement for OpenAI's TTS API  
⚡ **FastAPI Performance** - High-performance async API with automatic documentation  
🎭 **Voice Cloning** - Use your own voice samples for personalized speech  
📝 **Smart Text Processing** - Automatic chunking for long texts  
🐳 **Docker Ready** - Full containerization support  
⚙️ **Configurable** - Extensive environment variable configuration  
🎛️ **Parameter Control** - Real-time adjustment of speech characteristics  
📚 **Auto Documentation** - Interactive API docs at `/docs` and `/redoc`  
🔧 **Type Safety** - Full Pydantic validation for requests and responses  
🧠 **Memory Management** - Advanced memory monitoring and automatic cleanup

## Quick Start

### 1. Local Installation

#### Option A: Using uv (Recommended - Faster & Better Dependencies)

```bash
# Clone the repository
git clone https://github.com/travisvn/chatterbox-tts-api
cd chatterbox-tts-api

# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies with uv (automatically creates venv)
uv sync

# Copy and customize environment variables
cp .env.example .env

# Start the API with FastAPI
uv run uvicorn api:app --host 0.0.0.0 --port 5123
# Or use the main script
uv run api.py
```

> 💡 **Why uv?** Users report better compatibility with `chatterbox-tts`, 25-40% faster installs, and superior dependency resolution. [See migration guide →](docs/UV_MIGRATION.md)

#### Option B: Using pip (Traditional)

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

# Start the API with FastAPI
uvicorn api:app --host 0.0.0.0 --port 5123
# Or use the main script
python api.py
```

### 2. Docker (Recommended)

```bash
# Clone and start with Docker Compose
git clone https://github.com/travisvn/chatterbox-tts-api
cd chatterbox-tts-api

# Use Docker-optimized environment variables
cp .env.example.docker .env  # Docker-specific paths, ready to use
# Or: cp .env.example .env    # Local development paths, needs customization

# Choose your deployment method:
docker compose up -d                                    # Standard (pip-based)
docker compose -f docker-compose.uv.yml up -d          # uv-optimized (faster builds)
docker compose -f docker-compose.gpu.yml up -d         # Standard + GPU
docker compose -f docker-compose.uv.gpu.yml up -d      # uv + GPU (recommended for GPU users)
docker compose -f docker-compose.cpu.yml up -d         # CPU-only

# Watch the logs as it initializes (the first use of TTS takes the longest)
docker logs chatterbox-tts-api -f

# Test the API
curl -X POST http://localhost:5123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello from Chatterbox TTS!"}' \
  --output test.wav
```

### 3. Explore the API

Once running, visit:

- **Interactive API Docs**: http://localhost:5123/docs (Swagger UI)
- **Alternative Docs**: http://localhost:5123/redoc (ReDoc)
- **OpenAPI Schema**: http://localhost:5123/openapi.json
- **Memory Monitoring**: http://localhost:5123/memory (Memory usage stats)

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

The project provides two environment example files:

- **`.env.example`** - For local development (uses `./models`, `./voice-sample.mp3`)
- **`.env.example.docker`** - For Docker deployment (uses `/app/models`, `/app/voice-sample.mp3`)

Choose the appropriate one for your setup:

```bash
# For local development
cp .env.example .env

# For Docker deployment
cp .env.example.docker .env
```

Key environment variables (see the example files for full list):

| Variable            | Default              | Description                    |
| ------------------- | -------------------- | ------------------------------ |
| `PORT`              | `5123`               | API server port                |
| `EXAGGERATION`      | `0.5`                | Emotion intensity (0.25-2.0)   |
| `CFG_WEIGHT`        | `0.5`                | Pace control (0.0-1.0)         |
| `TEMPERATURE`       | `0.8`                | Sampling randomness (0.05-5.0) |
| `VOICE_SAMPLE_PATH` | `./voice-sample.mp3` | Voice sample for cloning       |
| `DEVICE`            | `auto`               | Device (auto/cuda/mps/cpu)     |

<details>
<summary><strong>🎭 Voice Cloning</strong></summary>

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

</details>

<details>
<summary><strong>🐳 Docker Deployment</strong></summary>

### Development

```bash
docker compose up
```

### Production

```bash
# Create production environment
cp .env.example .env
nano .env  # Set production values

# Deploy
docker compose -f docker-compose.yml up -d
```

### With GPU Support

```bash
# Enable GPU section in docker-compose.yml
# Ensure NVIDIA Container Toolkit is installed
docker compose up -d
```

</details>

<details>
<summary><strong>📚 API Reference</strong></summary>

## API Endpoints

| Endpoint           | Method | Description                      |
| ------------------ | ------ | -------------------------------- |
| `/v1/audio/speech` | POST   | Generate speech from text        |
| `/health`          | GET    | Health check and status          |
| `/config`          | GET    | Current configuration            |
| `/v1/models`       | GET    | Available models (OpenAI compat) |
| `/docs`            | GET    | Interactive API documentation    |
| `/redoc`           | GET    | Alternative API documentation    |

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

</details>

<details>
<summary><strong>🧠 Memory Management</strong></summary>

The API includes advanced memory management to prevent memory leaks and optimize performance:

### Memory Management Features

- **Automatic Cleanup**: Periodic garbage collection and tensor cleanup
- **CUDA Memory Management**: Automatic GPU cache clearing
- **Memory Monitoring**: Real-time memory usage tracking
- **Manual Controls**: API endpoints for manual cleanup operations

### Memory Configuration

| Variable                    | Default | Description                       |
| --------------------------- | ------- | --------------------------------- |
| `MEMORY_CLEANUP_INTERVAL`   | `5`     | Cleanup memory every N requests   |
| `CUDA_CACHE_CLEAR_INTERVAL` | `3`     | Clear CUDA cache every N requests |
| `ENABLE_MEMORY_MONITORING`  | `true`  | Enable detailed memory logging    |

### Memory Monitoring Endpoints

```bash
# Get memory status
curl http://localhost:5123/memory

# Trigger manual cleanup
curl "http://localhost:5123/memory?cleanup=true&force_cuda_clear=true"

# Reset memory tracking (with confirmation)
curl -X POST "http://localhost:5123/memory/reset?confirm=true"
```

### Memory Testing

Run the memory management test suite:

```bash
# Test memory patterns and cleanup
python test_memory.py  # or: uv run test_memory.py

# Monitor memory during testing
watch -n 1 'curl -s http://localhost:5123/memory | jq .memory_info'
```

### Memory Optimization Tips

**For High-Volume Production:**

```env
MEMORY_CLEANUP_INTERVAL=3
CUDA_CACHE_CLEAR_INTERVAL=2
ENABLE_MEMORY_MONITORING=false  # Reduce logging overhead
MAX_CHUNK_LENGTH=200             # Smaller chunks for less memory usage
```

**For Development/Debugging:**

```env
MEMORY_CLEANUP_INTERVAL=1
CUDA_CACHE_CLEAR_INTERVAL=1
ENABLE_MEMORY_MONITORING=true
```

**Memory Leak Prevention:**

- Tensors are automatically moved to CPU before deletion
- Gradient tracking is disabled during inference
- Audio chunks are cleaned up after concatenation
- CUDA cache is periodically cleared
- Python garbage collection is triggered regularly

</details>

<details>
<summary><strong>🧪 Testing</strong></summary>

Run the test suite:

```bash
# With pip/venv
python test_api.py

# With uv
uv run test_api.py
```

The test suite now includes:

- Basic endpoint testing
- FastAPI documentation availability
- Custom parameter validation
- Error handling verification
- Performance benchmarking

</details>

<details>
<summary><strong>⚡ Performance</strong></summary>

**FastAPI Benefits:**

- **Async support**: Better concurrent request handling
- **Faster serialization**: JSON responses ~25% faster than Flask
- **Type validation**: Pydantic models prevent invalid requests
- **Auto documentation**: No manual API doc maintenance

**Hardware Recommendations:**

- **CPU**: Works but slower, reduce chunk size for better memory usage
- **GPU**: Recommended for production, significantly faster
- **Memory**: 4GB minimum, 8GB+ recommended
- **Concurrency**: Async support allows better multi-request handling

</details>

<details>
<summary><strong>🔧 Troubleshooting</strong></summary>

### Common Issues

**CUDA/CPU Compatibility Error**

```
RuntimeError: Attempting to deserialize object on a CUDA device but torch.cuda.is_available() is False
```

This happens because `chatterbox-tts` models require PyTorch with CUDA support, even when running on CPU. Solutions:

```bash
# Option 1: Use default setup (now includes CUDA-enabled PyTorch)
docker compose up -d

# Option 2: Use explicit CUDA setup (traditional)
docker compose -f docker-compose.gpu.yml up -d

# Option 3: Use uv + GPU setup (recommended for GPU users)
docker compose -f docker-compose.uv.gpu.yml up -d

# Option 4: Use CPU-only setup (may have compatibility issues)
docker compose -f docker-compose.cpu.yml up -d

# Option 5: Clear model cache and retry with CUDA-enabled setup
docker volume rm chatterbox-tts-api_chatterbox-models
docker compose up -d --build

# Option 6: Try uv for better dependency resolution
uv sync
uv run uvicorn api:app --host 0.0.0.0 --port 5123
```

**For local development**, install PyTorch with CUDA support:

```bash
# With pip
pip uninstall torch torchvision torchaudio
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
pip install chatterbox-tts

# With uv (handles this automatically)
uv sync
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
uvicorn api:app --host 0.0.0.0 --port 5123  # or: uv run api.py
```

**FastAPI startup issues**

```bash
# Check if uvicorn is installed
uvicorn --version

# Run with verbose logging
uvicorn api:app --host 0.0.0.0 --port 5123 --log-level debug

# Alternative startup method
python api.py
```

</details>

<details>
<summary><strong>💻 Development</strong></summary>

### Local Development

```bash
# Install in development mode (pip)
pip install -e .

# Or with uv
uv sync --extra dev

# Start with auto-reload (FastAPI development)
uvicorn api:app --host 0.0.0.0 --port 5123 --reload

# Or use the main script
python api.py
```

### Testing

```bash
# Run API tests
python test_api.py  # or: uv run test_api.py

# Test specific endpoint
curl http://localhost:5123/health

# Check API documentation
curl http://localhost:5123/openapi.json
```

### FastAPI Development Features

- **Auto-reload**: Use `--reload` flag for development
- **Interactive docs**: Visit `/docs` for live API testing
- **Type hints**: Full IDE support with Pydantic models
- **Validation**: Automatic request/response validation

</details>

<details>
<summary><strong>🤝 Contributing</strong></summary>

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure FastAPI docs are updated
6. Submit a pull request

</details>

## Support

- 📖 **Documentation**: See [API Documentation](docs/API_README.md) and [Docker Guide](docs/DOCKER_README.md)
- 🔄 **Migration**: Upgrading to uv? See the [uv Migration Guide](docs/UV_MIGRATION.md)
- 🚀 **FastAPI**: New to FastAPI? Check the [FastAPI docs](https://fastapi.tiangolo.com/)
- 🐛 **Issues**: Report bugs and feature requests via GitHub issues
- 💬 **Discord**: Join the [Chatterbox TTS Discord](https://discord.gg/XqS7RxUp) or the [Discord for this project](http://chatterboxtts.com/discord)

---

Made with ♥️ and ⚡ FastAPI for the open source community
