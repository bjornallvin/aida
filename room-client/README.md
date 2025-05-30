# Room Client for Aida Apartment AI

Raspberry Pi client software for Aida's multi-room audio system. This client handles audio streaming, voice commands, and room-specific controls for the Aida apartment AI system.

## Features

- **Automatic Server Discovery**: Scans network for Aida server
- **Audio Device Detection**: Lists and configures available sound cards
- **Robust Connection**: Auto-reconnect with configurable retry logic
- **Systemd Integration**: Runs as a system service with auto-start
- **Room-based Identification**: Each Pi identifies as a specific room
- **AI Voice Commands**: Speech-to-text interaction with OpenAI integration
- **Audio Feedback**: TTS responses played through room speakers
- **Easy Management**: Simple command-line interface for control

## Directory Structure

The room-client has been organized into a clean, modular structure for better maintainability:

```
room-client/
├── src/                          # Modular source code
│   ├── audio/                    # Audio handling & VAD
│   ├── client/                   # Snapcast client management  
│   ├── config/                   # Configuration management
│   ├── optimization/             # Hardware optimizations
│   ├── stt/                      # Speech-to-text engines
│   ├── utils/                    # Platform detection & logging
│   └── voice/                    # Voice command processing
├── deployment/                   # Deployment & installation
│   ├── install-pi.sh            # Raspberry Pi setup
│   └── deploy-to-pis.sh         # Bulk deployment
├── scripts/                      # Development scripts
│   ├── activate.sh              # Virtual environment activation
│   ├── start_modular.sh         # Start modular client
│   └── test_modular.sh          # Test setup
├── docs/                         # Documentation
│   ├── MODULAR_STRUCTURE.md     # Architecture details
│   ├── MODULARIZATION_COMPLETE.md
│   └── MACOS_COMPATIBILITY.md   # macOS setup guide
├── configs/                      # Configuration examples
│   ├── client-pi.json           # Pi-specific config
│   ├── config-examples.json     # Example configurations
│   └── *.backup                 # Configuration backups
├── optimization/                 # Hardware optimizations
│   └── pi_optimization.py       # Raspberry Pi tuning
├── tests/                        # Test files
├── venv/                         # Python virtual environment
├── main.py                       # Main entry point
├── client.json                   # Active configuration
└── requirements.txt              # Dependencies
```

### Quick Start Guide

**Primary Usage (Current Architecture):**
```bash
python main.py --config client.json
```

**Development & Testing:**
```bash
./scripts/start_modular.sh       # Start with convenience script
./scripts/test_modular.sh        # Test all components
```

**Deployment:**
```bash
sudo ./deployment/install-pi.sh  # Install on Raspberry Pi
./deployment/deploy-to-pis.sh    # Deploy to multiple Pis
```

## Quick Development Setup

For development on macOS or Linux:

```bash
# Clone and setup
cd /path/to/aida/room-client

# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy and edit configuration
cp configs/config-examples.json client.json
# Edit client.json with your settings

# Test the setup
python main.py --test-audio
```

## Installation on Raspberry Pi

### Quick Install with Voice Commands
```bash
# Copy this directory to your Pi
scp -r room-client/ pi@your-pi-ip:/tmp/

# SSH to your Pi and run installation
ssh pi@your-pi-ip
sudo /tmp/room-client/install-pi.sh

# Install voice command dependencies
cd /opt/aida/room-client
sudo pip3 install -r requirements.txt
```

### Manual Install
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install snapcast client and audio tools
sudo apt install snapclient alsa-utils python3 python3-pip

# Install voice command dependencies
sudo apt install portaudio19-dev python3-dev
sudo pip3 install pyaudio webrtcvad requests

# Copy client files to /opt/aida/room-client/
# Run pip install for dependencies
sudo pip3 install -r requirements.txt
```

## Installation on macOS

The Aida room client now supports macOS for development and testing purposes.

### Prerequisites
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3 and audio dependencies
brew install python3 portaudio

# Optional: Install mpg123 for audio playback (afplay is used by default)
brew install mpg123
```

### Installation
```bash
# Clone or download the Aida project
cd /path/to/aida/room-client

# Create and activate Python virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install setuptools  # Fix for webrtcvad compatibility
pip install -r requirements.txt

# Create configuration directory
mkdir -p ~/Library/Application\ Support/Aida

# Copy example configuration
cp config.example.json ~/Library/Application\ Support/Aida/client.json
```

## Installation on Linux/WSL Ubuntu

The Aida room client supports Linux development environments, including WSL (Windows Subsystem for Linux) with Ubuntu.

### Prerequisites
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python development headers and build tools
sudo apt install python3-dev python3-pip build-essential

# Install audio development libraries (required for pyaudio and webrtcvad)
sudo apt install portaudio19-dev libasound2-dev

# Optional: Install additional audio libraries if needed
sudo apt install libjack-jackd2-dev libpulse-dev
```

### Installation
```bash
# Navigate to the room-client directory
cd /path/to/aida/room-client

# Create and activate Python virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install setuptools  # Fix for webrtcvad compatibility
pip install -r requirements.txt

# Create configuration directory
mkdir -p ~/.config/aida

# Copy example configuration
cp config.example.json ~/.config/aida/client.json
```

### Troubleshooting Linux/WSL Installation

If you encounter compilation errors when installing `pyaudio` or `webrtcvad`:

```bash
# Install missing development packages
sudo apt install python3-dev build-essential portaudio19-dev libasound2-dev

# Alternative: Install pre-compiled wheels if available
pip install --only-binary=all pyaudio webrtcvad

# If still having issues, try installing packages individually
pip install pyaudio
pip install webrtcvad
```

### Quick Start (Virtual Environment)
```bash
# Use the convenience activation script
cd /path/to/aida/room-client
source scripts/activate.sh

# This will activate the virtual environment and show available commands
```

### Usage on macOS
```bash
# Method 1: Use activation script (recommended)
source scripts/activate.sh
python main.py --test-audio

# Method 2: Manual activation
source venv/bin/activate
python main.py --config ~/Library/Application\ Support/Aida/client.json

# Test audio output
python main.py --test-audio

# List available audio devices
python main.py --list-cards

# Interactive setup
python main.py --setup

# Test voice commands (if enabled)
python main.py --test-voice
```

### macOS-Specific Notes

- **Audio Device Detection**: Uses `system_profiler SPAudioDataType` instead of `aplay -l`
- **Audio Testing**: Uses built-in `say` command instead of `speaker-test`
- **Audio Playback**: Prefers `afplay` (built-in) with `mpg123` fallback
- **Configuration Path**: `~/Library/Application Support/Aida/client.json`
- **Log Path**: `~/Library/Logs/aida-snapcast.log`
- **No systemd**: Run manually or use launchd for auto-start

### Linux/WSL-Specific Notes

- **Audio Device Detection**: Uses `aplay -l` to list available sound cards
- **Audio Testing**: Uses `speaker-test` for audio output testing
- **Audio Playback**: Uses ALSA/PulseAudio system defaults
- **Configuration Path**: `~/.config/aida/client.json` or `/etc/aida/client.json`
- **Log Path**: `/var/log/aida-snapcast.log` or journalctl for systemd
- **Package Dependencies**: Requires `python3-dev`, `build-essential`, and audio development libraries
- **WSL Audio**: May require PulseAudio configuration for audio output to Windows

### Development Status in WSL

After running `python main.py --test-audio`, you should see:
- ✅ **Configuration loading** - Works perfectly
- ✅ **VAD (Voice Activity Detection)** - Initializes successfully
- ✅ **Faster-Whisper model loading** - Downloads and loads speech recognition model
- ✅ **Wake word detection** - "Aida" wake word system ready
- ✅ **Voice command parsing** - Ready to process commands
- ❌ **Audio input/output** - Fails due to WSL audio limitations

**WSL Development Workflow**: The core voice recognition and command processing systems work perfectly in WSL. For full audio testing, deploy to a Raspberry Pi or use a Linux VM with audio hardware access.

## WSL Audio Status Update

**✅ COMPLETE**: Full audio functionality working in WSL Ubuntu!

### Successful Configuration:
- **PulseAudio**: Connected to WSLg audio server (`/mnt/wslg/PulseServer`)  
- **ALSA**: Configured to route through PulseAudio (`~/.asoundrc`)
- **PyAudio**: Successfully handles both input and output through Windows audio system
- **Audio Tests**: Both `speaker-test` and `python main.py --test-audio` work perfectly
- **Snapclient**: Installed and working (version 0.27.0)

### Status Summary:
✅ **PyAudio Output**: Working - can play audio through Windows  
✅ **PyAudio Input**: Working - can record audio from Windows microphone
✅ **Dependency Build**: Fixed - all packages compile successfully  
✅ **Room-client Components**: Working - VAD, faster-whisper, wake word detection all initialize  
✅ **Snapclient**: Installed and connects successfully
✅ **Voice Pipeline**: Ready for testing with backend server

**Final Status**: WSL audio setup is complete. Room-client starts successfully with all audio components working. Ready for backend integration testing.

---

## Configuration

The client uses a JSON configuration file. Configuration file locations:

- **Development**: `./client.json` (current directory)
- **Raspberry Pi**: `/etc/aida/client.json` (system-wide)
- **macOS**: `~/Library/Application Support/Aida/client.json`
- **Linux**: `~/.config/aida/client.json` (user-specific)

Example configuration:

```json
{
  "room_name": "living_room",
  "server_host": "192.168.1.100",
  "server_port": 1704,
  "sound_card": "hw:0,0",
  "volume": 50,
  "auto_start": true,
  "retry_interval": 10,
  "max_retries": -1,
  "client_name": "living_room",
  "voice_commands_enabled": false,
  "backend_url": "http://192.168.1.100:3000",
  "ai_audio_playback": true
}
```

### Configuration Options

- **room_name**: Unique identifier for this room
- **server_host**: IP address of your Aida server
- **server_port**: Snapcast server port (default: 1704)
- **sound_card**: ALSA audio device identifier
- **volume**: Default volume level (0-100)
- **auto_start**: Start automatically on boot
- **retry_interval**: Seconds between reconnection attempts
- **max_retries**: Maximum reconnection attempts (-1 = infinite)
- **client_name**: Display name for Snapcast
- **voice_commands_enabled**: Enable AI voice interaction (requires dependencies)
- **backend_url**: URL of Aida backend server for AI features
- **ai_audio_playback**: Play AI responses through room speakers
- **vad_aggressiveness**: Voice activity detection sensitivity (0-3, higher = less background noise, default: 3)
- **silence_threshold**: Frames of silence before stopping recording (higher = less sensitive, default: 40)

## Usage

### On Raspberry Pi (after installation)
Use the `aida-client` command:

```bash
# Start the client
aida-client start

# Stop the client  
aida-client stop

# Restart the client
aida-client restart

# Check status
aida-client status

# View logs
aida-client logs

# Reconfigure
aida-client setup

# Test audio output
aida-client test-audio

# Test voice commands (if enabled)
aida-client test-voice
```

### Development Usage (macOS/Linux)
Use the main entry point directly. For development, it's recommended to use a virtual environment:

```bash
# First time setup (if not already done)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Daily development usage
source scripts/activate.sh  # Activates venv and shows commands

# Or manually
source venv/bin/activate

# Start the client
python main.py --config client.json

# Enable voice commands for this session
python main.py --enable-voice

# Test audio output
python main.py --test-audio

# List available audio devices
python main.py --list-cards

# Interactive setup
python main.py --setup

# Test voice commands (if enabled)
python main.py --test-voice

# Interactive voice testing (if voice handler exists)
python -c "from src.voice.handler import VoiceHandler; VoiceHandler().test()"
```

## Voice Commands

### Prerequisites

For voice command functionality, ensure you have:

1. **Microphone connected** to your Raspberry Pi
2. **Voice dependencies installed**:
   ```bash
   sudo pip3 install pyaudio webrtcvad requests
   ```
3. **Backend server running** with OpenAI and ElevenLabs API keys configured

### Voice Command Examples

Once enabled, you can interact with Aida using natural language:

- **"Hey Aida, play some jazz music"** - Request music playback
- **"Aida, lower the volume"** - Volume control
- **"What's playing right now?"** - Get current track info
- **"Turn off the music"** - Stop playback
- **"Play something relaxing"** - Mood-based music requests

### Troubleshooting Voice Commands

```bash
# Check microphone input
arecord -l

# Test microphone recording
arecord -d 5 test.wav
aplay test.wav

# Check voice command dependencies
python3 -c "import pyaudio, webrtcvad; print('Voice deps OK')"

# Test backend connection
curl http://192.168.1.100:3000/health
```

#### Voice Sensitivity Issues

If the voice commands are picking up too much background noise:

1. **Increase VAD aggressiveness** in your config:
   ```json
   "vad_aggressiveness": 3
   ```
   Values: 0 (least aggressive) to 3 (most aggressive)

2. **Increase silence threshold** to require more silence before stopping:
   ```json
   "silence_threshold": 60
   ```
   Higher values = less sensitive to brief noises

3. **Test your current settings**:
   ```bash
   python main.py --test-voice
   ```

## Audio Setup

### Finding Audio Devices
```bash
# List available sound cards
aplay -l

# Test audio output
speaker-test -t sine -f 1000 -l 1
```

### Common Audio Device Identifiers
- **Built-in audio**: `hw:0,0` or `default`
- **USB Audio**: `hw:1,0` 
- **HAT Audio**: `hw:2,0`
- **Bluetooth**: `bluealsa:HCI=hci0,DEV=XX:XX:XX:XX:XX:XX`

### Audio Troubleshooting

**No sound output**:
```bash
# Check ALSA mixer levels
alsamixer

# Unmute and set volume
amixer set Master 70% unmute
```

**Permission issues**:
```bash
# Add user to audio group
sudo usermod -a -G audio aida
```

**USB audio not detected**:
```bash
# Check USB devices
lsusb

# Reload audio modules
sudo modprobe snd-usb-audio
```

## Network Configuration

The client will automatically scan for your Aida server, but you can also configure manually:

```bash
# Find your server IP
nmap -p 1704 192.168.1.0/24

# Test connection
telnet YOUR_SERVER_IP 1704
```

## Room-Specific Setup Examples

### Living Room (Main speakers)
```json
{
  "room_name": "living_room",
  "volume": 70,
  "sound_card": "hw:1,0"
}
```

### Bedroom (Quiet hours)
```json
{
  "room_name": "bedroom", 
  "volume": 40,
  "sound_card": "default"
}
```

### Kitchen (Background music)
```json
{
  "room_name": "kitchen",
  "volume": 60,
  "sound_card": "hw:0,0"
}
```

## Systemd Service

The installation automatically creates a systemd service:

```bash
# Service name is based on room name
sudo systemctl status aida-snapcast-living-room

# Enable auto-start
sudo systemctl enable aida-snapcast-living-room

# Start manually
sudo systemctl start aida-snapcast-living-room
```

## Logs and Troubleshooting

### View Logs
```bash
# Real-time logs
aida-client logs

# System logs
journalctl -u aida-snapcast-* -f

# Application log file
tail -f /var/log/aida-snapcast.log
```

### Common Issues

**Client won't connect**:
- Check server IP and port
- Verify network connectivity
- Check firewall settings

**Audio stuttering**:
- Check network bandwidth
- Adjust audio buffer settings
- Verify audio device configuration

**Service won't start**:
- Check configuration file syntax
- Verify user permissions
- Check systemd service status

## Hardware Recommendations

### Raspberry Pi Models
- **Pi 4**: Best performance for multiple rooms
- **Pi 3B+**: Good for single room setups  
- **Pi Zero 2 W**: Compact, sufficient for basic audio

### Audio Hardware
- **USB Audio Adapters**: Improved audio quality
- **DAC HATs**: Professional audio output
- **Powered Speakers**: Direct connection without amplifier
- **Audio Amplifier HATs**: For passive speakers

## Security Considerations

- Change default Pi passwords
- Use SSH keys instead of passwords
- Configure firewall if needed
- Keep system updated

```bash
# Update regularly
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 1704/tcp  # Snapcast
sudo ufw enable
```
