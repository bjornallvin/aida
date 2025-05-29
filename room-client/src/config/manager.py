"""
Configuration management for Aida room client
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class ConfigManager:
    """Manages client configuration with defaults and validation"""

    DEFAULT_CONFIG = {
        "room_name": "unknown",
        "server_host": "192.168.1.100",
        "server_port": 1704,
        "sound_card": "default",
        "volume": 50,
        "auto_start": True,
        "retry_interval": 10,
        "max_retries": -1,  # -1 for infinite retries
        "client_name": None,  # Will default to room_name if not set
        "voice_commands_enabled": False,
        "backend_url": "http://192.168.1.100:3000",
        "ai_audio_playback": True,
        "use_native_stt": True,
        "stt_config": {
            "model_size": "base",
            "device": "auto",
            "compute_type": "float16",
        },
        "vad_aggressiveness": 3,
        "silence_threshold": 40,
        "wake_word": "apartment",
        "wake_word_timeout": 120,
        "test_audio_on_start": False,
    }

    def __init__(self, config_path: Optional[str] = None):
        """Initialize configuration manager"""
        self.config_path = config_path or self._get_project_config_path()
        self.config = self.load_config()

    def _get_project_config_path(self):
        """Get configuration path for development - uses project root"""
        # Get the directory containing this script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up to room-client, then up one more to project root
        project_root = os.path.dirname(os.path.dirname(current_dir))
        return os.path.join(project_root, "client.json")

    def load_config(self) -> Dict[str, Any]:
        """Load client configuration with defaults"""
        config = self.DEFAULT_CONFIG.copy()

        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r", encoding="utf-8") as f:
                    user_config = json.load(f)
                    config.update(user_config)
                logger.info("Loaded config from: %s", self.config_path)
            else:
                logger.warning(
                    "Config file not found: %s, creating with defaults",
                    self.config_path,
                )
                self.create_default_config(config)
        except OSError as e:
            logger.error("Error loading config: %s, using defaults", e)

        # Set default client name if not specified
        if not config.get("client_name"):
            config["client_name"] = config["room_name"]

        return config

    def create_default_config(self, config: Dict[str, Any]):
        """Create a default configuration file"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2)
            logger.info("Created default config at: %s", self.config_path)
        except OSError as e:
            logger.error("Failed to create config file: %s", e)

    def save_config(self):
        """Save current configuration to file"""
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2)
            logger.info("Saved config to: %s", self.config_path)
        except OSError as e:
            logger.error("Failed to save config: %s", e)

    def get(self, key: str, default=None):
        """Get configuration value"""
        return self.config.get(key, default)

    def set(self, key: str, value: Any):
        """Set configuration value"""
        self.config[key] = value

    def update(self, updates: Dict[str, Any]):
        """Update multiple configuration values"""
        self.config.update(updates)

    def validate(self) -> bool:
        """Validate configuration values"""
        errors = []

        # Check required fields
        required_fields = ["room_name", "server_host", "server_port"]
        for field in required_fields:
            if not self.config.get(field):
                errors.append(f"Missing required field: {field}")

        # Validate types
        if not isinstance(self.config.get("server_port"), int):
            errors.append("server_port must be an integer")

        if not isinstance(self.config.get("volume"), (int, float)):
            errors.append("volume must be a number")

        if errors:
            for error in errors:
                logger.error("Config validation error: %s", error)
            return False

        return True
