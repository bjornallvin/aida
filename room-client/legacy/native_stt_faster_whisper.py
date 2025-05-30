"""
Native STT implementation using faster-whisper for improved performance.
This implementation provides local speech-to-text without network calls.
"""

import os
import time
import logging
from typing import Optional, Dict, Any
from pathlib import Path

try:
    from faster_whisper import WhisperModel

    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    WhisperModel = None


class FasterWhisperSTT:
    """
    High-performance local STT using faster-whisper.
    This is optimized for speed and runs entirely locally.
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "auto",
        compute_type: str = "float16",
        cache_dir: Optional[str] = None,
    ):
        """
        Initialize the faster-whisper STT engine.

        Args:
            model_size: Model size ("tiny", "base", "small", "medium", "large-v3")
            device: Device to use ("cpu", "cuda", "auto")
            compute_type: Computation type ("float16", "float32", "int8")
            cache_dir: Directory to cache models
        """
        if not FASTER_WHISPER_AVAILABLE:
            raise ImportError(
                "faster-whisper is not installed. Run: pip install faster-whisper"
            )

        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self.cache_dir = cache_dir or os.path.expanduser("~/.cache/faster-whisper")

        # Ensure cache directory exists
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)

        self.logger = logging.getLogger(__name__)
        self._load_model()

    def _load_model(self):
        """Load the Whisper model."""
        try:
            start_time = time.time()
            self.logger.info(f"Loading faster-whisper model: {self.model_size}")

            # Determine device
            device = self.device
            if device == "auto":
                try:
                    import torch

                    device = "cuda" if torch.cuda.is_available() else "cpu"
                except ImportError:
                    device = "cpu"

            # Adjust compute type based on device
            compute_type = self.compute_type
            if device == "cpu" and compute_type == "float16":
                compute_type = "float32"  # CPU doesn't support float16

            self.model = WhisperModel(
                model_size_or_path=self.model_size,
                device=device,
                compute_type=compute_type,
                download_root=self.cache_dir,
            )

            load_time = time.time() - start_time
            self.logger.info(
                f"Model loaded in {load_time:.2f}s on {device} with {compute_type}"
            )

        except Exception as e:
            self.logger.error(f"Failed to load model: {e}")
            raise

    def transcribe_file(
        self,
        audio_path: str,
        language: Optional[str] = None,
        initial_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe an audio file to text.

        Args:
            audio_path: Path to the audio file
            language: Language code (e.g., "en", "es") or None for auto-detection
            initial_prompt: Optional prompt to guide transcription

        Returns:
            Dict with transcription results
        """
        if not self.model:
            raise RuntimeError("Model not loaded")

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        try:
            start_time = time.time()

            # Transcribe with faster-whisper
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                initial_prompt=initial_prompt,
                beam_size=1,  # Faster inference
                best_of=1,  # Faster inference
                temperature=0.0,  # Deterministic output
                vad_filter=True,  # Voice activity detection
                vad_parameters=dict(min_silence_duration_ms=500),
            )

            # Collect all segments
            transcript_segments = []
            full_text = ""

            for segment in segments:
                segment_data = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "confidence": getattr(segment, "avg_logprob", 0.0),
                }
                transcript_segments.append(segment_data)
                full_text += segment.text.strip() + " "

            transcription_time = time.time() - start_time
            full_text = full_text.strip()

            result = {
                "text": full_text,
                "segments": transcript_segments,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "transcription_time": transcription_time,
                "model_size": self.model_size,
                "success": True,
            }

            self.logger.info(
                f"Transcribed in {transcription_time:.2f}s: '{full_text[:100]}...'"
            )
            return result

        except Exception as e:
            self.logger.error(f"Transcription failed: {e}")
            return {
                "text": "",
                "segments": [],
                "language": None,
                "error": str(e),
                "success": False,
            }

    def transcribe_numpy(
        self, audio_array, sample_rate: int = 16000, language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe numpy audio array directly.

        Args:
            audio_array: Numpy array with audio data
            sample_rate: Sample rate of the audio
            language: Language code or None for auto-detection

        Returns:
            Dict with transcription results
        """
        if not self.model:
            raise RuntimeError("Model not loaded")

        try:
            start_time = time.time()

            segments, info = self.model.transcribe(
                audio_array,
                language=language,
                beam_size=1,
                best_of=1,
                temperature=0.0,
                vad_filter=True,
            )

            # Collect segments
            full_text = ""
            transcript_segments = []

            for segment in segments:
                segment_data = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "confidence": getattr(segment, "avg_logprob", 0.0),
                }
                transcript_segments.append(segment_data)
                full_text += segment.text.strip() + " "

            transcription_time = time.time() - start_time
            full_text = full_text.strip()

            return {
                "text": full_text,
                "segments": transcript_segments,
                "language": info.language,
                "transcription_time": transcription_time,
                "success": True,
            }

        except Exception as e:
            self.logger.error(f"Numpy transcription failed: {e}")
            return {"text": "", "error": str(e), "success": False}

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "cache_dir": self.cache_dir,
            "available": FASTER_WHISPER_AVAILABLE,
            "loaded": self.model is not None,
        }


# Factory function for easy instantiation
def create_faster_whisper_stt(
    model_size: str = "base", device: str = "auto", compute_type: str = "float16"
) -> FasterWhisperSTT:
    """
    Factory function to create a FasterWhisperSTT instance.

    Recommended configurations:
    - For speed: model_size="tiny" or "base"
    - For accuracy: model_size="small" or "medium"
    - For CPU: compute_type="float32"
    - For GPU: compute_type="float16"
    """
    return FasterWhisperSTT(
        model_size=model_size, device=device, compute_type=compute_type
    )


if __name__ == "__main__":
    # Test the implementation
    logging.basicConfig(level=logging.INFO)

    print("Testing FasterWhisperSTT...")
    stt = create_faster_whisper_stt(model_size="tiny")  # Use tiny for quick testing
    print(f"Model info: {stt.get_model_info()}")

    # Test with a sample audio file if available
    test_audio = "/tmp/test_audio.wav"
    if os.path.exists(test_audio):
        result = stt.transcribe_file(test_audio)
        print(f"Transcription: {result}")
    else:
        print("No test audio file found at /tmp/test_audio.wav")
