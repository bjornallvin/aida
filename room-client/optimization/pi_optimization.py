#!/usr/bin/env python3
"""
Raspberry Pi optimization utilities for native STT
"""

import os
import logging
import subprocess
import platform
from typing import Dict, Any

logger = logging.getLogger(__name__)


def get_pi_info() -> Dict[str, Any]:
    """Get Raspberry Pi hardware information"""
    info = {
        "model": "unknown",
        "ram_mb": 0,
        "cpu_cores": os.cpu_count(),
        "architecture": platform.machine(),
        "is_pi": False,
    }

    try:
        # Check if it's a Raspberry Pi
        with open("/proc/cpuinfo", "r") as f:
            cpuinfo = f.read()
            if "Raspberry Pi" in cpuinfo or "BCM" in cpuinfo:
                info["is_pi"] = True

                # Extract model info
                for line in cpuinfo.split("\n"):
                    if "Model" in line and "Raspberry Pi" in line:
                        info["model"] = line.split(":")[1].strip()
                        break

        # Get RAM info
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    info["ram_mb"] = int(line.split()[1]) // 1024
                    break

    except Exception as e:
        logger.warning(f"Could not read Pi info: {e}")

    return info


def get_optimal_stt_config(pi_info: Dict[str, Any]) -> Dict[str, Any]:
    """Get optimal STT configuration for this Pi"""

    # Default conservative config
    config = {"model_size": "tiny", "device": "cpu", "compute_type": "float32"}

    if not pi_info["is_pi"]:
        logger.warning("Not running on Raspberry Pi - using default config")
        return config

    ram_mb = pi_info["ram_mb"]
    model = pi_info["model"]

    logger.info(f"Optimizing for {model} with {ram_mb}MB RAM")

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


def optimize_system_for_stt():
    """Apply system optimizations for STT performance"""
    optimizations = []

    try:
        # Set CPU governor to performance mode
        subprocess.run(
            ["sudo", "cpufreq-set", "-g", "performance"],
            capture_output=True,
            check=False,
        )
        optimizations.append("CPU governor set to performance")

        # Increase GPU memory split (give more RAM to CPU)
        gpu_mem = subprocess.run(
            ["vcgencmd", "get_mem", "gpu"], capture_output=True, text=True, check=False
        )
        if gpu_mem.returncode == 0:
            current_gpu_mem = int(gpu_mem.stdout.split("=")[1].strip().replace("M", ""))
            if current_gpu_mem > 64:
                logger.info(
                    f"Consider reducing GPU memory from {current_gpu_mem}MB to 64MB"
                )
                optimizations.append(
                    f"GPU memory: {current_gpu_mem}MB (consider reducing to 64MB)"
                )

        # Set OMP threads for optimal CPU usage
        cpu_cores = os.cpu_count()
        os.environ["OMP_NUM_THREADS"] = str(max(1, cpu_cores - 1))
        optimizations.append(f"OMP threads set to {cpu_cores - 1}")

    except Exception as e:
        logger.warning(f"Could not apply system optimizations: {e}")

    return optimizations


def monitor_stt_performance():
    """Monitor STT performance and resource usage"""
    import psutil

    process = psutil.Process()

    # Monitor during STT operations
    cpu_percent = process.cpu_percent()
    memory_mb = process.memory_info().rss / 1024 / 1024

    # System-wide stats
    system_ram_percent = psutil.virtual_memory().percent
    system_cpu_percent = psutil.cpu_percent()

    return {
        "process_cpu_percent": cpu_percent,
        "process_memory_mb": memory_mb,
        "system_ram_percent": system_ram_percent,
        "system_cpu_percent": system_cpu_percent,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    print("🍓 Raspberry Pi STT Optimization")
    print("=" * 40)

    # Get Pi info
    pi_info = get_pi_info()
    print(f"Hardware: {pi_info}")

    # Get optimal config
    optimal_config = get_optimal_stt_config(pi_info)
    print(f"Recommended STT config: {optimal_config}")

    # Apply optimizations
    optimizations = optimize_system_for_stt()
    print(f"Applied optimizations: {optimizations}")
