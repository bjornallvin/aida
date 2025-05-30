#!/usr/bin/env python3
"""
Test Backend Communication for Aida Snapcast Client
Tests the /chat endpoint communication between client and backend with type checking
"""

import json
import os
import requests
import sys
from pathlib import Path
from typing import Dict, Any

# Add the room-client directory to the path for proper module structure
room_client_path = str(Path(__file__).parent.parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)

from src.voice.handler import VoiceCommandHandler
from src.schemas import HealthResponse, ChatResponse, HealthData

# Import our schemas for validation
try:
    from src.schemas import ResponseValidator

    SCHEMAS_AVAILABLE = True
except ImportError:
    print("⚠️  Schemas not available - install pydantic for full validation")
    SCHEMAS_AVAILABLE = False


def validate_response_schema(
    response_data: Dict[str, Any], schema_name: str
) -> tuple[bool, str, Any]:
    """Validate response using appropriate schema"""
    if not SCHEMAS_AVAILABLE:
        return True, "Schema validation skipped (pydantic not available)", response_data

    try:
        if schema_name == "health":
            validated = ResponseValidator.validate_health_response(response_data)
        elif schema_name == "chat":
            validated = ResponseValidator.validate_chat_response(response_data)
        else:
            return False, f"Unknown schema: {schema_name}", None

        return True, "Schema validation passed", validated
    except Exception as e:
        return False, f"Schema validation failed: {e}", None


def test_health_endpoint(backend_url):
    """Test if backend is running and responding with schema validation"""
    try:
        response = requests.get(f"{backend_url}/health", timeout=5)
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Backend health check passed")
            print(f"   Response: {response_data}")

            # Validate response schema
            is_valid, message, validated_data = validate_response_schema(
                response_data, "health"
            )
            if is_valid and SCHEMAS_AVAILABLE:
                print(f"   ✅ Schema validation: {message}")
                # Access validated data
                health_data: HealthData = validated_data.data
                print(f"   📊 Status: {health_data.status}")
                print(f"   🕒 Uptime: {health_data.uptime}")

            elif not is_valid:
                print(f"   ⚠️  Schema validation: {message}")
                # Still continue test but log the issue
            else:
                print(f"   ℹ️  {message}")

            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False


def test_chat_endpoint(backend_url, room_name="test_room"):
    """Test the /chat endpoint directly"""
    try:
        print(f"\n🔄 Testing /chat endpoint...")

        # Test data
        test_message = "Hello Aida, can you hear me?"
        test_data = {
            "message": test_message,
            "roomName": room_name,
            "conversationHistory": [],
        }

        # Send request
        response = requests.post(f"{backend_url}/chat", json=test_data, timeout=30)

        if response.status_code == 200:
            result = response.json().get("data", {})
            print("✅ Chat endpoint test passed")
            print(f"   User message: {test_message}")
            print(f"   AI response:{result.get('response', 'No response')}")
            print(f"   Usage: {result.get('usage', 'No usage data')}")
            return True
        else:
            print(f"❌ Chat endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False

    except requests.RequestException as e:
        print(f"❌ Chat endpoint request failed: {e}")
        return False


def test_voice_command_handler(backend_url, room_name="test_room"):
    """Test the VoiceCommandHandler's text command method"""
    try:
        print(f"\n🔄 Testing VoiceCommandHandler...")

        # Create minimal config
        config = {
            "room_name": room_name,
            "voice_commands_enabled": True,
            "backend_url": backend_url,
        }

        # Initialize voice handler
        voice_handler = VoiceCommandHandler(config, backend_url)

        # Test text command
        test_message = "What can you help me with today?"
        result = voice_handler.send_text_command(test_message)

        if result:
            print("✅ VoiceCommandHandler test passed")
            print(f"   User message: {test_message}")
            print(f"   AI response: {result}")
            print(
                f"   Conversation history length: {len(voice_handler.conversation_history)}"
            )
            return True
        else:
            print("❌ VoiceCommandHandler test failed")
            return False

    except Exception as e:
        print(f"❌ VoiceCommandHandler test error: {e}")
        return False


def test_conversation_flow(backend_url, room_name="test_room"):
    """Test a multi-turn conversation"""
    try:
        print(f"\n🔄 Testing conversation flow...")

        config = {
            "room_name": room_name,
            "voice_commands_enabled": True,
            "backend_url": backend_url,
        }

        voice_handler = VoiceCommandHandler(config, backend_url)

        # Multi-turn conversation
        messages = [
            "Hello, I'm testing the system",
            "Can you play some music?",
            "What about jazz music?",
            "Thank you for the help",
        ]

        for i, message in enumerate(messages, 1):
            print(f"   Turn {i}: {message}")
            result = voice_handler.send_text_command(message)
            if result:
                print(f"   AI: {result[:100]}...")
            else:
                print(f"   ❌ Failed at turn {i}")
                return False

        print("✅ Conversation flow test passed")
        print(
            f"   Final conversation history: {len(voice_handler.conversation_history)} messages"
        )
        return True

    except Exception as e:
        print(f"❌ Conversation flow test error: {e}")
        return False


def main():
    """Main test function"""
    print("🚀 Testing Aida Backend-Client Communication")
    print("=" * 50)

    # Configuration
    backend_url = "http://localhost:3000"
    room_name = "test_room"

    # Override from environment if available
    if "AIDA_BACKEND_URL" in os.environ:
        backend_url = os.environ["AIDA_BACKEND_URL"]

    print(f"Backend URL: {backend_url}")
    print(f"Room Name: {room_name}")

    # Run tests
    tests_passed = 0
    total_tests = 4

    if test_health_endpoint(backend_url):
        tests_passed += 1

    if test_chat_endpoint(backend_url, room_name):
        tests_passed += 1

    if test_voice_command_handler(backend_url, room_name):
        tests_passed += 1

    if test_conversation_flow(backend_url, room_name):
        tests_passed += 1

    # Results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} passed")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Backend-client communication is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the backend server and configuration.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
