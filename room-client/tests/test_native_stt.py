#!/usr/bin/env python3
"""
Quick test of native STT integration
"""

import json
import logging
import sys
import os

# Add the room-client directory to the path so we can import voice_commands
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "room-client"))
from voice_commands import VoiceCommandHandler

# Setup logging
logging.basicConfig(level=logging.INFO)


def test_native_stt_integration():
    """Test native STT integration without audio files"""
    print("🚀 Native STT Integration Test")
    print("=" * 50)

    # Load config
    config_path = os.path.join(os.path.dirname(__file__), "..", "client.json")
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    print("📊 Configuration:")
    print(f"   Native STT enabled: {config.get('use_native_stt', False)}")
    print(f"   STT config: {config.get('stt_config', {})}")

    # Test handler initialization
    print("\n🔧 Initializing VoiceCommandHandler...")
    handler = VoiceCommandHandler(config)
    print("✅ Handler initialized successfully")

    # Get STT status
    print("\n📊 STT Status:")
    status = handler.get_stt_status()
    for key, value in status.items():
        if key == "model_info":
            print(f"   {key}:")
            for k, v in value.items():
                print(f"      {k}: {v}")
        elif key != "stt_config":
            print(f"   {key}: {value}")

    # Test text command (doesn't require STT)
    print("\n💬 Testing text command (bypasses STT)...")
    test_message = "Hello Aida, this is a test of the native STT system"
    response = handler.send_text_command(test_message)

    if response:
        print(f"✅ Text command successful")
        print(f"   Input: {test_message}")
        print(
            f"   Response: {response[:100]}..."
            if len(response) > 100
            else f"   Response: {response}"
        )
    else:
        print("❌ Text command failed")

    # Summary
    print("\n🎯 Integration Test Summary:")
    if (
        status["native_stt_enabled"]
        and status["native_stt_available"]
        and status["native_stt_loaded"]
    ):
        print("✅ Native STT is fully operational!")
        print("   - Faster-whisper installed and loaded")
        print("   - Model ready for transcription")
        print("   - Backend fallback available")

        expected_improvement = "5-10x faster transcription (0.3-0.8s vs 5-10s)"
        print(f"   - Expected performance: {expected_improvement}")

    elif status["native_stt_enabled"] and not status["native_stt_available"]:
        print("⚠️  Native STT enabled but not available")
        print("   - Install faster-whisper: pip install faster-whisper")

    elif not status["native_stt_enabled"]:
        print("ℹ️  Native STT disabled in configuration")
        print("   - Set 'use_native_stt': true in client.json to enable")

    else:
        print("❌ Native STT configuration issue")

    print("\n🏁 Test complete!")


if __name__ == "__main__":
    try:
        test_native_stt_integration()
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
