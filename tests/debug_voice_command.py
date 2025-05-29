#!/usr/bin/env python3
"""Debug script to test voice command connection"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "room-client"))

from voice_commands import VoiceCommandHandler
import json
import logging
import requests

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Load config
with open("../client.json", "r") as f:
    config = json.load(f)

print(f"Config: {config}")

# Create handler
handler = VoiceCommandHandler(config)

print(f"Backend URL: {handler.backend_url}")
print(f"Room name: {handler.room_name}")

# Test send_text_command
print("Testing send_text_command...")

# Let's also test the raw request manually
data = {
    "message": "Hello, this is a test from the room client",
    "roomName": handler.room_name,
    "conversationHistory": handler.conversation_history,
}

print(f"Sending data: {data}")

try:
    raw_response = requests.post(f"{handler.backend_url}/chat", json=data, timeout=15)
    print(f"Raw status code: {raw_response.status_code}")
    print(f"Raw response text: {raw_response.text}")
    print(f"Raw response json: {raw_response.json()}")
except Exception as e:
    print(f"Raw request error: {e}")

# Now test the handler method
response = handler.send_text_command("Hello, this is a test from the room client")
print(f"Handler response: {response}")
