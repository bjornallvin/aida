#!/usr/bin/env python3
"""
Test script for specific light control commands
Tests the issue with "turn on desk and workshop light in bedroom"
"""

import requests
import json


def test_specific_lights():
    """Test the problematic specific light command"""
    print("Testing: 'turn on desk and workshop light in bedroom'")

    response = requests.post(
        "http://localhost:3000/chat",
        json={
            "message": "turn on desk and workshop light in bedroom",
            "roomName": "bedroom",
            "conversationHistory": [],
        },
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
    test_specific_lights()
