#!/bin/bash
# Test AI Voice Command Integration
# Tests the complete voice command flow from Snapcast client to backend

set -e

echo "🤖 Aida AI Voice Command Integration Test"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_URL="http://localhost:3000"
TEST_ROOM="test_room"

echo -e "\n${YELLOW}1. Testing Backend Dependencies...${NC}"

# Check if backend is running
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend not running. Starting backend...${NC}"
    cd backend
    npm start &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    sleep 5
    cd ..
fi

echo -e "\n${YELLOW}2. Testing OpenAI Integration...${NC}"

# Test chat endpoint
CHAT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, this is a test\", \"roomName\": \"$TEST_ROOM\"}")

if echo "$CHAT_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ OpenAI chat endpoint working${NC}"
    echo "Response: $(echo "$CHAT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['response'][:100] + '...')")"
else
    echo -e "${RED}✗ OpenAI chat endpoint failed${NC}"
    echo "Response: $CHAT_RESPONSE"
fi

echo -e "\n${YELLOW}3. Testing TTS Integration...${NC}"

# Test TTS endpoint
TTS_RESPONSE=$(curl -s -X POST "$BACKEND_URL/tts" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Hello from Aida AI voice testing\"}")

if echo "$TTS_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ ElevenLabs TTS endpoint working${NC}"
else
    echo -e "${RED}✗ TTS endpoint failed${NC}"
    echo "Response: $TTS_RESPONSE"
fi

echo -e "\n${YELLOW}4. Testing Voice Command Dependencies...${NC}"

# Check Python dependencies
cd room-client

if python3 -c "import pyaudio, webrtcvad, requests" 2>/dev/null; then
    echo -e "${GREEN}✓ Voice command Python dependencies available${NC}"
else
    echo -e "${YELLOW}⚠ Installing voice command dependencies...${NC}"
    pip3 install -r requirements.txt
fi

echo -e "\n${YELLOW}5. Testing Voice Command Module...${NC}"

# Test voice commands module
if python3 -c "from voice_commands import VoiceCommandHandler; print('Voice commands module loaded successfully')" 2>/dev/null; then
    echo -e "${GREEN}✓ Voice commands module working${NC}"
else
    echo -e "${RED}✗ Voice commands module failed to load${NC}"
fi

echo -e "\n${YELLOW}6. Testing Snapcast Client with Voice Commands...${NC}"

# Test client voice command functionality
python3 -c "
import sys
sys.path.append('.')
from client import SnapcastClient
import tempfile
import json

# Create test config
config = {
    'room_name': 'test_room',
    'voice_commands_enabled': True,
    'backend_url': 'http://localhost:3000',
    'ai_audio_playback': False  # Disable for testing
}

with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
    json.dump(config, f)
    config_path = f.name

try:
    client = SnapcastClient(config_path)
    client.init_voice_commands()
    
    if client.voice_handler:
        print('✓ Voice handler initialized successfully')
        response = client.send_text_command('Hello Aida, can you play some music?')
        if response:
            print(f'✓ Text command test successful: {response[:100]}...')
        else:
            print('✗ Text command test failed')
    else:
        print('✗ Voice handler initialization failed')
        
finally:
    import os
    os.unlink(config_path)
"

echo -e "\n${YELLOW}7. Testing Audio File Serving...${NC}"

# Check if audio files are served correctly
AUDIO_DIR="backend/audio"
mkdir -p "$AUDIO_DIR"

# Create a test audio file reference
if curl -s "$BACKEND_URL/audio/" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Audio file serving endpoint accessible${NC}"
else
    echo -e "${YELLOW}⚠ Audio file serving endpoint not accessible (normal if no files)${NC}"
fi

echo -e "\n${YELLOW}8. Integration Summary...${NC}"

echo "Testing complete! Voice command integration status:"
echo "• Backend OpenAI chat: $(if curl -s "$BACKEND_URL/chat" -X POST -H "Content-Type: application/json" -d '{"message":"test"}' | grep -q success; then echo "✓ Working"; else echo "✗ Failed"; fi)"
echo "• Backend TTS: $(if curl -s "$BACKEND_URL/tts" -X POST -H "Content-Type: application/json" -d '{"text":"test"}' | grep -q success; then echo "✓ Working"; else echo "✗ Failed"; fi)"
echo "• Voice dependencies: $(if python3 -c "import pyaudio, webrtcvad" 2>/dev/null; then echo "✓ Installed"; else echo "✗ Missing"; fi)"
echo "• Snapcast client: $(if python3 -c "from client import SnapcastClient" 2>/dev/null; then echo "✓ Working"; else echo "✗ Failed"; fi)"

echo -e "\n${GREEN}🎉 AI Voice Command Integration Test Complete!${NC}"
echo ""
echo "To enable voice commands on a Raspberry Pi:"
echo "1. Copy room-client/ folder to your Pi"
echo "2. Run: pip3 install -r requirements.txt"
echo "3. Configure client.json with voice_commands_enabled: true"
echo "4. Run: python3 client.py --enable-voice"
echo ""
echo "To test voice commands:"
echo "1. Ensure backend is running with valid API keys"
echo "2. Run: python3 client.py --test-voice"
echo "3. Or use interactive mode: python3 voice_commands.py"

# Cleanup
if [ ! -z "$BACKEND_PID" ]; then
    echo "Stopping test backend..."
    kill $BACKEND_PID 2>/dev/null || true
fi
