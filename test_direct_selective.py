#!/usr/bin/env python3
"""
Direct test of the new control_multiple_lights functionality
"""

import requests
import json


def test_direct_selective_control():
    """Test the new control_multiple_lights action directly"""
    print("Testing direct control_multiple_lights with excludeDevices...")

    # Test data that should use our new functionality
    tool_call_data = {
        "action": "control_multiple_lights",
        "deviceName": "bedroom",
        "isOn": False,
        "excludeDevices": ["bedroom_bed"],
    }

    print(f"Tool call data: {json.dumps(tool_call_data, indent=2)}")

    # Direct API call to test the tool
    response = requests.post(
        "http://localhost:3000/tools/tradfri_control",
        json=tool_call_data,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )

    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result.get('success', False)}")
        print(f"Message: {result.get('message', 'No message')}")
        return result.get("success", False)
    else:
        print(f"Direct tool call failed: {response.status_code}")
        print(response.text)
        return False


def test_ai_with_explicit_instruction():
    """Test with more explicit instruction to use the new action"""
    print("\nTesting with explicit instruction...")

    message = """Use the control_multiple_lights action to turn off all bedroom lights except the bed light. 
    Use these parameters:
    - action: control_multiple_lights
    - deviceName: bedroom  
    - isOn: false
    - excludeDevices: ["bedroom_bed"]"""

    response = requests.post(
        "http://localhost:3000/chat",
        json={"message": message, "roomName": "bedroom", "conversationHistory": []},
        headers={"Content-Type": "application/json"},
        timeout=30,
    )

    if response.status_code == 200:
        data = response.json()
        chat_data = data.get("data", {})
        print("AI Response:", chat_data.get("response", ""))
        print()

        if "toolCalls" in chat_data:
            print("Tool Calls:")
            for i, call in enumerate(chat_data["toolCalls"], 1):
                print(f"{i}. Tool: {call.get('function', {}).get('name', 'unknown')}")
                try:
                    args = json.loads(call.get("function", {}).get("arguments", "{}"))
                    print(f"   Action: {args.get('action', 'unknown')}")
                    print(f"   Device: {args.get('deviceName', 'N/A')}")
                    print(f"   IsOn: {args.get('isOn', 'N/A')}")
                    print(f"   ExcludeDevices: {args.get('excludeDevices', 'N/A')}")
                except json.JSONDecodeError:
                    print(
                        f"   Args: {call.get('function', {}).get('arguments', 'N/A')}"
                    )

        if "toolResults" in chat_data:
            print()
            print("Tool Results:")
            for i, result in enumerate(chat_data["toolResults"], 1):
                if isinstance(result, dict):
                    print(f"{i}. Success: {result.get('success', False)}")
                    print(f"   Message: {result.get('message', 'No message')}")
    else:
        print(f"Request failed: {response.status_code}")
        print(response.text)


if __name__ == "__main__":
    # First test direct tool call
    direct_success = test_direct_selective_control()

    # Then test AI integration
    test_ai_with_explicit_instruction()

    print(f"\nDirect tool test: {'✅ PASSED' if direct_success else '❌ FAILED'}")
