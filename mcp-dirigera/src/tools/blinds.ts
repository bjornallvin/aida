import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DirigeraClientWrapper } from '../dirigera-client.js';

export function registerBlindTools(server: McpServer, dirigeraClient: DirigeraClientWrapper) {
  // Control blinds
  server.registerTool(
    "control-blinds",
    {
      title: "Control Blinds",
      description: "Open, close, or set position of blinds",
      inputSchema: {
        deviceId: z.string().describe("Device ID of the blinds"),
        position: z.number().min(0).max(100).optional().describe("Position (0=closed, 100=open)"),
        action: z.enum(["open", "close", "stop"]).optional().describe("Quick action")
      }
    },
    async ({ deviceId, position, action }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        if (action) {
          // Handle quick actions
          if (action === "open") {
            position = 100;
          } else if (action === "close") {
            position = 0;
          } else if (action === "stop") {
            // For stop, we need to get current position and set it
            const device = await dirigeraClient.withRetry(() =>
              client.devices.get({ id: deviceId })
            );
            position = device.attributes.blindsCurrentLevel || 50;
          }
        }
        
        if (position !== undefined) {
          await dirigeraClient.withRetry(() =>
            client.devices.setAttributes({
              id: deviceId,
              attributes: { blindsTargetLevel: position }
            })
          );
        }
        
        return {
          content: [{
            type: "text",
            text: `Successfully ${action || 'set'} blinds ${deviceId}${position !== undefined ? ` to ${position}%` : ''}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to control blinds: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Control all blinds in a room
  server.registerTool(
    "control-room-blinds",
    {
      title: "Control Room Blinds",
      description: "Control all blinds in a specific room",
      inputSchema: {
        room: z.string().describe("Room name"),
        position: z.number().min(0).max(100).optional().describe("Position (0=closed, 100=open)"),
        action: z.enum(["open", "close"]).optional().describe("Quick action for all blinds")
      }
    },
    async ({ room, position, action }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        const blinds = devices.filter(device => 
          device.deviceType === 'blinds' && 
          device.room?.name?.toLowerCase() === room.toLowerCase()
        );
        
        if (blinds.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No blinds found in room: ${room}`
            }]
          };
        }
        
        // Determine position based on action
        if (action === "open") position = 100;
        if (action === "close") position = 0;
        
        if (position !== undefined) {
          await Promise.all(blinds.map(blind =>
            dirigeraClient.withRetry(() =>
              client.devices.setAttributes({
                id: blind.id,
                attributes: { blindsTargetLevel: position }
              })
            )
          ));
        }
        
        return {
          content: [{
            type: "text",
            text: `Successfully ${action || 'set'} ${blinds.length} blinds in ${room}${position !== undefined ? ` to ${position}%` : ''}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to control room blinds: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}