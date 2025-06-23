import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DirigeraClientWrapper } from '../dirigera-client.js';

export function registerLightTools(server: McpServer, dirigeraClient: DirigeraClientWrapper) {
  // Control light
  server.registerTool(
    "control-light",
    {
      title: "Control Light",
      description: "Turn lights on/off, adjust brightness, and change color",
      inputSchema: {
        deviceId: z.string().describe("Device ID of the light"),
        on: z.boolean().optional().describe("Turn light on (true) or off (false)"),
        brightness: z.number().min(0).max(100).optional().describe("Brightness level (0-100)"),
        colorTemperature: z.number().min(2200).max(6500).optional().describe("Color temperature in Kelvin"),
        color: z.object({
          hue: z.number().min(0).max(360).describe("Hue (0-360)"),
          saturation: z.number().min(0).max(1).describe("Saturation (0-1)")
        }).optional().describe("Color settings for RGB lights")
      }
    },
    async ({ deviceId, on, brightness, colorTemperature, color }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const updates: any = {};
        
        if (on !== undefined) {
          updates.isOn = on;
        }
        
        if (brightness !== undefined) {
          updates.lightLevel = brightness;
        }
        
        if (colorTemperature !== undefined) {
          updates.colorTemperature = colorTemperature;
        }
        
        if (color) {
          updates.colorHue = color.hue;
          updates.colorSaturation = color.saturation;
        }
        
        await dirigeraClient.withRetry(() =>
          client.devices.setAttributes({
            id: deviceId,
            attributes: updates
          })
        );
        
        return {
          content: [{
            type: "text",
            text: `Successfully updated light ${deviceId}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to control light: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Control all lights in a room
  server.registerTool(
    "control-room-lights",
    {
      title: "Control Room Lights",
      description: "Control all lights in a specific room",
      inputSchema: {
        room: z.string().describe("Room name"),
        on: z.boolean().optional().describe("Turn lights on (true) or off (false)"),
        brightness: z.number().min(0).max(100).optional().describe("Brightness level (0-100)")
      }
    },
    async ({ room, on, brightness }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        const lights = devices.filter(device => 
          device.deviceType === 'light' && 
          device.room?.name?.toLowerCase() === room.toLowerCase()
        );
        
        if (lights.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No lights found in room: ${room}`
            }]
          };
        }
        
        const updates: any = {};
        if (on !== undefined) updates.isOn = on;
        if (brightness !== undefined) updates.lightLevel = brightness;
        
        await Promise.all(lights.map(light =>
          dirigeraClient.withRetry(() =>
            client.devices.setAttributes({
              id: light.id,
              attributes: updates
            })
          )
        ));
        
        return {
          content: [{
            type: "text",
            text: `Successfully updated ${lights.length} lights in ${room}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to control room lights: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Set light scene
  server.registerTool(
    "set-light-scene",
    {
      title: "Set Light Scene",
      description: "Apply a predefined light scene",
      inputSchema: {
        sceneId: z.string().describe("Scene ID to activate")
      }
    },
    async ({ sceneId }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        await dirigeraClient.withRetry(() =>
          client.scenes.trigger({ id: sceneId })
        );
        
        return {
          content: [{
            type: "text",
            text: `Successfully activated scene ${sceneId}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to set scene: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // List available scenes
  server.registerTool(
    "list-scenes",
    {
      title: "List Scenes",
      description: "List all available light scenes",
      inputSchema: {}
    },
    async () => {
      const client = await dirigeraClient.getClient();
      
      try {
        const scenes = await dirigeraClient.withRetry(() => client.scenes.list());
        
        const sceneList = scenes.map(scene => 
          `- ${scene.info.name} (ID: ${scene.id})`
        ).join('\n');
        
        return {
          content: [{
            type: "text",
            text: `Available scenes:\n${sceneList}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to list scenes: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // List all lights
  server.registerTool(
    "list-lights",
    {
      title: "List All Lights",
      description: "List all lights in the home with their current status",
      inputSchema: {}
    },
    async () => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        const lights = devices.filter((device: any) => device.deviceType === 'light');
        
        if (lights.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No lights found in the system."
            }]
          };
        }
        
        const lightList = lights.map((light: any) => {
          const name = light.attributes.customName || 'Unnamed Light';
          const room = light.room?.name || 'No room';
          const isOn = light.attributes.isOn ? 'ON' : 'OFF';
          const brightness = light.attributes.lightLevel !== undefined ? ` (${light.attributes.lightLevel}%)` : '';
          const colorTemp = light.attributes.colorTemperature ? ` - ${light.attributes.colorTemperature}K` : '';
          
          return `• ${name} (${room}): ${isOn}${brightness}${colorTemp} [ID: ${light.id}]`;
        }).join('\n');
        
        return {
          content: [{
            type: "text",
            text: `Found ${lights.length} lights:\n\n${lightList}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to list lights: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}