#!/usr/bin/env python3

import requests
import json


def test_new_endpoint():
    url = "http://localhost:3000/text-voice-command"
    payload = {
        "message": "What time is it?",
        "room": "unknown",
        "conversation_history": [],
    }

    print(f"Testing {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Audio file: {data.get('data', {}).get('audioFile', 'None')}")
        else:
            print("❌ Failed")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_new_endpoint()
