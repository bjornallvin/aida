# Aida Development Environment

This directory contains a unified development environment for the entire Aida Apartment AI project. The virtual environment includes all Python dependencies from all subprojects, making it easier to develop and test across components.

## Quick Start

1. **Setup the development environment:**
   ```bash
   ./setup_dev_env.sh
   ```

2. **Activate the environment:**
   ```bash
   source ./activate_dev_env.sh
   ```

3. **Start developing:**
   ```bash
   # Run room client
   cd room-client && python client.py --test-voice
   
   # Run mopidy server  
   cd mopidy-server && python server.py
   
   # Run backend (in separate terminal)
   cd backend && npm run dev
   ```

## Environment Structure

```
aida/
├── aida-dev-env/           # Virtual environment directory
├── requirements.txt        # Consolidated Python dependencies
├── setup_dev_env.sh       # Setup script
├── activate_dev_env.sh    # Activation helper script
└── deactivate_dev_env.sh  # Deactivation helper script
```

## What's Included

The unified virtual environment includes dependencies for:

### Room Client (`room-client/`)
- **pyaudio** - Audio recording and playback
- **webrtcvad** - Voice activity detection
- **numpy** - Audio processing
- **requests** - HTTP communication with backend

### Mopidy Server (`mopidy-server/`)
- **mopidy** - Core music server
- **mopidy-spotify** - Spotify integration
- **mopidy-mpd** - MPD protocol support
- **mopidy-local** - Local media library
- **mopidy-youtube** - YouTube integration
- **mopidy-soundcloud** - SoundCloud support
- **pykka** - Actor framework

### Development Tools
- **pytest** - Testing framework
- **black** - Code formatting
- **flake8** - Code linting
- **mypy** - Type checking
- **pre-commit** - Git hooks

### Backend (`backend/`)
- Node.js dependencies are installed separately in the `backend/` directory
- TypeScript compilation and development tools

## Usage

### Activating the Environment

```bash
# Option 1: Direct activation
source aida-dev-env/bin/activate

# Option 2: Use helper script (recommended)
source ./activate_dev_env.sh
```

The helper script provides additional information about the environment and available commands.

### Running Components

**Room Client:**
```bash
cd room-client
python client.py --help                    # See all options
python client.py --test-audio             # Test audio output
python client.py --test-voice             # Test voice commands
python client.py --config test-config.json # Run with specific config
```

**Mopidy Server:**
```bash
cd mopidy-server
python server.py                          # Run in foreground
python server.py --daemon                 # Run as daemon
python server.py --status                 # Check status
python server.py --stop                   # Stop daemon
```

**Backend:**
```bash
cd backend
npm run dev                                # Development mode with hot reload
npm run build                             # Build TypeScript
npm start                                 # Production mode
```

### Development Workflow

1. **Start all services:**
   ```bash
   # Terminal 1: Activate environment and start mopidy
   source ./activate_dev_env.sh
   cd mopidy-server && python server.py --daemon
   
   # Terminal 2: Start backend
   cd backend && npm run dev
   
   # Terminal 3: Run room client (if testing)
   cd room-client && python client.py --test-voice
   ```

2. **Run tests:**
   ```bash
   # Python tests
   pytest
   
   # Room client specific tests
   cd room-client && python -m pytest tests/
   
   # Backend tests (if any)
   cd backend && npm test
   ```

3. **Code formatting and linting:**
   ```bash
   # Format Python code
   black .
   
   # Lint Python code
   flake8 .
   
   # Type check Python code
   mypy .
   ```

### Deactivating the Environment

```bash
# Option 1: Standard deactivation
deactivate

# Option 2: Use helper script
source ./deactivate_dev_env.sh
```

## Troubleshooting

### Environment Issues

**Virtual environment doesn't exist:**
```bash
./setup_dev_env.sh
```

**Permission issues on macOS:**
```bash
# For pyaudio (if needed)
brew install portaudio
pip install pyaudio

# For audio device access
# Grant microphone permissions in System Preferences > Security & Privacy
```

**Missing system dependencies:**
```bash
# macOS
brew install portaudio ffmpeg

# Ubuntu/Debian
sudo apt-get install portaudio19-dev python3-dev ffmpeg

# Install snapcast client for room client testing
# macOS
brew install snapcast

# Linux
sudo apt-get install snapclient
```

### Component-Specific Issues

**Room Client:**
- Check `room-client/MACOS_COMPATIBILITY.md` for macOS-specific issues
- Ensure microphone permissions are granted
- Test audio devices with `--list-cards` option

**Mopidy Server:**
- Check `mopidy-server/README.md` for configuration
- Ensure Spotify credentials are configured (if using Spotify)
- Check port 6600 is available for MPD

**Backend:**
- Check `backend/README.md` for API documentation
- Ensure OpenAI API key is configured
- Check port 3000 is available

## Environment Variables

Create a `.env` file in the root directory for shared environment variables:

```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs TTS (optional)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Spotify (for mopidy)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Development settings
NODE_ENV=development
LOG_LEVEL=debug
```

## VS Code Integration

For optimal VS Code experience:

1. **Set Python interpreter:**
   - Open Command Palette (Cmd+Shift+P)
   - Select "Python: Select Interpreter"
   - Choose `./aida-dev-env/bin/python`

2. **Workspace settings (.vscode/settings.json):**
   ```json
   {
     "python.pythonPath": "./aida-dev-env/bin/python",
     "python.linting.enabled": true,
     "python.linting.flake8Enabled": true,
     "python.formatting.provider": "black",
     "python.testing.pytestEnabled": true,
     "python.testing.pytestArgs": ["."]
   }
   ```

## Contributing

When adding new Python dependencies:

1. Add them to the appropriate section in `requirements.txt`
2. Run `pip install -r requirements.txt` to update the environment
3. Test that all components still work
4. Update this README if needed

When adding Node.js dependencies:
1. Add them to `backend/package.json`
2. Run `npm install` in the backend directory
3. Update backend documentation as needed
