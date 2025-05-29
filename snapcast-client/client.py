#!/usr/bin/env python3
"""
Snapcast Client Manager for Aida Apartment AI
Manages Snapcast client connection and room-specific audio routing
"""

import os
import sys
import json
import time
import logging
import subprocess
import signal
import platform
from typing import Dict, Any, Optional

# Try to import voice commands module
try:
    from voice_commands import VoiceCommandHandler

    VOICE_COMMANDS_AVAILABLE = True
except ImportError:
    VOICE_COMMANDS_AVAILABLE = False


# Platform detection
PLATFORM = platform.system()
IS_MACOS = PLATFORM == "Darwin"
IS_LINUX = PLATFORM == "Linux"
IS_WINDOWS = PLATFORM == "Windows"


def get_default_config_path():
    """Get default configuration path based on platform"""
    if IS_MACOS:
        return os.path.expanduser("~/Library/Application Support/Aida/client.json")
    elif IS_WINDOWS:
        return os.path.expanduser("~/AppData/Local/Aida/client.json")
    else:  # Linux and others
        return "/etc/aida/client.json"


def get_log_path():
    """Get appropriate log path based on platform"""
    if IS_MACOS:
        return os.path.expanduser("~/Library/Logs/aida-snapcast.log")
    elif IS_WINDOWS:
        return os.path.expanduser("~/AppData/Local/Aida/snapcast.log")
    else:  # Linux
        return "/var/log/aida-snapcast.log"


# Setup logging
def setup_logging():
    """Setup logging with fallback for permission issues"""
    handlers = []

    # Try to add file handler, fallback if permission denied
    try:
        log_path = get_log_path()
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        handlers.append(logging.FileHandler(log_path))
    except (PermissionError, OSError):
        # Fallback to local log file
        try:
            if IS_MACOS:
                fallback_dir = os.path.expanduser("~/.aida")
            else:
                fallback_dir = os.path.expanduser("~/.aida")
            os.makedirs(fallback_dir, exist_ok=True)
            handlers.append(
                logging.FileHandler(os.path.join(fallback_dir, "snapcast.log"))
            )
        except OSError:
            # If all else fails, just use console
            pass

    # Always add console handler
    handlers.append(logging.StreamHandler())

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=handlers,
    )


setup_logging()
logger = logging.getLogger(__name__)


class SnapcastClient:
    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            config_path = get_default_config_path()
        self.config_path = config_path
        self.config = self.load_config()
        self.process = None
        self.running = False

        # Voice command handler
        self.voice_handler = None

        # Setup signal handlers
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)

    def load_config(self) -> Dict[str, Any]:
        """Load client configuration"""
        default_config = {
            "room_name": "unknown",
            "server_host": "192.168.1.100",
            "server_port": 1704,
            "sound_card": "default",
            "volume": 50,
            "auto_start": True,
            "retry_interval": 10,
            "max_retries": -1,  # -1 for infinite retries
            "client_name": None,  # Will default to room_name if not set
            "voice_commands_enabled": False,  # Enable AI voice commands
            "backend_url": "http://192.168.1.100:3000",  # Aida backend URL
            "ai_audio_playback": True,  # Play AI responses through speakers
        }

        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r", encoding="utf-8") as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            else:
                logger.warning(
                    "Config file not found: %s, using defaults", self.config_path
                )
                # Create config directory and file with defaults
                os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
                with open(self.config_path, "w", encoding="utf-8") as f:
                    json.dump(default_config, f, indent=2)
                logger.info("Created default config at: %s", self.config_path)
        except OSError as e:
            logger.error("Error loading config: %s, using defaults", e)

        # Set default client name if not specified
        if not default_config.get("client_name"):
            default_config["client_name"] = default_config["room_name"]

        return default_config

    def check_dependencies(self) -> bool:
        """Check if snapclient is installed"""
        try:
            result = subprocess.run(
                ["snapclient", "--version"], capture_output=True, text=True, check=True
            )
            logger.info("Snapclient version: %s", result.stdout.strip())
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.error("snapclient not found. Please install snapcast-client package")
            return False

    def get_sound_cards(self) -> str:
        """Get available sound cards (platform-specific)"""
        try:
            if IS_MACOS:
                # On macOS, use system_profiler to list audio devices
                result = subprocess.run(
                    ["system_profiler", "SPAudioDataType"],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                return result.stdout
            elif IS_LINUX:
                # On Linux, use aplay
                result = subprocess.run(
                    ["aplay", "-l"], capture_output=True, text=True, check=True
                )
                return result.stdout
            elif IS_WINDOWS:
                # On Windows, could use PowerShell or other methods
                return "Audio device listing not implemented for Windows"
            else:
                return "Unknown platform"
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.error("Error getting sound cards: %s", e)
            return "Error retrieving audio devices"

    def test_audio(self) -> bool:
        """Test audio output (platform-specific)"""
        try:
            logger.info("Testing audio output...")

            if IS_MACOS:
                # On macOS, use built-in say command for testing
                subprocess.run(
                    ["say", "-v", "Alex", "Audio test from Aida"],
                    check=True,
                    timeout=10,
                )
                logger.info("Audio test completed (macOS say command)")
                return True

            elif IS_LINUX:
                # On Linux, use speaker-test
                subprocess.run(
                    [
                        "speaker-test",
                        "-D",
                        self.config["sound_card"],
                        "-t",
                        "sine",
                        "-f",
                        "1000",
                        "-l",
                        "1",
                    ],
                    timeout=5,
                    check=True,
                    capture_output=True,
                )
                logger.info("Audio test successful")
                return True

            elif IS_WINDOWS:
                # On Windows, could use different methods
                logger.warning("Audio testing not implemented for Windows")
                return True

            else:
                logger.warning("Audio testing not supported on this platform")
                return True

        except (
            subprocess.CalledProcessError,
            subprocess.TimeoutExpired,
            FileNotFoundError,
        ) as e:
            logger.warning("Audio test failed: %s", e)
            return False

    def init_voice_commands(self):
        """Initialize voice command handler if enabled"""
        if not self.config.get("voice_commands_enabled", False):
            logger.info("Voice commands disabled in config")
            return

        if not VOICE_COMMANDS_AVAILABLE:
            logger.warning("Voice commands not available - missing dependencies")
            logger.info(
                "To enable voice commands, install: pip install pyaudio webrtcvad"
            )
            return

        try:
            backend_url = self.config.get("backend_url", "http://localhost:3000")
            self.voice_handler = VoiceCommandHandler(self.config, backend_url)

            # Set up callback for AI responses
            self.voice_handler.on_ai_response = self._handle_ai_response

            logger.info("Voice command handler initialized")
        except Exception as e:
            logger.error("Failed to initialize voice commands: %s", e)
            self.voice_handler = None

    def start_voice_commands(self):
        """Start listening for voice commands"""
        if self.voice_handler:
            self.voice_handler.start_listening()
            logger.info("Voice command listening started")
        else:
            logger.warning("Voice commands not available")

    def stop_voice_commands(self):
        """Stop voice command listening"""
        if self.voice_handler:
            self.voice_handler.stop_listening()
            logger.info("Voice command listening stopped")

    def _handle_ai_response(self, response_text: str, audio_file_url: str):
        """Handle AI response by playing audio"""
        if not self.config.get("ai_audio_playback", True):
            logger.info("AI audio playback disabled")
            return

        try:
            # Download and play the AI response audio
            import requests

            # Convert relative URL to absolute if needed
            if audio_file_url.startswith("/"):
                backend_url = self.config.get("backend_url", "http://localhost:3000")
                audio_url = f"{backend_url.rstrip('/')}{audio_file_url}"
            else:
                audio_url = audio_file_url

            logger.info("Playing AI response: %s", response_text[:50])

            # Download audio file
            response = requests.get(audio_url, timeout=10)
            if response.status_code == 200:
                # Save to temporary file and play
                import tempfile

                with tempfile.NamedTemporaryFile(
                    suffix=".mp3", delete=False
                ) as temp_file:
                    temp_file.write(response.content)
                    temp_filename = temp_file.name

                # Play audio using platform-specific audio player
                audio_played = False

                if IS_MACOS:
                    # macOS: Use afplay (built-in)
                    try:
                        subprocess.run(
                            ["afplay", temp_filename],
                            check=True,
                            capture_output=True,
                            timeout=30,
                        )
                        audio_played = True
                        logger.info("Audio played using afplay (macOS)")
                    except (subprocess.CalledProcessError, FileNotFoundError) as e:
                        logger.warning("afplay failed: %s", e)

                if not audio_played:
                    # Try mpg123 (Linux/cross-platform)
                    try:
                        subprocess.run(
                            ["mpg123", temp_filename],
                            check=True,
                            capture_output=True,
                            timeout=30,
                        )
                        audio_played = True
                        logger.info("Audio played using mpg123")
                    except (subprocess.CalledProcessError, FileNotFoundError) as e:
                        logger.warning("mpg123 failed: %s", e)

                if not audio_played:
                    # Fallback to mpv
                    try:
                        subprocess.run(
                            ["mpv", "--no-video", temp_filename],
                            check=True,
                            capture_output=True,
                            timeout=30,
                        )
                        audio_played = True
                        logger.info("Audio played using mpv")
                    except (subprocess.CalledProcessError, FileNotFoundError) as e:
                        logger.warning("mpv failed: %s", e)

                if not audio_played:
                    logger.warning(
                        "No audio player found (tried: %s)",
                        "afplay, mpg123, mpv" if IS_MACOS else "mpg123, mpv",
                    )

                # Clean up temp file
                try:
                    os.unlink(temp_filename)
                except OSError:
                    pass

                logger.info("AI response audio played successfully")
            else:
                logger.error(
                    "Failed to download AI audio: HTTP %s", response.status_code
                )

        except Exception as e:
            logger.error("Failed to play AI response audio: %s", e)

    def send_text_command(self, text: str):
        """Send text command to AI (for testing)"""
        if self.voice_handler:
            return self.voice_handler.send_text_command(text)
        else:
            logger.warning("Voice commands not available")
            return None

    def start_client(self) -> bool:
        """Start the snapcast client"""
        if not self.check_dependencies():
            return False

        cmd = [
            "snapclient",
            "--host",
            self.config["server_host"],
            "--port",
            str(self.config["server_port"]),
            "--soundcard",
            self.config["sound_card"],
            "--client_name",
            self.config["client_name"],
        ]

        logger.info("Starting snapclient for room '%s'...", self.config["room_name"])
        logger.info(
            "Connecting to server: %s:%s",
            self.config["server_host"],
            self.config["server_port"],
        )
        logger.info("Using sound card: %s", self.config["sound_card"])

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid if os.name != "nt" else None,
            )

            self.running = True
            logger.info("Snapclient started (PID: %s)", self.process.pid)

            # Initialize and start voice commands if enabled
            self.init_voice_commands()
            self.start_voice_commands()

            return True

        except OSError as e:
            logger.error("Failed to start snapclient: %s", e)
            return False

    def stop_client(self):
        """Stop the snapcast client"""
        # Stop voice commands first
        self.stop_voice_commands()
        if self.voice_handler:
            self.voice_handler.cleanup()
            self.voice_handler = None

        if self.process and self.running:
            logger.info("Stopping snapclient...")
            try:
                if os.name != "nt":
                    # On Unix, kill the process group
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                else:
                    # On Windows, kill the process
                    self.process.terminate()

                self.process.wait(timeout=10)
                logger.info("Snapclient stopped")
            except subprocess.TimeoutExpired:
                logger.warning("Force killing snapclient...")
                if os.name != "nt":
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                else:
                    self.process.kill()
            except OSError as e:
                logger.error("Error stopping snapclient: %s", e)

            self.running = False
            self.process = None

    def monitor_client(self):
        """Monitor the snapclient process and restart if needed"""
        retry_count = 0
        max_retries = self.config["max_retries"]

        while True:
            if not self.running:
                break

            if self.process is None or self.process.poll() is not None:
                if max_retries != -1 and retry_count >= max_retries:
                    logger.error("Max retries (%s) reached. Giving up.", max_retries)
                    break

                retry_count += 1
                logger.warning(
                    "Snapclient not running. Attempting restart (%s)...", retry_count
                )

                if self.start_client():
                    retry_count = 0  # Reset counter on successful start
                else:
                    logger.error(
                        "Failed to restart snapclient. Waiting %s seconds...",
                        self.config["retry_interval"],
                    )
                    time.sleep(self.config["retry_interval"])
                    continue

            time.sleep(5)  # Check every 5 seconds

    def signal_handler(self, signum, _frame):
        """Handle shutdown signals"""
        logger.info("Received signal %s, shutting down...", signum)
        self.running = False
        self.stop_client()
        sys.exit(0)

    def run(self, daemon=False):
        """Run the snapcast client manager"""
        logger.info(
            "Starting Aida Snapcast Client for room: %s", self.config["room_name"]
        )

        if daemon:
            logger.info("Running in daemon mode")

        # Test audio if requested
        if self.config.get("test_audio_on_start", False):
            self.test_audio()

        # Start the client
        if not self.start_client():
            logger.error("Failed to start snapclient")
            return False

        # Monitor and restart if needed
        try:
            self.monitor_client()
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        finally:
            self.stop_client()

        return True


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Snapcast Client Manager for Aida")
    parser.add_argument(
        "--config",
        "-c",
        help="Path to client configuration file",
        default="/etc/aida/client.json",
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

    args = parser.parse_args()

    client = SnapcastClient(config_path=args.config)

    # Override voice commands if specified
    if args.enable_voice:
        client.config["voice_commands_enabled"] = True

    if args.list_cards:
        print("Available sound cards:")
        print(client.get_sound_cards())
        return

    if args.test_audio:
        success = client.test_audio()
        sys.exit(0 if success else 1)

    if args.test_voice:
        print("Testing voice commands...")
        client.init_voice_commands()
        if client.voice_handler:
            print("Voice commands available. Testing with backend...")
            response = client.send_text_command("Hello, this is a test")
            if response:
                print(f"AI Response: {response}")
                print("Voice commands working!")
            else:
                print("Failed to get AI response. Check backend connection.")
        else:
            print("Voice commands not available. Check dependencies and config.")
        return

    if args.setup:
        from setup import interactive_setup

        interactive_setup(args.config)
        return

    # Run the client
    try:
        client.run(daemon=args.daemon)
    except OSError as e:
        logger.error("Client error: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
