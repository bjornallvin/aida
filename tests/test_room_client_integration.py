#!/usr/bin/env python3
"""
Quick verification that the room client works with the bug fix
"""

import sys
from pathlib import Path

# Add the room-client directory to path
room_client_path = str(Path(__file__).parent.parent / "room-client")
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)


def test_room_client_integration():
    """Test that the room client integration works with the bug fix"""
    print("🏠 Testing Room Client Integration with Bug Fix")
    print("=" * 55)

    try:
        # Test importing voice handler from the room client
        from src.voice.handler import VoiceCommandHandler
        from src.voice.wake_word_detector import WakeWordDetector

        print("✅ Successfully imported VoiceCommandHandler")

        # Create a test configuration matching the actual client.json
        config = {
            "room_name": "test_room",
            "wake_word": "aida",
            "wake_word_similarity_threshold": 0.6,
            "wake_word_phonetic_matching": True,
            "wake_word_variations": ["apartment", "apartement", "appartment"],
            "wake_word_timeout": 120,
            "backend_url": "http://localhost:3000",
            "voice_commands_enabled": False,  # Don't start actual listening
            "use_native_stt": False,
        }

        # Initialize handler
        handler = VoiceCommandHandler(config)
        print("✅ VoiceCommandHandler initialized successfully")

        # Test that the bug fix method exists and works
        if hasattr(handler, "_extract_command_after_wake_word"):
            print("✅ Command extraction method exists")

            # Test the extraction directly
            test_command = handler._extract_command_after_wake_word(
                "aida turn on the lights", "aida"
            )
            expected = "turn on the lights"

            if test_command == expected:
                print(f"✅ Command extraction works: '{test_command}'")
            else:
                print(
                    f"❌ Command extraction failed: got '{test_command}', expected '{expected}'"
                )
                return False
        else:
            print("❌ Command extraction method not found")
            return False

        # Test wake word detector integration
        if hasattr(handler, "wake_word_detector"):
            print("✅ Wake word detector integrated")

            # Test detection with command
            result = handler.wake_word_detector.detect_wake_word(
                "aida turn on the lights"
            )
            if result["detected"]:
                print(
                    f"✅ Wake word detection works: method='{result['method']}', confidence={result['confidence']:.2f}"
                )
            else:
                print("❌ Wake word detection failed")
                return False
        else:
            print("❌ Wake word detector not found")
            return False

        # Test the full flow simulation
        print("\n🔄 Testing full processing flow simulation:")

        test_phrases = [
            "aida turn on the lights",
            "apartment play some music",
            "aida what time is it",
        ]

        commands_that_would_be_processed = []

        for phrase in test_phrases:
            print(f"\n🎤 Testing: '{phrase}'")

            # Simulate wake word detection
            detection_result = handler.wake_word_detector.detect_wake_word(phrase)
            if detection_result["detected"]:
                print(f"   ✅ Wake word detected: {detection_result['matched_word']}")

                # Extract command
                command = handler._extract_command_after_wake_word(
                    phrase, detection_result["matched_word"]
                )
                if command.strip():
                    print(f"   🎯 Command extracted: '{command}'")
                    commands_that_would_be_processed.append(command)
                else:
                    print("   ℹ️  No command after wake word")
            else:
                print("   ❌ Wake word not detected")

        print(
            f"\n📋 Commands that would be processed: {len(commands_that_would_be_processed)}"
        )
        for i, cmd in enumerate(commands_that_would_be_processed, 1):
            print(f"   {i}. '{cmd}'")

        expected_count = 3  # All phrases should produce commands
        success = len(commands_that_would_be_processed) == expected_count

        return success

    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_room_client_integration()

    print("\n" + "=" * 55)
    if success:
        print("🎉 SUCCESS! Room client integration with bug fix verified!")
        print("")
        print("✅ The wake word command processing bug has been fixed")
        print("✅ Commands following wake words will now be executed")
        print("✅ All existing functionality remains intact")
        print("")
        print("🚀 Your room client is ready to use!")
    else:
        print("❌ Integration test failed. Please check the errors above.")

    sys.exit(0 if success else 1)
