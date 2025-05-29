#!/usr/bin/env python3
"""
Aida Room Client - Modular implementation
Main entry point for the Snapcast client with voice commands
"""

import sys
import argparse
import logging

# Import modular components
from src.utils import setup_logging, get_logger
from src.config import ConfigManager
from src.client import SnapcastClient
from src.optimization import HardwareOptimizer

logger = get_logger(__name__)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Aida Snapcast Client Manager")
    parser.add_argument(
        "--config",
        "-c",
        help="Path to client configuration file",
        default=None,
    )
    parser.add_argument(
        "--daemon", "-d", action="store_true", help="Run as daemon process"
    )
    parser.add_argument(
        "--test-audio", "-t", action="store_true", help="Test audio output and exit"
    )
    parser.add_argument(
        "--list-cards",
        "-l",
        action="store_true",
        help="List available sound cards and exit",
    )
    parser.add_argument("--setup", "-s", action="store_true", help="Interactive setup")
    parser.add_argument(
        "--test-voice", "-v", action="store_true", help="Test voice commands and exit"
    )
    parser.add_argument(
        "--enable-voice",
        action="store_true",
        help="Enable voice commands for this session",
    )
    parser.add_argument(
        "--optimize",
        "-o",
        action="store_true",
        help="Apply hardware optimizations",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show client status and exit",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    # Setup logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    setup_logging(log_level)

    try:
        # Load configuration
        config_manager = ConfigManager(args.config)

        # Override voice commands if specified
        if args.enable_voice:
            config_manager.set("voice_commands_enabled", True)

        # Validate configuration
        if not config_manager.validate():
            logger.error("Configuration validation failed")
            return 1

        # Create client
        client = SnapcastClient(config_manager)

        # Handle specific actions
        if args.optimize:
            optimizer = HardwareOptimizer()
            logger.info("Applying hardware optimizations...")
            if optimizer.optimize_system():
                logger.info("Optimizations applied successfully")
            else:
                logger.warning("Some optimizations failed")

            # Show recommendations
            recommendations = optimizer.get_recommendations()
            logger.info("Hardware recommendations:")
            for _category, items in recommendations.items():
                if isinstance(items, list):
                    for item in items:
                        logger.info("  - %s", item)
            return 0

        if args.list_cards:
            print("Available sound cards:")
            print(client.get_sound_cards())
            return 0

        if args.test_audio:
            success = client.test_audio()
            return 0 if success else 1

        if args.test_voice:
            print("Testing voice commands...")
            client.init_voice_commands()
            if client.voice_handler:
                print("Voice commands available. Testing with backend...")
                response = client.send_text_command("Hello, this is a test")
                if response:
                    print("AI Response: %s" % response)
                    print("Voice commands working!")
                else:
                    print("Failed to get AI response. Check backend connection.")
            else:
                print("Voice commands not available. Check dependencies and config.")
            return 0

        if args.status:
            status = client.get_status()
            print("Client Status:")
            for key, value in status.items():
                print("  %s: %s" % (key, value))
            return 0

        if args.setup:
            print("Interactive setup not yet implemented in modular version")
            print("Please edit the configuration file directly or use the legacy setup")
            return 1

        # Run the client
        logger.info("Starting Aida Room Client (modular version)")
        success = client.run(daemon=args.daemon)
        return 0 if success else 1

    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        return 0
    except (OSError, IOError) as e:
        logger.error("Unexpected error: %s", e, exc_info=args.debug)
        return 1


if __name__ == "__main__":
    sys.exit(main())
