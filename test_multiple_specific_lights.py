#!/usr/bin/env python3
"""
Test script for multiple specific light control commands
Tests if AI uses multiple control_light calls for specific devices
"""

import requests
import json


def test_multiple_specific_lights():
    """Test multiple specific light commands"""
    commands = [
        # "turn off ceiling light in bedroom",
        "turn on desk and workshop light in bedroom",
        # "turn on the bedroom desk light and bedroom workshop light",
        # "turn on bedroom_desk and bedroom_workshop",
        # "turn on just the desk and workshop lights in the bedroom",
    ]

    for i, command in enumerate(commands, 1):
        print(f"\n--- Test {i} ---")
        print(f"Testing: '{command}'")

        response = requests.post(
            "http://localhost:3000/chat",
            json={"message": command, "roomName": "bedroom", "conversationHistory": []},
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        if response.status_code == 200:
            data = response.json()
            chat_data = data.get("data", {})
            print("AI Response:", chat_data.get("response", ""))

            if "toolCalls" in chat_data:
                print(f"Tool Calls ({len(chat_data['toolCalls'])}):")
                for j, call in enumerate(chat_data["toolCalls"], 1):
                    print(
                        f"  {j}. Tool: {call.get('function', {}).get('name', 'unknown')}"
                    )
                    try:
                        args = json.loads(
                            call.get("function", {}).get("arguments", "{}")
                        )
                        print(f"     Action: {args.get('action', 'unknown')}")
                        print(f"     Device: {args.get('deviceName', 'N/A')}")
                        print(f"     IsOn: {args.get('isOn', 'N/A')}")
                        if args.get("excludeDevices"):
                            print(
                                f"     ExcludeDevices: {args.get('excludeDevices', 'N/A')}"
                            )
                    except json.JSONDecodeError:
                        print(
                            f"     Args: {call.get('function', {}).get('arguments', 'N/A')}"
                        )

            if "toolResults" in chat_data:
                print("Tool Results:")
                for j, result in enumerate(chat_data["toolResults"], 1):
                    if isinstance(result, dict):
                        print(f"  {j}. Success: {result.get('success', False)}")
                        print(f"     Message: {result.get('message', 'No message')}")
        else:
            print(f"Request failed: {response.status_code}")
            print(response.text)


if __name__ == "__main__":
    test_multiple_specific_lights()
