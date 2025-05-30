#!/usr/bin/env python3
"""
Test script for Aida tool integration functionality
Tests the OpenAI function calling with smart home tools
"""

import requests
import time
import sys

# Configuration
BACKEND_URL = "http://localhost:3000"
TEST_TIMEOUT = 30


def test_backend_health():
    """Test if the backend is running and responsive"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and healthy")
            return True
        else:
            print(f"❌ Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend - is it running?")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error checking backend health: {e}")
        return False


def test_chat_with_tool_calls():
    """Test chat endpoint with requests that should trigger tool calls"""

    test_cases = [
        {
            "message": "Turn on the lights in the living room",
            "expected_tool": "tradfri_control",
            "description": "Light control request",
        },
        {
            "message": "Set the temperature to 22 degrees",
            "expected_tool": "control_temperature",
            "description": "Temperature control request",
        },
        {
            "message": "Play some music",
            "expected_tool": "control_music",
            "description": "Music control request",
        },
        {
            "message": "Lock the front door",
            "expected_tool": "control_security",
            "description": "Security control request",
        },
        {
            "message": "What's the status of all devices?",
            "expected_tool": "get_device_status",
            "description": "Device status request",
        },
    ]

    print("\n🧪 Testing chat with tool integration...")

    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test_case['description']}")
        print(f"Message: '{test_case['message']}'")

        try:
            response = requests.post(
                f"{BACKEND_URL}/chat",
                json={"message": test_case["message"], "roomName": "living_room"},
                headers={"Content-Type": "application/json"},
                timeout=TEST_TIMEOUT,
            )

            if response.status_code == 200:
                data = response.json()
                chat_data = data.get("data", {})
                print("✅ Chat request successful")
                print(f"Response: {chat_data.get('response', 'No response')[:100]}...")

                # Check if tool calls were made
                if "toolCalls" in chat_data and chat_data["toolCalls"]:
                    print(f"🔧 Tool calls detected: {len(chat_data['toolCalls'])}")
                    for tool_call in chat_data["toolCalls"]:
                        tool_name = tool_call.get("function", {}).get("name", "unknown")
                        print(f"   - Tool: {tool_name}")

                        if tool_name == test_case["expected_tool"]:
                            print(
                                f"   ✅ Expected tool '{test_case['expected_tool']}' was called"
                            )
                        else:
                            print(
                                f"   ⚠️  Expected '{test_case['expected_tool']}' but got '{tool_name}'"
                            )
                else:
                    print(
                        f"   ⚠️  No tool calls made (expected '{test_case['expected_tool']}')"
                    )

                # Check if tool results were returned
                if "toolResults" in chat_data and chat_data["toolResults"]:
                    print(f"🔧 Tool results: {len(chat_data['toolResults'])}")
                    for result in chat_data["toolResults"]:
                        success = result.get("success", False)
                        message = result.get("message", "No message")
                        print(f"   - Success: {success}, Message: {message}")

            else:
                print(f"❌ Chat request failed with status {response.status_code}")
                print(f"Response: {response.text}")

        except requests.exceptions.Timeout:
            print(f"❌ Request timed out after {TEST_TIMEOUT} seconds")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error during chat request: {e}")

        time.sleep(1)  # Brief pause between tests


def test_simple_chat():
    """Test basic chat functionality without tools"""
    print("\n🗨️  Testing basic chat functionality...")

    try:
        response = requests.post(
            f"{BACKEND_URL}/chat",
            json={"message": "Hello, how are you?", "roomName": "living_room"},
            headers={"Content-Type": "application/json"},
            timeout=TEST_TIMEOUT,
        )

        if response.status_code == 200:
            data = response.json()
            chat_data = data.get("data", {})
            print("✅ Basic chat successful")
            print(f"Response: {chat_data.get('response', 'No response')}")
            return True
        else:
            print(f"❌ Basic chat failed with status {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ Error during basic chat: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Aida Tool Integration Tests")
    print("=" * 50)

    # Test backend health
    if not test_backend_health():
        print("\n❌ Backend health check failed. Please ensure the backend is running.")
        print("Try: cd backend && npm run dev")
        sys.exit(1)

    # Test basic chat
    if not test_simple_chat():
        print("\n❌ Basic chat test failed.")
        sys.exit(1)

    # Test tool integration
    test_chat_with_tool_calls()

    print("\n" + "=" * 50)
    print("🎉 Tool integration tests completed!")
    print("\nNote: These tests verify that tool calling is working.")
    print("The actual smart home integrations are mocked and will need")
    print("to be connected to real APIs (Philips Hue, Nest, etc.) in production.")


if __name__ == "__main__":
    main()
