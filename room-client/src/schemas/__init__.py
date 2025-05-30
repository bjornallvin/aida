"""
Backend response schemas for type checking and validation
"""

from .schemas import (
    # Base classes
    APIResponse,
    ResponseValidator,
    # Data payload schemas
    HealthData,
    ChatData,
    VoiceCommandData,
    TTSData,
    PlayData,
    TokenUsage,
    ConversationMessage,
    # Request schemas
    ChatRequest,
    # Response type aliases
    HealthResponse,
    ChatResponse,
    VoiceCommandResponse,
    TTSResponse,
    PlayResponse,
    ErrorResponse,
    # Helper functions
    is_valid_response_structure,
    validate_response_types,
)

__all__ = [
    # Base classes
    "APIResponse",
    "ResponseValidator",
    # Data payload schemas
    "HealthData",
    "ChatData",
    "VoiceCommandData",
    "TTSData",
    "PlayData",
    "TokenUsage",
    "ConversationMessage",
    # Request schemas
    "ChatRequest",
    # Response type aliases
    "HealthResponse",
    "ChatResponse",
    "VoiceCommandResponse",
    "TTSResponse",
    "PlayResponse",
    "ErrorResponse",
    # Helper functions
    "is_valid_response_structure",
    "validate_response_types",
]
