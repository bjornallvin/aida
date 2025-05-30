"""
Voice package
"""

from .wake_word_detector import WakeWordDetector


# Only import handler when needed to avoid dependency issues
def get_voice_command_handler():
    """Lazy import of VoiceCommandHandler to avoid circular dependencies"""
    from .handler import VoiceCommandHandler

    return VoiceCommandHandler


__all__ = ["WakeWordDetector", "get_voice_command_handler"]
