"""
Backend response schemas for type checking and validation
Matches the APIResponse interface from backend TypeScript types
"""

from typing import List, Dict, Any, Optional, TypeVar, Generic
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

# Generic type for data payload
T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Base schema for all API responses matching backend APIResponse<T> interface"""

    success: bool = Field(..., description="Request success status")
    timestamp: str = Field(..., description="Response timestamp")
    error: Optional[str] = Field(None, description="Error message if request failed")
    details: Optional[str] = Field(None, description="Additional error details")
    data: Optional[T] = Field(None, description="Response data payload")

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v):
        # Accept ISO format timestamps
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Timestamp must be in ISO format")
        return v


class HealthData(BaseModel):
    """Schema for health endpoint data payload"""

    status: str = Field(..., description="Service status")
    version: Optional[str] = Field(None, description="Service version")
    uptime: Optional[float] = Field(None, description="Service uptime in seconds")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed_statuses = ["ok"]
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}, got {v}")
        return v


class TokenUsage(BaseModel):
    """Schema for token usage information"""

    total_tokens: int = Field(..., description="Total tokens used")
    prompt_tokens: int = Field(..., description="Number of prompt tokens used")
    completion_tokens: int = Field(..., description="Number of completion tokens used")

    @field_validator("total_tokens", "prompt_tokens", "completion_tokens")
    @classmethod
    def validate_positive(cls, v):
        if v < 0:
            raise ValueError("Token counts must be non-negative")
        return v


class ChatData(BaseModel):
    """Schema for chat endpoint data payload"""

    response: str = Field(..., description="AI assistant response")
    usage: Optional[TokenUsage] = Field(None, description="Token usage information")

    @field_validator("response")
    @classmethod
    def validate_response_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Response cannot be empty")
        return v


class ConversationMessage(BaseModel):
    """Schema for conversation history messages"""

    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        allowed_roles = ["user", "assistant", "system"]
        if v not in allowed_roles:
            raise ValueError(f"Role must be one of {allowed_roles}, got {v}")
        return v


class ChatRequest(BaseModel):
    """Schema for /chat endpoint request"""

    message: str = Field(..., description="User message")
    roomName: Optional[str] = Field(None, description="Room name")
    conversationHistory: List[ConversationMessage] = Field(
        default_factory=list, description="Previous conversation messages"
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v


class VoiceCommandData(BaseModel):
    """Schema for voice command endpoint data payload"""

    transcription: str = Field(..., description="Speech transcription")
    response: str = Field(..., description="AI assistant response")
    audioFile: str = Field(..., description="Generated audio file path")
    usage: Optional[TokenUsage] = Field(None, description="Token usage information")


class TTSData(BaseModel):
    """Schema for TTS endpoint data payload"""

    room: str = Field(..., description="Room name")
    filename: str = Field(..., description="Generated audio filename")
    textLength: int = Field(..., description="Length of text processed")


class PlayData(BaseModel):
    """Schema for play endpoint data payload"""

    room: str = Field(..., description="Room name")
    type: str = Field(..., description="Play type (spotify, radio)")
    result: Dict[str, Any] = Field(..., description="Play result details")


# Type aliases for specific API responses
HealthResponse = APIResponse[HealthData]
ChatResponse = APIResponse[ChatData]
VoiceCommandResponse = APIResponse[VoiceCommandData]
TTSResponse = APIResponse[TTSData]
PlayResponse = APIResponse[PlayData]
ErrorResponse = APIResponse[None]  # Error responses have no data payload


class ResponseValidator:
    """Utility class for validating backend responses"""

    @staticmethod
    def validate_health_response(response_data: Dict[str, Any]) -> HealthResponse:
        """Validate health endpoint response"""
        try:
            return HealthResponse(**response_data)
        except Exception as e:
            raise ValueError(f"Invalid health response format: {e}")

    @staticmethod
    def validate_chat_response(response_data: Dict[str, Any]) -> ChatResponse:
        """Validate chat endpoint response"""
        try:
            return ChatResponse(**response_data)
        except Exception as e:
            raise ValueError(f"Invalid chat response format: {e}")

    @staticmethod
    def validate_voice_command_response(
        response_data: Dict[str, Any],
    ) -> VoiceCommandResponse:
        """Validate voice command endpoint response"""
        try:
            return VoiceCommandResponse(**response_data)
        except Exception as e:
            raise ValueError(f"Invalid voice command response format: {e}")

    @staticmethod
    def validate_tts_response(response_data: Dict[str, Any]) -> TTSResponse:
        """Validate TTS endpoint response"""
        try:
            return TTSResponse(**response_data)
        except Exception as e:
            raise ValueError(f"Invalid TTS response format: {e}")

    @staticmethod
    def validate_play_response(response_data: Dict[str, Any]) -> PlayResponse:
        """Validate play endpoint response"""
        try:
            return PlayResponse(**response_data)
        except Exception as e:
            raise ValueError(f"Invalid play response format: {e}")

    @staticmethod
    def validate_error_response(response_data: Dict[str, Any]) -> ErrorResponse:
        """Validate error response"""
        try:
            return ErrorResponse(**response_data)
        except Exception as e:
            raise ValueError(f"Invalid error response format: {e}")

    @staticmethod
    def validate_chat_request(request_data: Dict[str, Any]) -> ChatRequest:
        """Validate chat request before sending"""
        try:
            return ChatRequest(**request_data)
        except Exception as e:
            raise ValueError(f"Invalid chat request format: {e}")


# Helper functions for common validations
def is_valid_response_structure(
    data: Dict[str, Any], required_fields: List[str]
) -> tuple[bool, str]:
    """Check if response has required fields"""
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {missing_fields}"
    return True, "Valid structure"


def validate_response_types(
    data: Dict[str, Any], field_types: Dict[str, type]
) -> tuple[bool, str]:
    """Validate that response fields have correct types"""
    for field, expected_type in field_types.items():
        if field in data and not isinstance(data[field], expected_type):
            return (
                False,
                f"Field '{field}' should be {expected_type.__name__}, got {type(data[field]).__name__}",
            )
    return True, "Valid types"
