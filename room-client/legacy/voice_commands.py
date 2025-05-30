#!/usr/bin/env python3
"""
AI Voice Command Module for Aida Snapcast Client
Handles speech-to-text recording and AI interaction with native STT support
"""

import json
import logging
import os
import tempfile
import threading
import time
import wave
from typing import Callable, Optional

import requests

try:
    import pyaudio
    import webrtcvad

    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False

# Native STT imports
try:
    from native_stt_faster_whisper import create_faster_whisper_stt

    NATIVE_STT_AVAILABLE = True
except ImportError:
    NATIVE_STT_AVAILABLE = False

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
        self.format = pyaudio.paInt16 if AUDIO_AVAILABLE else 0

        # Voice activity detection
        self.vad = None
        self.recording = False
        self.audio = None
        self.stream = None

        # VAD sensitivity settings (higher values = less sensitive to background noise)
        self.vad_aggressiveness = config.get(
            "vad_aggressiveness", 3
        )  # 0-3, 3 = most aggressive
        self.silence_threshold = config.get(
            "silence_threshold", 40
        )  # frames of silence before stopping

        # Conversation history for context
        self.conversation_history = []
        self.max_history = 10

        # Voice command settings
        self.listening_enabled = (
            config.get("voice_commands_enabled", True) and AUDIO_AVAILABLE
        )

        # Native STT configuration
        self.use_native_stt = config.get("use_native_stt", True)
        self.native_stt = None
        self.stt_config = config.get("stt_config", {})
        self._init_native_stt()

        # Wake word settings
        self.wake_word = "apartment"
        self.wake_word_detected = False
        self.wake_word_timeout = 120  # 2 minutes in seconds
        self.last_wake_word_time = 0
        self.wake_word_only_mode = True  # Start in wake word mode

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
            # Initialize VAD with configurable aggressiveness to reduce background noise
            self.vad = webrtcvad.Vad(
                self.vad_aggressiveness
            )  # 0-3, higher = more aggressive filtering

            # Initialize PyAudio
            self.audio = pyaudio.PyAudio()
            logger.info(
                "Audio system initialized for voice commands (VAD aggressiveness: %d)",
                self.vad_aggressiveness,
            )

        except (OSError, ImportError, AttributeError) as e:
            logger.error("Failed to initialize audio: %s", e)
            self.listening_enabled = False

    def _init_native_stt(self):
        """Initialize native STT if enabled and available"""
        if not self.use_native_stt:
            logger.info("Native STT disabled in configuration")
            return

        try:
            from native_stt_faster_whisper import create_faster_whisper_stt

            # Get STT configuration with defaults
            model_size = self.stt_config.get("model_size", "base")
            device = self.stt_config.get("device", "auto")
            compute_type = self.stt_config.get("compute_type", "float16")

            logger.info(f"Initializing native STT with model: {model_size}")
            self.native_stt = create_faster_whisper_stt(
                model_size=model_size, device=device, compute_type=compute_type
            )
            logger.info("✅ Native STT initialized successfully")

        except ImportError:
            logger.warning(
                "Native STT not available - install faster-whisper: pip install faster-whisper"
            )
            self.use_native_stt = False
        except Exception as e:
            logger.error(f"Failed to initialize native STT: {e}")
            self.use_native_stt = False

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
            except (OSError, AttributeError) as e:
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

            logger.info(
                "Voice command listening started in %s mode",
                "wake word" if self.wake_word_only_mode else "command",
            )
            audio_buffer = []
            silence_threshold = (
                self.silence_threshold
            )  # configurable frames of silence before stopping recording
            silence_count = 0
            recording_active = False
            timeout_check_counter = 0  # Check timeout every ~100 iterations

            while self.recording:
                # Periodically check wake word timeout
                timeout_check_counter += 1
                if timeout_check_counter >= 100:
                    self._check_wake_word_timeout()
                    timeout_check_counter = 0
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

                except (OSError, IOError) as e:
                    logger.error("Error in voice listening loop: %s", e)
                    time.sleep(0.1)

        except (OSError, IOError) as e:
            logger.error("Failed to start voice listening: %s", e)
        finally:
            if self.stream:
                try:
                    self.stream.stop_stream()
                    self.stream.close()
                except (OSError, AttributeError) as e:
                    logger.warning("Error cleaning up audio stream: %s", e)
                finally:
                    self.stream = None

    def _process_recorded_audio(self, audio_chunks):
        """Process recorded audio and send to AI"""
        # Check wake word timeout first
        self._check_wake_word_timeout()

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
            wav_file = wave.open(temp_filename, "wb")
            try:
                wav_file.setnchannels(self.channels)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(audio_data)
            finally:
                wav_file.close()

            # First transcribe the audio to check for wake word
            transcription = self._transcribe_audio(temp_filename)

            if transcription:
                logger.info("Voice transcribed: '%s'", transcription)
                if self.wake_word_only_mode:
                    # In wake word mode, only process if wake word is detected
                    remaining_command = self._process_wake_word_detection(transcription)
                    if remaining_command:
                        # Process the command that came after the wake word
                        self._send_ai_command(remaining_command, temp_filename)
                else:
                    # Not in wake word mode, process normally but still check for wake word
                    wake_word_command = self._process_wake_word_detection(transcription)
                    if wake_word_command:
                        # Wake word was said again, process any additional command
                        self._send_ai_command(wake_word_command, temp_filename)
                    else:
                        # Normal command processing
                        self._send_ai_command(transcription, temp_filename)
            else:
                logger.warning("No transcription received from audio")

        except (OSError, IOError, wave.Error) as e:
            logger.error("Failed to process recorded audio: %s", e)
        finally:
            # Clean up temp file
            if temp_filename:
                try:
                    os.unlink(temp_filename)
                except OSError:
                    pass

    def _transcribe_audio(self, audio_file_path: str) -> str:
        """Transcribe audio file to text using native STT or backend fallback"""

        # Try native STT first if available
        if self.use_native_stt and self.native_stt:
            try:
                start_time = time.time()
                result = self.native_stt.transcribe_file(audio_file_path)
                transcribe_time = time.time() - start_time

                if result.get("success", False):
                    transcription = result.get("text", "").strip()
                    if transcription:
                        logger.info(
                            f"🚀 Native STT transcribed in {transcribe_time:.2f}s: '{transcription[:50]}...'"
                        )
                        return transcription
                    else:
                        logger.warning(
                            "Native STT returned empty transcription, falling back to backend"
                        )
                else:
                    logger.warning(
                        f"Native STT failed: {result.get('error', 'Unknown error')}, falling back to backend"
                    )

            except Exception as e:
                logger.error(f"Native STT exception: {e}, falling back to backend")

        # Fallback to backend transcription
        logger.info("Using backend STT transcription")
        return self._transcribe_audio_backend(audio_file_path)

    def _transcribe_audio_backend(self, audio_file_path: str) -> str:
        """Original backend transcription method"""
        try:
            with open(audio_file_path, "rb") as audio_file:
                files = {"audio": ("audio.wav", audio_file, "audio/wav")}
                data = {
                    "roomName": self.room_name,
                    "transcribeOnly": "true",  # Flag to only transcribe, not process as command
                }

                response = requests.post(
                    f"{self.backend_url}/voice-command",
                    files=files,
                    data=data,
                    timeout=30,
                )

            if response.status_code == 200:
                result = response.json()
                data = result.get("data", {})
                return data.get("transcription", "")
            else:
                logger.error("Transcription error: %s", response.text)
                return ""

        except requests.RequestException as e:
            logger.error("Failed to transcribe audio: %s", e)
            return ""
        except (IOError, OSError) as e:
            logger.error("Failed to read audio file %s: %s", audio_file_path, e)
            return ""

    def _send_ai_command(
        self, command_text: str, audio_file_path: Optional[str] = None
    ):
        """Send command to AI backend (either text or with audio file)"""
        if not command_text.strip():
            logger.debug("Empty command, ignoring")
            return None

        try:
            logger.info("Sending AI command: %s", command_text[:50])

            if audio_file_path:
                # Send with audio file
                with open(audio_file_path, "rb") as audio_file:
                    files = {"audio": ("audio.wav", audio_file, "audio/wav")}
                    data = {
                        "roomName": self.room_name,
                        "conversationHistory": json.dumps(self.conversation_history),
                        "overrideTranscription": command_text,  # Use our processed text
                    }

                    response = requests.post(
                        f"{self.backend_url}/voice-command",
                        files=files,
                        data=data,
                        timeout=30,
                    )
            else:
                # Send as text command
                data = {
                    "message": command_text,
                    "roomName": self.room_name,
                    "conversationHistory": self.conversation_history,
                }

                response = requests.post(
                    f"{self.backend_url}/chat", json=data, timeout=15
                )

            if response.status_code == 200:
                result = response.json()
                data = result.get("data", {})
                ai_response = data.get("response", "")
                audio_file = data.get("audioFile", "")

                logger.info("AI response received: %s", ai_response[:100])

                # Update conversation history
                self.conversation_history.append(
                    {"role": "user", "content": command_text}
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
                if self.on_ai_response and ai_response:
                    self.on_ai_response(ai_response, audio_file)

                return ai_response
            else:
                logger.error("AI backend error: %s", response.text)
                return None

        except requests.RequestException as e:
            logger.error("Failed to send AI command: %s", e)
            return None

    def send_text_command(self, text: str):
        """Send text command directly to AI (for testing)"""
        logger.info("Text command received: '%s'", text)

        # Check wake word timeout first
        self._check_wake_word_timeout()

        if self.wake_word_only_mode:
            # Check if text contains wake word
            remaining_command = self._process_wake_word_detection(text)
            if remaining_command:
                # Process the command that came after the wake word
                return self._send_ai_command(remaining_command)
            elif self._detect_wake_word(text):
                # Wake word detected but no additional command
                logger.info("Wake word detected in text, ready for commands")
                return "Wake word detected. Ready for commands."
            else:
                logger.info("Wake word not detected, ignoring command")
                return "Please say 'Aida' first to activate voice commands."
        else:
            # Not in wake word mode, check if wake word is said again
            wake_word_command = self._process_wake_word_detection(text)
            if wake_word_command:
                # Wake word was said again, process any additional command
                return self._send_ai_command(wake_word_command)
            else:
                # Normal command processing
                return self._send_ai_command(text)

    def get_stt_status(self) -> dict:
        """Get STT system status and performance info"""
        status = {
            "native_stt_enabled": self.use_native_stt,
            "native_stt_available": NATIVE_STT_AVAILABLE,
            "native_stt_loaded": self.native_stt is not None,
            "backend_fallback": True,
            "stt_config": self.stt_config.copy() if self.stt_config else {},
        }

        if self.native_stt:
            try:
                model_info = self.native_stt.get_model_info()
                status.update(
                    {
                        "model_info": model_info,
                        "model_size": model_info.get("model_size", "unknown"),
                        "device": model_info.get("device", "unknown"),
                        "compute_type": model_info.get("compute_type", "unknown"),
                    }
                )
            except Exception as e:
                status["model_info_error"] = str(e)

        return status

    def cleanup(self):
        """Clean up resources"""
        self.stop_listening()
        if self.audio:
            try:
                self.audio.terminate()
            except (OSError, AttributeError) as e:
                logger.warning("Error terminating audio: %s", e)
        logger.info("Voice command handler cleaned up")

    def _check_wake_word_timeout(self):
        """Check if wake word timeout has expired and reset to wake word mode"""
        if (
            self.wake_word_detected
            and time.time() - self.last_wake_word_time > self.wake_word_timeout
        ):
            self.wake_word_detected = False
            self.wake_word_only_mode = True
            logger.info("Wake word timeout expired, returning to wake word mode")

    def _detect_wake_word(self, text: str) -> bool:
        """Check if the transcribed text contains the wake word"""
        if not text:
            return False

        # Simple case-insensitive check for wake word
        words = text.lower().split()
        return self.wake_word.lower() in words

    def _process_wake_word_detection(self, transcription: str):
        """Process wake word detection and update state"""
        if self._detect_wake_word(transcription):
            self.wake_word_detected = True
            self.wake_word_only_mode = False
            self.last_wake_word_time = time.time()
            logger.info(
                "Wake word 'Aida' detected, entering command mode for 2 minutes"
            )

            # Remove wake word from transcription for processing
            words = transcription.lower().split()
            filtered_words = [word for word in words if word != self.wake_word.lower()]
            remaining_text = " ".join(filtered_words).strip()

            # If there's additional text after the wake word, process it as a command
            if remaining_text:
                logger.info("Processing command after wake word: %s", remaining_text)
                return remaining_text

        return None

    def get_status(self) -> dict:
        """Get current status of voice command handler"""
        return {
            "listening_enabled": self.listening_enabled,
            "recording": self.recording,
            "wake_word_only_mode": self.wake_word_only_mode,
            "wake_word_detected": self.wake_word_detected,
            "time_until_timeout": max(
                0, self.wake_word_timeout - (time.time() - self.last_wake_word_time)
            )
            if self.wake_word_detected
            else 0,
        }


def test_voice_commands():
    """Test function for voice commands"""
    config = {"room_name": "test_room", "voice_commands_enabled": True}

    handler = VoiceCommandHandler(config)

    if not AUDIO_AVAILABLE:
        print("Audio dependencies not available. Please install:")
        print("pip install pyaudio webrtcvad")
        return

    print("Voice command test started with wake word 'Aida'.")
    print("Say 'Aida' first to activate voice commands for 2 minutes.")
    print("Speak to test voice recognition or enter text commands.")
    print("Type 'status' to see current mode, 'quit' to exit.")

    def on_response(response, audio_file):
        print(f"AI Response: {response}")
        if audio_file:
            print(f"Audio file: {audio_file}")

    handler.on_ai_response = on_response
    handler.start_listening()

    try:
        while True:
            status = handler.get_status()
            mode = "WAKE WORD" if status["wake_word_only_mode"] else "COMMAND"
            timeout = (
                f" ({status['time_until_timeout']:.0f}s left)"
                if status["wake_word_detected"]
                else ""
            )

            command = input(
                f"[{mode}{timeout}] Enter text command (or 'quit'/'status'): "
            ).strip()

            if command.lower() == "quit":
                break
            elif command.lower() == "status":
                print(f"Status: {status}")
                continue

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
