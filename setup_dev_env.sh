#!/bin/bash
# Setup script for Aida Apartment AI development environment
# Creates a virtual environment with all dependencies for all subprojects

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VENV_NAME="aida-dev-env"
PYTHON_VERSION="python3"

echo -e "${BLUE}🏠 Aida Apartment AI - Development Environment Setup${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if Python 3 is available
if ! command -v $PYTHON_VERSION &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed or not in PATH${NC}"
    echo -e "${YELLOW}Please install Python 3.8 or later${NC}"
    exit 1
fi

PYTHON_VER=$($PYTHON_VERSION --version)
echo -e "${GREEN}✅ Found: $PYTHON_VER${NC}"

# Check if we're already in the virtual environment
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo -e "${YELLOW}⚠️  You are currently in a virtual environment: $VIRTUAL_ENV${NC}"
    echo -e "${YELLOW}Please deactivate it first with: deactivate${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_NAME" ]; then
    echo -e "${BLUE}📦 Creating virtual environment: $VENV_NAME${NC}"
    $PYTHON_VERSION -m venv $VENV_NAME
else
    echo -e "${GREEN}✅ Virtual environment already exists: $VENV_NAME${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}🔄 Activating virtual environment${NC}"
source $VENV_NAME/bin/activate

# Upgrade pip
echo -e "${BLUE}📈 Upgrading pip${NC}"
pip install --upgrade pip

# Install Python dependencies
echo -e "${BLUE}📥 Installing Python dependencies${NC}"
pip install -r requirements.txt

# Check if Node.js is available for backend dependencies
if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    echo -e "${GREEN}✅ Found Node.js: $NODE_VER${NC}"
    
    # Install backend dependencies
    echo -e "${BLUE}📥 Installing backend Node.js dependencies${NC}"
    cd backend
    npm install
    cd ..
else
    echo -e "${YELLOW}⚠️  Node.js not found. Backend dependencies won't be installed.${NC}"
    echo -e "${YELLOW}Install Node.js to set up the backend: https://nodejs.org/${NC}"
fi

# Create activation script
echo -e "${BLUE}📝 Creating activation script${NC}"
cat > activate_dev_env.sh << 'EOF'
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
EOF

chmod +x activate_dev_env.sh

# Create deactivation script
cat > deactivate_dev_env.sh << 'EOF'
#!/bin/bash
# Deactivation script for Aida development environment

if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "ℹ️  No virtual environment is currently active"
    return 0 2>/dev/null || exit 0
fi

echo "👋 Deactivating Aida development environment"
deactivate
EOF

chmod +x deactivate_dev_env.sh

echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}📦 Virtual Environment: $VENV_NAME${NC}"
echo -e "${GREEN}🐍 Python Version: $(python --version)${NC}"
echo -e "${GREEN}📍 Location: $(pwd)/$VENV_NAME${NC}"
echo ""
echo -e "${BLUE}To activate the environment:${NC}"
echo -e "${YELLOW}  source ./activate_dev_env.sh${NC}"
echo ""
echo -e "${BLUE}To deactivate later:${NC}"
echo -e "${YELLOW}  deactivate${NC}"
echo -e "${YELLOW}  # or${NC}"
echo -e "${YELLOW}  source ./deactivate_dev_env.sh${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Activate the environment: source ./activate_dev_env.sh"
echo "2. Configure your subprojects (see individual README files)"
echo "3. Start developing! 🚀"
