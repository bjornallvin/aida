#!/bin/bash
# Activation script for Aida development environment

# Check if already activated
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtual environment already active: $VIRTUAL_ENV"
    return 0 2>/dev/null || exit 0
fi

# Check if virtual environment exists
if [ ! -d "aida-dev-env" ]; then
    echo "❌ Virtual environment not found. Run ./setup_dev_env.sh first"
    return 1 2>/dev/null || exit 1
fi

# Activate virtual environment
source aida-dev-env/bin/activate

echo "🏠 Aida Development Environment Activated"
echo "================================================"
echo "📦 Virtual Environment: $(which python)"
echo "🐍 Python Version: $(python --version)"
echo "📍 Working Directory: $(pwd)"
echo ""
echo "Available commands:"
echo "  - Run room client: cd room-client && python client.py"
echo "  - Run mopidy server: cd mopidy-server && python server.py"
echo "  - Run backend: cd backend && npm run dev"
echo "  - Run tests: pytest"
echo "  - Deactivate: deactivate"
echo ""
