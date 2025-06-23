import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DirigeraClientWrapper } from '../dirigera-client.js';

export function registerDeviceResources(server: McpServer, dirigeraClient: DirigeraClientWrapper) {
  // List all devices
  server.registerResource(
    "devices-list",
    "devices://list",
    {
      title: "All Devices",
      description: "List all devices connected to DIRIGERA hub",
      mimeType: "application/json"
    },
    async (uri: any) => {
      const client = await dirigeraClient.getClient();
      const devices = await dirigeraClient.withRetry(() => client.devices.list());
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(devices, null, 2)
        }]
      };
    }
  );

  // Get specific device
  server.registerResource(
    "device-details",
    new ResourceTemplate("devices://{deviceId}", { list: undefined }),
    {
      title: "Device Details",
      description: "Get details for a specific device",
      mimeType: "application/json"
    },
    (async (uri: any, { deviceId }: { deviceId: any }) => {
      const client = await dirigeraClient.getClient();
      const device = await dirigeraClient.withRetry(() => 
        client.devices.get({ id: deviceId })
      );
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(device, null, 2)
        }]
      };
    }) as any
  );

  // List devices by room
  server.registerResource(
    "devices-by-room",
    new ResourceTemplate("devices://by-room/{room}", { list: undefined }),
    {
      title: "Devices by Room",
      description: "List devices in a specific room",
      mimeType: "application/json"
    },
    (async (uri: any, { room }: { room: any }) => {
      const client = await dirigeraClient.getClient();
      const devices = await dirigeraClient.withRetry(() => client.devices.list());
      const filteredDevices = devices.filter((device: any) => 
        device.room?.name?.toLowerCase() === room.toLowerCase()
      );
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(filteredDevices, null, 2)
        }]
      };
    }) as any
  );

  // List devices by type
  server.registerResource(
    "devices-by-type",
    new ResourceTemplate("devices://by-type/{type}", { list: undefined }),
    {
      title: "Devices by Type",
      description: "List devices of a specific type (light, outlet, sensor, etc.)",
      mimeType: "application/json"
    },
    (async (uri: any, { type }: { type: any }) => {
      const client = await dirigeraClient.getClient();
      const devices = await dirigeraClient.withRetry(() => client.devices.list());
      const filteredDevices = devices.filter((device: any) => 
        device.deviceType?.toLowerCase() === type.toLowerCase()
      );
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(filteredDevices, null, 2)
        }]
      };
    }) as any
  );

  // Hub information
  server.registerResource(
    "hub-info",
    "hub://info",
    {
      title: "Hub Information",
      description: "Get DIRIGERA hub information",
      mimeType: "application/json"
    },
    async (uri: any) => {
      const client = await dirigeraClient.getClient();
      const hubInfo = await dirigeraClient.withRetry(() => client.hub.status());
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(hubInfo, null, 2)
        }]
      };
    }
  );
}