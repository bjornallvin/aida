#!/bin/bash
# Test the modular room client
cd "$(dirname "$0")"
echo "Testing platform detection..."
python -c "from src.utils import get_platform_info; print(get_platform_info())"

echo "Testing configuration..."
python -c "from src.config import ConfigManager; cm = ConfigManager(); print('Room:', cm.get('room_name'))"

echo "Testing audio..."
python main.py --test-audio

echo "Testing voice (if enabled)..."
python main.py --test-voice
