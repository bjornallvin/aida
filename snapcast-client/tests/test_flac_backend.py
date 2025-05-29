#!/usr/bin/env python3

import requests


def test_backend_with_flac():
    """Test our backend /speech-to-text endpoint with FLAC format"""
    print("🎯 Testing backend /speech-to-text with FLAC...")

    try:
        with open("test_audio.flac", "rb") as audio_file:
            files = {"audio": ("test_audio.flac", audio_file, "audio/flac")}

            print("📤 Sending FLAC file to backend...")
            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

            print(f"📬 Response status: {response.status_code}")
            print(f"📝 Response: {response.text}")

            if response.status_code == 200:
                result = response.json()
                print(
                    f"✅ SUCCESS! Backend transcription: '{result.get('text', 'No text')}'"
                )
                return True
            else:
                print(f"❌ FAILED! Backend error: {response.text}")
                return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


if __name__ == "__main__":
    test_backend_with_flac()
