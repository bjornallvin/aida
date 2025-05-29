"""
Speech-to-Text implementations
"""

import logging
from typing import Dict, Any, Optional
from ..utils import get_cache_dir

logger = logging.getLogger(__name__)

try:
    from faster_whisper import WhisperModel  # type: ignore[import-untyped]

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
        self.cache_dir = cache_dir or get_cache_dir()

        # Ensure cache directory exists
        from pathlib import Path

        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)

        self.logger = logging.getLogger(__name__)
        self._load_model()

    def _load_model(self):
        """Load the Whisper model."""
        try:
            import time

            start_time = time.time()
            self.logger.info("Loading faster-whisper model: %s", self.model_size)

            # Determine device
            device = self.device
            if device == "auto":
                try:
                    import torch  # type: ignore[import-untyped]

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
            )  # type: ignore

            load_time = time.time() - start_time
            self.logger.info(
                "Model loaded in %.2fs on %s with %s", load_time, device, compute_type
            )

        except (ImportError, OSError, IOError) as e:
            self.logger.error("Failed to load model: %s", e)
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

        import os

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        try:
            import time

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
                "Transcribed in %.2fs: '%s...'", transcription_time, full_text[:100]
            )
            return result

        except (OSError, IOError) as e:
            self.logger.error("Transcription failed: %s", e)
            return {
                "text": "",
                "segments": [],
                "language": None,
                "error": str(e),
                "success": False,
            }

    def transcribe_numpy(
        self, audio_array, language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe numpy audio array directly.

        Args:
            audio_array: Numpy array with audio data
            language: Language code or None for auto-detection

        Returns:
            Dict with transcription results
        """
        if not self.model:
            raise RuntimeError("Model not loaded")

        try:
            import time

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

        except (OSError, IOError) as e:
            self.logger.error("Numpy transcription failed: %s", e)
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


def create_stt_engine(config: Dict[str, Any]) -> Optional[FasterWhisperSTT]:
    """
    Factory function to create an STT engine based on configuration.

    Args:
        config: STT configuration dictionary

    Returns:
        STT engine instance or None if not available
    """
    if not config.get("use_native_stt", True):
        return None

    if not FASTER_WHISPER_AVAILABLE:
        logger.warning("faster-whisper not available")
        return None

    try:
        stt_config = config.get("stt_config", {})
        model_size = stt_config.get("model_size", "base")
        device = stt_config.get("device", "auto")
        compute_type = stt_config.get("compute_type", "float16")

        return FasterWhisperSTT(
            model_size=model_size, device=device, compute_type=compute_type
        )
    except (ImportError, OSError, IOError) as e:
        logger.error("Failed to create STT engine: %s", e)
        return None
