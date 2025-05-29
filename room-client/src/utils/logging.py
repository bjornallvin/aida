"""
Logging configuration and utilities
"""

import os
import logging
from .platform import get_log_path, IS_MACOS


def setup_logging(log_level=logging.INFO):
    """Setup logging with fallback for permission issues"""
    handlers = []

    # Try to add file handler, fallback if permission denied
    try:
        log_path = get_log_path()
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        handlers.append(logging.FileHandler(log_path, encoding="utf-8"))
    except (PermissionError, OSError):
        # Fallback to local log file
        try:
            if IS_MACOS:
                fallback_dir = os.path.expanduser("~/.aida")
            else:
                fallback_dir = os.path.expanduser("~/.aida")
            os.makedirs(fallback_dir, exist_ok=True)
            handlers.append(
                logging.FileHandler(
                    os.path.join(fallback_dir, "snapcast.log"), encoding="utf-8"
                )
            )
        except OSError:
            # If all else fails, just use console
            pass

    # Always add console handler
    handlers.append(logging.StreamHandler())

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=handlers,
    )


def get_logger(name: str):
    """Get a logger instance"""
    return logging.getLogger(name)
