#!/usr/bin/env python3
"""
Test script for selective light control commands
Tests the problematic "except" functionality
"""

import requests
import json

def test_selective_command():
    """Test the problematic selective light command"""
    print("Testing: 'turn off all the lights in the bedroom except the bed light'")
    
    response = requests.post(
        'http://localhost:3000/chat',
        json={
            'message': 'turn off all the lights in the bedroom except the bed light',
            'roomName': 'bedroom',
            'conversationHistory': []
        },
        headers={'Content-Type': 'application/json'},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        chat_data = data.get('data', {})
        print('AI Response:', chat_data.get('response', ''))
        print()
        
        if 'toolCalls' in chat_data:
            print('Tool Calls:')
            for i, call in enumerate(chat_data['toolCalls'], 1):
                print(f'{i}. Tool: {call.get("function", {}).get("name", "unknown")}')
                try:
                    args = json.loads(call.get('function', {}).get('arguments', '{}'))
                    print(f'   Action: {args.get("action", "unknown")}')
                    print(f'   Device: {args.get("deviceName", "N/A")}')
                    print(f'   IsOn: {args.get("isOn", "N/A")}')
                except json.JSONDecodeError:
                    print(f'   Args: {call.get("function", {}).get("arguments", "N/A")}')
        
        if 'toolResults' in chat_data:
            print()
            print('Tool Results:')
            for i, result in enumerate(chat_data['toolResults'], 1):
                if isinstance(result, dict):
                    print(f'{i}. Success: {result.get("success", False)}')
                    print(f'   Message: {result.get("message", "No message")}')
    else:
        print(f'Request failed: {response.status_code}')
        print(response.text)

if __name__ == "__main__":
    test_selective_command()
