#!/usr/bin/env python3
"""
Legacy Mopidy Server Launcher - DEPRECATED
This file is kept for backward compatibility.
Use the new package structure instead: python -m mopidy_server
"""

import sys
import warnings
from pathlib import Path

# Add src directory to path
src_path = Path(__file__).parent / "src"
if src_path.exists():
    sys.path.insert(0, str(src_path))


def main():
    """Legacy main entry point with deprecation warning"""
    warnings.warn(
        "server.py is deprecated. Use 'python __main__.py' or 'python -m mopidy_server' instead.",
        DeprecationWarning,
        stacklevel=2,
    )

    print("⚠️  WARNING: This script is deprecated!")
    print("🔄 Redirecting to new entry point...")
    print("")

    # Import and run the new main function
    try:
        from __main__ import main as new_main

        new_main()
    except ImportError:
        print("❌ Could not import new main function")
        print("Please run: python __main__.py")
        sys.exit(1)


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
