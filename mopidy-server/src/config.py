"""
Configuration management for Mopidy server
"""

import os
import configparser
from pathlib import Path
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class MopidyConfig:
    """Manages Mopidy configuration with environment variable substitution"""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or self._get_default_config_path()
        self.config = configparser.ConfigParser()
        self._load_config()

    def _get_default_config_path(self) -> str:
        """Get the default configuration file path"""
        current_dir = Path(__file__).parent.parent
        return str(current_dir / "mopidy.conf")

    def _load_config(self) -> None:
        """Load and parse the configuration file"""
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")

        logger.info(f"Loading configuration from: {self.config_path}")
        self.config.read(self.config_path)

    def validate_config(self) -> bool:
        """Validate the configuration and check for required environment variables"""
        required_sections = ["core", "http", "mpd"]
        missing_sections = []

        for section in required_sections:
            if not self.config.has_section(section):
                missing_sections.append(section)

        if missing_sections:
            logger.error(f"Missing required sections in config: {missing_sections}")
            return False

        # Check for Spotify configuration if enabled
        if self.config.has_section("spotify") and self.config.getboolean(
            "spotify", "enabled", fallback=False
        ):
            return self._validate_spotify_config()

        return True

    def _validate_spotify_config(self) -> bool:
        """Validate Spotify configuration and environment variables"""
        required_env_vars = [
            "SPOTIFY_USERNAME",
            "SPOTIFY_PASSWORD",
            "SPOTIFY_CLIENT_ID",
            "SPOTIFY_CLIENT_SECRET",
        ]

        missing_vars = []
        for var in required_env_vars:
            if not os.getenv(var):
                missing_vars.append(var)

        if missing_vars:
            logger.error(
                f"Missing required Spotify environment variables: {missing_vars}"
            )
            logger.info("Please set these in your .env file or environment")
            return False

        return True

    def get_http_port(self) -> int:
        """Get the HTTP interface port"""
        return self.config.getint("http", "port", fallback=6680)

    def get_mpd_port(self) -> int:
        """Get the MPD interface port"""
        return self.config.getint("mpd", "port", fallback=6600)

    def get_http_hostname(self) -> str:
        """Get the HTTP interface hostname"""
        return self.config.get("http", "hostname", fallback="0.0.0.0")

    def substitute_env_vars(self) -> str:
        """Create a temporary config file with environment variables substituted"""
        import tempfile
        import os

        # Read the original config file
        with open(self.config_path, "r") as f:
            config_content = f.read()

        # Substitute environment variables
        for key, value in os.environ.items():
            config_content = config_content.replace(f"${{{key}}}", value)

        # Write to temporary file
        temp_file = tempfile.NamedTemporaryFile(mode="w", suffix=".conf", delete=False)
        temp_file.write(config_content)
        temp_file.close()

        return temp_file.name
