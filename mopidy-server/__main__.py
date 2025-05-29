#!/usr/bin/env python3
"""
Main entry point for Mopidy Server package
"""

import sys
import logging
import argparse
from pathlib import Path

# Add src directory to path for development
src_path = Path(__file__).parent / "src"
if src_path.exists():
    sys.path.insert(0, str(src_path))

try:
    from src import MopidyServer, MopidyServerError
except ImportError:
    # Fallback for development/testing
    from src.server import MopidyServer
    from src.exceptions import MopidyServerError


def setup_logging(verbose: bool = False):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Mopidy Server for Aida Apartment AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                     # Start in foreground
  %(prog)s --daemon           # Start as daemon
  %(prog)s --status           # Check server status
  %(prog)s --stop             # Stop running server
  %(prog)s --config custom.conf # Use custom config
        """,
    )

    parser.add_argument(
        "--config", "-c", help="Path to Mopidy configuration file", default=None
    )
    parser.add_argument(
        "--daemon", "-d", action="store_true", help="Run as daemon process"
    )
    parser.add_argument(
        "--stop", action="store_true", help="Stop running Mopidy server"
    )
    parser.add_argument(
        "--status", action="store_true", help="Check Mopidy server status"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
    )
    parser.add_argument("--version", action="version", version="Mopidy Server 1.0.0")

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)

    try:
        with MopidyServer(config_path=args.config) as server:
            if args.stop:
                logger.info("Stopping Mopidy server...")
                server.stop()

            elif args.status:
                if server.status():
                    print("✅ Mopidy server is running")
                    print(
                        f"   HTTP interface: http://localhost:{server.config.get_http_port()}"
                    )
                    print(f"   MPD interface: localhost:{server.config.get_mpd_port()}")
                    sys.exit(0)
                else:
                    print("❌ Mopidy server is not running")
                    sys.exit(1)

            else:
                logger.info("Starting Mopidy server...")
                server.start(daemon=args.daemon)

    except MopidyServerError as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
