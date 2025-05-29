#!/usr/bin/env python3
"""
Migration utility for transitioning to modular room client
"""

import os
import sys
import json
import shutil
from pathlib import Path


def migrate_config():
    """Migrate existing configuration to new format"""
    old_configs = [
        "client.json",
        "client-pi.json",
        "client_native_stt.json",
        "dev-test-config.json",
    ]

    migrations_done = []

    for config_file in old_configs:
        if os.path.exists(config_file):
            print(f"Found config: {config_file}")

            try:
                with open(config_file, "r") as f:
                    config = json.load(f)

                # Add new modular-specific settings if missing
                if "use_native_stt" not in config:
                    config["use_native_stt"] = True

                if "stt_config" not in config:
                    config["stt_config"] = {
                        "model_size": "base",
                        "device": "auto",
                        "compute_type": "float16",
                    }

                if "vad_aggressiveness" not in config:
                    config["vad_aggressiveness"] = 3

                if "silence_threshold" not in config:
                    config["silence_threshold"] = 40

                # Create backup
                backup_file = f"{config_file}.backup"
                shutil.copy2(config_file, backup_file)

                # Save updated config
                with open(config_file, "w") as f:
                    json.dump(config, f, indent=2)

                migrations_done.append(config_file)
                print(f"  ✓ Migrated {config_file} (backup: {backup_file})")

            except Exception as e:
                print(f"  ✗ Failed to migrate {config_file}: {e}")

    return migrations_done


def create_convenience_scripts():
    """Create convenience scripts for common operations"""
    scripts = {
        "start_modular.sh": """#!/bin/bash
# Start the modular room client
cd "$(dirname "$0")"
python main.py "$@"
""",
        "start_legacy.sh": """#!/bin/bash
# Start the legacy room client
cd "$(dirname "$0")"
python client.py "$@"
""",
        "test_modular.sh": """#!/bin/bash
# Test the modular room client
cd "$(dirname "$0")"
echo "Testing platform detection..."
python -c "from src.utils import get_platform_info; print(get_platform_info())"

echo "Testing configuration..."
python -c "from src.config import ConfigManager; cm = ConfigManager(); print('Room:', cm.get('room_name'))"

echo "Testing audio..."
python main.py --test-audio

echo "Testing voice (if enabled)..."
python main.py --test-voice
""",
    }

    for script_name, content in scripts.items():
        with open(script_name, "w") as f:
            f.write(content)
        os.chmod(script_name, 0o755)
        print(f"Created script: {script_name}")


def main():
    """Main migration function"""
    print("🔄 Aida Room Client Migration Utility")
    print("=====================================")

    print("\n1. Migrating configuration files...")
    migrated = migrate_config()

    print("\n2. Creating convenience scripts...")
    create_convenience_scripts()

    print("\n✅ Migration completed!")
    print(f"   Migrated {len(migrated)} config files")
    print(f"   Created convenience scripts")

    print("\n📋 Next Steps:")
    print("   • Test the modular version: ./test_modular.sh")
    print("   • Start modular client: ./start_modular.sh")
    print("   • Start legacy client: ./start_legacy.sh")
    print("   • Read MODULAR_STRUCTURE.md for details")

    print("\n🔗 Usage:")
    print("   python main.py --help          # Show all options")
    print("   python main.py --status        # Check status")
    print("   python main.py --optimize      # Apply optimizations")
    print("   python main.py --enable-voice  # Enable voice commands")


if __name__ == "__main__":
    main()
