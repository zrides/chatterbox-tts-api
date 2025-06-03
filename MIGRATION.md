# Migration Guide: New Project Structure

The Chatterbox TTS API has been reorganized from a single `api.py` file into a modular package structure for better maintainability and extensibility.

## What Changed

### Before (Single File)

```
chatterbox-tts-api/
├── api.py                   # Everything in one 780-line file
├── test_api.py             # Tests
├── Dockerfile              # Mixed in root
├── docker-compose.yml      # Mixed in root
└── ...
```

### After (Organized Structure)

```
chatterbox-tts-api/
├── app/                    # Main application package
│   ├── config.py          # Configuration management
│   ├── main.py            # FastAPI app
│   ├── models/            # Pydantic models
│   ├── core/              # Core functionality
│   └── api/               # API endpoints
├── docker/                # All Docker files consolidated
├── tests/                 # Test suite
├── main.py               # Entry point
└── start.py             # Development helper
```

## Migration Steps

### 1. For Local Development

**Old way:**

```bash
python api.py
# or
uvicorn api:app --host 0.0.0.0 --port 5123
```

**New way:**

```bash
python main.py
# or
uvicorn app.main:app --host 0.0.0.0 --port 5123
# or (recommended)
python start.py dev  # Development mode with auto-reload
python start.py prod # Production mode
```

### 2. For Docker Deployments

**Old way:**

```bash
docker compose up -d
```

**New way:**

```bash
docker compose -f docker/docker-compose.yml up -d
# For different variants:
docker compose -f docker/docker-compose.uv.yml up -d     # uv-optimized
docker compose -f docker/docker-compose.gpu.yml up -d   # GPU support
docker compose -f docker/docker-compose.cpu.yml up -d   # CPU-only
```

### 3. For Testing

**Old way:**

```bash
python test_api.py
```

**New way:**

```bash
python tests/test_api.py
# or
python start.py test
```

### 4. For Custom Integrations

If you were importing from the old `api.py`:

**Old imports:**

```python
from api import Config, TTSRequest, health_check
```

**New imports:**

```python
from app.config import Config
from app.models import TTSRequest
from app.api.endpoints.health import health_check
```

## Benefits of New Structure

✅ **Maintainability**: Smaller, focused modules instead of one large file  
✅ **Extensibility**: Easy to add new endpoints or features  
✅ **Testing**: Better test organization and isolation  
✅ **Docker**: Organized container files by purpose  
✅ **Development**: Helper scripts for common tasks  
✅ **Type Safety**: Better IDE support with organized imports

## Backward Compatibility

- **API endpoints remain the same** - no changes to HTTP interfaces
- **Environment variables unchanged** - same `.env` configuration
- **Docker images work the same** - updated internally but same interface
- **Tests validate same functionality** - just moved to `tests/` directory

## Need Help?

- **View structure**: `python start.py info`
- **Quick start**: `python start.py dev`
- **Test everything works**: `python start.py test`

The reorganization improves maintainability while keeping the same powerful TTS functionality!
