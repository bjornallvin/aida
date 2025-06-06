#!/usr/bin/env python3
"""
Test script to verify the wake word command extraction bug fix
"""

import sys
import os
from pathlib import Path
from unittest.mock import Mock, patch

# Add the room-client src to path
room_client_src = str(Path(__file__).parent.parent / "room-client" / "src")
sys.path.insert(0, room_client_src)


def test_wake_word_command_extraction():
    """Test that commands following wake words are properly extracted and processed"""
    print("🐛 Testing Wake Word Command Extraction Bug Fix")
    print("=" * 60)

    try:
        # Import required modules
        from voice.handler import VoiceCommandHandler

        print("✅ VoiceCommandHandler import successful")

        # Create test configuration
        config = {
            "wake_word": "aida",
            "wake_word_similarity_threshold": 0.6,
            "wake_word_phonetic_matching": True,
            "wake_word_variations": ["apartment", "apartement"],
            "backend_url": "http://localhost:3000",
            "voice_commands_enabled": False,  # Don't start actual audio processing
            "use_native_stt": False,
            "wake_word_timeout": 120,
        }

        # Create handler
        handler = VoiceCommandHandler(config)
        print("✅ VoiceCommandHandler initialization successful")

        # Test command extraction method
        test_cases = [
            ("aida turn on the lights", "turn on the lights"),
            ("aida, can you play some music", "play some music"),
            ("aida please set a timer for 5 minutes", "set a timer for 5 minutes"),
            ("apartment lower the volume", "lower the volume"),
            ("aida and then turn off the tv", "turn off the tv"),
            ("hey aida what time is it", "what time is it"),
            ("aida", ""),  # Just wake word, no command
        ]

        print("\n🧪 Testing command extraction:")
        passed = 0
        total = len(test_cases)

        for input_text, expected_command in test_cases:
            # Test the extraction method directly
            extracted = handler._extract_command_after_wake_word(input_text, "aida")

            if extracted.strip() == expected_command.strip():
                status = "✅ PASS"
                passed += 1
            else:
                status = "❌ FAIL"

            print(
                f"{status} '{input_text}' -> '{extracted}' (expected: '{expected_command}')"
            )

        print(
            f"\n📊 Results: {passed}/{total} tests passed ({passed / total * 100:.1f}%)"
        )

        # Test the full wake word detection and command processing flow
        print("\n🔄 Testing Full Processing Flow:")

        # Mock the _process_voice_command method to capture what gets processed
        processed_commands = []
        original_process_command = handler._process_voice_command

        def mock_process_command(text):
            processed_commands.append(text)
            print(f"   📝 Command processed: '{text}'")

        handler._process_voice_command = mock_process_command

        # Simulate transcribed audio processing
        test_phrases = [
            "aida turn on the lights",
            "aida play some jazz music",
            "apartment what's the weather like",
            "just some random text without wake word",
        ]

        for phrase in test_phrases:
            print(f"\n🎤 Simulating: '{phrase}'")

            # Simulate the wake word detection and processing logic
            if handler.wake_word_only_mode:
                detection_result = handler.wake_word_detector.detect_wake_word(phrase)
                if detection_result["detected"]:
                    handler.wake_word_detected = True
                    import time

                    handler.last_wake_word_time = time.time()
                    print(
                        f"   ✅ Wake word detected: {detection_result['matched_word']}"
                    )

                    # Extract and process command
                    command_text = handler._extract_command_after_wake_word(
                        phrase, detection_result["matched_word"]
                    )
                    if command_text.strip():
                        print(f"   🎯 Extracted command: '{command_text}'")
                        handler._process_voice_command(command_text)
                    else:
                        print("   ℹ️  No command found after wake word")
                else:
                    print("   ❌ No wake word detected")

        # Restore original method
        handler._process_voice_command = original_process_command

        print(f"\n📋 Commands that would be processed:")
        for i, cmd in enumerate(processed_commands, 1):
            print(f"   {i}. '{cmd}'")

        # Verify we got the expected commands
        expected_commands = [
            "turn on the lights",
            "play some jazz music",
            "what's the weather like",
        ]
        success = len(processed_commands) == len(expected_commands)

        if success:
            for expected, actual in zip(expected_commands, processed_commands):
                if expected.strip() != actual.strip():
                    success = False
                    break

        print(f"\n🎉 Full flow test: {'✅ PASSED' if success else '❌ FAILED'}")

        return passed == total and success

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_wake_word_command_extraction()

    print("\n" + "=" * 60)
    if success:
        print("✅ Bug fix verified! Wake word command extraction is working correctly.")
        print("🚀 The system now properly processes commands that follow wake words.")
    else:
        print("❌ Bug fix verification failed. Please check the errors above.")

    sys.exit(0 if success else 1)
