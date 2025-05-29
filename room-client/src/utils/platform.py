"""
Platform detection and utilities
"""

import platform
import os
import logging

logger = logging.getLogger(__name__)

# Platform detection
PLATFORM = platform.system()
IS_MACOS = PLATFORM == "Darwin"
IS_LINUX = PLATFORM == "Linux"
IS_WINDOWS = PLATFORM == "Windows"
IS_RASPBERRY_PI = False

# Check if running on Raspberry Pi
try:
    with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
        cpuinfo = f.read()
        if "Raspberry Pi" in cpuinfo or "BCM" in cpuinfo:
            IS_RASPBERRY_PI = True
except (FileNotFoundError, OSError):
    pass


def get_platform_info():
    """Get comprehensive platform information"""
    return {
        "system": PLATFORM,
        "is_macos": IS_MACOS,
        "is_linux": IS_LINUX,
        "is_windows": IS_WINDOWS,
        "is_raspberry_pi": IS_RASPBERRY_PI,
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
        "cpu_count": os.cpu_count(),
    }


def get_default_config_path():
    """Get default configuration path based on platform"""
    if IS_MACOS:
        return os.path.expanduser("~/Library/Application Support/Aida/client.json")
    elif IS_WINDOWS:
        return os.path.expanduser("~/AppData/Local/Aida/client.json")
    else:  # Linux
        return "/etc/aida/client.json"


def get_log_path():
    """Get appropriate log path based on platform"""
    if IS_MACOS:
        return os.path.expanduser("~/Library/Logs/aida-snapcast.log")
    elif IS_WINDOWS:
        return os.path.expanduser("~/AppData/Local/Aida/snapcast.log")
    else:  # Linux
        return "/var/log/aida-snapcast.log"


def get_cache_dir():
    """Get appropriate cache directory based on platform"""
    if IS_MACOS:
        return os.path.expanduser("~/Library/Caches/Aida")
    elif IS_WINDOWS:
        return os.path.expanduser("~/AppData/Local/Aida/Cache")
    else:  # Linux
        return os.path.expanduser("~/.cache/aida")
