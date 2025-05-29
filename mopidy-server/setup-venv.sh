#!/bin/bash
# Virtual environment setup script for Mopidy server

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
PYTHON_VERSION="3.9"

echo "🎵 Setting up Mopidy Server Virtual Environment..."

echo "📍 Found Python version: $PYTHON_VER"

# Prefer python3.10 if available
if command -v python3.10 &> /dev/null; then
    PYTHON_BIN="python3.10"
    echo "🐍 Using Python 3.10 for virtual environment."
else
    PYTHON_BIN="python3"
    echo "⚠️  Python 3.11 not found, falling back to default python3."
fi

# Check Python version
PYTHON_VER=$($PYTHON_BIN -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "📍 Found Python version: $PYTHON_VER"

# Create virtual environment
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    $PYTHON_BIN -m venv "$VENV_DIR"
else
    echo "📦 Virtual environment already exists at $VENV_DIR"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    echo "📥 Installing Python dependencies..."
    pip install -r "$SCRIPT_DIR/requirements.txt"
else
    echo "❌ requirements.txt not found!"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo "📄 Creating .env file from example..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "⚠️  Please edit .env file with your Spotify credentials"
fi

echo "✅ Virtual environment setup complete!"
echo ""
echo "To activate the environment in the future, run:"
echo "    source $VENV_DIR/bin/activate"
echo ""
echo "To start the Mopidy server:"
echo "    python -m mopidy_server"
echo ""
echo "For help:"
echo "    python -m mopidy_server --help"
