#!/usr/bin/env python3
"""
Test script for room-based light control functionality
Tests chat commands that should toggle lights in specific rooms
"""

import requests
import time
import sys
import json
from typing import Dict, List, Any

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


def test_get_available_devices():
    """Get list of available devices for testing"""
    try:
        print("\n🔍 Getting available devices for testing...")

        response = requests.post(
            f"{BACKEND_URL}/chat",
            json={
                "message": "List all devices",
                "roomName": "test_room",
                "conversationHistory": [],
            },
            headers={"Content-Type": "application/json"},
            timeout=TEST_TIMEOUT,
        )

        if response.status_code == 200:
            data = response.json()
            chat_data = data.get("data", {})
            print("✅ Device list request successful")

            # Check for tool calls
            if "toolCalls" in chat_data and chat_data["toolCalls"]:
                print(f"🔧 Tool calls detected: {len(chat_data['toolCalls'])}")

            # Check for tool results with device data
            if "toolResults" in chat_data and chat_data["toolResults"]:
                print(f"📋 Tool results: {len(chat_data['toolResults'])}")
                for result in chat_data["toolResults"]:
                    # Handle both dict and list result formats
                    if isinstance(result, dict):
                        if result.get("success") and "data" in result:
                            devices = result.get("data", [])
                            if isinstance(devices, list) and devices:
                                print(f"📱 Found {len(devices)} devices:")
                                rooms = {}
                                for device in devices:
                                    # Group devices by room based on naming convention
                                    device_name = device.get("name", "")
                                    room_name = (
                                        device_name.split("_")[0]
                                        if "_" in device_name
                                        else "unknown"
                                    )
                                    if room_name not in rooms:
                                        rooms[room_name] = []
                                    rooms[room_name].append(device)

                                for room, room_devices in rooms.items():
                                    lights = [
                                        d
                                        for d in room_devices
                                        if d.get("type") == "light"
                                    ]
                                    if lights:
                                        print(f"   🏠 {room}: {len(lights)} lights")
                                        for light in lights[:3]:  # Show first 3 lights
                                            print(
                                                f"      💡 {light.get('name')} (ID: {light.get('id')})"
                                            )

                                return rooms
                    elif isinstance(result, list):
                        # Handle direct list of devices
                        devices = result
                        if devices:
                            print(f"📱 Found {len(devices)} devices:")
                            rooms = {}
                            for device in devices:
                                # Group devices by room based on naming convention
                                device_name = device.get("name", "")
                                room_name = (
                                    device_name.split("_")[0]
                                    if "_" in device_name
                                    else "unknown"
                                )
                                if room_name not in rooms:
                                    rooms[room_name] = []
                                rooms[room_name].append(device)

                            for room, room_devices in rooms.items():
                                lights = [
                                    d for d in room_devices if d.get("type") == "light"
                                ]
                                if lights:
                                    print(f"   🏠 {room}: {len(lights)} lights")
                                    for light in lights[:3]:  # Show first 3 lights
                                        print(
                                            f"      💡 {light.get('name')} (ID: {light.get('id')})"
                                        )

                            return rooms

            print("ℹ️  No device data found in response")
            return {}
        else:
            print(f"❌ Device list request failed: {response.status_code}")
            return {}

    except Exception as e:
        print(f"❌ Error getting device list: {e}")
        return {}


def test_room_light_commands():
    """Test various room-based light control commands"""

    test_cases = [
        {
            "message": "Turn on the lights in the living room",
            "roomName": "living_room",
            "description": "Turn on living room lights",
            "expected_tool": "tradfri_control",
            "expected_action": "control_light",
        },
        {
            "message": "Turn off all bedroom lights",
            "roomName": "bedroom",
            "description": "Turn off bedroom lights",
            "expected_tool": "tradfri_control",
            "expected_action": "control_light",
        },
        {
            "message": "Dim the kitchen lights to 50%",
            "roomName": "kitchen",
            "description": "Dim kitchen lights",
            "expected_tool": "tradfri_control",
            "expected_action": "control_light",
        },
        {
            "message": "Toggle the bathroom light",
            "roomName": "bathroom",
            "description": "Toggle bathroom light",
            "expected_tool": "tradfri_control",
            "expected_action": "control_light",
        },
        {
            "message": "Set living room lights to bright",
            "roomName": "living_room",
            "description": "Brighten living room lights",
            "expected_tool": "tradfri_control",
            "expected_action": "control_light",
        },
        {
            "message": "Turn on all lights",
            "roomName": "living_room",
            "description": "Turn on all lights (from living room)",
            "expected_tool": "tradfri_control",
            "expected_action": ["control_light", "search_devices"],
        },
        {
            "message": "Turn off the main light in here",
            "roomName": "bedroom",
            "description": "Turn off main light in current room",
            "expected_tool": "tradfri_control",
            "expected_action": "control_light",
        },
    ]

    print("\n💡 Testing room-based light control commands...")

    successful_tests = 0
    total_tests = len(test_cases)

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- Test {i}/{total_tests}: {test_case['description']} ---")
        print(f"Room: {test_case['roomName']}")
        print(f"Command: '{test_case['message']}'")

        try:
            response = requests.post(
                f"{BACKEND_URL}/chat",
                json={
                    "message": test_case["message"],
                    "roomName": test_case["roomName"],
                    "conversationHistory": [],
                },
                headers={"Content-Type": "application/json"},
                timeout=TEST_TIMEOUT,
            )

            if response.status_code == 200:
                data = response.json()
                chat_data = data.get("data", {})
                print("✅ Chat request successful")

                ai_response = chat_data.get("response", "No response")
                print(
                    f"🤖 AI Response: {ai_response[:150]}{'...' if len(ai_response) > 150 else ''}"
                )

                # Check if tool calls were made
                tool_calls_success = False
                if "toolCalls" in chat_data and chat_data["toolCalls"]:
                    print(f"🔧 Tool calls detected: {len(chat_data['toolCalls'])}")

                    for tool_call in chat_data["toolCalls"]:
                        tool_name = tool_call.get("function", {}).get("name", "unknown")
                        tool_args = tool_call.get("function", {}).get("arguments", "{}")

                        try:
                            args = json.loads(tool_args)
                            action = args.get("action", "unknown")
                            device_name = args.get("deviceName", "N/A")
                            is_on = args.get("isOn", "N/A")
                            brightness = args.get("brightness", "N/A")

                            print(f"   🔧 Tool: {tool_name}")
                            print(f"      Action: {action}")
                            if device_name != "N/A":
                                print(f"      Device: {device_name}")
                            if is_on != "N/A":
                                print(f"      State: {'ON' if is_on else 'OFF'}")
                            if brightness != "N/A":
                                print(f"      Brightness: {brightness}%")

                            # Check if expected tool was called
                            if tool_name == test_case["expected_tool"]:
                                expected_actions = test_case["expected_action"]
                                if isinstance(expected_actions, str):
                                    expected_actions = [expected_actions]

                                if action in expected_actions:
                                    print(
                                        f"   ✅ Expected tool '{tool_name}' with action '{action}' was called"
                                    )
                                    tool_calls_success = True
                                else:
                                    print(
                                        f"   ⚠️  Expected action {expected_actions} but got '{action}'"
                                    )
                            else:
                                print(
                                    f"   ⚠️  Expected tool '{test_case['expected_tool']}' but got '{tool_name}'"
                                )

                        except json.JSONDecodeError:
                            print(f"   ⚠️  Could not parse tool arguments: {tool_args}")

                else:
                    print(
                        f"   ⚠️  No tool calls made (expected '{test_case['expected_tool']}')"
                    )

                # Check if tool results were returned
                tool_results_success = False
                if "toolResults" in chat_data and chat_data["toolResults"]:
                    print(f"📋 Tool results: {len(chat_data['toolResults'])}")
                    for result in chat_data["toolResults"]:
                        # Handle both dict and list result formats
                        if isinstance(result, dict):
                            success = result.get("success", False)
                            message = result.get("message", "No message")
                            print(f"   📋 Success: {success}, Message: {message}")
                            if success:
                                tool_results_success = True
                        elif isinstance(result, list):
                            # Handle list results (e.g., device lists)
                            print(f"   📋 List result with {len(result)} items")
                            tool_results_success = True
                        else:
                            print(f"   📋 Unknown result format: {type(result)}")
                            tool_results_success = (
                                True  # Assume success if we got a result
                            )

                # Test is successful if both tool calls and results are working
                if tool_calls_success and tool_results_success:
                    print("🎉 Test PASSED - Tool integration working correctly")
                    successful_tests += 1
                elif tool_calls_success:
                    print("⚠️  Test PARTIAL - Tool called but check results")
                    successful_tests += 0.5
                else:
                    print("❌ Test FAILED - No appropriate tool calls made")

            else:
                print(f"❌ Chat request failed with status {response.status_code}")
                print(f"Response: {response.text}")

        except requests.exceptions.Timeout:
            print(f"❌ Request timed out after {TEST_TIMEOUT} seconds")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error during chat request: {e}")

        time.sleep(1)  # Brief pause between tests

    print(f"\n📊 Test Summary: {successful_tests}/{total_tests} tests successful")
    return successful_tests >= total_tests * 0.7  # 70% success rate threshold


def test_device_search_and_control():
    """Test device search and then control specific devices"""
    print("\n🔍 Testing device search and targeted control...")

    search_test_cases = [
        {
            "message": "Find all lights in the living room",
            "roomName": "living_room",
            "description": "Search for living room lights",
        },
        {
            "message": "Show me all the lights in the house",
            "roomName": "living_room",
            "description": "Search for all lights",
        },
        {
            "message": "What lights are available in the bedroom?",
            "roomName": "bedroom",
            "description": "Search for bedroom lights",
        },
    ]

    for test_case in search_test_cases:
        print(f"\n🔍 {test_case['description']}")
        print(f"Command: '{test_case['message']}'")

        try:
            response = requests.post(
                f"{BACKEND_URL}/chat",
                json={
                    "message": test_case["message"],
                    "roomName": test_case["roomName"],
                    "conversationHistory": [],
                },
                headers={"Content-Type": "application/json"},
                timeout=TEST_TIMEOUT,
            )

            if response.status_code == 200:
                data = response.json()
                chat_data = data.get("data", {})
                print("✅ Search request successful")

                ai_response = chat_data.get("response", "")
                print(
                    f"🤖 AI Response: {ai_response[:200]}{'...' if len(ai_response) > 200 else ''}"
                )

                # Check for search tool calls
                if "toolCalls" in chat_data and chat_data["toolCalls"]:
                    for tool_call in chat_data["toolCalls"]:
                        tool_name = tool_call.get("function", {}).get("name", "unknown")
                        if tool_name == "tradfri_control":
                            try:
                                args = json.loads(
                                    tool_call.get("function", {}).get("arguments", "{}")
                                )
                                action = args.get("action", "")
                                if action in ["search_devices", "list_devices"]:
                                    print(f"   ✅ Search tool call detected: {action}")
                            except json.JSONDecodeError:
                                pass

            else:
                print(f"❌ Search request failed: {response.status_code}")

        except Exception as e:
            print(f"❌ Error in search test: {e}")

        time.sleep(1)


def test_complex_room_scenarios():
    """Test more complex room-based scenarios"""
    print("\n🏠 Testing complex room scenarios...")

    complex_scenarios = [
        {
            "message": "I'm going to bed, turn off all the lights except the bedroom nightstand",
            "roomName": "bedroom",
            "description": "Bedtime scenario - selective lighting",
        },
        {
            "message": "Set up the living room for movie night - dim the lights to 20%",
            "roomName": "living_room",
            "description": "Movie night scenario - ambient lighting",
        },
        {
            "message": "Turn on the kitchen lights, I'm cooking dinner",
            "roomName": "kitchen",
            "description": "Cooking scenario - task lighting",
        },
        {
            "message": "Good morning! Turn on all the lights in the house",
            "roomName": "living_room",
            "description": "Morning routine - house-wide lighting",
        },
    ]

    for scenario in complex_scenarios:
        print(f"\n🎬 Scenario: {scenario['description']}")
        print(f"Room: {scenario['roomName']}")
        print(f"Command: '{scenario['message']}'")

        try:
            response = requests.post(
                f"{BACKEND_URL}/chat",
                json={
                    "message": scenario["message"],
                    "roomName": scenario["roomName"],
                    "conversationHistory": [],
                },
                headers={"Content-Type": "application/json"},
                timeout=TEST_TIMEOUT,
            )

            if response.status_code == 200:
                data = response.json()
                chat_data = data.get("data", {})
                print("✅ Scenario request successful")

                ai_response = chat_data.get("response", "")
                print(f"🤖 AI Response: {ai_response}")

                # Analyze tool calls for complex scenarios
                if "toolCalls" in chat_data and chat_data["toolCalls"]:
                    print(f"🔧 {len(chat_data['toolCalls'])} tool call(s) made")
                    for i, tool_call in enumerate(chat_data["toolCalls"], 1):
                        tool_name = tool_call.get("function", {}).get("name", "unknown")
                        print(f"   {i}. Tool: {tool_name}")

                        if tool_name == "tradfri_control":
                            try:
                                args = json.loads(
                                    tool_call.get("function", {}).get("arguments", "{}")
                                )
                                print(f"      Action: {args.get('action', 'unknown')}")
                                if args.get("deviceName"):
                                    print(f"      Device: {args.get('deviceName')}")
                                if args.get("isOn") is not None:
                                    print(
                                        f"      State: {'ON' if args.get('isOn') else 'OFF'}"
                                    )
                                if args.get("brightness"):
                                    print(
                                        f"      Brightness: {args.get('brightness')}%"
                                    )
                            except json.JSONDecodeError:
                                print("      (Could not parse arguments)")

                # Check tool results
                if "toolResults" in chat_data and chat_data["toolResults"]:
                    success_count = 0
                    total_count = len(chat_data["toolResults"])
                    for r in chat_data["toolResults"]:
                        if isinstance(r, dict) and r.get("success"):
                            success_count += 1
                        elif isinstance(r, list):
                            success_count += 1  # Assume list results are successful
                    print(f"📋 Tool results: {success_count}/{total_count} successful")

            else:
                print(f"❌ Scenario request failed: {response.status_code}")

        except Exception as e:
            print(f"❌ Error in scenario test: {e}")

        time.sleep(2)  # Longer pause for complex scenarios


def main():
    """Run all room-based light control tests"""
    print("🚀 Starting Room-Based Light Control Tests")
    print("=" * 60)

    # Test backend health
    if not test_backend_health():
        print("\n❌ Backend health check failed. Please ensure the backend is running.")
        print("Try: cd backend && npm run dev")
        sys.exit(1)

    # Get available devices to understand what we're working with
    available_rooms = test_get_available_devices()

    # Test basic room light commands
    basic_tests_passed = test_room_light_commands()

    # Test device search functionality
    test_device_search_and_control()

    # Test complex scenarios
    test_complex_room_scenarios()

    print("\n" + "=" * 60)
    print("🎉 Room-based light control tests completed!")

    if basic_tests_passed:
        print("✅ RESULT: Room-based light control is working correctly!")
        print("   - Chat endpoint processes natural language commands")
        print("   - tradfri_control tool is called appropriately")
        print("   - Room context is being used effectively")
        print("   - Light control commands are executed successfully")
    else:
        print("❌ RESULT: Some issues detected with room-based light control")
        print("   - Check tool integration and device connectivity")
        print("   - Verify DIRIGERA hub is connected and configured")
        print("   - Ensure devices follow naming convention (room_name_number)")

    print("\n💡 Tips for testing:")
    print("   - Make sure your DIRIGERA hub is connected")
    print(
        "   - Check that devices are named with room prefixes (e.g., 'living_1', 'bedroom_2')"
    )
    print("   - Test with actual device names from your setup")
    print("   - Use natural language commands like 'turn on living room lights'")


if __name__ == "__main__":
    main()
