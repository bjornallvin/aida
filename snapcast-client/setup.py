#!/usr/bin/env python3
"""
Interactive setup script for Aida Snapcast Client
"""

import json
import subprocess
import re
import socket
from pathlib import Path


def get_hostname():
    """Get the current hostname"""
    try:
        return socket.gethostname()
    except OSError:
        return "unknown"


def get_ip_address():
    """Get the current IP address"""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "unknown"


def scan_for_server():
    """Scan for Aida server on the network"""
    print("Scanning for Aida server...")

    # Get local network range
    try:
        ip = get_ip_address()
        if ip == "unknown":
            return None

        # Simple scan for common server ports
        network_base = ".".join(ip.split(".")[:-1]) + "."

        for i in range(1, 255):
            test_ip = network_base + str(i)
            if test_ip == ip:  # Skip self
                continue

            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.1)
                result = sock.connect_ex((test_ip, 1704))
                sock.close()

                if result == 0:
                    print(f"Found potential Aida server at: {test_ip}")
                    return test_ip
            except OSError:
                continue
    except OSError as e:
        print(f"Network scan failed: {e}")

    return None


def get_sound_cards():
    """Get available sound cards"""
    cards = []
    try:
        result = subprocess.run(
            ["aplay", "-l"], capture_output=True, text=True, check=True
        )

        # Parse output to extract card names
        for line in result.stdout.split("\n"):
            if line.startswith("card "):
                match = re.search(r"card (\d+):", line)
                if match:
                    card_num = match.group(1)
                    # Extract card name
                    if "[" in line and "]" in line:
                        card_name = line.split("[")[1].split("]")[0]
                        cards.append(
                            {
                                "id": f"hw:{card_num},0",
                                "name": card_name,
                                "description": line.strip(),
                            }
                        )
    except subprocess.CalledProcessError as e:
        print(f"Error getting sound cards: {e}")
        # Add default fallback
        cards.append(
            {
                "id": "default",
                "name": "Default",
                "description": "System default audio device",
            }
        )

    return cards


def interactive_setup(config_file_path):
    """Interactive setup for the Snapcast client"""
    print("=== Aida Snapcast Client Setup ===\n")

    # Get hostname for default room name
    hostname = get_hostname()

    # Room name
    room_name = input(f"Enter room name (default: {hostname}): ").strip()
    if not room_name:
        room_name = hostname

    # Server discovery
    print("\nLooking for Aida server...")
    server_ip = scan_for_server()

    if server_ip:
        use_found = (
            input(f"Found server at {server_ip}. Use this? (Y/n): ").strip().lower()
        )
        if use_found in ["", "y", "yes"]:
            server_host = server_ip
        else:
            server_host = input("Enter server IP address: ").strip()
    else:
        print("No server found automatically.")
        server_host = input("Enter server IP address: ").strip()

    # Server port
    server_port = input("Enter server port (default: 1704): ").strip()
    if not server_port:
        server_port = 1704
    else:
        server_port = int(server_port)

    # Sound card selection
    print("\nAvailable sound cards:")
    cards = get_sound_cards()

    for i, card in enumerate(cards):
        print(f"{i + 1}: {card['name']} ({card['id']})")

    while True:
        try:
            choice = input(
                f"\nSelect sound card (1-{len(cards)}, default: 1): "
            ).strip()
            if not choice:
                choice = 1
            else:
                choice = int(choice)

            if 1 <= choice <= len(cards):
                sound_card = cards[choice - 1]["id"]
                break
            else:
                print("Invalid choice, please try again.")
        except ValueError:
            print("Please enter a number.")

    # Volume
    volume = input("Enter default volume (0-100, default: 50): ").strip()
    if not volume:
        volume = 50
    else:
        volume = int(volume)

    # Auto start
    auto_start = input("Auto-start on boot? (Y/n): ").strip().lower()
    auto_start = auto_start in ["", "y", "yes"]

    # Create configuration
    config = {
        "room_name": room_name,
        "server_host": server_host,
        "server_port": server_port,
        "sound_card": sound_card,
        "volume": volume,
        "auto_start": auto_start,
        "retry_interval": 10,
        "max_retries": -1,
        "client_name": room_name,
        "test_audio_on_start": False,
    }

    # Save configuration
    config_dir = Path(config_file_path).parent
    config_dir.mkdir(parents=True, exist_ok=True)

    with open(config_file_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    print(f"\nConfiguration saved to: {config_file_path}")
    print("\nConfiguration:")
    print(json.dumps(config, indent=2))

    # Test audio
    test_audio = input("\nTest audio output now? (y/N): ").strip().lower()
    if test_audio in ["y", "yes"]:
        try:
            subprocess.run(
                [
                    "speaker-test",
                    "-D",
                    sound_card,
                    "-t",
                    "sine",
                    "-f",
                    "1000",
                    "-l",
                    "1",
                ],
                timeout=3,
                check=True,
            )
            print("Audio test completed!")
        except subprocess.CalledProcessError as e:
            print(f"Audio test failed: {e}")

    # Setup systemd service
    setup_service = (
        input("\nSetup systemd service for auto-start? (Y/n): ").strip().lower()
    )
    if setup_service in ["", "y", "yes"]:
        create_systemd_service(config_file_path, room_name)

    print("\nSetup complete! You can now start the client with:")
    print(
        f"sudo python3 /opt/aida/snapcast-client/client.py --config {config_file_path}"
    )


def create_systemd_service(service_config_path, room_name):
    """Create systemd service file"""
    service_content = f"""[Unit]
Description=Aida Snapcast Client - {room_name}
After=network.target sound.target
Wants=network.target

[Service]
Type=simple
User=aida
Group=audio
ExecStart=/usr/bin/python3 /opt/aida/snapcast-client/client.py --config {service_config_path} --daemon
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""

    service_file = f"/etc/systemd/system/aida-snapcast-{room_name.lower().replace(' ', '-')}.service"

    try:
        with open(service_file, "w", encoding="utf-8") as f:
            f.write(service_content)

        print(f"Systemd service created: {service_file}")
        print("To enable and start the service:")
        print(
            f"sudo systemctl enable aida-snapcast-{room_name.lower().replace(' ', '-')}"
        )
        print(
            f"sudo systemctl start aida-snapcast-{room_name.lower().replace(' ', '-')}"
        )

    except OSError as e:
        print(f"Failed to create systemd service: {e}")
        print("You may need to run this setup as root.")


if __name__ == "__main__":
    import sys

    config_path = sys.argv[1] if len(sys.argv) > 1 else "/etc/aida/client.json"
    interactive_setup(config_path)
