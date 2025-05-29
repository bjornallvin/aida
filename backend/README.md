# Backend Server for Aida Apartment AI

Express.js backend server that provides API endpoints for music control and text-to-speech functionality.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

3. **Required API Keys**:
   - **ElevenLabs**: For text-to-speech generation
   - **OpenAI**: For future chat functionality
   - **Mopidy URL**: Should point to your Mopidy server (default: http://localhost:6680)

## Usage

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## API Endpoints

### Music Control

**POST /play** - Control music playback
```json
// Spotify
{
  "room": "living_room",
  "type": "spotify",
  "query": "Bohemian Rhapsody Queen"
}

// Radio Stream
{
  "room": "kitchen", 
  "type": "radio",
  "url": "http://stream.example.com/radio"
}
```

**POST /tts** - Text-to-speech
```json
{
  "room": "bedroom",
  "text": "Good morning! The weather is sunny today."
}
```

**GET /health** - Health check
```json
{
  "status": "ok",
  "timestamp": "2025-05-28T10:00:00.000Z"
}
```

### Future Endpoints (Planned)
- `POST /pause` - Pause/resume playback
- `POST /volume` - Volume control  
- `POST /chat` - AI chat functionality

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
MOPIDY_URL=http://localhost:6680
PORT=3000
TTS_OUTPUT_DIR=./audio
```

## Audio Setup

- TTS files are saved to the configured audio directory
- Audio playback uses `mpg123` command
- Files are automatically cleaned up after playback
- Compatible with Snapcast for multi-room audio

## Dependencies

- **express**: Web framework
- **axios**: HTTP client for API calls  
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **uuid**: Unique ID generation for TTS files
