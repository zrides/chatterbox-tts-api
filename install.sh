#!/bin/bash

# ChatterboxTTS API Installation Script

set -e

echo "🚀 Installing ChatterboxTTS API..."

# Check Python version
python_version=$(python3 --version 2>&1 | grep -oP '(?<=Python )\d+\.\d+')
required_version="3.11"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
    echo "❌ Error: Python 3.11 is required. Found: $python_version"
    exit 1
fi

echo "✅ Python version check passed: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp env.example .env
    echo "📝 Please edit .env to customize your configuration"
fi

# Check if voice sample exists
if [ ! -f "voice-sample.mp3" ]; then
    echo "⚠️  Warning: voice-sample.mp3 not found"
    echo "   You can add your own voice sample or use the provided one"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "To start the API:"
echo "  source venv/bin/activate"
echo "  python api.py"
echo ""
echo "Or with Docker:"
echo "  docker compose up -d"
echo ""
echo "Test the API:"
echo "  curl -X POST http://localhost:5123/v1/audio/speech \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"input\": \"Hello world!\"}' \\"
echo "    --output test.wav" 