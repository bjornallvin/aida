#!/usr/bin/env python3
"""
Simple test to check voice-command endpoint
"""

import json
import logging
import requests

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_voice_command_endpoint():
    """Test the /text-voice-command endpoint directly"""

    # Load config to get backend URL
    with open("client.json", "r") as f:
        config = json.load(f)

    backend_url = config.get("backend_url", "http://localhost:3000")
    room_name = config.get("room_name", "unknown")

    # Prepare request for text-voice-command endpoint
    payload = {
        "message": "What time is it?",  # Test message
        "roomName": room_name,
        "conversationHistory": [],
        "source": "voice_command",
    }

    logger.info("Testing /text-voice-command endpoint...")
    logger.info(f"Backend URL: {backend_url}")
    logger.info(f"Room name: {room_name}")

    try:
        # Send to text-voice-command endpoint
        response = requests.post(
            f"{backend_url}/text-voice-command",
            json=payload,
            timeout=30,
            headers={"Content-Type": "application/json"},
        )

        logger.info(f"Response status: {response.status_code}")

        if response.status_code == 200:
            json_response = response.json()
            logger.info(f"Response JSON: {json.dumps(json_response, indent=2)}")

            data = json_response.get("data", {})
            ai_response = data.get("response", "")
            audio_file = data.get("audioFile", "")

            logger.info(f"AI Response: {ai_response}")
            logger.info(f"Audio file: {audio_file}")

            if audio_file:
                logger.info("✅ Audio file URL received!")
                return True
            else:
                logger.error("❌ No audio file URL in response")
                return False
        else:
            logger.error(f"❌ Backend error: {response.status_code} - {response.text}")
            return False

    except requests.RequestException as e:
        logger.error(f"❌ Request failed: {e}")
        return False


if __name__ == "__main__":
    success = test_voice_command_endpoint()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")
