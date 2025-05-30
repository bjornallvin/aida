#!/usr/bin/env python3
"""
Test runner for room-client tests with simplified imports
"""

import sys
from pathlib import Path


def test_imports():
    """Test that all imports work correctly"""
    print("🧪 Testing Room-Client Test Imports")
    print("=" * 40)

    # Add the room-client directory to path for proper module structure
    room_client_path = str(Path(__file__).parent.parent)
    if room_client_path not in sys.path:
        sys.path.insert(0, room_client_path)

    try:
        # Test wake word detector import
        from src.voice.wake_word_detector import WakeWordDetector

        print("✅ WakeWordDetector import successful")

        # Test client import (this is easier since it doesn't use relative imports)
        import main

        print("✅ Main module import successful")

        return True

    except ImportError as e:
        print(f"❌ Import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def run_simple_wake_word_test():
    """Run a simple wake word test"""
    print("\n🎯 Running Simple Wake Word Test")
    print("=" * 40)

    try:
        from src.voice.wake_word_detector import WakeWordDetector

        # Create detector
        detector = WakeWordDetector(
            wake_word="apartment",
            similarity_threshold=0.6,
            phonetic_matching=True,
            custom_variations=["aida"],
        )

        # Test cases
        test_cases = [
            ("apartment turn on lights", True),
            ("apartmint help me", True),
            ("apartement what time", True),
            ("aida set timer", True),
            ("elephant in room", False),
        ]

        passed = 0
        for text, should_detect in test_cases:
            result = detector.detect_wake_word(text)
            detected = result["detected"]

            if detected == should_detect:
                status = "✅ PASS"
                passed += 1
            else:
                status = "❌ FAIL"

            print(f"{status} '{text}' -> {detected}")

        print(f"\nResults: {passed}/{len(test_cases)} tests passed")
        return passed == len(test_cases)

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Room-Client Test Suite")
    print("=" * 50)

    # Test imports
    imports_ok = test_imports()

    if imports_ok:
        # Run simple test
        test_ok = run_simple_wake_word_test()

        if test_ok:
            print("\n🎉 All tests passed! Import paths are working correctly.")
            sys.exit(0)
        else:
            print("\n❌ Tests failed")
            sys.exit(1)
    else:
        print("\n❌ Import tests failed")
        sys.exit(1)
