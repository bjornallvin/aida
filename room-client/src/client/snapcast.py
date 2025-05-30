"""
Snapcast client management
"""

import logging
import subprocess
import signal
import sys
import time
from typing import Dict, Any, Optional

from ..config import ConfigManager
from ..voice import get_voice_command_handler
from ..audio import AudioManager
from ..utils import IS_MACOS, IS_LINUX, IS_WINDOWS

logger = logging.getLogger(__name__)


class SnapcastClient:
    """Manages Snapcast client connection and room-specific audio routing"""

    def __init__(self, config_manager: ConfigManager):
        """Initialize the Snapcast client"""
        self.config_manager = config_manager
        self.config = config_manager.config
        self.process = None
        self.running = False

        # Initialize components
        self.audio_manager = AudioManager()
        self.voice_handler = None

        # Setup signal handlers
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)

        # Initialize voice commands if enabled
        if self.config.get("voice_commands_enabled", False):
            self.init_voice_commands()

    def init_voice_commands(self):
        """Initialize voice command handler"""
        try:
            VoiceCommandHandler = get_voice_command_handler()
            self.voice_handler = VoiceCommandHandler(
                config=self.config,
                backend_url=self.config.get("backend_url", "http://localhost:3000"),
            )

            # Set up AI response callback
            if self.config.get("ai_audio_playback", True):
                self.voice_handler.on_ai_response = self._handle_ai_response

            logger.info("Voice commands initialized")
        except (OSError, IOError) as e:
            logger.error("Failed to initialize voice commands: %s", e)
            self.voice_handler = None

    def _handle_ai_response(self, response_text: str, audio_file_url: str):
        """Handle AI response by playing audio"""
        if not self.config.get("ai_audio_playback", True):
            logger.info("AI audio playback disabled")
            return

        if not audio_file_url:
            logger.info("No audio file URL provided")
            return

        try:
            # Convert relative URL to absolute if needed
            if audio_file_url.startswith("/"):
                backend_url = self.config.get("backend_url", "http://localhost:3000")
                audio_url = f"{backend_url.rstrip('/')}{audio_file_url}"
            else:
                audio_url = audio_file_url

            logger.info("Playing AI response: %s", response_text[:50])

            # Download audio file
            import requests

            response = requests.get(audio_url, timeout=10)
            if response.status_code == 200:
                # Save to temporary file and play
                import tempfile
                import os

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

    def check_dependencies(self) -> bool:
        """Check if snapclient is installed"""
        try:
            result = subprocess.run(
                ["snapclient", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if result.returncode == 0:
                logger.info("snapclient found: %s", result.stdout.strip())
                return True
            else:
                logger.error("snapclient not working properly")
                return False
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            if isinstance(e, FileNotFoundError):
                logger.error("snapclient not found. Please install snapcast.")
            else:
                logger.error("snapclient check timed out")
            return False
        except (OSError, IOError) as e:
            logger.error("Error checking snapclient: %s", e)
            return False

    def get_sound_cards(self) -> str:
        """Get available sound cards based on platform"""
        if IS_MACOS:
            return self._get_macos_sound_cards()
        elif IS_LINUX:
            return self._get_linux_sound_cards()
        elif IS_WINDOWS:
            return self._get_windows_sound_cards()
        else:
            return "Platform not supported for sound card detection"

    def _get_macos_sound_cards(self) -> str:
        """Get macOS sound cards using system_profiler"""
        try:
            result = subprocess.run(
                ["system_profiler", "SPAudioDataType"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            return (
                result.stdout if result.returncode == 0 else "Error getting sound cards"
            )
        except (OSError, IOError, subprocess.TimeoutExpired) as e:
            return f"Error: {e}"

    def _get_linux_sound_cards(self) -> str:
        """Get Linux sound cards using aplay"""
        try:
            result = subprocess.run(
                ["aplay", "-l"], capture_output=True, text=True, timeout=5, check=False
            )
            return (
                result.stdout if result.returncode == 0 else "Error getting sound cards"
            )
        except (OSError, IOError, subprocess.TimeoutExpired) as e:
            return f"Error: {e}"

    def _get_windows_sound_cards(self) -> str:
        """Get Windows sound cards"""
        # TODO: Implement Windows sound card detection
        return "Windows sound card detection not implemented"

    def test_audio(self) -> bool:
        """Test audio output"""
        logger.info("Testing audio output...")
        return self.audio_manager.test_audio_output()

    def start_client(self) -> bool:
        """Start the snapcast client"""
        if not self.check_dependencies():
            return False

        try:
            cmd = [
                "snapclient",
                "--host",
                self.config["server_host"],
                "--port",
                str(self.config["server_port"]),
                "--soundcard",
                self.config["sound_card"],
                "--player",
                "pulse:buffer_time=80",
            ]

            # Add client name if specified
            if self.config.get("client_name"):
                cmd.extend(["--hostID", self.config["client_name"]])

            logger.info("Starting snapclient: %s", " ".join(cmd))

            self.process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )

            # Give it a moment to start
            time.sleep(2)

            if self.process.poll() is None:
                logger.info("Snapclient started successfully")

                # Start voice commands if enabled
                if self.voice_handler:
                    self.voice_handler.start_listening()

                return True
            else:
                stdout, stderr = self.process.communicate()
                logger.error("Snapclient failed to start")
                logger.error("stdout: %s", stdout)
                logger.error("stderr: %s", stderr)
                return False

        except (OSError, IOError) as e:
            logger.error("Error starting snapclient: %s", e)
            return False

    def stop_client(self):
        """Stop the snapcast client"""
        # Stop voice commands
        if self.voice_handler:
            self.voice_handler.stop_listening()

        # Stop snapclient process
        if self.process:
            logger.info("Stopping snapclient...")
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except (subprocess.TimeoutExpired, OSError, IOError) as e:
                if isinstance(e, subprocess.TimeoutExpired):
                    logger.warning("Snapclient didn't terminate gracefully, killing...")
                    self.process.kill()
                    self.process.wait()
                else:
                    logger.error("Error stopping snapclient: %s", e)
            finally:
                self.process = None

        # Cleanup audio resources
        self.audio_manager.cleanup()

    def monitor_client(self):
        """Monitor the snapclient process and restart if needed"""
        retry_count = 0
        max_retries = self.config["max_retries"]

        while self.running:
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

        self.running = True

        # Test audio if requested
        if self.config.get("test_audio_on_start", False):
            self.test_audio()

        # Start the client
        if not self.start_client():
            logger.error("Failed to start snapclient")
            return False

        try:
            # Monitor and restart if needed
            self.monitor_client()
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        finally:
            self.stop_client()

        return True

    def send_text_command(self, text: str) -> Optional[str]:
        """Send a text command through voice handler"""
        if self.voice_handler:
            result = self.voice_handler.send_text_command(text)
            if result:
                # Extract just the response text from the tuple (response_text, audio_file_url)
                response_text, _ = result
                return response_text
            return None
        else:
            logger.warning("Voice handler not available")
            return None

    def get_status(self) -> Dict[str, Any]:
        """Get client status"""
        status = {
            "running": self.running,
            "process_running": self.process is not None and self.process.poll() is None,
            "room_name": self.config["room_name"],
            "server_host": self.config["server_host"],
            "server_port": self.config["server_port"],
            "voice_enabled": self.voice_handler is not None,
        }

        if self.voice_handler:
            status["voice_status"] = self.voice_handler.get_status()

        return status
