import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DirigeraClientWrapper } from '../dirigera-client.js';

export function registerOutletTools(server: McpServer, dirigeraClient: DirigeraClientWrapper) {
  // Control outlet
  server.registerTool(
    "control-outlet",
    {
      title: "Control Outlet",
      description: "Turn outlets on or off",
      inputSchema: {
        deviceId: z.string().describe("Device ID of the outlet"),
        on: z.boolean().describe("Turn outlet on (true) or off (false)")
      }
    },
    async ({ deviceId, on }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        await dirigeraClient.withRetry(() =>
          client.devices.setAttributes({
            id: deviceId,
            attributes: { isOn: on }
          })
        );
        
        return {
          content: [{
            type: "text",
            text: `Successfully turned outlet ${deviceId} ${on ? 'on' : 'off'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to control outlet: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Set outlet startup behavior
  server.registerTool(
    "set-outlet-startup",
    {
      title: "Set Outlet Startup Behavior",
      description: "Configure outlet behavior when power is restored",
      inputSchema: {
        deviceId: z.string().describe("Device ID of the outlet"),
        behavior: z.enum(["on", "off", "previous"]).describe("Startup behavior: on, off, or previous state")
      }
    },
    async ({ deviceId, behavior }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const startupOnOff = behavior === "on" ? "startOn" : 
                            behavior === "off" ? "startToggle" : 
                            "startPrevious";
        
        await dirigeraClient.withRetry(() =>
          client.devices.setAttributes({
            id: deviceId,
            attributes: { startupOnOff }
          })
        );
        
        return {
          content: [{
            type: "text",
            text: `Successfully set outlet ${deviceId} startup behavior to ${behavior}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to set outlet startup behavior: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Control all outlets in a room
  server.registerTool(
    "control-room-outlets",
    {
      title: "Control Room Outlets",
      description: "Control all outlets in a specific room",
      inputSchema: {
        room: z.string().describe("Room name"),
        on: z.boolean().describe("Turn outlets on (true) or off (false)")
      }
    },
    async ({ room, on }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        const outlets = devices.filter(device => 
          device.deviceType === 'outlet' && 
          device.room?.name?.toLowerCase() === room.toLowerCase()
        );
        
        if (outlets.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No outlets found in room: ${room}`
            }]
          };
        }
        
        await Promise.all(outlets.map(outlet =>
          dirigeraClient.withRetry(() =>
            client.devices.setAttributes({
              id: outlet.id,
              attributes: { isOn: on }
            })
          )
        ));
        
        return {
          content: [{
            type: "text",
            text: `Successfully turned ${outlets.length} outlets in ${room} ${on ? 'on' : 'off'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to control room outlets: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}