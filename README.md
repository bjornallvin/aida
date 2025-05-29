# Aida - Apartment AI System

A complete apartment AI system with Express backend, integrated Mopidy server for music control, and Snapcast clients for multi-room audio distribution.

## Architecture

- **Backend Server** (`/backend`): Node.js Express API for music control and TTS
- **Mopidy Server** (`/mopidy-server`): Python-based music server with Spotify/YouTube/SoundCloud
- **Snapcast Clients** (`/snapcast-client`): Raspberry Pi clients for room-specific audio
- **Multi-room Audio**: Complete distributed audio system with room-based control

## Features

- **Music Control**: Play Spotify tracks, YouTube videos, SoundCloud, and radio streams
- **Text-to-Speech**: Generate and play TTS using ElevenLabs API
- **Multi-room Audio**: Snapcast server and Raspberry Pi clients for distributed playback
- **Room-based Control**: Target specific rooms or play synchronized audio everywhere
- **Raspberry Pi Integration**: Complete setup scripts for Pi deployment
- **Docker Support**: Containerized deployment with docker-compose
- **Robust Monitoring**: Auto-reconnect, health checks, and comprehensive logging

## Quick Setup

### Option 1: Docker (Recommended)
```bash
# Copy environment configuration
cp .env.docker.example .env.docker

# Edit with your API keys
nano .env.docker

# Start the complete system
docker-compose up -d
```

### Option 2: Manual Setup
1. **Install all dependencies**:
   ```bash
   npm run setup
   ```

2. **Configure environment variables**:
   ```bash
   # Backend configuration
   cp backend/.env.example backend/.env
   
   # Mopidy configuration
   cp mopidy-server/.env.example mopidy-server/.env
   
   # Edit with your actual API keys and credentials
   ```

3. **Start the servers**:
   ```bash
   # Start both servers
   npm start
   
   # Or start individually
   npm run start:backend
   npm run start:mopidy
   ```

### Option 3: Raspberry Pi Clients
Deploy Snapcast clients to your Raspberry Pi devices:
```bash
# Deploy to multiple Pis at once
cd snapcast-client
./deploy-to-pis.sh 192.168.1.101 192.168.1.102 192.168.1.103
```

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Express API    │    │   Mopidy Server  │    │ Snapcast Server │
│  (port 3000)    │◄──►│   (port 6680)    │◄──►│   (port 1704)   │
│                 │    │                  │    │                 │
│ • OpenAI Chat   │    │ • Spotify        │    │ • Audio Stream  │
│ • Speech-to-Text│    │ • YouTube        │    │ • Multi-room    │
│ • TTS (ElevenLabs) │  │ • SoundCloud     │    │ • Synchronization│
│ • Music Control │    │ • Radio Streams  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                         ┌───────────────────────────────┼─────────────────┐
                         │                               │                 │
                ┌────────▼────────┐             ┌────────▼────────┐       │
                │  Raspberry Pi   │             │  Raspberry Pi   │    ┌──▼──┐
                │  (Living Room)  │             │   (Kitchen)     │    │ ... │
                │                 │             │                 │    └─────┘
                │ • Snapcast Client│            │ • Snapcast Client│
                │ • Voice Commands │            │ • Voice Commands │
                │ • AI Interaction │            │ • AI Interaction │
                │ • Auto-reconnect │            │ • Auto-reconnect │
                │ • Room Audio    │             │ • Room Audio    │
                └─────────────────┘             └─────────────────┘
                         │                               │
                         ▼ Voice Commands                ▼ Voice Commands
                    🎤 "Hey Aida, play           🎤 "Aida, lower the
                       some jazz music"             volume please"
```

## Required System Dependencies
- **Python 3.8+**: For Mopidy server
- **Node.js 16+**: For Express backend
- **mpg123**: Audio player for TTS (`brew install mpg123` on macOS)
- **Docker & Docker Compose**: For containerized deployment
- **Snapcast**: For Raspberry Pi clients (`apt install snapclient` on Pi)
```env
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
MOPIDY_URL=http://localhost:6680
PORT=3000
TTS_OUTPUT_DIR=./audio
```

### Mopidy Server (`mopidy-server/.env`)
```env
SPOTIFY_USERNAME=your_spotify_username
SPOTIFY_PASSWORD=your_spotify_password
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## API Endpoints

### POST /play
Control music playback in specific rooms.

**Spotify Playback**:
```json
{
  "room": "living_room",
  "type": "spotify",
  "query": "Bohemian Rhapsody Queen"
}
```

**Radio Playback**:
```json
{
  "room": "kitchen",
  "type": "radio",
  "url": "http://stream.example.com/radio"
}
```

### POST /tts
Generate and play text-to-speech audio.

```json
{
  "room": "bedroom",
  "text": "Good morning! The weather today is sunny with a high of 75 degrees."
}
```

### GET /health
Health check endpoint.

### POST /speech-to-text
Convert speech audio to text using OpenAI Whisper.

**Request**: Multipart form with audio file
```bash
curl -X POST http://localhost:3000/speech-to-text \
  -F "audio=@recording.wav"
```

**Response**:
```json
{
  "success": true,
  "text": "Hello Aida, can you play some music?",
  "timestamp": "2025-05-28T10:30:00.000Z"
}
```

### POST /chat
AI chat completion using OpenAI GPT.

**Request**:
```json
{
  "message": "Hello Aida, can you play some jazz music?",
  "roomName": "living_room",
  "conversationHistory": []
}
```

**Response**:
```json
{
  "success": true,
  "response": "I'd be happy to play some jazz for you! Let me start a smooth jazz playlist.",
  "timestamp": "2025-05-28T10:30:00.000Z",
  "usage": {
    "total_tokens": 45
  }
}
```

### POST /voice-command
Complete voice interaction: speech-to-text + AI chat + TTS response.

**Request**: Multipart form with audio file and room context
```bash
curl -X POST http://localhost:3000/voice-command \
  -F "audio=@voice_command.wav" \
  -F "roomName=living_room" \
  -F "conversationHistory=[]"
```

**Response**:
```json
{
  "success": true,
  "transcription": "Hey Aida, play some relaxing music",
  "response": "I'll play some relaxing music for you right away!",
  "audioFile": "/audio/response_abc123.mp3",
  "timestamp": "2025-05-28T10:30:00.000Z",
  "usage": {
    "total_tokens": 52
  }
}
```

## Future Endpoints

- `POST /pause` - Pause/resume playback
- `POST /volume` - Volume control

## Voice Commands

Aida supports AI-powered voice commands through Snapcast clients equipped with microphones. The voice command system uses:

- **OpenAI Whisper**: Speech-to-text transcription
- **OpenAI GPT-3.5-turbo**: Natural language understanding and response generation
- **ElevenLabs**: Text-to-speech for AI responses

### Enabling Voice Commands

1. **Configure API Keys** (in `backend/.env`):
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

2. **Install Dependencies** on Raspberry Pi:
   ```bash
   cd snapcast-client
   pip3 install -r requirements.txt
   ```

3. **Enable in Client Config**:
   ```json
   {
     "room_name": "living_room",
     "voice_commands_enabled": true,
     "backend_url": "http://192.168.1.100:3000",
     "ai_audio_playback": true
   }
   ```

4. **Start Client with Voice Commands**:
   ```bash
   python3 client.py --enable-voice
   ```

### Voice Command Examples

- **Music Control**: "Hey Aida, play some jazz music"
- **Volume Control**: "Aida, lower the volume"
- **Information**: "What's playing right now?"
- **Room Control**: "Turn off the music in the kitchen"

### Testing Voice Commands

```bash
# Test voice command integration
./test-voice-integration.sh

# Test individual components
cd snapcast-client
python3 client.py --test-voice

# Interactive voice testing
python3 voice_commands.py
```

## Usage

### Start Everything (Production)
```bash
npm start  # Starts Mopidy as daemon + Express server
```

### Development Mode
```bash
npm run dev  # Starts Mopidy as daemon + Express server with nodemon
```

### Individual Services
```bash
# Start only the Express backend
npm run start:backend

# Start only Mopidy server
npm run start:mopidy

# Start Mopidy as background daemon
npm run start:mopidy:daemon

# Check Mopidy status
npm run status:mopidy

# Stop Mopidy daemon
npm run stop:mopidy
```

## Project Structure

```
aida/
├── backend/                 # Express server
│   ├── server.js           # Main Express application
│   ├── package.json        # Node.js dependencies
│   └── .env               # Backend environment variables
├── mopidy-server/          # Mopidy music server
│   ├── server.py          # Mopidy launcher script
│   ├── mopidy.conf        # Mopidy configuration
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Mopidy environment variables
├── package.json           # Root package.json with scripts
└── README.md             # This file
```

## Dependencies

- **Core dependencies**: Automatically installed by setup script
- **External dependencies**: 
  - **Python 3.8+**: For Mopidy server
  - **mpg123**: Audio player for TTS (`brew install mpg123`)
  - **Snapcast**: (Optional) For multi-room audio distribution

## Audio Setup Notes

- TTS files are temporarily saved to the configured audio directory
- Files are automatically cleaned up after playback  
- Assumes Snapcast or similar system will pick it up from mpg123
- Mopidy handles Spotify authentication and playback
- Multi-room audio routing handled by room parameter in API calls

## Development

### Quick Start
```bash
# One-command setup
./setup.sh

# Start development environment  
npm run dev
```

### Manual Setup
```bash
# Install all dependencies
npm run setup

# Configure environment variables
# Edit backend/.env and mopidy-server/.env

# Start everything
npm start
```

### Docker Deployment
```bash
# Setup Docker environment
npm run docker:setup
# Edit .env with your credentials

# Build and run with Docker Compose
npm run docker:run

# View logs
npm run docker:logs

# Stop containers
npm run docker:stop
```

## Logging

All operations are logged with timestamps and structured data for easy debugging and monitoring. Both servers provide comprehensive logging for troubleshooting.

### Docker Environment (`.env.docker`)
All variables combined for Docker Compose deployment.

## Snapcast Client System

The Snapcast client system provides distributed audio to Raspberry Pi devices in each room.

### Features
- **Auto-discovery**: Scans network for Aida server
- **Audio device detection**: Lists and configures sound cards
- **Robust connection**: Auto-reconnect with configurable retry logic
- **Systemd integration**: Runs as system service with auto-start
- **Bulk deployment**: Deploy to multiple Pis simultaneously

### Raspberry Pi Setup
```bash
# Single Pi setup
scp -r snapcast-client/ pi@192.168.1.101:/tmp/
ssh pi@192.168.1.101 "sudo /tmp/snapcast-client/install-pi.sh"

# Bulk deployment to multiple Pis
cd snapcast-client
./deploy-to-pis.sh 192.168.1.101 192.168.1.102 192.168.1.103
```

### Client Configuration
Each Pi uses `/etc/aida/client.json`:
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
  "client_name": "living_room"
}
```

### Client Management
```bash
# Interactive setup on Pi
sudo python3 /opt/aida/snapcast-client/setup.py

# Manual client control
sudo python3 /opt/aida/snapcast-client/client.py --config /etc/aida/client.json

# Check client status
sudo systemctl status aida-snapcast-[room-name]

# View client logs
sudo journalctl -u aida-snapcast-[room-name] -f
```
