#!/usr/bin/env python3
"""
Voice-to-Voice Chat Test for Aida
Tests the complete pipeline: voice → speech-to-text → AI chat → TTS → audio playback
"""

import sys
import json
import time
import wave
import tempfile
import requests
import logging
import platform
import subprocess
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Platform detection
IS_MACOS = platform.system() == "Darwin"


class VoiceToVoiceTest:
    def __init__(self):
        self.backend_url = "http://localhost:3000"
        self.room_name = "test_room"
        self.conversation_history = []

    def test_health(self):
        """Test backend health"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                logger.info("✅ Backend health check passed")
                return True
            else:
                logger.error("❌ Backend health check failed: %s", response.status_code)
                return False
        except Exception as e:
            logger.error("❌ Backend health check failed: %s", e)
            return False

    def test_chat_endpoint(self):
        """Test text chat endpoint"""
        try:
            data = {
                "message": "Hello Aida, can you hear me?",
                "roomName": self.room_name,
                "conversationHistory": self.conversation_history,
            }

            response = requests.post(f"{self.backend_url}/chat", json=data, timeout=15)

            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("response", "")
                logger.info("✅ Chat endpoint test passed")
                logger.info(
                    "🤖 AI Response: %s",
                    ai_response[:100] + "..."
                    if len(ai_response) > 100
                    else ai_response,
                )

                # Update conversation history
                self.conversation_history.append(
                    {"role": "user", "content": data["message"]}
                )
                self.conversation_history.append(
                    {"role": "assistant", "content": ai_response}
                )

                return True
            else:
                logger.error("❌ Chat endpoint failed: %s", response.text)
                return False

        except Exception as e:
            logger.error("❌ Chat endpoint test failed: %s", e)
            return False

    def create_test_audio(self):
        """Create a test audio file with synthetic speech for testing"""
        try:
            # Create a temporary WAV file with silence (for testing without actual recording)
            temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)

            if IS_MACOS:
                # Use macOS 'say' command to create test audio
                logger.info("🎤 Creating test audio with macOS 'say' command...")
                temp_aiff = tempfile.NamedTemporaryFile(suffix=".aiff", delete=False)

                # Generate speech to AIFF first
                subprocess.run(
                    [
                        "say",
                        "-o",
                        temp_aiff.name,
                        "Hello Aida, this is a test of the voice to voice chat system. Can you respond to this message?",
                    ],
                    check=True,
                )

                # Convert AIFF to WAV using ffmpeg or afconvert
                try:
                    subprocess.run(
                        [
                            "afconvert",
                            temp_aiff.name,
                            temp_file.name,
                            "-f",
                            "WAVE",
                            "-d",
                            "LEI16@16000",  # 16-bit linear PCM at 16kHz
                        ],
                        check=True,
                    )
                    logger.info("✅ Test audio created successfully")
                except subprocess.CalledProcessError:
                    # Fallback: create silence
                    logger.warning("⚠️  afconvert failed, creating silence for testing")
                    self._create_silence_wav(temp_file.name)

                # Clean up temp AIFF
                Path(temp_aiff.name).unlink(missing_ok=True)

            else:
                # For non-macOS, create a simple silence file
                logger.info("🎤 Creating test audio with silence (non-macOS)")
                self._create_silence_wav(temp_file.name)

            return temp_file.name

        except Exception as e:
            logger.error("❌ Failed to create test audio: %s", e)
            return None

    def _create_silence_wav(self, filename):
        """Create a WAV file with 3 seconds of silence"""
        sample_rate = 16000
        duration = 3  # seconds
        channels = 1

        with wave.open(filename, "wb") as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)

            # Write silence
            silence_data = b"\x00\x00" * (sample_rate * duration)
            wav_file.writeframes(silence_data)

    def test_speech_to_text(self, audio_file):
        """Test speech-to-text endpoint"""
        try:
            logger.info("🗣️  Testing speech-to-text...")

            with open(audio_file, "rb") as f:
                files = {"audio": ("test_audio.wav", f, "audio/wav")}
                response = requests.post(
                    f"{self.backend_url}/speech-to-text", files=files, timeout=30
                )

            if response.status_code == 200:
                result = response.json()
                transcription = result.get("text", "")
                logger.info("✅ Speech-to-text test passed")
                logger.info("📝 Transcription: %s", transcription)
                return transcription
            else:
                logger.error("❌ Speech-to-text failed: %s", response.text)
                return None

        except Exception as e:
            logger.error("❌ Speech-to-text test failed: %s", e)
            return None

    def test_voice_command_pipeline(self, audio_file):
        """Test the complete voice command pipeline"""
        try:
            logger.info("🎯 Testing complete voice command pipeline...")

            with open(audio_file, "rb") as f:
                files = {"audio": ("test_audio.wav", f, "audio/wav")}
                data = {
                    "roomName": self.room_name,
                    "conversationHistory": json.dumps(self.conversation_history),
                }

                response = requests.post(
                    f"{self.backend_url}/voice-command",
                    files=files,
                    data=data,
                    timeout=45,
                )

            if response.status_code == 200:
                result = response.json()
                transcription = result.get("transcription", "")
                ai_response = result.get("response", "")
                audio_file_path = result.get("audioFile", "")

                logger.info("✅ Voice command pipeline test passed")
                logger.info("📝 Transcription: %s", transcription)
                logger.info(
                    "🤖 AI Response: %s",
                    ai_response[:100] + "..."
                    if len(ai_response) > 100
                    else ai_response,
                )
                logger.info("🔊 Audio file: %s", audio_file_path)

                # Test audio playback
                if audio_file_path:
                    self.test_audio_playback(audio_file_path)

                return True
            else:
                logger.error("❌ Voice command pipeline failed: %s", response.text)
                return False

        except Exception as e:
            logger.error("❌ Voice command pipeline test failed: %s", e)
            return False

    def test_audio_playback(self, audio_file_path):
        """Test audio playback of AI response"""
        try:
            # Construct full URL for audio file
            audio_url = f"{self.backend_url}{audio_file_path}"
            logger.info("🔊 Testing audio playback: %s", audio_url)

            # Download the audio file
            response = requests.get(audio_url, timeout=10)
            if response.status_code == 200:
                # Save to temporary file
                temp_audio = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
                temp_audio.write(response.content)
                temp_audio.close()

                # Play audio based on platform
                if IS_MACOS:
                    # Use afplay on macOS
                    logger.info("🎵 Playing audio with afplay...")
                    result = subprocess.run(
                        ["afplay", temp_audio.name],
                        capture_output=True,
                        text=True,
                        timeout=10,
                    )
                    if result.returncode == 0:
                        logger.info("✅ Audio playback successful")
                    else:
                        logger.warning("⚠️  afplay had issues, trying mpg123...")
                        # Try mpg123 as fallback
                        result = subprocess.run(
                            ["mpg123", temp_audio.name],
                            capture_output=True,
                            text=True,
                            timeout=10,
                        )
                        if result.returncode == 0:
                            logger.info("✅ Audio playback successful with mpg123")
                        else:
                            logger.error("❌ Audio playback failed")
                else:
                    # Use mpg123 on other platforms
                    logger.info("🎵 Playing audio with mpg123...")
                    result = subprocess.run(
                        ["mpg123", temp_audio.name],
                        capture_output=True,
                        text=True,
                        timeout=10,
                    )
                    if result.returncode == 0:
                        logger.info("✅ Audio playback successful")
                    else:
                        logger.error("❌ Audio playback failed")

                # Clean up
                Path(temp_audio.name).unlink(missing_ok=True)
                return True

            else:
                logger.error(
                    "❌ Failed to download audio file: %s", response.status_code
                )
                return False

        except Exception as e:
            logger.error("❌ Audio playback test failed: %s", e)
            return False

    def run_complete_test(self):
        """Run the complete voice-to-voice test suite"""
        logger.info("🚀 Starting Voice-to-Voice Chat Test Suite")
        logger.info("=" * 60)

        tests_passed = 0
        total_tests = 5

        # Test 1: Backend Health
        if self.test_health():
            tests_passed += 1

        # Test 2: Chat Endpoint
        if self.test_chat_endpoint():
            tests_passed += 1

        # Test 3: Create Test Audio
        audio_file = self.create_test_audio()
        if audio_file:
            tests_passed += 1
            logger.info("✅ Test audio creation passed")

            try:
                # Test 4: Speech-to-Text
                if self.test_speech_to_text(audio_file):
                    tests_passed += 1

                # Test 5: Complete Voice Command Pipeline
                if self.test_voice_command_pipeline(audio_file):
                    tests_passed += 1

            finally:
                # Clean up test audio file
                Path(audio_file).unlink(missing_ok=True)
        else:
            logger.error("❌ Test audio creation failed")

        # Results
        logger.info("=" * 60)
        logger.info("🏁 Test Results: %d/%d tests passed", tests_passed, total_tests)

        if tests_passed == total_tests:
            logger.info(
                "🎉 All tests passed! Voice-to-voice chat is working correctly."
            )
            return True
        else:
            logger.warning("⚠️  Some tests failed. Check the logs above for details.")
            return False


def main():
    """Main entry point"""
    print("🎤🤖 Aida Voice-to-Voice Chat Test")
    print("Testing complete pipeline: Voice → Speech-to-Text → AI Chat → TTS → Audio")
    print()
    print("DEBUG: Main function started")
    print("DEBUG: About to create tester object")

    tester = VoiceToVoiceTest()
    success = tester.run_complete_test()

    if success:
        print("\n✅ Voice-to-voice chat system is working correctly!")
        sys.exit(0)
    else:
        print("\n❌ Voice-to-voice chat system has issues. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
