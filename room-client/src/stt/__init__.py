"""
STT package
"""

from .faster_whisper import FasterWhisperSTT, create_stt_engine

__all__ = ["FasterWhisperSTT", "create_stt_engine"]
