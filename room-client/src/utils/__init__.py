"""
Utils package
"""

from .platform import (
    get_platform_info,
    get_default_config_path,
    get_log_path,
    get_cache_dir,
)
from .logging import setup_logging, get_logger
from .platform import IS_MACOS, IS_LINUX, IS_WINDOWS, IS_RASPBERRY_PI

__all__ = [
    "get_platform_info",
    "get_default_config_path",
    "get_log_path",
    "get_cache_dir",
    "setup_logging",
    "get_logger",
    "IS_MACOS",
    "IS_LINUX",
    "IS_WINDOWS",
    "IS_RASPBERRY_PI",
]
