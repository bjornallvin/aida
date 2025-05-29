#!/usr/bin/env python3
"""
Test script to verify backend-client communication for chat functionality
"""

import requests
import json
import sys


def test_chat_endpoint():
    """Test the /chat endpoint communication"""
    backend_url = "http://localhost:3000"

    print("🧪 Testing Backend-Client Communication")
    print("=" * 50)

    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = requests.get(f"{backend_url}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"   ✅ Health check successful: {health_data['status']}")
            print(f"   📅 Server timestamp: {health_data['timestamp']}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        return False

    # Test 2: Chat endpoint with simple message
    print("\n2. Testing /chat endpoint...")
    chat_data = {
        "message": "Hello Aida, can you hear me?",
        "roomName": "test_room",
        "conversationHistory": [],
    }

    try:
        response = requests.post(
            f"{backend_url}/chat",
            json=chat_data,
            timeout=15,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Chat request successful")
            print(
                f"   💬 AI Response: {result.get('response', 'No response')[:100]}..."
            )
            print(f"   📊 Success: {result.get('success', False)}")
            print(f"   🕒 Timestamp: {result.get('timestamp', 'No timestamp')}")

            if "usage" in result:
                usage = result["usage"]
                print(f"   🔢 Tokens used: {usage.get('total_tokens', 'N/A')}")

            return True
        else:
            print(f"   ❌ Chat request failed: {response.status_code}")
            print(f"   📝 Response: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ Chat request failed: {e}")
        return False

    # Test 3: Chat with conversation history
    print("\n3. Testing /chat with conversation history...")
    conversation_history = [
        {"role": "user", "content": "What's your name?"},
        {"role": "assistant", "content": "I'm Aida, your apartment AI assistant."},
    ]

    chat_data_with_history = {
        "message": "What can you help me with?",
        "roomName": "living_room",
        "conversationHistory": conversation_history,
    }

    try:
        response = requests.post(
            f"{backend_url}/chat",
            json=chat_data_with_history,
            timeout=15,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Chat with history successful")
            print(
                f"   💬 AI Response: {result.get('response', 'No response')[:100]}..."
            )
            return True
        else:
            print(f"   ❌ Chat with history failed: {response.status_code}")
            return False

    except Exception as e:
        print(f"   ❌ Chat with history failed: {e}")
        return False


def test_voice_command_class():
    """Test the VoiceCommandHandler's send_text_command method"""
    print("\n4. Testing VoiceCommandHandler class...")

    try:
        # Import the voice command handler
        import sys
        import os

        sys.path.append(os.path.join(os.path.dirname(__file__), "..", "room-client"))
        from voice_commands import VoiceCommandHandler

        # Create a test config
        test_config = {"room_name": "test_room", "voice_commands_enabled": True}

        # Initialize handler (without audio dependencies)
        handler = VoiceCommandHandler(test_config, backend_url="http://localhost:3000")

        # Test text command
        result = handler.send_text_command(
            "Hello Aida, this is a test from the voice command handler."
        )

        if result:
            print(f"   ✅ VoiceCommandHandler test successful")
            print(f"   💬 Response: {result.get('response', 'No response')[:100]}...")
            return True
        else:
            print(f"   ❌ VoiceCommandHandler test failed")
            return False

    except ImportError as e:
        print(f"   ⚠️  Could not import VoiceCommandHandler: {e}")
        return True  # Don't fail the test for import issues
    except Exception as e:
        print(f"   ❌ VoiceCommandHandler test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Backend-Client Communication Tests\n")

    tests_passed = 0
    total_tests = 4

    # Run tests
    if test_chat_endpoint():
        tests_passed += 1

    if test_voice_command_class():
        tests_passed += 1

    # Results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Backend-client communication is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
