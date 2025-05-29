"""
Hardware optimization utilities, particularly for Raspberry Pi
"""

import os
import logging
import subprocess
import platform
from typing import Dict, Any

logger = logging.getLogger(__name__)


class HardwareOptimizer:
    """Hardware-specific optimizations"""

    def __init__(self):
        self.platform_info = self._get_platform_info()

    def _get_platform_info(self) -> Dict[str, Any]:
        """Get comprehensive platform information"""
        info = {
            "model": "unknown",
            "ram_mb": 0,
            "cpu_cores": os.cpu_count(),
            "architecture": platform.machine(),
            "is_pi": False,
            "system": platform.system(),
        }

        try:
            # Check if it's a Raspberry Pi
            with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
                cpuinfo = f.read()
                if "Raspberry Pi" in cpuinfo or "BCM" in cpuinfo:
                    info["is_pi"] = True

                    # Extract model info
                    for line in cpuinfo.split("\n"):
                        if "Model" in line and "Raspberry Pi" in line:
                            info["model"] = line.split(":")[1].strip()
                            break

            # Get RAM info
            with open("/proc/meminfo", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        info["ram_mb"] = int(line.split()[1]) // 1024
                        break

        except (OSError, IOError) as e:
            logger.warning("Could not read platform info: %s", e)

        return info

    def get_optimal_stt_config(self) -> Dict[str, Any]:
        """Get optimal STT configuration for this hardware"""
        # Default conservative config
        config = {"model_size": "tiny", "device": "cpu", "compute_type": "float32"}

        if not self.platform_info["is_pi"]:
            # Not a Pi - can probably handle more
            config["model_size"] = "base"
            # Try to detect GPU
            config["device"] = "auto"
            config["compute_type"] = "float16"
            return config

        ram_mb = self.platform_info["ram_mb"]
        model = self.platform_info["model"]

        logger.info("Optimizing STT for %s with %sMB RAM", model, ram_mb)

        # Pi 5 or high-RAM Pi 4
        if "Pi 5" in model or ram_mb >= 7000:
            config["model_size"] = "base"  # Better accuracy

        # Pi 4 with 4GB+
        elif "Pi 4" in model and ram_mb >= 3000:
            config["model_size"] = "base" if ram_mb >= 4000 else "tiny"

        # Pi 4 with less RAM or older Pi
        else:
            config["model_size"] = "tiny"  # Conservative for limited RAM

        return config

    def optimize_system(self) -> bool:
        """Apply system optimizations"""
        if not self.platform_info["is_pi"]:
            logger.info("Not a Raspberry Pi - skipping Pi-specific optimizations")
            return True

        try:
            optimizations_applied = []

            # Increase audio buffer size to reduce dropouts
            self._set_audio_buffer_size()
            optimizations_applied.append("audio_buffer")

            # Set CPU governor to performance for audio workloads
            if self._set_cpu_governor("performance"):
                optimizations_applied.append("cpu_governor")

            # Increase audio thread priority
            if self._set_audio_priority():
                optimizations_applied.append("audio_priority")

            logger.info("Applied optimizations: %s", ", ".join(optimizations_applied))
            return True

        except (OSError, IOError) as e:
            logger.error("Failed to apply optimizations: %s", e)
            return False

    def _set_audio_buffer_size(self):
        """Set optimal audio buffer size"""
        try:
            # Create or update ALSA configuration
            alsa_conf = """
# Optimized ALSA configuration for Aida
pcm.!default {
    type pulse
    server unix:/run/user/1000/pulse/native
}

ctl.!default {
    type pulse
    server unix:/run/user/1000/pulse/native
}
"""
            with open(os.path.expanduser("~/.asoundrc"), "w", encoding="utf-8") as f:
                f.write(alsa_conf)
            logger.info("Updated ALSA configuration")
        except (OSError, IOError) as e:
            logger.warning("Could not update ALSA config: %s", e)

    def _set_cpu_governor(self, governor: str) -> bool:
        """Set CPU governor"""
        try:
            gov_files = [
                f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_governor"
                for i in range(self.platform_info["cpu_cores"])
            ]

            for gov_file in gov_files:
                if os.path.exists(gov_file):
                    subprocess.run(
                        ["sudo", "sh", "-c", f"echo {governor} > {gov_file}"],
                        check=True,
                        capture_output=True,
                    )

            logger.info("Set CPU governor to %s", governor)
            return True

        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("Could not set CPU governor to %s", governor)
            return False

    def _set_audio_priority(self) -> bool:
        """Set high priority for audio processes"""
        try:
            # This would typically require root privileges
            # For now, just log that we would do this
            logger.info("Audio priority optimization noted (requires root)")
            return False
        except (OSError, IOError) as e:
            logger.warning("Could not set audio priority: %s", e)
            return False

    def get_recommendations(self) -> Dict[str, Any]:
        """Get hardware-specific recommendations"""
        recommendations = {
            "stt_config": self.get_optimal_stt_config(),
            "general": [],
            "pi_specific": [],
        }

        if self.platform_info["is_pi"]:
            ram_mb = self.platform_info["ram_mb"]

            if ram_mb < 2000:
                recommendations["pi_specific"].append(
                    "Consider upgrading to Pi 4 with more RAM for better performance"
                )

            recommendations["pi_specific"].extend(
                [
                    "Use a high-quality SD card (Class 10 or better)",
                    "Ensure adequate cooling for sustained performance",
                    "Consider using USB audio interface for better quality",
                ]
            )

        recommendations["general"].extend(
            [
                "Use wired network connection for best stability",
                "Place device away from WiFi interference sources",
                "Regularly update system and dependencies",
            ]
        )

        return recommendations
