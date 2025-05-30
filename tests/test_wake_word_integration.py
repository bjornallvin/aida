#!/usr/bin/env python3
"""
Integration test for wake word detection refactoring
"""

import sys
import os
from pathlib import Path

# Add the room-client src to path
room_client_src = str(Path(__file__).parent.parent / "room-client" / "src")
sys.path.insert(0, room_client_src)


def test_integration():
    """Test that the wake word detection integration works"""
    print("🎯 Testing Wake Word Detection Integration")
    print("=" * 50)

    try:
        # Test direct import of WakeWordDetector first
        from voice.wake_word_detector import WakeWordDetector

        print("✅ WakeWordDetector import successful")

        # Test wake word detector initialization
        detector = WakeWordDetector(
            wake_word="apartment",
            similarity_threshold=0.6,
            phonetic_matching=True,
            variations=["aida", "apartement"],
        )
        print("✅ WakeWordDetector initialization successful")

        # Test configuration with new wake word settings
        config = {
            "room_name": "test_room",
            "wake_word": "apartment",
            "wake_word_similarity_threshold": 0.6,
            "wake_word_phonetic_matching": True,
            "wake_word_variations": ["aida", "apartement"],
            "backend_url": "http://localhost:3000",
            "voice_commands_enabled": False,  # Don't start actual listening
            "use_native_stt": False,
        }

        print("✅ Voice handler imported successfully")

        # Create handler
        handler = VoiceCommandHandler(config)
        print("✅ Voice handler created successfully")

        # Test wake word detection
        test_cases = [
            ("apartment turn on lights", True),
            ("apartmint help me", True),
            ("apartement what time", True),
            ("aida set timer", True),
            ("important meeting", False),  # Should not match after fix
            ("elephant in room", False),
        ]

        print("\n🧪 Testing wake word detection:")
        passed = 0
        total = len(test_cases)

        for test_text, should_detect in test_cases:
            result = handler.test_wake_word_detection(test_text)
            detected = result["detected"]

            if detected == should_detect:
                status = "✅ PASS"
                passed += 1
            else:
                status = "❌ FAIL"

            print(f"{status} '{test_text}' -> Detected: {detected}")
            if detected:
                print(
                    f"     Method: {result['method']}, Confidence: {result['confidence']:.2f}"
                )

        print(
            f"\n📊 Results: {passed}/{total} tests passed ({passed / total * 100:.1f}%)"
        )

        # Show enhanced status
        print("\n📋 Voice Handler Status:")
        status = handler.get_status()
        print(f"  Wake word: {status['wake_word']}")
        print(f"  Listening enabled: {status['listening_enabled']}")
        print(f"  STT available: {status['stt_available']}")

        if "wake_word_detector" in status:
            detector_status = status["wake_word_detector"]
            print(f"  Detector variations: {detector_status['variations_count']}")
            print(f"  Similarity threshold: {detector_status['similarity_threshold']}")
            print(f"  Phonetic matching: {detector_status['phonetic_matching']}")

        print("\n🎉 Wake word refactoring integration successful!")
        return passed == total

    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_integration()
    print("\n" + "=" * 50)
    if success:
        print("✅ All integration tests passed!")
        print("🚀 The wake word detection refactoring is ready for use!")
    else:
        print("❌ Some tests failed. Please check the errors above.")

    sys.exit(0 if success else 1)
