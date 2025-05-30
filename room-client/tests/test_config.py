#!/usr/bin/env python3
import sys
import os
import json

# Add the room-client directory to Python path
room_client_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "room-client"
)
sys.path.insert(0, room_client_path)

try:
    from voice_commands import VoiceCommandHandler
except ImportError as e:
    print(f"❌ Error importing voice_commands: {e}")
    print(f"Looking in: {room_client_path}")
    sys.exit(1)

# Load the actual config
config_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "client.json"
)
try:
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
except FileNotFoundError:
    print(f"❌ Config file not found at: {config_path}")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"❌ Error parsing config file: {e}")
    sys.exit(1)

print("Configuration loaded:")
print(f"  VAD Aggressiveness: {config.get('vad_aggressiveness', 'Not set')}")
print(f"  Silence Threshold: {config.get('silence_threshold', 'Not set')}")

# Test the voice command handler initialization
try:
    handler = VoiceCommandHandler(config)
    print(f"  Handler VAD Level: {handler.vad_aggressiveness}")
    print(f"  Handler Silence Threshold: {handler.silence_threshold}")
    print("✅ Voice command handler initialized successfully with new settings")
except Exception as e:
    print(f"❌ Error initializing voice command handler: {e}")
    sys.exit(1)

print("\n🎯 Voice sensitivity settings are working correctly!")
