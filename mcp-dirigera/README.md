# MCP DIRIGERA Server

An MCP (Model Context Protocol) server for controlling IKEA DIRIGERA smart home hub. This server allows you to control your IKEA smart home devices through natural language interfaces.

## Quick Start

```bash
# 1. Find your DIRIGERA hub on the network
npx -y mcp-dirigera discover

# 2. Authenticate with your hub  
npx -y mcp-dirigera authenticate 192.168.1.100

# 3. Use the returned token to run the server  
npx -y mcp-dirigera 192.168.1.100 <your-token>
```

That's it! No installation required.

## Features

- **Device Control**: Control lights, outlets, blinds, and read sensor data
- **Room-based Control**: Control all devices in a specific room
- **Scene Management**: Activate predefined light scenes
- **Device Discovery**: List and filter devices by type, room, or ID
- **Sensor Monitoring**: Read motion, temperature, humidity, and light sensors

## Prerequisites

- Node.js 18 or higher
- IKEA DIRIGERA hub on your local network
- Access token for the DIRIGERA hub

## Getting Your Access Token

You'll need to authenticate with your DIRIGERA hub to get an access token:

### Option 1: Automatic Discovery (Recommended)
```bash
# Automatically find your hub
npx -y mcp-dirigera discover

# Then authenticate with the found IP
npx -y mcp-dirigera authenticate <discovered-ip>
```

### Option 2: Manual IP Entry  
1. Find your DIRIGERA hub IP address (check your router or use a network scanner)

2. Run the authentication command:
   ```bash
   npx -y mcp-dirigera authenticate <your-hub-ip>
   ```

3. Press the action button on your DIRIGERA hub when prompted

4. Copy the returned access token from the output

## Installation & Usage

### Authentication
First, get your access token:
```bash
npx -y mcp-dirigera authenticate <ip-address>
```

### Running the Server
Then run the MCP server:
```bash
npx -y mcp-dirigera <ip-address> <access-token>
```

### Complete Example
```bash
# Step 1: Find your hub
npx -y mcp-dirigera discover

# Step 2: Authenticate (follow prompts to press hub button)
npx -y mcp-dirigera authenticate 192.168.1.100

# Step 3: Use the returned token to run the server
npx -y mcp-dirigera 192.168.1.100 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Configuration for Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dirigera": {
      "command": "npx",
      "args": ["-y", "mcp-dirigera", "YOUR_HUB_IP", "YOUR_ACCESS_TOKEN"]
    }
  }
}
```

Replace `YOUR_HUB_IP` with your DIRIGERA hub's IP address and `YOUR_ACCESS_TOKEN` with your access token.

## Available Tools

### Device Management
- **list-devices**: List all devices with optional room/type filters
- **list-lights**: List all lights with current status
- **list-device-types**: Show all available device types
- **list-rooms**: Show all rooms and device counts

### Light Control
- **control-light**: Turn lights on/off, adjust brightness, change color/temperature
- **control-room-lights**: Control all lights in a specific room
- **set-light-scene**: Activate predefined light scenes
- **list-scenes**: List all available scenes

### Outlet Control
- **control-outlet**: Turn outlets on/off
- **set-outlet-startup**: Configure outlet power-on behavior
- **control-room-outlets**: Control all outlets in a room

### Blind Control
- **control-blinds**: Open/close blinds or set specific position
- **control-room-blinds**: Control all blinds in a room

### Sensor Tools
- **get-sensor-data**: Read sensor values (motion, temperature, humidity, light)
- **get-room-environment**: Get environmental summary for a room

## Available Resources

- **devices://list**: List all devices
- **devices://{deviceId}**: Get specific device details
- **devices://by-room/{room}**: List devices in a room
- **devices://by-type/{type}**: List devices by type
- **hub://info**: Get hub information

## Example Interactions

Once configured, you can ask Claude:

**Device Discovery:**
- "What devices do you see in my smart home?"
- "List all my lights"
- "Show me all devices in the bedroom"
- "What types of devices do I have?"
- "Which rooms have smart devices?"

**Device Control:**
- "Turn on all lights in the living room"
- "Set the bedroom lights to 50% brightness"
- "Close all blinds"
- "Turn off all outlets in the office"
- "Activate the 'Movie Time' scene"

**Status & Monitoring:**
- "What's the temperature in the kitchen?"
- "Show me all motion sensors"
- "Show me the hub information"

## Troubleshooting

### Authentication Issues
1. **"Authentication failed"**: 
   - Make sure you press the action button on your DIRIGERA hub
   - You have exactly 90 seconds after pressing the button
   - Verify the IP address is correct
   - Ensure your computer can reach the hub on the network

2. **"Invalid IP address format"**: 
   - IP should be in format: 192.168.1.100
   - Check your router for the hub's IP address

### Server Issues  
1. **Connection Failed**: Ensure your hub IP and access token are correct
2. **Device Not Found**: Device IDs are case-sensitive
3. **Network Issues**: Ensure your computer can reach the DIRIGERA hub on your network

### Finding Your Hub IP
- Check your router's admin interface
- Use a network scanner app
- Look in the IKEA Home smart app settings

## Development

To build from source:

```bash
git clone <repository>
cd mcp-dirigera
npm install
npm run build
```

## License

MIT