# Chatterbox TTS API Docker Deployment Guide

This guide covers how to run the ChatterboxTTS API using Docker and Docker Compose v2.

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone and prepare:**

   ```bash
   git clone https://github.com/travisvn/chatterbox-tts-api
   cd chatterbox-tts-api
   cp .env.example .env  # Copy and customize environment variables
   ```

2. **Start the service:**

   ```bash
   docker compose up -d
   ```

3. **Test the API:**
   ```bash
   curl -X POST http://localhost:5123/v1/audio/speech \
     -H "Content-Type: application/json" \
     -d '{"input": "Hello from Docker!"}' \
     --output test.wav
   ```

### Option 2: Docker Run

```bash
# Build the image
docker build -t chatterbox-tts-api .

# Run the container
docker run -d \
  --name chatterbox-tts-api \
  -p 5123:5123 \
  -v ./voice-sample.mp3:/app/voice-sample.mp3:ro \
  -v chatterbox-models:/app/models \
  -e EXAGGERATION=0.7 \
  -e CFG_WEIGHT=0.4 \
  chatterbox-tts
```

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose v2 (comes with Docker Desktop)
- At least 4GB RAM (8GB+ recommended)
- GPU support (optional but recommended)

### For GPU Support

**NVIDIA GPU (Linux):**

```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

Then uncomment the GPU section in `docker-compose.yml`.

## ⚙️ Configuration

### Environment Variables

Copy `env.example` to `.env` and customize:

```bash
cp env.example .env
nano .env  # or your preferred editor
```

**Key variables:**

| Variable            | Default              | Description                     |
| ------------------- | -------------------- | ------------------------------- |
| `PORT`              | `5123`               | API server port                 |
| `EXAGGERATION`      | `0.5`                | Emotion intensity (0.25-2.0)    |
| `CFG_WEIGHT`        | `0.5`                | Pace control (0.0-1.0)          |
| `TEMPERATURE`       | `0.8`                | Sampling temperature (0.05-5.0) |
| `VOICE_SAMPLE_PATH` | `./voice-sample.mp3` | Path to voice sample            |
| `DEVICE`            | `auto`               | Device: auto/cuda/mps/cpu       |
| `MAX_CHUNK_LENGTH`  | `280`                | Max characters per chunk        |

### Voice Sample Configuration

**Option 1: Default voice sample**

```bash
# Place your voice sample in the project root
cp your-voice.mp3 voice-sample.mp3
```

**Option 2: Custom path via environment**

```env
VOICE_SAMPLE_PATH=/app/voice-samples/custom-voice.mp3
VOICE_SAMPLE_HOST_PATH=./my-voices/custom-voice.mp3
```

**Option 3: Multiple voice samples**

```bash
mkdir voice-samples
cp voice1.mp3 voice2.mp3 voice-samples/
```

Then mount the directory:

```env
VOICE_SAMPLES_DIR=./voice-samples
```

## 🏗️ Build Options

### Standard Build

```bash
docker build -t chatterbox-tts .
```

### Build with Custom Base Image

```bash
docker build --build-arg BASE_IMAGE=python:3.11-bullseye -t chatterbox-tts .
```

### Multi-stage Build (Smaller Image)

```bash
docker build -f Dockerfile.slim -t chatterbox-tts:slim .
```

## 🚢 Deployment Examples

### Development Setup

```yaml
# docker-compose.dev.yml
services:
  chatterbox-tts:
    build: .
    ports:
      - '5123:5123'
    environment:
      - FLASK_DEBUG=true
      - EXAGGERATION=0.7
    volumes:
      - .:/app
      - chatterbox-models:/app/models
    command: python -m flask run --host=0.0.0.0 --port=5123 --debug
```

```bash
docker compose -f docker-compose.dev.yml up
```

### Production Setup

```yaml
# docker-compose.prod.yml
services:
  chatterbox-tts:
    image: chatterbox-tts:latest
    restart: always
    ports:
      - '5123:5123'
    environment:
      - FLASK_ENV=production
      - FLASK_DEBUG=false
    volumes:
      - ./voice-sample.mp3:/app/voice-sample.mp3:ro
      - chatterbox-models:/app/models
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
```

### Multiple Instances (Load Balancing)

```yaml
services:
  chatterbox-tts-1:
    build: .
    ports:
      - '5123:5123'
    # ... config

  chatterbox-tts-2:
    build: .
    ports:
      - '5002:5123'
    # ... config

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - chatterbox-tts-1
      - chatterbox-tts-2
```

## 📊 Monitoring and Logs

### View Logs

```bash
# Real-time logs
docker compose logs -f chatterbox-tts

# Last 100 lines
docker compose logs --tail=100 chatterbox-tts
```

### Health Checks

```bash
# Check container health
docker compose ps

# Manual health check
curl http://localhost:5123/health

# Get configuration
curl http://localhost:5123/config
```

### Resource Monitoring

```bash
# Container stats
docker stats chatterbox-tts-api

# Detailed info
docker inspect chatterbox-tts-api
```

## 🔧 Troubleshooting

### Common Issues

**1. Model Download Fails**

```bash
# Check internet connectivity
docker compose exec chatterbox-tts curl -I https://huggingface.co

# Clear model cache
docker volume rm chatterbox_chatterbox-models
docker compose up --build
```

**2. Voice Sample Not Found**

```bash
# Check file permissions
ls -la voice-sample.mp3

# Verify mount
docker compose exec chatterbox-tts ls -la /app/voice-sample.mp3
```

**3. Out of Memory**

```bash
# Check memory usage
docker stats

# Increase Docker memory limit or use CPU device
echo 'DEVICE=cpu' >> .env
docker compose up -d
```

**4. GPU Not Detected**

```bash
# Check NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi

# Verify GPU setup in container
docker compose exec chatterbox-tts python -c "import torch; print(torch.cuda.is_available())"
```

### Performance Tuning

**For CPU-only systems:**

```env
DEVICE=cpu
MAX_CHUNK_LENGTH=200  # Smaller chunks
TEMPERATURE=0.6       # Less random sampling
```

**For GPU systems:**

```env
DEVICE=cuda
MAX_CHUNK_LENGTH=300  # Can handle larger chunks
```

**For faster inference:**

```env
CFG_WEIGHT=0.3        # Faster speech
TEMPERATURE=0.5       # More deterministic
```

## 🔒 Security Considerations

### Production Security

```env
# Disable debug mode
FLASK_DEBUG=false

# Bind to specific interface
HOST=127.0.0.1  # localhost only

# Use secrets for sensitive config
VOICE_SAMPLE_PATH=/run/secrets/voice_sample
```

### Docker Secrets Example

```yaml
services:
  chatterbox-tts:
    # ... other config
    secrets:
      - voice_sample
    environment:
      - VOICE_SAMPLE_PATH=/run/secrets/voice_sample

secrets:
  voice_sample:
    file: ./secrets/voice-sample.mp3
```

## 📈 Scaling

### Horizontal Scaling

```yaml
services:
  chatterbox-tts:
    # ... config
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### Using External Load Balancer

```bash
# HAProxy example
docker run -d --name haproxy \
  -p 80:80 \
  -v ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro \
  haproxy:alpine
```

## 🧪 Testing

### Automated Testing

```bash
# Run test suite
docker compose exec chatterbox-tts python test_api.py

# Custom test
docker compose exec chatterbox-tts python -c "
import requests
resp = requests.post('http://localhost:5123/v1/audio/speech',
                    json={'input': 'Docker test'})
print(f'Status: {resp.status_code}, Size: {len(resp.content)} bytes')
"
```

### Performance Testing

```bash
# Stress test with multiple requests
for i in {1..10}; do
  curl -X POST http://localhost:5123/v1/audio/speech \
    -H "Content-Type: application/json" \
    -d '{"input": "Performance test '$i'"}' \
    --output test_$i.wav &
done
wait
```

## 📝 Advanced Configuration

### Custom Dockerfile

```dockerfile
# Dockerfile.custom
FROM chatterbox-tts:latest

# Add custom models or configurations
COPY custom-models/ /app/models/
COPY custom-voices/ /app/voices/

# Set custom defaults
ENV EXAGGERATION=0.8
ENV CFG_WEIGHT=0.3
```

### Multi-architecture Build

```bash
# Build for multiple platforms
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t chatterbox-tts:multi .
```

### CI/CD Integration

```yaml
# .github/workflows/docker.yml
name: Docker Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and test
        run: |
          docker compose up -d
          sleep 30
          curl -f http://localhost:5123/health
          docker compose down
```

For more information, see the main [API_README.md](API_README.md) for API usage details.
