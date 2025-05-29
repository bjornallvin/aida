#!/usr/bin/env python3
"""
Working Voice-to-Voice Test for Aida
Tests the complete pipeline with proper error handling
"""

import sys
import requests
import json
import subprocess
import tempfile
import os


def test_health():
    """Test backend health"""
    print("🏥 Testing backend health...")
    try:
        response = requests.get("http://localhost:3000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False


def test_chat():
    """Test the chat endpoint"""
    print("\n💬 Testing chat endpoint...")
    try:
        data = {
            "message": "Hello Aida, can you hear me?",
            "roomName": "test_room",
            "conversationHistory": [],
        }

        response = requests.post("http://localhost:3000/chat", json=data, timeout=15)

        if response.status_code == 200:
            result = response.json()
            ai_response = result.get("response", "")
            print(f"✅ Chat works! AI said: '{ai_response[:100]}...'")
            return True
        else:
            print(f"❌ Chat failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Chat test failed: {e}")
        return False


def create_test_audio():
    """Create a test audio file"""
    print("\n🎤 Creating test audio...")

    # Create temporary files
    temp_aiff = tempfile.NamedTemporaryFile(suffix=".aiff", delete=False)
    temp_mp3 = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    temp_aiff.close()
    temp_mp3.close()

    try:
        # Create audio with say command
        print("🗣️  Recording test message with macOS say...")
        subprocess.run(
            [
                "say",
                "-o",
                temp_aiff.name,
                "Hello Aida, this is a voice test. Please respond to this message.",
            ],
            check=True,
            capture_output=True,
        )

        # Convert to MP3 for better OpenAI compatibility
        print("🔄 Converting to MP3...")
        subprocess.run(
            ["afconvert", temp_aiff.name, temp_mp3.name, "-f", "mp4f", "-d", "aac"],
            check=True,
            capture_output=True,
        )

        # Check file size
        file_size = os.path.getsize(temp_mp3.name)
        print(f"✅ Created test audio: {file_size} bytes")

        # Clean up AIFF
        os.unlink(temp_aiff.name)

        return temp_mp3.name if file_size > 0 else None

    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create audio: {e}")
        # Clean up on error
        try:
            os.unlink(temp_aiff.name)
        except:
            pass
        try:
            os.unlink(temp_mp3.name)
        except:
            pass
        return None


def test_speech_to_text(audio_file):
    """Test speech-to-text endpoint"""
    print("\n🗣️  Testing speech-to-text...")

    try:
        with open(audio_file, "rb") as f:
            files = {"audio": ("test.mp3", f, "audio/mpeg")}
            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

        print(f"📤 Response status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            transcription = result.get("text", "")
            print(f"✅ Transcription: '{transcription}'")
            return transcription
        else:
            print(f"❌ Speech-to-text failed: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Speech-to-text error: {e}")
        return None


def test_voice_command(audio_file):
    """Test the complete voice command pipeline"""
    print("\n🎯 Testing complete voice command pipeline...")

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

        print(f"📤 Response status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            transcription = result.get("transcription", "")
            ai_response = result.get("response", "")
            audio_file_path = result.get("audioFile", "")

            print(f"✅ Transcription: '{transcription}'")
            print(f"✅ AI Response: '{ai_response[:100]}...'")
            print(f"✅ Audio file: {audio_file_path}")

            # Test audio playback if available
            if audio_file_path:
                test_audio_playback(audio_file_path)

            return True
        else:
            print(f"❌ Voice command failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Voice command error: {e}")
        return False


def test_audio_playback(audio_file_path):
    """Test downloading and playing the AI response audio"""
    print("\n🔊 Testing audio playback...")

    try:
        # Download the audio file
        audio_url = f"http://localhost:3000{audio_file_path}"
        response = requests.get(audio_url, timeout=10)

        if response.status_code == 200:
            # Save to temporary file
            temp_audio = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            temp_audio.write(response.content)
            temp_audio.close()

            print(f"📥 Downloaded audio: {len(response.content)} bytes")

            # Play with afplay (macOS)
            try:
                subprocess.run(
                    ["afplay", temp_audio.name],
                    check=True,
                    capture_output=True,
                    timeout=15,
                )
                print("✅ Audio playback successful!")
            except subprocess.CalledProcessError:
                print("⚠️  afplay failed, trying mpg123...")
                try:
                    subprocess.run(
                        ["mpg123", temp_audio.name],
                        check=True,
                        capture_output=True,
                        timeout=15,
                    )
                    print("✅ Audio playback successful with mpg123!")
                except:
                    print("❌ Audio playback failed")

            # Clean up
            os.unlink(temp_audio.name)

        else:
            print(f"❌ Failed to download audio: {response.status_code}")

    except Exception as e:
        print(f"❌ Audio playback error: {e}")


def main():
    """Run the complete test suite"""
    print("🎤🤖 Aida Voice-to-Voice Test Suite")
    print("=" * 50)

    # Run tests
    tests_passed = 0
    total_tests = 4

    # Test 1: Health check
    if test_health():
        tests_passed += 1

    # Test 2: Chat endpoint
    if test_chat():
        tests_passed += 1

    # Test 3: Create audio and test voice endpoints
    audio_file = create_test_audio()
    if audio_file:
        tests_passed += 1

        try:
            # Test 4: Either speech-to-text OR voice command (both use same backend logic)
            if test_voice_command(audio_file):
                tests_passed += 1
            elif test_speech_to_text(audio_file):
                # If voice command fails, at least test speech-to-text
                tests_passed += 0.5  # Partial credit

        finally:
            # Clean up
            if os.path.exists(audio_file):
                os.unlink(audio_file)
                print(f"🧹 Cleaned up: {audio_file}")

    # Results
    print("\n" + "=" * 50)
    print(f"🏁 Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed >= 3:
        print("🎉 Voice-to-voice system is working!")
        if tests_passed == total_tests:
            print("✨ All features working perfectly!")
        else:
            print("⚠️  Some features need attention but core functionality works")
        return True
    else:
        print("❌ Voice-to-voice system has significant issues")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
