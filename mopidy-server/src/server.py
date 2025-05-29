"""
Mopidy server management and process control
"""

import os
import sys
import subprocess
import logging
import signal
import time
import socket
from pathlib import Path
from typing import Optional, List
from .config import MopidyConfig
from .exceptions import MopidyServerError, MopidyDependencyError, MopidyProcessError

logger = logging.getLogger(__name__)


class MopidyServer:
    """Manages Mopidy server lifecycle and operations"""

    def __init__(self, config_path: Optional[str] = None):
        self.config = MopidyConfig(config_path)
        self.process: Optional[subprocess.Popen] = None
        self.temp_config_file: Optional[str] = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

    def cleanup(self):
        """Cleanup resources"""
        if self.temp_config_file and os.path.exists(self.temp_config_file):
            os.unlink(self.temp_config_file)
            self.temp_config_file = None

    def check_dependencies(self) -> bool:
        """Check if Mopidy and required extensions are installed"""
        try:
            result = subprocess.run(
                ["mopidy", "--version"],
                capture_output=True,
                text=True,
                check=True,
                timeout=10,
            )
            version_info = result.stdout.strip()
            logger.info(f"Mopidy version: {version_info}")

            # Check for specific extensions
            self._check_extensions()
            return True

        except subprocess.TimeoutExpired:
            logger.error("Mopidy version check timed out")
            return False
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.error("Mopidy not found. Please install with: pip install mopidy")
            return False

    def _check_extensions(self) -> None:
        """Check if required Mopidy extensions are available"""
        try:
            result = subprocess.run(
                ["mopidy", "deps"],
                capture_output=True,
                text=True,
                check=True,
                timeout=15,
            )
            deps_output = result.stdout
            logger.debug(f"Mopidy dependencies: {deps_output}")

        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            logger.warning(f"Could not check Mopidy extensions: {e}")

    def validate_setup(self) -> bool:
        """Validate the entire Mopidy setup"""
        logger.info("Validating Mopidy setup...")

        # Check dependencies
        if not self.check_dependencies():
            return False

        # Validate configuration
        if not self.config.validate_config():
            return False

        # Check if ports are available
        if not self._check_port_availability():
            return False

        logger.info("Mopidy setup validation completed successfully")
        return True

    def _check_port_availability(self) -> bool:
        """Check if required ports are available"""
        http_port = self.config.get_http_port()
        mpd_port = self.config.get_mpd_port()

        ports_to_check = [http_port, mpd_port]

        for port in ports_to_check:
            if self._is_port_in_use(port):
                logger.warning(f"Port {port} is already in use")
                # Don't fail validation, just warn

        return True

    def _is_port_in_use(self, port: int, host: str = "localhost") -> bool:
        """Check if a port is currently in use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result == 0
        except Exception:
            return False

    def start(self, daemon: bool = False, wait_for_startup: bool = True) -> bool:
        """Start the Mopidy server"""
        if not self.validate_setup():
            raise MopidyServerError("Mopidy setup validation failed")

        # Create temporary config with environment variables substituted
        self.temp_config_file = self.config.substitute_env_vars()

        logger.info("Starting Mopidy server...")

        cmd = ["mopidy", "--config", self.temp_config_file]

        try:
            if daemon:
                # Start as daemon process
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    preexec_fn=os.setsid if os.name != "nt" else None,
                )

                if wait_for_startup:
                    if not self._wait_for_startup():
                        self.stop()
                        raise MopidyServerError("Mopidy failed to start properly")

                logger.info(f"Mopidy started as daemon (PID: {self.process.pid})")
                self._log_endpoints()

            else:
                # Start in foreground
                subprocess.run(cmd, check=True)

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to start Mopidy: {e}")
            self.cleanup()
            return False
        except KeyboardInterrupt:
            logger.info("Shutting down Mopidy...")
            self.stop()
            return False

        return True

    def _wait_for_startup(self, timeout: int = 30) -> bool:
        """Wait for Mopidy to start up and be ready to accept connections"""
        http_port = self.config.get_http_port()
        start_time = time.time()

        while time.time() - start_time < timeout:
            if self._is_port_in_use(http_port):
                logger.info("Mopidy HTTP interface is ready")
                return True
            time.sleep(1)

        logger.error(f"Mopidy did not start within {timeout} seconds")
        return False

    def _log_endpoints(self) -> None:
        """Log the available Mopidy endpoints"""
        http_hostname = self.config.get_http_hostname()
        http_port = self.config.get_http_port()
        mpd_port = self.config.get_mpd_port()

        # Use localhost for display if hostname is 0.0.0.0
        display_host = "localhost" if http_hostname == "0.0.0.0" else http_hostname

        logger.info(f"HTTP interface available at: http://{display_host}:{http_port}")
        logger.info(f"MPD interface available at: {display_host}:{mpd_port}")

    def stop(self) -> None:
        """Stop the Mopidy server"""
        if not self.process or self.process.poll() is not None:
            logger.info("Mopidy server is not running")
            self.cleanup()
            return

        logger.info("Stopping Mopidy server...")

        try:
            if os.name != "nt":
                # On Unix, send SIGTERM to the process group
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            else:
                # On Windows, terminate the process
                self.process.terminate()

            # Wait for graceful shutdown
            try:
                self.process.wait(timeout=10)
                logger.info("Mopidy server stopped gracefully")
            except subprocess.TimeoutExpired:
                logger.warning("Force killing Mopidy server...")
                if os.name != "nt":
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                else:
                    self.process.kill()
                self.process.wait()
                logger.info("Mopidy server force stopped")

        except ProcessLookupError:
            logger.info("Mopidy process already terminated")
        except Exception as e:
            logger.error(f"Error stopping Mopidy: {e}")
        finally:
            self.process = None
            self.cleanup()

    def restart(self, daemon: bool = False) -> bool:
        """Restart the Mopidy server"""
        logger.info("Restarting Mopidy server...")
        self.stop()
        time.sleep(2)  # Give some time for cleanup
        return self.start(daemon=daemon)

    def status(self) -> dict:
        """Get the status of the Mopidy server"""
        status_info = {
            "running": False,
            "pid": None,
            "http_available": False,
            "mpd_available": False,
            "config_valid": False,
        }

        # Check if our process is running
        if self.process and self.process.poll() is None:
            status_info["running"] = True
            status_info["pid"] = self.process.pid

        # Check if HTTP interface is responding
        http_port = self.config.get_http_port()
        status_info["http_available"] = self._is_port_in_use(http_port)

        # Check if MPD interface is responding
        mpd_port = self.config.get_mpd_port()
        status_info["mpd_available"] = self._is_port_in_use(mpd_port)

        # Check config validity
        try:
            status_info["config_valid"] = self.config.validate_config()
        except Exception:
            status_info["config_valid"] = False

        return status_info

    def get_logs(self, lines: int = 50) -> List[str]:
        """Get recent log output from the Mopidy process"""
        if not self.process:
            return ["Mopidy server is not running"]

        try:
            # This is a simplified version - in production you might want to
            # implement proper log file monitoring
            if self.process.stderr:
                stderr_output = self.process.stderr.read().decode(
                    "utf-8", errors="ignore"
                )
                return stderr_output.split("\n")[-lines:]
        except Exception as e:
            logger.error(f"Error reading logs: {e}")

        return ["Unable to read logs"]
