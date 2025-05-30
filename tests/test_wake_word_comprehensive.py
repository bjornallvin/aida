#!/usr/bin/env python3
"""
Comprehensive wake word detection integration test
"""

import sys
import os
from pathlib import Path

# Add the room-client src to path
room_client_src = str(Path(__file__).parent.parent / "room-client" / "src")
sys.path.insert(0, room_client_src)


def test_wake_word_detector_standalone():
    """Test WakeWordDetector in isolation"""
    print("🎯 Testing WakeWordDetector Standalone")
    print("=" * 50)

    try:
        from voice.wake_word_detector import WakeWordDetector

        print("✅ WakeWordDetector import successful")

        # Test with apartment configuration
        detector = WakeWordDetector(
            wake_word="apartment",
            similarity_threshold=0.6,
            phonetic_matching=True,
            custom_variations=["aida", "apartement", "appartment"],
        )
        print("✅ Detector initialization successful")

        # Comprehensive test cases
        test_cases = [
            ("apartment", True, "exact match"),
            ("apartmant", True, "typo variation"),
            ("apartmint", True, "phonetic variation"),
            ("a part ment", True, "split words"),
            ("aida", True, "custom variation"),
            ("apartement", True, "custom variation 2"),
            ("appartment", True, "custom variation 3"),
            ("important", False, "false positive check"),
            ("department", False, "false positive check 2"),
            ("hello world", False, "unrelated text"),
            ("elephant", False, "phonetically different"),
        ]

        print("\n🔍 Testing detection scenarios:")
        passed = 0
        for text, expected, description in test_cases:
            result = detector.detect_wake_word(text)
            detected = result["detected"]

            if detected == expected:
                status = "✅ PASS"
                passed += 1
            else:
                status = "❌ FAIL"

            if detected:
                print(
                    f"{status} '{text}' -> {description} (method: {result['method']}, conf: {result['confidence']:.2f})"
                )
            else:
                print(f"{status} '{text}' -> {description}")

        print(
            f"\n📊 Results: {passed}/{len(test_cases)} tests passed ({passed / len(test_cases) * 100:.1f}%)"
        )

        # Test dynamic configuration
        print("\n⚙️ Testing dynamic configuration:")
        detector.add_variation("custom_test")
        print("✅ Added custom variation")

        result = detector.detect_wake_word("custom_test")
        if result["detected"]:
            print("✅ Custom variation detected successfully")
        else:
            print("❌ Custom variation not detected")

        # Show status
        status = detector.get_status()
        print(f"\n📋 Detector status:")
        print(f"  Wake word: {status['wake_word']}")
        print(f"  Variations: {status['variations_count']}")
        print(f"  Threshold: {status['similarity_threshold']}")
        print(f"  Phonetic: {status['phonetic_matching']}")

        return passed == len(test_cases)

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_voice_handler_integration():
    """Test VoiceCommandHandler integration with WakeWordDetector"""
    print("\n🎯 Testing VoiceCommandHandler Integration")
    print("=" * 50)

    try:
        # Import required modules
        from voice import get_voice_command_handler

        print("✅ Voice handler import successful")

        # Create minimal config for testing
        config = {
            "wake_word": "apartment",
            "wake_word_similarity_threshold": 0.6,
            "wake_word_phonetic_matching": True,
            "wake_word_variations": ["aida", "apartement"],
            "backend_url": "http://localhost:3000",
            "voice_commands_enabled": False,  # Don't start actual audio processing
            "use_native_stt": False,
        }

        VoiceCommandHandler = get_voice_command_handler()
        handler = VoiceCommandHandler(config)
        print("✅ VoiceCommandHandler initialization successful")

        # Test that wake word detector is properly integrated
        if hasattr(handler, "wake_word_detector"):
            print("✅ Wake word detector is integrated")

            # Test detection through handler
            test_texts = [
                "apartment turn on lights",
                "apartmant help me",
                "aida what time is it",
                "important meeting tomorrow",
            ]

            print("\n🧪 Testing through handler:")
            for text in test_texts:
                result = handler.wake_word_detector.detect_wake_word(text)
                if result["detected"]:
                    print(f"✅ '{text}' -> detected via {result['method']}")
                else:
                    print(f"❌ '{text}' -> not detected")
        else:
            print("❌ Wake word detector not found in handler")
            return False

        print("✅ Voice handler integration successful")
        return True

    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_configuration_loading():
    """Test that configuration loading works correctly"""
    print("\n🎯 Testing Configuration Loading")
    print("=" * 50)

    try:
        # Test loading from client.json
        from config import ConfigManager

        config_manager = ConfigManager()
        config_manager.load("/Users/bjorn.allvin/Code/aida/room-client/client.json")

        # Check if wake word settings are loaded
        wake_word = config_manager.get("wake_word")
        threshold = config_manager.get("wake_word_similarity_threshold")
        phonetic = config_manager.get("wake_word_phonetic_matching")
        variations = config_manager.get("wake_word_variations")

        print(f"✅ Wake word: {wake_word}")
        print(f"✅ Threshold: {threshold}")
        print(f"✅ Phonetic matching: {phonetic}")
        print(f"✅ Variations: {variations}")

        if wake_word == "apartment" and threshold == 0.6:
            print("✅ Configuration loaded correctly")
            return True
        else:
            print("❌ Configuration values unexpected")
            return False

    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("🚀 Wake Word Detection - Comprehensive Integration Test")
    print("=" * 70)

    tests = [
        ("Standalone WakeWordDetector", test_wake_word_detector_standalone),
        ("VoiceCommandHandler Integration", test_voice_handler_integration),
        ("Configuration Loading", test_configuration_loading),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n{'=' * 20} {test_name} {'=' * 20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)

    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1

    success_rate = passed / len(results) * 100
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed ({success_rate:.1f}%)")

    if passed == len(results):
        print(
            "\n🎉 All tests passed! Wake word detection refactoring is complete and working!"
        )
        print("🚀 The system can now handle:")
        print("   • Exact wake word matches")
        print("   • Typos and variations (apartmant, apartmint)")
        print("   • Phonetic similarities")
        print("   • Split words (a part ment)")
        print("   • Custom variations (aida, apartement)")
        print("   • False positive prevention (important, department)")
    else:
        print(
            f"\n⚠️  {len(results) - passed} tests failed. Please review the errors above."
        )

    return passed == len(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
