"""
Voice Activity Detection utilities
"""

import logging

logger = logging.getLogger(__name__)

try:
    import webrtcvad

    VAD_AVAILABLE = True
except ImportError:
    VAD_AVAILABLE = False
    webrtcvad = None


class VoiceActivityDetector:
    """Voice Activity Detection using WebRTC VAD"""

    def __init__(self, aggressiveness: int = 3, sample_rate: int = 16000):
        """
        Initialize VAD

        Args:
            aggressiveness: VAD aggressiveness (0-3, higher = more aggressive)
            sample_rate: Audio sample rate (8000, 16000, 32000, or 48000)
        """
        self.aggressiveness = aggressiveness
        self.sample_rate = sample_rate
        self.vad = None
        self.frame_duration_ms = 30  # WebRTC VAD supports 10, 20, or 30ms
        self.frame_size = int(sample_rate * self.frame_duration_ms / 1000)

        if VAD_AVAILABLE and webrtcvad:
            try:
                self.vad = webrtcvad.Vad(aggressiveness)
                logger.info("VAD initialized with aggressiveness: %s", aggressiveness)
            except (OSError, IOError) as e:
                logger.error("Failed to initialize VAD: %s", e)
        else:
            logger.warning(
                "WebRTC VAD not available. Install with: pip install webrtcvad"
            )

    def is_speech(self, audio_frame: bytes) -> bool:
        """
        Check if audio frame contains speech

        Args:
            audio_frame: Audio frame bytes (must be correct length for sample rate)

        Returns:
            True if speech detected, False otherwise
        """
        if not self.vad:
            return True  # Assume speech if VAD not available

        try:
            # Ensure frame is correct length
            expected_length = self.frame_size * 2  # 2 bytes per sample for 16-bit audio
            if len(audio_frame) != expected_length:
                # Pad or truncate to correct length
                if len(audio_frame) < expected_length:
                    audio_frame += b"\x00" * (expected_length - len(audio_frame))
                else:
                    audio_frame = audio_frame[:expected_length]

            return self.vad.is_speech(audio_frame, self.sample_rate)
        except (OSError, IOError) as e:
            logger.warning("VAD error: %s", e)
            return True  # Assume speech on error

    def filter_audio_chunks(self, chunks: list, min_speech_chunks: int = 3) -> list:
        """
        Filter audio chunks to keep only those with significant speech

        Args:
            chunks: List of audio chunk bytes
            min_speech_chunks: Minimum number of speech chunks required

        Returns:
            Filtered list of chunks
        """
        if not self.vad:
            return chunks

        speech_chunks = []
        speech_count = 0

        for chunk in chunks:
            if self.is_speech(chunk):
                speech_count += 1
                speech_chunks.append(chunk)
            else:
                # Include some non-speech chunks for context
                if speech_count > 0:
                    speech_chunks.append(chunk)

        # Only return chunks if we have enough speech
        if speech_count >= min_speech_chunks:
            return speech_chunks
        else:
            return []
