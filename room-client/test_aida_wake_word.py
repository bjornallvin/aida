#!/usr/bin/env python3
"""
Test script to verify the wake word change from "apartment" to "aida"
"""

import sys
from pathlib import Path

# Add the room-client directory to path for proper module structure
room_client_path = str(Path(__file__).parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)

from src.config import ConfigManager
from src.voice.wake_word_detector import WakeWordDetector


def test_aida_wake_word():
    """Test that Aida is now the primary wake word"""
    print("🎯 Testing Aida Wake Word Configuration")
    print("=" * 50)

    try:
        # Test 1: Configuration loading
        print("1. Testing configuration loading...")
        config_manager = ConfigManager("client.json")
        wake_word = config_manager.get("wake_word")
        variations = config_manager.get("wake_word_variations")

        print(f"   ✅ Primary wake word: '{wake_word}'")
        print(f"   ✅ Variations: {variations}")

        if wake_word != "aida":
            print(f"   ❌ Expected 'aida', got '{wake_word}'")
            return False

        # Test 2: Wake word detector initialization
        print("\n2. Testing wake word detector...")
        detector = WakeWordDetector(
            wake_word=wake_word,
            similarity_threshold=0.6,
            phonetic_matching=True,
            custom_variations=variations,
        )

        status = detector.get_status()
        print(f"   ✅ Detector initialized with '{status['wake_word']}'")
        print(f"   ✅ Total variations: {status['variations_count']}")

        # Test 3: Detection scenarios
        print("\n3. Testing detection scenarios...")
        test_cases = [
            # Aida variations (should detect)
            ("aida turn on lights", True, "Primary wake word"),
            ("ayda help me", True, "Phonetic variation"),
            ("ada what time", True, "Short variation"),
            ("hey aida play music", True, "Natural speech"),
            ("aide set timer", True, "Spelling variation"),
            # Apartment still works as variation (should detect)
            ("apartment play jazz", True, "Apartment as variation"),
            ("apartement volume up", True, "Apartment misspelling"),
            # Should not detect
            ("hello world", False, "Unrelated text"),
            ("important meeting", False, "False positive check"),
        ]

        passed = 0
        total = len(test_cases)

        for text, should_detect, description in test_cases:
            result = detector.detect_wake_word(text)
            detected = result["detected"]

            if detected == should_detect:
                status_icon = "✅"
                passed += 1
            else:
                status_icon = "❌"

            print(f"   {status_icon} '{text}' -> {description}")
            if detected and should_detect:
                print(
                    f"      Method: {result['method']}, Confidence: {result['confidence']:.2f}"
                )

        print(
            f"\n📊 Results: {passed}/{total} tests passed ({passed / total * 100:.1f}%)"
        )

        if passed == total:
            print("\n🎉 SUCCESS! Wake word successfully changed to 'Aida'")
            print("\n✅ Key improvements:")
            print("   • Primary wake word is now 'aida'")
            print("   • 'apartment' remains available as a variation")
            print("   • All aida variations (ayda, ada, aide, etc.) work")
            print("   • Phonetic and fuzzy matching enabled")
            print("   • False positive prevention maintained")

            return True
        else:
            print(f"\n⚠️  {total - passed} tests failed")
            return False

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_aida_wake_word()
    print(f"\n{'=' * 50}")
    print(f"Wake Word Change Result: {'✅ SUCCESS' if success else '❌ FAILED'}")

    if success:
        print("\n🚀 The wake word has been successfully changed to 'Aida'!")
        print(
            "   You can now say 'Aida' instead of 'apartment' to activate voice commands."
        )

    sys.exit(0 if success else 1)
