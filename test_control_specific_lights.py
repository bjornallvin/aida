#!/usr/bin/env python3
"""
Test script to verify the new control_specific_lights functionality
"""

import requests
import json
import time

# Backend URL
BASE_URL = "http://localhost:3000"


def send_voice_command(command):
    """Send a voice command to the backend"""
    url = f"{BASE_URL}/text-voice-command"
    payload = {
        "message": command,
    }

    print(f"\n🗣️  Sending command: '{command}'")
    print("=" * 60)

    try:
        response = requests.post(url, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            response_data = result.get("data", {})
            print(f"✅ Response: {response_data.get('response', 'No response text')}")

            # Check if tools were called
            if "toolResults" in response_data and response_data["toolResults"]:
                print(f"\n🔧 Tools called: {len(response_data['toolResults'])}")
                for i, tool_result in enumerate(response_data["toolResults"], 1):
                    # Handle case where tool_result might be a list
                    if isinstance(tool_result, list):
                        # If it's a list, take the first item
                        if tool_result:
                            tool_result = tool_result[0]
                        else:
                            continue

                    # Tool results structure from backend
                    tool_name = tool_result.get("toolName", "Unknown")
                    success = tool_result.get("success", False)
                    message = tool_result.get("message", "No message")
                    print(
                        f"   Tool {i}: {tool_name} - {'✅' if success else '❌'} {message}"
                    )

                    # Show specific details for control_specific_lights
                    if tool_name == "tradfri_control":
                        # Get parameters from toolCalls if available
                        if "toolCalls" in response_data and response_data["toolCalls"]:
                            for tool_call in response_data["toolCalls"]:
                                if (
                                    tool_call.get("function", {}).get("name")
                                    == "tradfri_control"
                                ):
                                    args = json.loads(
                                        tool_call.get("function", {}).get(
                                            "arguments", "{}"
                                        )
                                    )
                                    action = args.get("action", "unknown")
                                    print(f"      Action: {action}")

                                    if action == "control_specific_lights":
                                        device_names = args.get("deviceNames", [])
                                        print(f"      Device Names: {device_names}")

                                        # Show execution results
                                        controlled = tool_result.get(
                                            "controlledDevices", []
                                        )
                                        failed = tool_result.get("failedDevices", [])

                                        if controlled:
                                            print(f"      ✅ Controlled: {controlled}")
                                        if failed:
                                            print(f"      ❌ Failed: {failed}")
            else:
                print("⚠️  No tools were called")

        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

    print("-" * 60)


def main():
    print("🧪 Testing Control Specific Lights Functionality")
    print("=" * 60)

    # Test cases for the new control_specific_lights action
    test_commands = [
        # Test 1: Multiple specific devices in bedroom
        "turn on desk and workshop light in bedroom",
        # Test 2: Two specific devices with different phrasing
        "turn on the desk light and workshop light in the bedroom",
        # Test 3: Turn off specific devices
        "turn off desk and workshop light in bedroom",
        # Test 4: Three specific devices
        "turn on desk, workshop, and floor light in bedroom",
        # Test 5: Mixed command with brightness
        "set desk and workshop light in bedroom to 50% brightness",
        # Test 6: Different room
        "turn on kitchen counter and under cabinet lights",
        # Test 7: Single device (should use control_light)
        "turn on desk light in bedroom",
        # Test 8: Room-wide with exclusion (should use control_multiple_lights)
        "turn on all bedroom lights except the bed light",
    ]

    for i, command in enumerate(test_commands, 1):
        print(f"\n📋 Test {i}/{len(test_commands)}")
        send_voice_command(command)
        time.sleep(2)  # Small delay between tests

    print("\n🏁 All tests completed!")
    print("\n📊 Expected Results:")
    print(
        "- Tests 1-6: Should use 'control_specific_lights' action with deviceNames array"
    )
    print("- Test 7: Should use 'control_light' action for single device")
    print("- Test 8: Should use 'control_multiple_lights' action with excludeDevices")


if __name__ == "__main__":
    main()
