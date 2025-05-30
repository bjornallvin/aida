#!/usr/bin/env python3
"""
Test script for voice integration functionality
"""
# pylint: disable=wrong-import-position

import sys
import traceback
from pathlib import Path

# Add the room-client directory to path for proper module structure
room_client_path = str(Path(__file__).parent.parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)

# Import after path setup to ensure proper module resolution
from src.client import SnapcastClient
from src.config import ConfigManager


def test_voice_integration():
    """Test voice command integration end-to-end"""
    print("=== Aida Voice Integration Test ===")

    # Use the room-client config file
    config_path = str(Path(__file__).parent.parent / "client.json")

    print(f"Using config: {config_path}")

    # Check if config file exists
    if not Path(config_path).exists():
        print(f"❌ Config file not found: {config_path}")
        return False

    client = None
    try:
        # Initialize config manager
        config_manager = ConfigManager(config_path)

        # Initialize client
        client = SnapcastClient(config_manager)
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

            try:
                response = client.voice_handler.send_text_command(message)

                if response:
                    print(f"✅ AI Response: {response}")
                else:
                    print(f"❌ Failed to get response for: {message}")
                    return False
            except (ConnectionError, TimeoutError) as network_error:
                print(f"❌ Network error sending command '{message}': {network_error}")
                return False
            except (AttributeError, TypeError) as api_error:
                print(f"❌ API error sending command '{message}': {api_error}")
                return False
            except Exception as cmd_error:  # pylint: disable=broad-except
                print(f"❌ Unexpected error sending command '{message}': {cmd_error}")
                return False

        print("\n=== Testing Conversation History ===")
        if hasattr(client.voice_handler, "conversation_history"):
            history = client.voice_handler.conversation_history
            print(f"Conversation history has {len(history)} entries")

            for entry in history:
                role = entry.get("role", "unknown")
                content = entry.get("content", "")[:50] + (
                    "..." if len(entry.get("content", "")) > 50 else ""
                )
                print(f"  {role}: {content}")
        else:
            print("⚠️  Conversation history not available")

        print("\n✅ All voice integration tests passed!")
        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure all required modules are available")
        return False

    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        return False

    except ConnectionError as e:
        print(f"❌ Connection error: {e}")
        print("   Make sure the backend server is running at the configured URL")
        return False

    except Exception as e:  # pylint: disable=broad-except
        print(f"❌ Test failed with error: {e}")
        traceback.print_exc()
        return False

    finally:
        # Cleanup resources
        if client and hasattr(client, "voice_handler") and client.voice_handler:
            try:
                if hasattr(client.voice_handler, "stop_listening"):
                    client.voice_handler.stop_listening()
                    print("✅ Voice handler stopped successfully")
            except (AttributeError, RuntimeError) as cleanup_error:
                print(f"⚠️  Voice handler cleanup failed: {cleanup_error}")

        # Additional cleanup if client has other cleanup methods
        if client:
            cleanup_methods = ["close", "disconnect", "shutdown"]
            for method_name in cleanup_methods:
                if hasattr(client, method_name):
                    try:
                        getattr(client, method_name)()
                        print(f"✅ Called {method_name}() successfully")
                        break
                    except (AttributeError, RuntimeError) as cleanup_error:
                        print(f"⚠️  {method_name}() cleanup failed: {cleanup_error}")


if __name__ == "__main__":
    success = test_voice_integration()
    print(f"\n{'=' * 50}")
    print(f"Test Result: {'✅ PASS' if success else '❌ FAIL'}")
    sys.exit(0 if success else 1)
