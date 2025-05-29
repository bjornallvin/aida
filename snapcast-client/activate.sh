#!/bin/bash
# Aida Snapcast Client - Virtual Environment Activation Script
# Usage: source activate.sh

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo "❌ Virtual environment not found at $SCRIPT_DIR/venv"
    echo "Run the following commands to create it:"
    echo "  cd $SCRIPT_DIR"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install --upgrade pip"
    echo "  pip install setuptools"
    echo "  pip install -r requirements.txt"
    return 1 2>/dev/null || exit 1
fi

# Activate virtual environment
source "$SCRIPT_DIR/venv/bin/activate"

# Set proper config path for macOS
export AIDA_CONFIG_PATH="$HOME/Library/Application Support/Aida/client.json"

echo "✅ Aida Snapcast Client virtual environment activated"
echo "📁 Config path: $AIDA_CONFIG_PATH"
echo ""
echo "Available commands:"
echo "  python client.py --help                    # Show all options"
echo "  python client.py --list-cards             # List audio devices"
echo "  python client.py --test-audio             # Test audio output"
echo "  python client.py --test-voice             # Test voice commands"
echo "  python client.py --config \"\$AIDA_CONFIG_PATH\" # Run with config"
echo ""
echo "To deactivate: deactivate"
