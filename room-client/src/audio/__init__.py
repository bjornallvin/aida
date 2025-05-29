"""
Audio package
"""

from .manager import AudioManager
from .vad import VoiceActivityDetector

__all__ = ["AudioManager", "VoiceActivityDetector"]
