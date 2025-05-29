#!/usr/bin/env python3
"""
Simple Voice-to-Voice Test for Aida
Tests the backend speech-to-text and voice command endpoints
"""

import tempfile
import requests
import subprocess
import json
import os


def create_simple_audio():
    """Create a simple MP3 audio file using macOS say command"""
    print("Creating test MP3 audio...")

    # Create temporary MP3 file
    temp_mp3 = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    temp_mp3.close()

    try:
        # Use say command to create audio in AIFF, then convert to MP3
        temp_aiff = tempfile.NamedTemporaryFile(suffix=".aiff", delete=False)
        temp_aiff.close()

        # Create AIFF with say
        subprocess.run(
            [
                "say",
                "-o",
                temp_aiff.name,
                "Hello Aida, this is a test message for voice recognition",
            ],
            check=True,
        )

        # Convert to MP3 using afconvert
        subprocess.run(
            ["afconvert", temp_aiff.name, temp_mp3.name, "-f", "mp4f", "-d", "aac"],
            check=True,
        )

        # Clean up AIFF
        os.unlink(temp_aiff.name)

        print(f"✅ Created MP3: {temp_mp3.name}")
        return temp_mp3.name

    except Exception as e:
        print(f"❌ Failed to create MP3: {e}")
        return None


def test_speech_to_text(audio_file):
    """Test the speech-to-text endpoint"""
    print("\n🗣️  Testing speech-to-text endpoint...")

    try:
        with open(audio_file, "rb") as f:
            files = {"audio": ("test.mp3", f, "audio/mpeg")}
            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            result = response.json()
            transcription = result.get("text", "")
            print(f"✅ Transcription: {transcription}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_voice_command(audio_file):
    """Test the voice command endpoint"""
    print("\n🎯 Testing voice command endpoint...")

    try:
        with open(audio_file, "rb") as f:
            files = {"audio": ("test.mp3", f, "audio/mpeg")}
            data = {"roomName": "test_room", "conversationHistory": json.dumps([])}

            response = requests.post(
                "http://localhost:3000/voice-command",
                files=files,
                data=data,
                timeout=45,
            )

        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            result = response.json()
            transcription = result.get("transcription", "")
            ai_response = result.get("response", "")
            audio_file_path = result.get("audioFile", "")

            print(f"✅ Transcription: {transcription}")
            print(f"✅ AI Response: {ai_response}")
            print(f"✅ Audio file: {audio_file_path}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    print("🎤 Simple Voice Test for Aida")
    print("=" * 50)

    # Create test audio
    audio_file = create_simple_audio()
    if not audio_file:
        print("❌ Failed to create test audio")
        return

    try:
        # Test speech-to-text
        test_speech_to_text(audio_file)

        # Test voice command
        test_voice_command(audio_file)

    finally:
        # Clean up
        if audio_file and os.path.exists(audio_file):
            os.unlink(audio_file)
            print(f"🧹 Cleaned up: {audio_file}")


if __name__ == "__main__":
    main()
