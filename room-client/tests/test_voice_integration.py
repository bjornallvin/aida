#!/usr/bin/env python3
"""
Test script for voice integration functionality
"""

import sys
from pathlib import Path

# Add the room-client directory to path for proper module structure
room_client_path = str(Path(__file__).parent.parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)

from src.client import SnapcastClient


def test_voice_integration():
    """Test voice command integration end-to-end"""
    print("=== Aida Voice Integration Test ===")

    # Use the room-client config file
    config_path = str(Path(__file__).parent.parent / "client.json")

    print(f"Using config: {config_path}")

    try:
        # Initialize client
        client = SnapcastClient(config_path)
        client.init_voice_commands()

        if not client.voice_handler:
            print("❌ Voice commands not available")
            return False

        print("✅ Voice commands initialized successfully")

        # Test multiple interactions
        test_messages = [
            "What is the capital of France?",
            "Tell me a short joke",
            "What did we just talk about?",  # Test conversation history
        ]

        print("\n=== Testing AI Interactions ===")

        for i, message in enumerate(test_messages, 1):
            print(f"\nTest {i}: {message}")
            response = client.send_text_command(message)

            if response:
                print(f"✅ AI Response: {response}")
            else:
                print(f"❌ Failed to get response for: {message}")
                return False

        print("\n=== Testing Conversation History ===")
        history = client.voice_handler.conversation_history
        print(f"Conversation history has {len(history)} entries")

        for entry in history:
            role = entry.get("role", "unknown")
            content = entry.get("content", "")[:50] + (
                "..." if len(entry.get("content", "")) > 50 else ""
            )
            print(f"  {role}: {content}")

        print("\n✅ All voice integration tests passed!")
        return True

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return False

    finally:
        if "client" in locals() and hasattr(client, "cleanup"):
            client.cleanup()


if __name__ == "__main__":
    success = test_voice_integration()
    sys.exit(0 if success else 1)
