#!/usr/bin/env python3

import requests


def test_backend_with_debug():
    """Test backend with detailed file information"""
    print("🎯 Testing backend with debug info...")

    try:
        # Use the FLAC file which should work
        with open("test_audio.flac", "rb") as audio_file:
            files = {"audio": ("test_audio.flac", audio_file, "audio/flac")}

            print("📤 Sending FLAC file to backend with debug...")
            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

            print(f"📬 Response status: {response.status_code}")
            print(f"📝 Response: {response.text}")

    except Exception as e:
        print(f"❌ Exception: {e}")


if __name__ == "__main__":
    test_backend_with_debug()
