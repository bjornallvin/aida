#!/usr/bin/env python3
"""
Simple test script for wake word detection
"""

import sys
import importlib.util
from pathlib import Path


def test_wake_word_simple():
    """Simple test of wake word detection"""
    print("🎯 Testing Wake Word Detection")
    print("=" * 40)

    # Import wake word detector
    detector_path = (
        Path(__file__).parent.parent
        / "room-client"
        / "src"
        / "voice"
        / "wake_word_detector.py"
    )
    spec = importlib.util.spec_from_file_location("wake_word_detector", detector_path)

    if spec is None or spec.loader is None:
        print("❌ Could not load wake word detector")
        return False

    wake_word_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(wake_word_module)
    WakeWordDetector = wake_word_module.WakeWordDetector

    # Create detector
    detector = WakeWordDetector(
        wake_word="apartment",
        similarity_threshold=0.6,
        phonetic_matching=True,
        custom_variations=["aida"],
    )

    # Test cases
    test_cases = [
        ("apartment turn on lights", True),  # Exact match
        ("apartmint help me", True),  # Variation
        ("apartement what time", True),  # Misspelling
        ("aida set timer", True),  # Custom variation
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
