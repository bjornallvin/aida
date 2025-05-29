#!/usr/bin/env python3

import requests


def test_backend_speech_to_text():
    """Test our backend /speech-to-text endpoint with working MP3"""
    print("🎯 Testing backend /speech-to-text endpoint...")

    try:
        with open("test_audio_proper.mp3", "rb") as audio_file:
            files = {"audio": ("test_audio_proper.mp3", audio_file, "audio/mpeg")}

            print("📤 Sending request to backend...")
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
    test_backend_speech_to_text()
