#!/usr/bin/env python3
import sys
import os

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "room-client"))
from voice_commands import VoiceCommandHandler
import json

# Load the actual config
with open("client.json", "r") as f:
    config = json.load(f)

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
