#!/bin/bash
# Environment verification script for Aida development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Aida Development Environment Verification${NC}"
echo -e "${BLUE}===========================================${NC}"

# Check if virtual environment is active
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo -e "${RED}❌ Virtual environment not active${NC}"
    echo -e "${YELLOW}Please run: source ./activate_dev_env.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Virtual environment active: $VIRTUAL_ENV${NC}"

# Test Python imports
echo -e "${BLUE}🐍 Testing Python dependencies...${NC}"

dependencies=(
    "requests"
    "pyaudio" 
    "webrtcvad"
    "numpy"
    "mopidy"
    "pytest"
    "black"
    "flake8"
    "mypy"
)

for dep in "${dependencies[@]}"; do
    if python -c "import $dep" 2>/dev/null; then
        echo -e "${GREEN}  ✅ $dep${NC}"
    else
        echo -e "${RED}  ❌ $dep${NC}"
    fi
done

# Test Node.js
echo -e "${BLUE}📦 Testing Node.js environment...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}  ✅ Node.js: $(node --version)${NC}"
    echo -e "${GREEN}  ✅ npm: $(npm --version)${NC}"
else
    echo -e "${RED}  ❌ Node.js not found${NC}"
fi

# Test backend dependencies
echo -e "${BLUE}🌐 Testing backend dependencies...${NC}"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}  ✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}  ⚠️  Backend dependencies not found. Run: cd backend && npm install${NC}"
fi

# Test component CLI access
echo -e "${BLUE}🔧 Testing component access...${NC}"

# Room client
if [ -f "room-client/client.py" ]; then
    if python room-client/client.py --help &>/dev/null; then
        echo -e "${GREEN}  ✅ Room client accessible${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Room client has issues (check dependencies)${NC}"
    fi
else
    echo -e "${RED}  ❌ Room client not found${NC}"
fi

# Backend
if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}  ✅ Backend accessible${NC}"
else
    echo -e "${RED}  ❌ Backend not found${NC}"
fi

# Summary
echo -e "${BLUE}📋 Environment Summary${NC}"
echo -e "${BLUE}=====================${NC}"
echo -e "🏠 Project: Aida Apartment AI"
echo -e "📍 Location: $(pwd)"
echo -e "🐍 Python: $(python --version)"
echo -e "📦 Virtual Env: $(basename $VIRTUAL_ENV)"
echo -e "🟢 Node.js: $(node --version 2>/dev/null || echo 'Not available')"

echo -e "\n${GREEN}🎉 Development environment ready!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Configure your environment variables (.env files)"
echo "2. Start developing: cd room-client && python client.py --help"
echo "3. Run backend: cd backend && npm run dev"
echo "4. Run tests: pytest"
echo ""
echo -e "${YELLOW}💡 Tip: Use 'source ./activate_dev_env.sh' to activate this environment in new terminals${NC}"
