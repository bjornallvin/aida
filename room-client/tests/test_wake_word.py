#!/usr/bin/env python3
"""
Test script for the improved wake word detection system
"""

import sys
import os
import logging
from pathlib import Path
import importlib.util


# Import the wake word detector directly to avoid relative import issues
def import_wake_word_detector():
    """Import wake word detector module directly"""
    detector_path = (
        Path(__file__).parent.parent
        / "room-client"
        / "src"
        / "voice"
        / "wake_word_detector.py"
    )
    spec = importlib.util.spec_from_file_location("wake_word_detector", detector_path)
    if spec is None:
        raise ImportError(f"Could not load wake word detector from {detector_path}")

    wake_word_module = importlib.util.module_from_spec(spec)
    if spec.loader is None:
        raise ImportError("Could not get module loader")

    spec.loader.exec_module(wake_word_module)
    return wake_word_module.WakeWordDetector


# Get the WakeWordDetector class
try:
    WakeWordDetector = import_wake_word_detector()
except Exception as e:
    print(f"❌ Failed to import WakeWordDetector: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def test_wake_word_detection():
    """Test the wake word detection with various inputs"""

    print("🎯 Testing Improved Wake Word Detection")
    print("=" * 50)

    # Initialize detector
    detector = WakeWordDetector(
        wake_word="apartment",
        similarity_threshold=0.6,
        phonetic_matching=True,
        custom_variations=["aida", "hey apartment"],
    )

    # Test cases - simulating various transcription results
    test_cases = [
        # Exact matches
        "apartment turn on the lights",
        "hey apartment what time is it",
        # Common misspellings/variations
        "apartement can you help me",
        "apartament how are you",
        "appartment please play music",
        "apartmant what's the weather",
        # Phonetic variations
        "apartmint turn off the tv",
        "apartent show me the news",
        "apertment set a timer",
        # Split words
        "a part mint help me",
        "apart ment what time is it",
        "a part ment turn on lights",
        # Similar sounding words
        "apartment set alarm",  # Should match
        "department store hours",  # Should NOT match
        "compartment is full",  # Should NOT match
        # Custom variations
        "aida turn on the lights",
        "hey apartment play music",
        # Edge cases
        "apartmnet help",  # Typo
        "appartement français",  # French spelling
        "apartamento en español",  # Spanish
        # Should not match
        "elephant in the room",
        "important meeting today",
        "apartment building for sale",  # Contains word but different context
    ]

    print(f"\n📊 Testing with {len(test_cases)} test cases:")
    print("-" * 50)

    successful_detections = 0

    for i, test_text in enumerate(test_cases, 1):
        result = detector.detect_wake_word(test_text)

        status_emoji = "✅" if result["detected"] else "❌"

        print(f"{i:2d}. {status_emoji} Input: '{test_text}'")

        if result["detected"]:
            successful_detections += 1
            print(f"     Method: {result['method']}")
            print(f"     Matched: '{result['matched_word']}'")
            print(f"     Confidence: {result['confidence']:.2f}")
            print(f"     Similarity: {result['similarity_score']:.2f}")

        print()

    print("=" * 50)
    print(f"📈 Results Summary:")
    print(f"   Total tests: {len(test_cases)}")
    print(f"   Detections: {successful_detections}")
    print(f"   Detection rate: {successful_detections / len(test_cases) * 100:.1f}%")

    # Show detector status
    print(f"\n🔧 Detector Configuration:")
    status = detector.get_status()
    print(f"   Wake word: {status['wake_word']}")
    print(f"   Similarity threshold: {status['similarity_threshold']}")
    print(f"   Phonetic matching: {status['phonetic_matching']}")
    print(f"   Total variations: {status['variations_count']}")
    print(
        f"   Variations: {', '.join(status['variations'][:10])}{'...' if len(status['variations']) > 10 else ''}"
    )

    return detector


def interactive_test():
    """Interactive testing mode"""
    print("\n🎮 Interactive Testing Mode")
    print("Enter transcribed text to test wake word detection.")
    print("Type 'quit' to exit, 'status' to see detector info.")
    print("-" * 50)

    detector = WakeWordDetector(
        wake_word="apartment",
        similarity_threshold=0.6,
        phonetic_matching=True,
        custom_variations=["aida", "hey apartment"],
    )

    while True:
        try:
            user_input = input("\n🎤 Enter transcribed text: ").strip()

            if user_input.lower() in ["quit", "exit", "q"]:
                print("👋 Goodbye!")
                break

            if user_input.lower() == "status":
                status = detector.get_status()
                print(f"📊 Detector Status:")
                for key, value in status.items():
                    if key != "variations":  # Too long to display
                        print(f"   {key}: {value}")
                continue

            if user_input.lower().startswith("add "):
                variation = user_input[4:].strip()
                detector.add_variation(variation)
                print(f"✅ Added variation: '{variation}'")
                continue

            if not user_input:
                continue

            result = detector.detect_wake_word(user_input)

            if result["detected"]:
                print(f"✅ DETECTED!")
                print(f"   Method: {result['method']}")
                print(f"   Matched: '{result['matched_word']}'")
                print(f"   Confidence: {result['confidence']:.2f}")
                print(f"   Similarity: {result['similarity_score']:.2f}")
            else:
                print(f"❌ Not detected")

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("🏠 AIDA Room Client - Wake Word Detection Test")
    print("=" * 60)

    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        interactive_test()
    else:
        detector = test_wake_word_detection()

        print("\n💡 To run interactive test mode:")
        print("   python test_wake_word.py --interactive")

        print("\n🔗 To integrate with your voice handler:")
        print("   detector = WakeWordDetector('apartment', similarity_threshold=0.6)")
        print("   result = detector.detect_wake_word(transcribed_text)")
        print("   if result['detected']: # Handle wake word detection")
