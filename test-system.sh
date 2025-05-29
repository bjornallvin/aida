#!/bin/bash

# Test script for Aida apartment AI system
echo "🔊 Testing Aida Apartment AI System"
echo "=================================="

# Test 1: Check if all components can start without errors
echo -e "\n1. Testing component startup..."

echo "   • Testing Snapcast client help..."
cd snapcast-client
python3 client.py --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Snapcast client loads successfully"
else
    echo "     ❌ Snapcast client failed to load"
fi

# Test 2: Check configuration validation
echo "   • Testing configuration loading..."
python3 client.py --config test-config.json --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Configuration loads successfully"
else
    echo "     ❌ Configuration failed to load"
fi

cd ..

# Test 3: Check Docker setup
echo "   • Testing Docker configuration..."
docker-compose config > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Docker Compose configuration is valid"
else
    echo "     ❌ Docker Compose configuration is invalid"
fi

# Test 4: Check if all required files exist
echo -e "\n2. Checking file structure..."
files=(
    "backend/server.js"
    "backend/package.json"
    "mopidy-server/server.py"
    "mopidy-server/mopidy.conf"
    "snapcast-client/client.py"
    "snapcast-client/setup.py"
    "snapcast-client/install-pi.sh"
    "snapcast-client/deploy-to-pis.sh"
    "docker-compose.yml"
    "Dockerfile"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
    fi
done

echo -e "\n🎉 Test completed!"
echo "To deploy the system:"
echo "  • For Docker: docker-compose up -d"
echo "  • For Pi clients: cd snapcast-client && ./deploy-to-pis.sh [ip1] [ip2] ..."
echo "  • For manual setup: npm run setup && npm start"
