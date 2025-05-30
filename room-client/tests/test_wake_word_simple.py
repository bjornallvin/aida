#!/usr/bin/env python3
"""
Simple test script for wake word detection
"""

import sys
from pathlib import Path

# Add the room-client directory to path for proper module structure
room_client_path = str(Path(__file__).parent.parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)


def test_wake_word_simple():
    """Simple test of wake word detection"""
    print("🎯 Testing Wake Word Detection")
    print("=" * 40)

    # Import wake word detector
    try:
        from src.voice.wake_word_detector import WakeWordDetector
    except ImportError as e:
        print(f"❌ Could not import wake word detector: {e}")
        return False

    # Create detector
    detector = WakeWordDetector(
        wake_word="aida",
        similarity_threshold=0.6,
        phonetic_matching=True,
        custom_variations=["apartment"],
    )

    # Test cases
    test_cases = [
        ("aida turn on lights", True),  # Exact match
        ("ayda help me", True),  # Variation
        ("ada what time", True),  # Short variation
        ("apartment set timer", True),  # Custom variation (backward compatibility)
        ("elephant in room", False),  # Should not match
        ("important meeting", False),  # Should not match
    ]

    passed = 0
    total = len(test_cases)

    for text, should_detect in test_cases:
        result = detector.detect_wake_word(text)
        detected = result["detected"]

        if detected == should_detect:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"

        print(f"{status} '{text}' -> Detected: {detected}")
        if detected:
            print(
                f"    Method: {result['method']}, Confidence: {result['confidence']:.2f}"
            )

    print("-" * 40)
    print(f"Results: {passed}/{total} tests passed ({passed / total * 100:.1f}%)")

    return passed == total


if __name__ == "__main__":
    success = test_wake_word_simple()
    sys.exit(0 if success else 1)
