# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aida is a comprehensive apartment AI system with distributed audio, voice control, and smart home integration. The repository contains multiple components:

- **Backend API** (TypeScript/Express) - Central control server for AI, music, and smart home
- **Web Client** (Next.js 15/React 19) - Web interface for system control  
- **Room Clients** (Python) - Raspberry Pi voice/audio clients deployed per room
- **Mopidy Server** (Python) - Music streaming server for Spotify/YouTube/SoundCloud
- **MCP DIRIGERA Server** (TypeScript) - Standalone MCP server for IKEA smart home control

## Essential Commands

### Multi-Component Development Environment
```bash
# Unified development environment for all Python components
./setup_dev_env.sh
source ./activate_dev_env.sh

# Start everything in production
npm start

# Development mode with auto-reload
npm run dev
```

### Backend Development
```bash
cd backend
npm install
npm run dev:watch      # Start with auto-reload
npm run build         # Compile TypeScript
npm run dirigera:setup # Setup IKEA smart home hub
ts-node tests/test-openai-tts.ts  # Test TTS functionality
```

### Web Client Development
```bash
cd web-client
npm install
npm run dev           # Start Next.js with TurboPack
npm run build         # Production build
npm run lint          # Run ESLint
```

### MCP DIRIGERA Server Development
```bash
cd mcp-dirigera
npm install
npm run build         # Build TypeScript
npm run dev           # Development with .env file loading
npm run test:cli      # Test CLI interface
npm run test:discover # Test hub discovery
npm run test:auth     # Test authentication
```

### Room Client/Mopidy Testing
```bash
# Test voice commands locally
cd room-client && python client.py --test-voice

# Test voice integration pipeline
cd tests && ./test-voice-integration.sh

# Deploy to multiple Raspberry Pis
cd room-client && ./deploy-to-pis.sh 192.168.1.101 192.168.1.102
```

## Architecture & Key Components

### Backend API Architecture (`/backend`)

Tool-calling AI system with smart home and audio integration:

- **AI Services** (`src/services/`)
  - OpenAI chat completions with function calling
  - Text-to-speech with ElevenLabs integration
  - Sonos speaker control with room targeting

- **Tools System** (`src/tools/`) 
  - Modular tool registration with base `Tool` interface
  - IKEA DIRIGERA light/device control via Tradfri integration
  - Music playback (Spotify/YouTube) via Mopidy service
  - TuneIn radio search and streaming
  - Sonos direct control for multi-room audio

- **Routes** (`src/routes/`)
  - Complete voice interaction pipeline (STT → AI → TTS)
  - Device control endpoints with room targeting
  - Music control with room-specific playback

### Distributed Audio System

Multi-room audio architecture using Snapcast:

- **Mopidy Server** serves audio streams on port 6680
- **Snapcast Server** distributes synchronized audio on port 1704  
- **Room Clients** (Raspberry Pi) connect as Snapcast clients per room
- **Voice Processing** on each client with wake word detection

### MCP DIRIGERA Server (`/mcp-dirigera`)

Standalone Model Context Protocol server for IKEA smart home:

- **Three-Command CLI**: `discover`, `authenticate <ip>`, `<ip> <token>`
- **Tool Registration Pattern**: Device tools, light tools, outlet tools, sensor tools
- **Lazy Connection Management**: Connects to DIRIGERA only when MCP requests are made
- **Resource System**: Device listing with filtering by room/type

### Web Client Architecture (`/web-client`)

React-based control interface with voice capabilities:

- **Device Management**: Real-time device control with Material-UI components
- **Voice Interface**: WebRTC recording with push-to-talk functionality  
- **Conversation System**: Chat interface with conversation history

## Key Integration Patterns

### Tool-Calling AI Architecture
The backend implements a sophisticated tool-calling system where:
- AI services automatically discover and register tools from `src/tools/`
- Tools define schemas for parameters and return structured responses
- Multiple tools can be executed in sequence for complex operations
- Room context is preserved across tool executions

### Multi-Room Audio Coordination
Audio playback is coordinated across rooms through:
- Mopidy provides unified music sources (Spotify, YouTube, radio)
- Snapcast handles synchronized distribution to room clients
- Room clients maintain persistent connections with auto-reconnect
- Voice commands are processed locally but executed centrally

### Smart Home Device Control
IKEA DIRIGERA integration provides:
- Device discovery and state management via Tradfri API
- Room-based device grouping and control
- Scene activation and management
- Real-time status monitoring

## Environment Configuration

### Backend Configuration (`backend/.env`)
```bash
OPENAI_API_KEY=required_for_ai_features
DIRIGERA_GATEWAY_IP=hub_ip_address  
DIRIGERA_ACCESS_TOKEN=authentication_token
ELEVENLABS_API_KEY=required_for_tts
PORT=3000
```

### MCP DIRIGERA Configuration (`mcp-dirigera/.env`)
```bash
DIRIGERA_IP=192.168.1.100
DIRIGERA_TOKEN=access_token_from_authentication
```

## Development Workflow

### Adding New AI Tools
1. Create tool class inheriting from base `Tool` interface in `backend/src/tools/`
2. Implement `name`, `description`, `parameters`, and `execute` method
3. Tools are automatically discovered and registered by the AI service

### MCP Server Development
1. Tools follow MCP SDK patterns with `registerTool()` and Zod schemas
2. Use lazy connection pattern - connect to DIRIGERA only when tools are called
3. Test locally with `npm link` before publishing to npm

### Testing Voice Pipeline
1. Use room-client test mode to verify audio processing without deployment
2. Test STT → AI → TTS pipeline with `./test-voice-integration.sh`
3. Deploy to test Raspberry Pis for integration testing

### Multi-Service Debugging
- Backend and web client run on different ports (3000, 3001)
- Room clients connect to central backend for voice processing
- Mopidy provides music services via separate Python process
- Use unified dev environment for Python component coordination