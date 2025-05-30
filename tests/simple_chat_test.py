#!/usr/bin/env python3
import requests
import json

print("🧪 Testing Backend-Client Communication")
print("=" * 50)

# Test chat endpoint
print("Testing /chat endpoint...")
try:
    data = {
        "message": "Hello Aida, list  my light devices",
        "roomName": "test_room",
        "conversationHistory": [],
    }

    response = requests.post("http://localhost:3000/chat", json=data, timeout=15)

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print("✅ SUCCESS!")
        print(f"AI Response: {result.get('data', 'No response')}")
        print(f"Success: {result.get('success', False)}")
        print(f"Timestamp: {result.get('timestamp', 'No timestamp')}")
    else:
        print(f"❌ FAILED - Status: {response.status_code}")
        print(f"Response: {response.text}")

except Exception as e:
    print(f"❌ ERROR: {e}")
