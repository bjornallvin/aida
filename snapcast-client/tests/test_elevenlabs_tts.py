#!/usr/bin/env python3

import requests
import os


def test_elevenlabs_direct():
    """Test ElevenLabs API directly"""
    # Get API key from backend .env
    with open("../backend/.env", "r") as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                break

    print(f"🎯 Testing ElevenLabs API directly...")
    print(f"🔑 API Key: {api_key[:10]}...{api_key[-10:]}")

    # Test with ElevenLabs API
    url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"  # Default voice
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key,
    }

    data = {
        "text": "Hello! This is a test of the ElevenLabs text to speech API.",
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
    }

    try:
        print("📤 Sending request to ElevenLabs...")
        response = requests.post(url, json=data, headers=headers, timeout=30)

        print(f"📬 Response status: {response.status_code}")
        print(f"📝 Response headers: {dict(response.headers)}")

        if response.status_code == 200:
            # Save the audio
            with open("elevenlabs_test.mp3", "wb") as f:
                f.write(response.content)
            print(
                f"✅ SUCCESS! Audio saved to elevenlabs_test.mp3 ({len(response.content)} bytes)"
            )
            return True
        else:
            print(f"❌ FAILED! Error: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


def test_backend_tts():
    """Test our backend /tts endpoint"""
    print(f"\n🎯 Testing backend /tts endpoint...")

    data = {
        "text": "Hello Aida! This is a test of the backend text to speech.",
        "room": "test_room",
    }

    try:
        print("📤 Sending request to backend TTS...")
        response = requests.post("http://localhost:3000/tts", json=data, timeout=30)

        print(f"📬 Response status: {response.status_code}")

        if response.status_code == 200:
            # Save the audio
            with open("backend_tts_test.mp3", "wb") as f:
                f.write(response.content)
            print(
                f"✅ SUCCESS! Backend TTS audio saved ({len(response.content)} bytes)"
            )
            return True
        else:
            print(f"❌ FAILED! Backend TTS error: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("🔊 Testing ElevenLabs TTS with corrected API key")
    print("=" * 60)

    # Test ElevenLabs directly first
    elevenlabs_success = test_elevenlabs_direct()

    # If ElevenLabs works, test our backend
    if elevenlabs_success:
        backend_success = test_backend_tts()
        if backend_success:
            print(f"\n🎉 COMPLETE TTS SUCCESS!")
            print("🔊 You can play the test files:")
            print("   afplay elevenlabs_test.mp3")
            print("   afplay backend_tts_test.mp3")

    print(f"\n{'=' * 60}")
    print("🏁 TTS testing complete!")
    print(f"{'=' * 60}")
