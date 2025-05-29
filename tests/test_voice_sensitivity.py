#!/usr/bin/env python3
"""
Test script for voice sensitivity settings
Tests different VAD aggressiveness levels and silence thresholds
"""

import json
import sys
import os

# Add the room-client directory to the path so we can import voice_commands
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "room-client"))

from voice_commands import VoiceCommandHandler


def test_voice_sensitivity_settings():
    """Test different voice sensitivity configurations"""

    print("🎤 Voice Sensitivity Settings Test")
    print("=" * 50)

    # Test configurations with different sensitivity levels
    test_configs = [
        {
            "name": "Low Sensitivity (picks up more background noise)",
            "config": {
                "room_name": "test_room",
                "voice_commands_enabled": True,
                "vad_aggressiveness": 0,
                "silence_threshold": 10,
            },
        },
        {
            "name": "Medium Sensitivity (balanced)",
            "config": {
                "room_name": "test_room",
                "voice_commands_enabled": True,
                "vad_aggressiveness": 2,
                "silence_threshold": 20,
            },
        },
        {
            "name": "High Sensitivity (filters background noise)",
            "config": {
                "room_name": "test_room",
                "voice_commands_enabled": True,
                "vad_aggressiveness": 3,
                "silence_threshold": 40,
            },
        },
    ]

    for test_config in test_configs:
        print(f"\n📊 Testing: {test_config['name']}")
        print(f"   VAD Aggressiveness: {test_config['config']['vad_aggressiveness']}")
        print(f"   Silence Threshold: {test_config['config']['silence_threshold']}")

        try:
            handler = VoiceCommandHandler(test_config["config"])

            if handler.listening_enabled:
                print(f"   ✅ Voice handler initialized successfully")
                print(f"   🔧 VAD Level: {handler.vad_aggressiveness}")
                print(f"   🔇 Silence Threshold: {handler.silence_threshold}")
            else:
                print(f"   ⚠️  Voice commands not available (missing dependencies)")

        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n" + "=" * 50)
    print("💡 Recommendations:")
    print("   • For noisy environments: vad_aggressiveness=3, silence_threshold=60")
    print("   • For quiet environments: vad_aggressiveness=1, silence_threshold=20")
    print("   • Current default: vad_aggressiveness=3, silence_threshold=40")
    print("\n📝 Edit your client.json to adjust these settings")


if __name__ == "__main__":
    test_voice_sensitivity_settings()
