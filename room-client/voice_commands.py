#!/usr/bin/env python3
"""
AI Voice Command Module for Aida Snapcast Client
Handles speech-to-text recording and AI interaction
"""

import os
import json
import time
import wave
import logging
import threading
import tempfile
import requests
from typing import Optional, Callable

try:
    import pyaudio
    import webrtcvad

    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False

logger = logging.getLogger(__name__)


class VoiceCommandHandler:
    """Handles voice recording, speech-to-text, and AI interaction"""

    def __init__(self, config: dict, backend_url: str = "http://localhost:3000"):
        self.config = config
        self.backend_url = backend_url.rstrip("/")
        self.room_name = config.get("room_name", "unknown")

        # Audio settings
        self.sample_rate = 16000
        self.channels = 1
        self.chunk_duration_ms = 30  # VAD requires 10, 20, or 30ms chunks
        self.chunk_size = int(self.sample_rate * self.chunk_duration_ms / 1000)
        self.format = pyaudio.paInt16 if AUDIO_AVAILABLE else None

        # Voice activity detection
        self.vad = None
        self.recording = False
        self.audio = None
        self.stream = None

        # Conversation history for context
        self.conversation_history = []
        self.max_history = 10

        # Voice command settings
        self.listening_enabled = (
            config.get("voice_commands_enabled", True) and AUDIO_AVAILABLE
        )

        # Callback for when AI responds
        self.on_ai_response: Optional[Callable] = None

        self._init_audio()

    def _init_audio(self):
        """Initialize audio components"""
        if not AUDIO_AVAILABLE:
            logger.warning(
                "Audio dependencies not available. Install: pip install pyaudio webrtcvad"
            )
            return

        try:
            # Initialize VAD
            self.vad = webrtcvad.Vad(2)  # Aggressiveness level 0-3

            # Initialize PyAudio
            self.audio = pyaudio.PyAudio()
            logger.info("Audio system initialized for voice commands")

        except Exception as e:
            logger.error("Failed to initialize audio: %s", e)
            self.listening_enabled = False

    def start_listening(self):
        """Start listening for voice commands in background thread"""
        if not self.listening_enabled:
            logger.warning("Voice listening not available")
            return

        if self.recording:
            logger.warning("Already listening for voice commands")
            return

        self.recording = True
        listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
        listen_thread.start()
        logger.info("Started listening for voice commands")

    def stop_listening(self):
        """Stop listening for voice commands"""
        self.recording = False
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except Exception as e:
                logger.warning("Error stopping audio stream: %s", e)
            finally:
                self.stream = None
        logger.info("Stopped listening for voice commands")

    def _listen_loop(self):
        """Main listening loop for voice commands"""
        if not self.audio or not self.vad:
            logger.error("Audio components not initialized")
            return

        try:
            # Open audio stream
            self.stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size,
            )

            logger.info("Voice command listening started")
            audio_buffer = []
            silence_threshold = 20  # frames of silence before stopping recording
            silence_count = 0
            recording_active = False

            while self.recording:
                try:
                    # Read audio chunk
                    audio_chunk = self.stream.read(
                        self.chunk_size, exception_on_overflow=False
                    )

                    # Check for voice activity
                    is_speech = self.vad.is_speech(audio_chunk, self.sample_rate)

                    if is_speech:
                        if not recording_active:
                            logger.info("Voice activity detected, starting recording")
                            audio_buffer = []
                            recording_active = True

                        audio_buffer.append(audio_chunk)
                        silence_count = 0
                    else:
                        if recording_active:
                            silence_count += 1
                            audio_buffer.append(audio_chunk)  # Keep some silence

                            # Stop recording after enough silence
                            if silence_count >= silence_threshold:
                                logger.info("End of speech detected, processing audio")
                                self._process_recorded_audio(audio_buffer)
                                recording_active = False
                                silence_count = 0
                                audio_buffer = []

                except Exception as e:
                    logger.error("Error in voice listening loop: %s", e)
                    time.sleep(0.1)

        except Exception as e:
            logger.error("Failed to start voice listening: %s", e)
        finally:
            if self.stream:
                try:
                    self.stream.stop_stream()
                    self.stream.close()
                except Exception as e:
                    logger.warning("Error cleaning up audio stream: %s", e)
                finally:
                    self.stream = None

    def _process_recorded_audio(self, audio_chunks):
        """Process recorded audio and send to AI"""
        if len(audio_chunks) < 10:  # Too short
            logger.debug("Audio too short, ignoring")
            return

        temp_filename = None
        try:
            # Combine audio chunks
            audio_data = b"".join(audio_chunks)

            # Save to temporary WAV file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_filename = temp_file.name

            # Write WAV file
            with wave.open(temp_filename, "wb") as wav_file:
                wav_file.setnchannels(self.channels)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(audio_data)

            # Send to AI backend for processing
            self._send_voice_command(temp_filename)

        except Exception as e:
            logger.error("Failed to process recorded audio: %s", e)
        finally:
            # Clean up temp file
            if temp_filename:
                try:
                    os.unlink(temp_filename)
                except OSError:
                    pass

    def _send_voice_command(self, audio_file_path):
        """Send voice command to AI backend"""
        try:
            logger.info("Sending voice command to AI backend")

            # Prepare request data with explicit content type
            with open(audio_file_path, "rb") as audio_file:
                files = {"audio": ("audio.wav", audio_file, "audio/wav")}
                data = {
                    "roomName": self.room_name,
                    "conversationHistory": json.dumps(self.conversation_history),
                }

                # Send to backend
                response = requests.post(
                    f"{self.backend_url}/voice-command",
                    files=files,
                    data=data,
                    timeout=30,
                )

            if response.status_code == 200:
                result = response.json()

                # Extract data from the wrapped response
                data = result.get("data", {})
                transcription = data.get("transcription", "")
                ai_response = data.get("response", "")
                audio_file = data.get("audioFile", "")

                logger.info("AI response received: %s", ai_response[:100])

                # Update conversation history
                self.conversation_history.append(
                    {"role": "user", "content": transcription}
                )
                self.conversation_history.append(
                    {"role": "assistant", "content": ai_response}
                )

                # Keep history limited
                if len(self.conversation_history) > self.max_history * 2:
                    self.conversation_history = self.conversation_history[
                        -self.max_history * 2 :
                    ]

                # Trigger audio playback if callback is set
                if self.on_ai_response and audio_file:
                    self.on_ai_response(ai_response, audio_file)

                return {
                    "transcription": transcription,
                    "response": ai_response,
                    "audio_file": audio_file,
                }

            else:
                logger.error("AI backend error: %s", response.text)
                return None

        except requests.RequestException as e:
            logger.error("Failed to send voice command: %s", e)
            return None

    def send_text_command(self, text: str):
        """Send text command directly to AI (for testing)"""
        try:
            data = {
                "message": text,
                "roomName": self.room_name,
                "conversationHistory": self.conversation_history,
            }

            response = requests.post(f"{self.backend_url}/chat", json=data, timeout=15)

            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("data", {}).get("response", "")

                # Update conversation history
                self.conversation_history.append({"role": "user", "content": text})
                self.conversation_history.append(
                    {"role": "assistant", "content": ai_response}
                )

                if len(self.conversation_history) > self.max_history * 2:
                    self.conversation_history = self.conversation_history[
                        -self.max_history * 2 :
                    ]

                logger.info("Text command response: %s", ai_response)
                return ai_response
            else:
                logger.error("AI backend error: %s", response.text)
                return None

        except requests.RequestException as e:
            logger.error("Failed to send text command: %s", e)
            return None

    def cleanup(self):
        """Clean up resources"""
        self.stop_listening()
        if self.audio:
            try:
                self.audio.terminate()
            except Exception as e:
                logger.warning("Error terminating audio: %s", e)
        logger.info("Voice command handler cleaned up")


def test_voice_commands():
    """Test function for voice commands"""
    config = {"room_name": "test_room", "voice_commands_enabled": True}

    handler = VoiceCommandHandler(config)

    if not AUDIO_AVAILABLE:
        print("Audio dependencies not available. Please install:")
        print("pip install pyaudio webrtcvad")
        return

    print("Voice command test started.")
    print("Speak to test voice recognition or enter text commands.")
    print("Say 'quit' to exit.")

    def on_response(response, audio_file):
        print(f"AI Response: {response}")
        if audio_file:
            print(f"Audio file: {audio_file}")

    handler.on_ai_response = on_response
    handler.start_listening()

    try:
        while True:
            command = input("Enter text command (or 'quit'): ").strip()
            if command.lower() == "quit":
                break
            if command:
                response = handler.send_text_command(command)
                print(f"Response: {response}")
    except KeyboardInterrupt:
        pass
    finally:
        handler.cleanup()
        print("Voice command test completed.")


if __name__ == "__main__":
    test_voice_commands()
