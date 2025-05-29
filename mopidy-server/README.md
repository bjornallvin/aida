# 🎵 Mopidy Server for Aida Apartment AI

A Python-based Mopidy server with Spotify integration, multi-room audio support, and comprehensive configuration management.

## 🚀 Quick Start

### 1. Setup Virtual Environment (Recommended)

The easiest way to get started is using our setup script:

```bash
# Make sure you're in the mopidy-server directory
cd /path/to/aida/mopidy-server

# Run the setup script (creates venv and installs dependencies)
./setup-venv.sh
```

**Manual Setup:**

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

### 3. Get Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy Client ID and Client Secret to your `.env` file
4. Add your Spotify username and password

### 4. Run the Server

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate

# Start server (foreground with logs)
python -m mopidy_server

# Or use the legacy script
python __main__.py
```

## 📖 Usage

### Command Line Options

```bash
# Start in foreground (default)
python -m mopidy_server

# Start as background daemon
python -m mopidy_server --daemon

# Check server status
python -m mopidy_server --status

# Stop running server
python -m mopidy_server --stop

# Use custom configuration
python -m mopidy_server --config /path/to/custom.conf

# Enable verbose logging
python -m mopidy_server --verbose

# Show help
python -m mopidy_server --help
```

### Server Endpoints

Once running, the server provides:

- **HTTP API**: `http://localhost:6680`
  - Web interface: `http://localhost:6680/`
  - JSON-RPC API: `http://localhost:6680/mopidy/rpc`
  
- **MPD Protocol**: `localhost:6600`
  - Compatible with MPD clients

## 🏗️ Project Structure

```
mopidy-server/
├── __main__.py              # Main entry point
├── setup.py                 # Package setup
├── setup-venv.sh           # Virtual environment setup script
├── requirements.txt         # Python dependencies
├── mopidy.conf             # Mopidy configuration
├── .env.example            # Environment variables template
├── server.py               # Legacy launcher (deprecated)
└── src/                    # Source package
    ├── __init__.py         # Package initialization
    ├── server.py           # Server management
    ├── config.py           # Configuration handling
    └── exceptions.py       # Custom exceptions
```
- Spotify integration
- Local file support
- Stream support for radio

## Extensions Included

- **mopidy-spotify**: Spotify Premium integration
- **mopidy-youtube**: YouTube music support
- **mopidy-soundcloud**: SoundCloud integration
- **mopidy-internetarchive**: Internet Archive music

## API Endpoints

Once running, Mopidy provides:
- **HTTP API**: `http://localhost:6680/mopidy/rpc`
- **Web Interface**: `http://localhost:6680/`
- **MPD Protocol**: `localhost:6600`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Spotify Configuration
SPOTIFY_USERNAME=your_spotify_username
SPOTIFY_PASSWORD=your_spotify_password
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Optional: Server Configuration
MOPIDY_HTTP_PORT=6680
MOPIDY_MPD_PORT=6600
MOPIDY_HTTP_HOSTNAME=0.0.0.0
```

### Mopidy Configuration

The `mopidy.conf` file supports environment variable substitution:

```ini
[core]
cache_dir = /tmp/mopidy/cache
config_dir = /tmp/mopidy/config
data_dir = /tmp/mopidy/data

[http]
hostname = ${MOPIDY_HTTP_HOSTNAME}
port = ${MOPIDY_HTTP_PORT}
enabled = true

[spotify]
enabled = true
username = ${SPOTIFY_USERNAME}
password = ${SPOTIFY_PASSWORD}
client_id = ${SPOTIFY_CLIENT_ID}
client_secret = ${SPOTIFY_CLIENT_SECRET}
```

## 🛠️ Development

### Package Installation (Development Mode)

```bash
# Activate virtual environment
source venv/bin/activate

# Install in development mode
pip install -e .

# Now you can use the console command
mopidy-server --help
```

### Code Formatting and Linting

```bash
# Format code
black src/

# Lint code
flake8 src/

# Run tests
pytest
```

### Project Architecture

- **`src/server.py`**: Main server management class with process lifecycle
- **`src/config.py`**: Configuration parsing and environment variable handling  
- **`src/exceptions.py`**: Custom exception classes
- **`__main__.py`**: Command-line interface and entry point

## 🐛 Troubleshooting

### Common Issues

**1. Virtual Environment Issues**
```bash
# Remove and recreate virtual environment
rm -rf venv
./setup-venv.sh
```

**2. Mopidy Not Found**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Verify mopidy installation
mopidy --version
```

**3. Spotify Authentication**
```bash
# Check environment variables
cat .env

# Test Spotify credentials in browser
# https://developer.spotify.com/console/
```

**4. Port Already in Use**
```bash
# Check what's using the ports
lsof -i :6680  # HTTP interface
lsof -i :6600  # MPD interface

# Kill existing processes if needed
python -m mopidy_server --stop
```

### Logs and Debugging

```bash
# Enable verbose logging
python -m mopidy_server --verbose

# Check Mopidy logs (if using system installation)
tail -f ~/.local/share/mopidy/mopidy.log
```

## 🔗 Integration

This server integrates with the Aida Apartment AI system:

- **Backend**: Node.js backend communicates via HTTP API
- **Snapcast**: Multi-room audio distribution
- **Voice Control**: AI-powered music commands

### API Usage Example

```python
import requests

# Get current track
response = requests.post('http://localhost:6680/mopidy/rpc', json={
    'method': 'core.playback.get_current_track',
    'jsonrpc': '2.0',
    'id': 1
})

print(response.json())
```

## 📝 License

MIT License - see the main project LICENSE file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

For more information, see the main Aida project documentation.
