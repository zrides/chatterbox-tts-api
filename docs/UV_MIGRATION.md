# Migration Guide: From pip to uv

This guide explains how to migrate the Chatterbox TTS API from pip to uv for better dependency management, faster installations, and improved PyTorch/CUDA compatibility.

## Why Migrate to uv?

Based on user feedback and testing, uv provides several advantages for this project:

1. **Better PyTorch/CUDA handling**: Native support for PyTorch indexes and variants
2. **Faster installations**: 25-40% faster than pip in benchmarks
3. **Superior dependency resolution**: SAT-based resolver prevents conflicts
4. **Git dependency support**: Better handling of `chatterbox-tts` from GitHub
5. **Cross-platform consistency**: Environment markers handle CPU/GPU variants automatically
6. **Docker optimizations**: Better caching and faster container builds

## Pre-Migration Checklist

- [ ] Backup your current `.venv` directory (if using virtual environments)
- [ ] Note your current Python version (`python --version`)
- [ ] Save current package versions (`pip freeze > backup-requirements.txt`)

## Step 1: Install uv

### macOS/Linux:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Windows:

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Alternative (via pip):

```bash
pip install uv
```

## Step 2: Local Development Migration

### Option A: Quick Migration (Recommended)

1. **Remove old virtual environment**:

   ```bash
   rm -rf .venv
   ```

2. **Install dependencies with uv**:

   ```bash
   uv sync
   ```

3. **Test the installation**:

   ```bash
   uv run python -c "import chatterbox; print('✓ chatterbox-tts installed')"
   uv run python -c "import torch; print(f'✓ PyTorch {torch.__version__} - CUDA: {torch.cuda.is_available()}')"
   ```

4. **Run the API**:
   ```bash
   uv run api.py
   ```

### Option B: Manual Migration

1. **Initialize uv project** (if you want to customize):

   ```bash
   uv init --no-readme --no-workspace
   ```

2. **Add dependencies**:
   ```bash
   uv add "chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox.git"
   uv add "torch>=2.0.0,<2.7.0"
   uv add "torchaudio>=2.0.0,<2.7.0"
   uv add "flask>=2.3.0"
   uv add "python-dotenv>=1.0.0"
   uv add "requests>=2.28.0" --optional dev
   ```

## Step 3: PyTorch Configuration

The provided `pyproject.toml` automatically handles PyTorch variants:

- **Linux**: Uses CUDA-enabled PyTorch
- **macOS/Windows**: Uses CPU-only PyTorch
- **Manual override**: Set environment variables if needed

### Force CPU version:

```bash
UV_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cpu uv sync
```

### Force CUDA version:

```bash
UV_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cu124 uv sync
```

## Step 4: Docker Migration

### Using the new uv-based Docker setup:

1. **Build with uv**:

   ```bash
   docker build -f Dockerfile.uv -t chatterbox-tts-uv .
   ```

2. **Or use docker-compose**:

   ```bash
   docker-compose -f docker-compose.uv.yml up -d
   ```

3. **GPU variant**:
   ```bash
   docker build -f Dockerfile.uv.gpu -t chatterbox-tts-uv-gpu .
   ```

## Step 5: Verify Migration

### Test basic functionality:

```bash
# Health check
uv run python -c "
import requests
r = requests.get('http://localhost:5123/health')
print(f'Status: {r.status_code}')
print(r.json())
"

# Test TTS generation
uv run python test_api.py
```

### Performance comparison:

```bash
# Time the installation
time uv sync --reinstall
# vs
time pip install -r requirements.txt
```

## Step 6: Update Development Workflow

### New commands:

| Old pip command                   | New uv command     |
| --------------------------------- | ------------------ |
| `pip install package`             | `uv add package`   |
| `pip install -r requirements.txt` | `uv sync`          |
| `python script.py`                | `uv run script.py` |
| `pip freeze`                      | `uv pip freeze`    |

### Environment management:

```bash
# Create/sync environment
uv sync

# Add new dependency
uv add numpy

# Remove dependency
uv remove numpy

# Update all dependencies
uv sync --upgrade

# Install dev dependencies
uv sync --extra dev
```

## Step 7: CI/CD Updates

Update your CI/CD pipelines to use uv:

```yaml
# GitHub Actions example
- name: Set up uv
  uses: astral-sh/setup-uv@v2

- name: Install dependencies
  run: uv sync

- name: Run tests
  run: uv run python test_api.py
```

## Troubleshooting

### Common Issues:

1. **CUDA compatibility**:

   ```bash
   # Clear cache and reinstall
   uv cache clean
   uv sync --reinstall
   ```

2. **Git dependency issues**:

   ```bash
   # Force refresh git dependencies
   uv sync --refresh-package chatterbox-tts
   ```

3. **Lock file conflicts**:

   ```bash
   # Regenerate lock file
   rm uv.lock
   uv sync
   ```

4. **Python version mismatch**:
   ```bash
   # Use specific Python version
   uv python install 3.11
   uv sync --python 3.11
   ```

## Performance Benefits

Expected improvements after migration:

- **Installation speed**: 25-40% faster
- **Dependency resolution**: More reliable, fewer conflicts
- **Docker builds**: 20-30% faster with better caching
- **Development workflow**: Faster environment creation
- **PyTorch compatibility**: Better handling of CUDA variants

## Rollback Plan

If you need to rollback to pip:

1. **Restore backup**:

   ```bash
   pip install -r backup-requirements.txt
   ```

2. **Remove uv files**:

   ```bash
   rm pyproject.toml uv.lock
   ```

3. **Use original Docker files**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

## Additional Resources

- [uv Documentation](https://docs.astral.sh/uv/)
- [PyTorch with uv Guide](https://docs.astral.sh/uv/guides/integration/pytorch/)
- [uv Docker Guide](https://docs.astral.sh/uv/guides/integration/docker/)

## Support

If you encounter issues during migration:

1. Check the [uv troubleshooting guide](https://docs.astral.sh/uv/reference/troubleshooting/)
2. Open an issue with reproduction steps
3. Include `uv.lock` and `pyproject.toml` files
4. Provide error logs with `--verbose` flag
