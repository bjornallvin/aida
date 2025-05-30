# IKEA DIRIGERA Integration Setup

This guide will help you set up the IKEA DIRIGERA smart home integration for your Aida apartment AI system.

## Prerequisites

- IKEA DIRIGERA Hub connected to your network
- Physical access to the DIRIGERA Hub (to press the ACTION button)
- Node.js and npm installed

## Quick Setup

### Automatic Setup (Recommended)

Run the automated setup script:

```bash
cd /Users/bjorn.allvin/Code/aida/backend
npm run dirigera:setup
```

This script will:
1. Discover your DIRIGERA hub on the network (or prompt for IP)
2. Guide you through authentication using the ACTION button
3. Generate and save an access token
4. Test the connection
5. Automatically update your `.env` file
6. Display available devices

**Important**: You'll need to press the ACTION button on your DIRIGERA hub when prompted!

### Manual Setup

If the automatic setup doesn't work, follow these steps:

1. **Find your hub IP address**
   - Check your router's admin panel for connected devices
   - Look for a device named like "DIRIGERA-Hub" or similar
   - Note the IP address (e.g., `192.168.1.100`)

2. **Generate access token manually**
   
   You can use the dirigera library directly:
   ```bash
   cd /Users/bjorn.allvin/Code/aida/backend
   npx ts-node -e "
   import { createDirigeraClient } from 'dirigera';
   
   (async () => {
     console.log('Press the ACTION button on your hub NOW!');
     const client = await createDirigeraClient({ gatewayIP: 'YOUR_HUB_IP' });
     const token = await client.authenticate();
     console.log('Access token:', token);
   })();"
   ```

3. **Set environment variables**
   
   Edit `/Users/bjorn.allvin/Code/aida/backend/.env`:
   ```bash
   DIRIGERA_GATEWAY_IP=192.168.1.100
   DIRIGERA_ACCESS_TOKEN=your_access_token_here
   ```

## Authentication Process

The DIRIGERA hub uses a different authentication method than the old Tradfri gateway:

1. **ACTION Button**: Instead of a security code, you press the ACTION button on the bottom of the hub
2. **Access Token**: The hub generates a permanent access token (no expiration)
3. **90-second window**: You have 90 seconds after pressing the button to complete authentication

### Finding the ACTION Button

The ACTION button is located on the bottom of your DIRIGERA hub:
- It's a small, round button
- Press and release it once (don't hold it down)
- The hub's LED will indicate pairing mode
- You have 90 seconds to run the authentication

## Supported Devices

The DIRIGERA integration supports:

- **Lights**: On/off, brightness (1-100%), color, color temperature
- **Blinds**: Open/close, position control (0-100%), stop
- **Outlets**: On/off control
- **Motion Sensors**: Status reading
- **Controllers**: Status reading

## API Changes from Tradfri

If you're migrating from the old Tradfri integration:

- **Brightness Scale**: Changed from 0-254 to 1-100
- **Device IDs**: Now use string IDs instead of numeric instance IDs  
- **Color Control**: Uses hue/saturation instead of hex colors
- **No Groups**: DIRIGERA doesn't support groups in the same way
- **Device Names**: Uses `customName` attribute instead of `name`

## Environment Variables

```bash
# DIRIGERA Configuration
DIRIGERA_GATEWAY_IP=192.168.1.100
DIRIGERA_ACCESS_TOKEN=your_access_token

# Legacy Tradfri (automatically commented out)
# TRADFRI_GATEWAY_IP=192.168.1.100
# TRADFRI_GATEWAY_KEY=your_psk
# TRADFRI_IDENTITY=aida-backend
```

## Usage Examples

Once configured, you can control devices through the Aida AI:

```
"Turn on the living room lights"
"Set bedroom lights to 50% brightness"  
"Change kitchen lights to warm white"
"Close the bedroom blinds"
"Open the living room blinds to 75%"
"Turn off all outlets"
```

## Troubleshooting

### Common Issues

1. **"No hub found"**
   - Ensure the hub is powered on and connected to your network
   - Try entering the IP address manually
   - Check that you're on the same network as the hub

2. **"Authentication failed"**
   - Make sure you pressed the ACTION button before running the script
   - The 90-second timeout may have expired - try again
   - Check that the hub IP address is correct

3. **"Device not found"**
   - Run `npm run dirigera:setup` to see available devices
   - Use the exact device name shown in the setup
   - Device names are case-insensitive and underscores are converted to spaces

4. **"Connection timeout"**
   - Check network connectivity between your computer and the hub
   - Verify the hub IP address
   - Ensure no firewall is blocking the connection

### Network Discovery Issues

If automatic discovery fails:
1. Find your hub IP manually in your router's admin panel
2. Use the manual setup option
3. Ensure mDNS/Bonjour is working on your network

### Token Management

- Access tokens don't expire but can be revoked from the hub
- If you need to regenerate a token, run the setup script again
- Keep your access token secure - it provides full access to your hub

## Migration from Tradfri

If you're upgrading from the old Tradfri integration:

1. **Run the new setup**: `npm run dirigera:setup`
2. **Old credentials**: Automatically commented out in `.env`
3. **Update scripts**: The old `tradfri:setup` command will show a migration message
4. **Device names**: May need to update any hardcoded device references

The migration script will preserve your old Tradfri settings as comments in case you need to roll back.

## API Reference

For development purposes, the DIRIGERA client provides these main methods:

```typescript
// Lights
await client.lights.list()
await client.lights.setIsOn({ id, isOn: true })
await client.lights.setLightLevel({ id, lightLevel: 50 })
await client.lights.setLightColor({ id, colorHue: 120, colorSaturation: 100 })

// Blinds  
await client.blinds.list()
await client.blinds.setTargetLevel({ id, blindsTargetLevel: 75 })

// Outlets
await client.outlets.list()
await client.outlets.setIsOn({ id, isOn: true })

// General
await client.devices.list()
await client.home()
```

## Support

For issues specific to the DIRIGERA integration:
1. Check the [dirigera npm package documentation](https://www.npmjs.com/package/dirigera)
2. Verify your hub firmware is up to date
3. Check the Aida backend logs for detailed error messages

The DIRIGERA hub must be running firmware version 2.390.47 or later for full compatibility.
