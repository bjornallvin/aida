"""
Voice command handling and AI interaction
"""

import logging
import os
import tempfile
import threading
import time
from typing import Callable, Optional, Dict, Any
import wave
import requests

from ..audio import AudioManager, VoiceActivityDetector
from ..stt import create_stt_engine
from .wake_word_detector import WakeWordDetector
from ..schemas import APIResponse, ChatData, ResponseValidator

logger = logging.getLogger(__name__)

try:
    import pyaudio

    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False


class VoiceCommandHandler:
    """Handles voice recording, speech-to-text, and AI interaction"""

    def __init__(
        self, config: Dict[str, Any], backend_url: str = "http://localhost:3000"
    ):
        self.config = config
        self.backend_url = backend_url.rstrip("/")
        self.room_name = config.get("room_name", "unknown")

        # Audio settings
        self.sample_rate = 16000
        self.channels = 1
        self.chunk_duration_ms = 30  # VAD requires 10, 20, or 30ms chunks
        self.chunk_size = int(self.sample_rate * self.chunk_duration_ms / 1000)
        self.format = pyaudio.paInt16 if PYAUDIO_AVAILABLE else 0

        # Initialize components
        self.audio_manager = AudioManager()
        self.vad = VoiceActivityDetector(
            aggressiveness=config.get("vad_aggressiveness", 3),
            sample_rate=self.sample_rate,
        )
        self.stt_engine = create_stt_engine(config)

        # Recording state
        self.recording = False
        self.stream = None

        # VAD settings
        self.silence_threshold = config.get("silence_threshold", 40)

        # Conversation history for context
        self.conversation_history = []
        self.max_history = 10

        # Voice command settings
        self.listening_enabled = (
            config.get("voice_commands_enabled", True) and PYAUDIO_AVAILABLE
        )

        # Wake word settings
        self.wake_word = config.get("wake_word", "aida")
        self.wake_word_detected = False
        self.wake_word_timeout = config.get("wake_word_timeout", 120)
        self.last_wake_word_time = 0
        self.wake_word_only_mode = True

        # Initialize robust wake word detector
        self.wake_word_detector = WakeWordDetector(
            wake_word=self.wake_word,
            similarity_threshold=config.get("wake_word_similarity_threshold", 0.6),
            phonetic_matching=config.get("wake_word_phonetic_matching", True),
            custom_variations=config.get("wake_word_variations", []),
        )

        # Callback for when AI responds
        # Accepts a string response
        self.on_ai_response: Optional[Callable[[str], None]] = None

    def start_listening(self):
        """Start listening for voice commands in background thread"""
        if not self.listening_enabled:
            logger.warning("Voice listening not available")
            return

        if not self.stt_engine:
            logger.warning("STT engine not available")
            return

        self.recording = True
        listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
        listen_thread.start()
        logger.info("Voice listening started")

    def stop_listening(self):
        """Stop listening for voice commands"""
        self.recording = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None
        logger.info("Voice listening stopped")

    def _listen_loop(self):
        """Main listening loop"""
        if not self.audio_manager.audio:
            logger.error("Audio not available for listening")
            return

        try:
            self.stream = self.audio_manager.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size,
            )

            logger.info("Listening for voice commands...")
            audio_chunks = []
            silence_count = 0
            speech_detected = False

            while self.recording:
                try:
                    chunk = self.stream.read(
                        self.chunk_size, exception_on_overflow=False
                    )

                    # Check for speech
                    if self.vad.is_speech(chunk):
                        audio_chunks.append(chunk)
                        silence_count = 0
                        speech_detected = True
                    else:
                        if speech_detected:
                            audio_chunks.append(chunk)
                            silence_count += 1

                            # Stop recording after silence threshold
                            if silence_count >= self.silence_threshold:
                                if audio_chunks:
                                    self._process_audio_chunks(audio_chunks)
                                audio_chunks = []
                                silence_count = 0
                                speech_detected = False

                except (OSError, IOError) as e:
                    logger.error("Error in listen loop: %s", e)
                    break

        except (OSError, IOError) as e:
            logger.error("Failed to start listening: %s", e)
        finally:
            if self.stream:
                self.stream.stop_stream()
                self.stream.close()
                self.stream = None

    def _process_audio_chunks(self, chunks):
        """Process recorded audio chunks"""
        try:
            # Filter chunks with VAD
            filtered_chunks = self.vad.filter_audio_chunks(chunks, min_speech_chunks=3)
            if not filtered_chunks:
                return

            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                self._save_audio_chunks(filtered_chunks, tmp_file.name)

                # Transcribe audio
                if self.stt_engine and hasattr(self.stt_engine, "transcribe_file"):
                    result = self.stt_engine.transcribe_file(tmp_file.name)
                else:
                    logger.error(
                        "STT engine not available or missing transcribe_file method"
                    )
                    return

                # Clean up temp file
                os.unlink(tmp_file.name)

            if result.get("success") and result.get("text"):
                text = result["text"].strip()
                logger.info("Transcribed: %s", text)

                # Check for wake word or process command
                if self.wake_word_only_mode:
                    detection_result = self.wake_word_detector.detect_wake_word(text)
                    if detection_result["detected"]:
                        self.wake_word_detected = True
                        self.last_wake_word_time = time.time()
                        logger.info(
                            "Wake word detected! Method: %s, Matched: '%s', Confidence: %.2f",
                            detection_result["method"],
                            detection_result["matched_word"],
                            detection_result["confidence"],
                        )
                        return

                # Process as command if wake word was detected recently
                if self._is_wake_word_active():
                    self._process_voice_command(text)

        except (OSError, IOError) as e:
            logger.error("Error processing audio: %s", e)

    def _save_audio_chunks(self, chunks, filename):
        """Save audio chunks to WAV file"""
        wav_file = wave.open(filename, "wb")
        try:
            wav_file.setnchannels(self.channels)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(b"".join(chunks))
        finally:
            wav_file.close()

    def _is_wake_word_active(self):
        """Check if wake word is still active"""
        if not self.wake_word_detected:
            return False

        if time.time() - self.last_wake_word_time > self.wake_word_timeout:
            self.wake_word_detected = False
            logger.info("Wake word timeout - back to wake word mode")
            return False

        return True

    def _process_voice_command(self, text: str):
        """Process a voice command through the AI backend"""
        try:
            response = self.send_text_command(text)
            if response and self.on_ai_response:
                self._call_ai_response_callback(response)
        except (OSError, IOError) as e:
            logger.error("Error processing voice command: %s", e)

    def _call_ai_response_callback(self, response: str):
        """Helper method to call the AI response callback"""
        if self.on_ai_response:
            self.on_ai_response(response)  # pylint: disable=not-callable

    def send_text_command(self, text: str) -> Optional[str]:
        """Send text command to AI backend"""
        try:
            # Add to conversation history
            self.conversation_history.append({"role": "user", "content": text})

            # Keep history manageable
            if len(self.conversation_history) > self.max_history * 2:
                self.conversation_history = self.conversation_history[
                    -self.max_history :
                ]

            # Prepare request
            payload = {
                "message": text,
                "room": self.room_name,
                "conversation_history": self.conversation_history,
                "source": "voice_command",
            }

            # Send to backend
            response = requests.post(
                f"{self.backend_url}/chat",
                json=payload,
                timeout=30,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 200:
                json = response.json()
                if not json or "data" not in json:
                    logger.error("Invalid response from backend: %s", json)
                    return None

                result: APIResponse[ChatData] = (
                    ResponseValidator.validate_chat_response(json)
                )
                if not result.data:
                    logger.error("No data in response from backend")
                    return None

                data: Optional[ChatData] = result.data
                if not data:
                    logger.error("No data returned from backend")
                    return None

                ai_response = data.response

                # Add AI response to history
                if ai_response:
                    self.conversation_history.append(
                        {"role": "assistant", "content": ai_response}
                    )

                logger.info("AI Response: %s", ai_response)
                return ai_response
            else:
                logger.error(
                    "Backend error: %s - %s", response.status_code, response.text
                )
                return None

        except requests.RequestException as e:
            logger.error("Failed to send command to backend: %s", e)
            return None
        except (OSError, IOError) as e:
            logger.error("Error in send_text_command: %s", e)
            return None

    def test_stt(self, audio_file: str) -> Dict[str, Any]:
        """Test STT with an audio file"""
        if not self.stt_engine:
            return {"error": "STT engine not available"}

        try:
            if self.stt_engine and hasattr(self.stt_engine, "transcribe_file"):
                return self.stt_engine.transcribe_file(audio_file)
            else:
                return {"error": "STT engine not available"}
        except (OSError, IOError) as e:
            logger.error("STT test failed: %s", e)
            return {"error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Get voice command handler status"""
        status = {
            "listening_enabled": self.listening_enabled,
            "recording": self.recording,
            "stt_available": self.stt_engine is not None,
            "wake_word": self.wake_word,
            "wake_word_detected": self.wake_word_detected,
            "wake_word_only_mode": self.wake_word_only_mode,
            "conversation_history_length": len(self.conversation_history),
        }

        # Add wake word detector status
        if hasattr(self, "wake_word_detector"):
            status["wake_word_detector"] = self.wake_word_detector.get_status()

        return status

    def add_wake_word_variation(self, variation: str) -> None:
        """Add a new wake word variation"""
        if hasattr(self, "wake_word_detector"):
            self.wake_word_detector.add_variation(variation)
            logger.info("Added wake word variation: '%s'", variation)

    def test_wake_word_detection(self, test_text: str) -> Dict[str, Any]:
        """Test wake word detection with given text"""
        if hasattr(self, "wake_word_detector"):
            result = self.wake_word_detector.detect_wake_word(test_text)
            logger.info("Wake word test - Input: '%s', Result: %s", test_text, result)
            return result
        return {"error": "Wake word detector not available"}
