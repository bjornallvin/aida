#!/usr/bin/env python3
"""
Simple integration test for wake word detection refactoring
"""

import sys
import os
from pathlib import Path

# Add the room-client src to path
room_client_src = str(Path(__file__).parent.parent / "room-client" / "src")
sys.path.insert(0, room_client_src)


def test_wake_word_detector():
    """Test that the WakeWordDetector works correctly"""
    print("🎯 Testing WakeWordDetector")
    print("=" * 50)

    try:
        # Test direct import of WakeWordDetector
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

        # Test detection methods
        test_cases = [
            ("apartment", True, "exact match"),
            ("apartmant", True, "fuzzy match"),
            ("apartmint", True, "phonetic match"),
            ("a part ment", True, "multi-word match"),
            ("aida", True, "variation match"),
            ("hello world", False, "no match"),
            ("important", False, "false positive check"),
        ]

        print("\n🔍 Testing detection methods:")
        passed = 0
        for text, expected, description in test_cases:
            result = detector.detect_wake_word(text)
            detected = result["detected"]
            if detected == expected:
                status = "✅"
                passed += 1
            else:
                status = "❌"

            if detected:
                print(
                    f"{status} '{text}' -> {description} (method: {result['method']}, confidence: {result['confidence']:.2f})"
                )
            else:
                print(f"{status} '{text}' -> {description}")

        print(f"\n📊 Results: {passed}/{len(test_cases)} tests passed")

        print("\n📊 Detector status:")
        status = detector.get_status()
        for key, value in status.items():
            print(f"  {key}: {value}")

        return passed == len(test_cases)

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("Wake Word Detection Simple Integration Test")
    print("=" * 60)

    success = test_wake_word_detector()

    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed! Wake word detection is working correctly.")
    else:
        print("❌ Some tests failed. Please check the errors above.")

    sys.exit(0 if success else 1)
