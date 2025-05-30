#!/usr/bin/env python3
"""
Final verification of wake word detection refactoring
"""

import sys
from pathlib import Path

# Add the room-client directory to path for proper module structure
room_client_path = str(Path(__file__).parent.parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)


def main():
    print("🎯 Wake Word Detection - Final Verification")
    print("=" * 60)

    try:
        # Import and test WakeWordDetector
        from src.voice.wake_word_detector import WakeWordDetector

        print("✅ WakeWordDetector import successful")

        # Create detector with apartment configuration
        detector = WakeWordDetector(
            wake_word="apartment",
            similarity_threshold=0.6,
            phonetic_matching=True,
            custom_variations=["aida", "apartement", "appartment"],
        )
        print("✅ Detector initialization successful")

        # Test the key scenarios that were failing before
        print("\n🔍 Testing key scenarios:")
        test_cases = [
            # Exact matches
            ("apartment turn on lights", True, "Exact wake word"),
            ("aida what time is it", True, "Custom variation"),
            # Speech recognition variations that were failing before
            ("apartmant help me", True, "Typo variation (apartmant)"),
            ("apartmint set timer", True, "Phonetic variation (apartmint)"),
            ("apartement play music", True, "Custom variation (apartement)"),
            ("a part ment volume up", True, "Split words"),
            # False positive prevention
            ("important meeting tomorrow", False, "Should NOT match 'important'"),
            ("department store visit", False, "Should NOT match 'department'"),
            ("elephant in the room", False, "Unrelated word"),
        ]

        passed = 0
        total = len(test_cases)

        for text, expected, description in test_cases:
            result = detector.detect_wake_word(text)
            detected = result["detected"]

            if detected == expected:
                status = "✅ PASS"
                passed += 1
            else:
                status = "❌ FAIL"

            if detected:
                print(f"{status} '{text}' -> {description}")
                print(
                    f"     Method: {result['method']}, Confidence: {result['confidence']:.2f}"
                )
            else:
                print(f"{status} '{text}' -> {description}")

        print(
            f"\n📊 Results: {passed}/{total} tests passed ({passed / total * 100:.1f}%)"
        )

        # Show detector capabilities
        print(f"\n📋 Detector Status:")
        status = detector.get_status()
        print(f"  Wake word: {status['wake_word']}")
        print(f"  Total variations: {status['variations_count']}")
        print(f"  Similarity threshold: {status['similarity_threshold']}")
        print(f"  Phonetic matching: {status['phonetic_matching']}")

        if passed == total:
            print("\n🎉 SUCCESS! Wake word detection refactoring is complete!")
            print("\n🚀 Key improvements achieved:")
            print("   ✅ Handles speech recognition typos (apartmant, apartmint)")
            print("   ✅ Supports custom variations (aida, apartement)")
            print("   ✅ Processes split words (a part ment)")
            print("   ✅ Prevents false positives (important, department)")
            print("   ✅ Maintains exact matching for perfect transcriptions")
            print("   ✅ Configurable similarity thresholds")
            print("   ✅ Phonetic matching with Soundex algorithm")
            print("\n📝 Configuration options added:")
            print("   • wake_word_similarity_threshold: 0.6")
            print("   • wake_word_phonetic_matching: true")
            print("   • wake_word_variations: ['aida', 'apartement', 'appartment']")
            return True
        else:
            print(f"\n⚠️  {total - passed} tests failed. Review the results above.")
            return False

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()

    print("\n" + "=" * 60)
    if success:
        print("✅ Wake word detection refactoring COMPLETE and VERIFIED!")
        print("🎯 The system is ready for production use.")
    else:
        print("❌ Verification failed. Please review the errors above.")

    sys.exit(0 if success else 1)
