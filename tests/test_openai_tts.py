#!/usr/bin/env python3
"""
Simple test for OpenAI TTS integration
Tests the new OpenAI TTS client replacing ElevenLabs
"""

import requests
import json
import time
import os
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:3000"
TEST_AUDIO_DIR = Path("test_audio_output")


def setup_test_environment():
    """Create test directory for audio files"""
    TEST_AUDIO_DIR.mkdir(exist_ok=True)
    print(f"✅ Test directory created: {TEST_AUDIO_DIR}")


def test_tts_endpoint():
    """Test the TTS endpoint with OpenAI"""
    print("\n🔊 Testing OpenAI TTS endpoint...")

    # Test data
    test_cases = [
        {
            "text": "Hello! This is a test of the new OpenAI text-to-speech system.",
            "room": "living_room",
            "language": "english",
            "description": "English TTS test",
        },
        {
            "text": "Hej! Detta är ett test av det nya OpenAI text-till-tal systemet.",
            "room": "bedroom",
            "language": "swedish",
            "description": "Swedish TTS test",
        },
        {
            "text": "This is an auto-detection test with mixed content. Hej från Sverige!",
            "room": "kitchen",
            "language": "auto",
            "description": "Auto-detection test",
        },
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- Test {i}: {test_case['description']} ---")

        try:
            # Make TTS request
            response = requests.post(
                f"{BACKEND_URL}/tts",
                json={
                    "text": test_case["text"],
                    "room": test_case["room"],
                    "language": test_case["language"],
                },
                timeout=30,
            )

            if response.status_code == 200:
                result = response.json()
                print(f"✅ TTS generated successfully")
                print(f"   📁 Filename: {result.get('filename', 'N/A')}")
                print(
                    f"   📝 Text length: {result.get('textLength', 'N/A')} characters"
                )
                print(f"   🏠 Room: {result.get('room', 'N/A')}")
            else:
                print(f"❌ TTS failed with status {response.status_code}")
                print(f"   Error: {response.text}")

        except requests.exceptions.Timeout:
            print(f"⏰ Request timed out (>30s)")
        except requests.exceptions.ConnectionError:
            print(f"🔌 Connection error - is the backend running?")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")

        # Wait between tests
        time.sleep(1)


def test_tts_file_generation():
    """Test TTS file generation endpoint"""
    print("\n📁 Testing TTS file generation...")

    try:
        response = requests.post(
            f"{BACKEND_URL}/tts/generate",
            json={
                "text": "This is a test file generation using OpenAI TTS.",
                "language": "english",
            },
            timeout=30,
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ TTS file generated successfully")
            print(f"   📁 Filename: {result.get('filename', 'N/A')}")

            # Try to download the file
            file_url = f"{BACKEND_URL}/audio/{result.get('filename')}"
            file_response = requests.get(file_url)

            if file_response.status_code == 200:
                # Save the file locally for verification
                local_file = TEST_AUDIO_DIR / result.get("filename", "test.mp3")
                with open(local_file, "wb") as f:
                    f.write(file_response.content)
                print(f"✅ Audio file downloaded: {local_file}")
                print(f"   📦 File size: {len(file_response.content)} bytes")
            else:
                print(
                    f"❌ Could not download audio file (status: {file_response.status_code})"
                )
        else:
            print(f"❌ File generation failed with status {response.status_code}")
            print(f"   Error: {response.text}")

    except Exception as e:
        print(f"❌ File generation test failed: {e}")


def test_backend_health():
    """Test if backend is running and responsive"""
    print("🏥 Testing backend health...")

    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy and responsive")
            return True
        else:
            print(f"⚠️  Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend - is it running on port 3000?")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


def main():
    """Run all TTS tests"""
    print("🚀 Starting OpenAI TTS Integration Tests")
    print("=" * 50)

    # Setup
    setup_test_environment()

    # Health check
    if not test_backend_health():
        print("\n❌ Backend health check failed. Please ensure:")
        print("   1. Backend is running (npm start or npm run dev)")
        print("   2. Backend is accessible on http://localhost:3000")
        print("   3. OPENAI_API_KEY is set in environment variables")
        return

    # Run TTS tests
    test_tts_endpoint()
    test_tts_file_generation()

    print("\n" + "=" * 50)
    print("🏁 OpenAI TTS Integration Tests Complete")
    print(f"📁 Check {TEST_AUDIO_DIR} for generated audio files")
    print("\nNote: If tests pass, your OpenAI TTS integration is working correctly! 🎉")


if __name__ == "__main__":
    main()
