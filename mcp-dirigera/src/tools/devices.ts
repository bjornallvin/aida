import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DirigeraClientWrapper } from '../dirigera-client.js';

export function registerDeviceTools(server: McpServer, dirigeraClient: DirigeraClientWrapper) {
  // List all devices
  server.registerTool(
    "list-devices",
    {
      title: "List All Devices",
      description: "List all devices connected to the DIRIGERA hub with their status",
      inputSchema: {
        room: z.string().optional().describe("Filter by room name (optional)"),
        type: z.string().optional().describe("Filter by device type (light, outlet, sensor, etc.) (optional)")
      }
    },
    async ({ room, type }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        let devices = await dirigeraClient.withRetry(() => client.devices.list());
        
        // Apply filters
        if (room) {
          devices = devices.filter((device: any) => 
            device.room?.name?.toLowerCase().includes(room.toLowerCase())
          );
        }
        
        if (type) {
          devices = devices.filter((device: any) => 
            device.deviceType?.toLowerCase() === type.toLowerCase()
          );
        }
        
        if (devices.length === 0) {
          const filterDesc = room || type ? ` matching filters${room ? ` (room: ${room})` : ''}${type ? ` (type: ${type})` : ''}` : '';
          return {
            content: [{
              type: "text",
              text: `No devices found${filterDesc}.`
            }]
          };
        }
        
        // Group devices by type for better organization
        const devicesByType: { [key: string]: any[] } = {};
        devices.forEach((device: any) => {
          const deviceType = device.deviceType || 'unknown';
          if (!devicesByType[deviceType]) {
            devicesByType[deviceType] = [];
          }
          devicesByType[deviceType].push(device);
        });
        
        const sections = Object.entries(devicesByType).map(([deviceType, typeDevices]) => {
          const deviceList = typeDevices.map((device: any) => {
            const name = device.attributes.customName || `Unnamed ${deviceType}`;
            const room = device.room?.name || 'No room';
            let status = '';
            
            // Add device-specific status
            if (device.deviceType === 'light') {
              const isOn = device.attributes.isOn ? 'ON' : 'OFF';
              const brightness = device.attributes.lightLevel !== undefined ? ` (${device.attributes.lightLevel}%)` : '';
              status = `${isOn}${brightness}`;
            } else if (device.deviceType === 'outlet') {
              status = device.attributes.isOn ? 'ON' : 'OFF';
            } else if (device.deviceType === 'motionSensor') {
              status = device.attributes.isDetected ? 'Motion detected' : 'No motion';
            } else if (device.deviceType === 'environmentSensor') {
              const temp = device.attributes.currentTemperature !== undefined ? `${device.attributes.currentTemperature}°C` : '';
              const humidity = device.attributes.currentRH !== undefined ? `${device.attributes.currentRH}%` : '';
              status = [temp, humidity].filter(Boolean).join(', ') || 'Active';
            } else if (device.deviceType === 'blinds') {
              const level = device.attributes.blindsCurrentLevel !== undefined ? `${device.attributes.blindsCurrentLevel}%` : '';
              status = level ? `Position: ${level}` : 'Available';
            } else {
              status = 'Available';
            }
            
            return `  • ${name} (${room}): ${status} [ID: ${device.id}]`;
          }).join('\n');
          
          return `**${deviceType.toUpperCase()} (${typeDevices.length})**\n${deviceList}`;
        }).join('\n\n');
        
        const filterDesc = room || type ? `\nFilters: ${room ? `Room="${room}" ` : ''}${type ? `Type="${type}"` : ''}` : '';
        
        return {
          content: [{
            type: "text",
            text: `Found ${devices.length} device(s):${filterDesc}\n\n${sections}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to list devices: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // List device types
  server.registerTool(
    "list-device-types",
    {
      title: "List Device Types",
      description: "Show all available device types in the system",
      inputSchema: {}
    },
    async () => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        
        // Count devices by type
        const typeCounts: { [key: string]: number } = {};
        devices.forEach((device: any) => {
          const deviceType = device.deviceType || 'unknown';
          typeCounts[deviceType] = (typeCounts[deviceType] || 0) + 1;
        });
        
        const typeList = Object.entries(typeCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([type, count]) => `• ${type}: ${count} device(s)`)
          .join('\n');
        
        return {
          content: [{
            type: "text",
            text: `Device types in your system:\n\n${typeList}\n\nTotal devices: ${devices.length}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to list device types: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // List rooms
  server.registerTool(
    "list-rooms",
    {
      title: "List Rooms",
      description: "Show all rooms and the number of devices in each",
      inputSchema: {}
    },
    async () => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        
        // Count devices by room
        const roomCounts: { [key: string]: number } = {};
        devices.forEach((device: any) => {
          const room = device.room?.name || 'No room assigned';
          roomCounts[room] = (roomCounts[room] || 0) + 1;
        });
        
        const roomList = Object.entries(roomCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([room, count]) => `• ${room}: ${count} device(s)`)
          .join('\n');
        
        return {
          content: [{
            type: "text",
            text: `Rooms in your system:\n\n${roomList}\n\nTotal devices: ${devices.length}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to list rooms: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}