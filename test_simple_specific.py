#!/usr/bin/env python3
"""
Simple test for specific light control
"""

import requests
import json


def test_simple_specific():
    """Test a simple specific light command"""
    print("Testing: 'turn on bedroom desk light'")

    response = requests.post(
        "http://localhost:3000/chat",
        json={
            "message": "turn on bedroom desk light",
            "roomName": "bedroom",
            "conversationHistory": [],
        },
        headers={"Content-Type": "application/json"},
        timeout=10,
    )

    if response.status_code == 200:
        data = response.json()
        chat_data = data.get("data", {})
        print("AI Response:", chat_data.get("response", ""))

        if "toolCalls" in chat_data:
            for i, call in enumerate(chat_data["toolCalls"], 1):
                try:
                    args = json.loads(call.get("function", {}).get("arguments", "{}"))
                    print(
                        f"Tool {i}: {args.get('action')} - Device: {args.get('deviceName')} - IsOn: {args.get('isOn')}"
                    )
                except json.JSONDecodeError:
                    print(f"Tool {i}: {call}")

        if "toolResults" in chat_data:
            for i, result in enumerate(chat_data["toolResults"], 1):
                if isinstance(result, dict):
                    print(
                        f"Result {i}: {result.get('success')} - {result.get('message')}"
                    )
    else:
        print(f"Failed: {response.status_code}")


if __name__ == "__main__":
    test_simple_specific()
