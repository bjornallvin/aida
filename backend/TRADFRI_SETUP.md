# IKEA Tradfri Integration Setup

This guide will help you set up the IKEA Tradfri smart home integration for your Aida apartment AI system.

## Prerequisites

- IKEA Tradfri Gateway connected to your network
- The security code from the bottom of your gateway
- Node.js and npm installed

## Quick Setup

### Option 1: Automatic Setup (Recommended)

Run the automated setup script:

```bash
cd /Users/bjorn.allvin/Code/aida/backend
npm run tradfri:setup
```

This script will:
1. Discover your Tradfri gateway on the network
2. Guide you through authentication
3. Test the connection
4. Automatically update your `.env` file

### Option 2: Manual Setup

1. **Find your gateway IP address**
   - Check your router's admin panel for connected devices
   - Look for a device named like "TRADFRI-Gateway-xxxxx"
   - Note the IP address (e.g., `192.168.1.100`)

2. **Get the security code**
   - Look at the bottom of your Tradfri gateway
   - Find the 16-character security code (format: XXXX-XXXX-XXXX-XXXX)

3. **Set environment variables**
   
   Edit `/Users/bjorn.allvin/Code/aida/backend/.env`:
   ```bash
   TRADFRI_GATEWAY_IP=192.168.1.100
   TRADFRI_GATEWAY_KEY=your_psk_here
   TRADFRI_IDENTITY=aida-backend
   ```

4. **Authenticate with the gateway**
   
   You'll need to run a one-time authentication to get the PSK (pre-shared key):
   ```bash
   npm run tradfri:setup
   ```

## Supported Devices

The Tradfri integration supports:

- **Lights**: Turn on/off, brightness control, color changes, color temperature
- **Blinds**: Open/close, position control, stop movement
- **Smart Outlets**: Turn on/off, power control
- **Groups**: Control multiple devices at once

## Usage Examples

Once configured, you can use voice commands like:

- "Turn on the living room lights"
- "Set bedroom lights to 50% brightness"
- "Change kitchen lights to warm white"
- "Open the blinds"
- "Turn off all lights"

## Troubleshooting

### Gateway Not Found
- Ensure your gateway is powered on and connected
- Check that you're on the same network
- Try using the IP address instead of auto-discovery

### Authentication Failed
- Double-check the security code from your gateway
- Make sure the gateway isn't in pairing mode
- Wait a few minutes and try again

### Connection Issues
- Verify the IP address is correct
- Check firewall settings
- Ensure the gateway firmware is up to date

### Environment Variables Not Loading
- Restart the backend server after updating `.env`
- Check that there are no spaces around the `=` sign
- Verify the file is saved properly

## Security Notes

- Store your PSK credentials securely
- Don't store the gateway security code permanently
- The PSK allows full control of your smart home devices
- Consider using a dedicated network for IoT devices

## Technical Details

The integration uses the `node-tradfri-client` library to communicate with your gateway via CoAP protocol. The system automatically:

- Discovers and connects to devices
- Maintains persistent connections
- Handles reconnection on network issues
- Updates device states in real-time
