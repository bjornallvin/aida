#!/usr/bin/env python3
"""
Test script to verify the audio playback fix
"""

import json
import logging
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.voice.handler import VoiceCommandHandler

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_audio_response():
    """Test that voice commands return audio URLs"""

    # Load config
    with open("client.json", "r") as f:
        config = json.load(f)

    # Create voice handler
    handler = VoiceCommandHandler(config)

    # Test sending a command
    test_message = "What time is it?"
    logger.info(f"Testing command: {test_message}")

    result = handler.send_text_command(test_message)
    if result:
        response_text, audio_file_url = result
        logger.info(f"Response text: {response_text}")
        logger.info(f"Audio file URL: {audio_file_url}")

        if audio_file_url:
            logger.info("✅ Audio URL received successfully!")
            return True
        else:
            logger.error("❌ No audio URL received")
            return False
    else:
        logger.error("❌ No response received")
        return False


if __name__ == "__main__":
    success = test_audio_response()
    sys.exit(0 if success else 1)
