#!/usr/bin/env python3
"""
Test the new control_specific_lights functionality
This should properly handle commands like "turn on desk and workshop light in bedroom"
"""

import json
import requests
import time


def test_control_specific_lights():
    """Test the new control_specific_lights action"""

    # Backend URL
    backend_url = "http://localhost:3000"

    print("🧪 Testing control_specific_lights functionality...")
    print("=" * 60)

    # Test cases for control_specific_lights
    test_cases = [
        {
            "name": "Test 1: Turn on desk and workshop lights",
            "message": "turn on desk and workshop light in bedroom",
            "expected_action": "control_specific_lights",
            "expected_devices": ["desk", "workshop"],
        },
        {
            "name": "Test 2: Turn off multiple specific lights",
            "message": "turn off bedroom desk light and bedroom workshop light",
            "expected_action": "control_specific_lights",
            "expected_devices": ["bedroom desk light", "bedroom workshop light"],
        },
        {
            "name": "Test 3: Control kitchen lights specifically",
            "message": "turn on kitchen counter and kitchen ceiling light",
            "expected_action": "control_specific_lights",
            "expected_devices": ["kitchen counter", "kitchen ceiling light"],
        },
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{test_case['name']}")
        print("-" * 50)

        try:
            # Send the message to backend
            response = requests.post(
                f"{backend_url}/chat",
                json={"message": test_case["message"]},
                headers={"Content-Type": "application/json"},
                timeout=30,
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Response received")
                print(f"📝 Response: {data.get('response', 'No response')}")

                # Check if tool calls were made
                if "toolCalls" in data and data["toolCalls"]:
                    for tool_call in data["toolCalls"]:
                        tool_name = tool_call.get("name", "unknown")
                        args = tool_call.get("arguments", {})

                        print(f"🔧 Tool: {tool_name}")
                        print(f"📋 Action: {args.get('action', 'unknown')}")

                        if tool_name == "tradfri_control":
                            action = args.get("action")

                            if action == test_case["expected_action"]:
                                print(f"✅ Correct action: {action}")

                                # Check deviceNames parameter
                                device_names = args.get("deviceNames", [])
                                print(f"🎯 Device names: {device_names}")

                                if device_names:
                                    print(
                                        f"✅ deviceNames parameter is being used correctly"
                                    )
                                    print(
                                        f"📊 Expected devices: {test_case['expected_devices']}"
                                    )
                                    print(f"📊 Actual devices: {device_names}")
                                else:
                                    print(
                                        f"❌ deviceNames parameter is missing or empty"
                                    )
                            else:
                                print(
                                    f"❌ Wrong action: expected {test_case['expected_action']}, got {action}"
                                )

                            # Show all parameters
                            print(f"🔍 All parameters: {json.dumps(args, indent=2)}")

                        print()
                else:
                    print("❌ No tool calls made")

            else:
                print(f"❌ Request failed with status {response.status_code}")
                print(f"Error: {response.text}")

        except Exception as e:
            print(f"❌ Test failed with error: {e}")

        print("\n" + "=" * 60)

        # Wait between tests
        if i < len(test_cases):
            time.sleep(2)

    print("\n🏁 Testing completed!")


if __name__ == "__main__":
    test_control_specific_lights()
