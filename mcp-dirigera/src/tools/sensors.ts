import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DirigeraClientWrapper } from '../dirigera-client.js';

export function registerSensorTools(server: McpServer, dirigeraClient: DirigeraClientWrapper) {
  // Get sensor data
  server.registerTool(
    "get-sensor-data",
    {
      title: "Get Sensor Data",
      description: "Read current values from sensors (motion, temperature, humidity, etc.)",
      inputSchema: {
        deviceId: z.string().optional().describe("Specific sensor device ID (optional)"),
        room: z.string().optional().describe("Get all sensors in a room (optional)"),
        type: z.enum(["motion", "temperature", "humidity", "light", "all"]).optional().describe("Filter by sensor type")
      }
    },
    async ({ deviceId, room, type }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        let sensors = devices.filter((device: any) => 
          device.deviceType === 'motionSensor' ||
          device.deviceType === 'environmentSensor' ||
          device.deviceType === 'lightSensor' ||
          device.deviceType === 'waterSensor' ||
          device.deviceType === 'openCloseSensor'
        );
        
        // Filter by specific device ID if provided
        if (deviceId) {
          sensors = sensors.filter(s => s.id === deviceId);
        }
        
        // Filter by room if provided
        if (room) {
          sensors = sensors.filter(s => 
            s.room?.name?.toLowerCase() === room.toLowerCase()
          );
        }
        
        // Filter by type if provided
        if (type && type !== "all") {
          sensors = sensors.filter(s => {
            const attrs = s.attributes;
            switch (type) {
              case "motion":
                return attrs.isDetected !== undefined;
              case "temperature":
                return attrs.currentTemperature !== undefined;
              case "humidity":
                return attrs.currentRH !== undefined;
              case "light":
                return attrs.illuminance !== undefined;
              default:
                return true;
            }
          });
        }
        
        if (sensors.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No matching sensors found"
            }]
          };
        }
        
        const sensorData = sensors.map(sensor => {
          const attrs = sensor.attributes;
          const data: string[] = [`${sensor.attributes.customName || 'Sensor'} (${sensor.room?.name || 'No room'}):`];
          
          if (attrs.isDetected !== undefined) {
            data.push(`  Motion: ${attrs.isDetected ? 'Detected' : 'No motion'}`);
          }
          if (attrs.currentTemperature !== undefined) {
            data.push(`  Temperature: ${attrs.currentTemperature}°C`);
          }
          if (attrs.currentRH !== undefined) {
            data.push(`  Humidity: ${attrs.currentRH}%`);
          }
          if (attrs.illuminance !== undefined) {
            data.push(`  Light level: ${attrs.illuminance} lux`);
          }
          if (attrs.batteryPercentage !== undefined) {
            data.push(`  Battery: ${attrs.batteryPercentage}%`);
          }
          
          return data.join('\n');
        }).join('\n\n');
        
        return {
          content: [{
            type: "text",
            text: sensorData
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to get sensor data: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get room environment summary
  server.registerTool(
    "get-room-environment",
    {
      title: "Get Room Environment",
      description: "Get a summary of all environmental conditions in a room",
      inputSchema: {
        room: z.string().describe("Room name")
      }
    },
    async ({ room }) => {
      const client = await dirigeraClient.getClient();
      
      try {
        const devices = await dirigeraClient.withRetry(() => client.devices.list());
        const roomSensors = devices.filter((device: any) => 
          (device.deviceType === 'motionSensor' ||
           device.deviceType === 'environmentSensor' ||
           device.deviceType === 'lightSensor' ||
           device.deviceType === 'waterSensor' ||
           device.deviceType === 'openCloseSensor') &&
          device.room?.name?.toLowerCase() === room.toLowerCase()
        );
        
        if (roomSensors.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No sensors found in room: ${room}`
            }]
          };
        }
        
        const summary: string[] = [`Environmental conditions in ${room}:`];
        let hasMotion = false;
        let temperatures: number[] = [];
        let humidities: number[] = [];
        let lightLevels: number[] = [];
        
        roomSensors.forEach(sensor => {
          const attrs = sensor.attributes;
          if (attrs.isDetected === true) hasMotion = true;
          if (attrs.currentTemperature !== undefined) temperatures.push(attrs.currentTemperature);
          if (attrs.currentRH !== undefined) humidities.push(attrs.currentRH);
          if (attrs.illuminance !== undefined) lightLevels.push(attrs.illuminance);
        });
        
        if (temperatures.length > 0) {
          const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
          summary.push(`- Temperature: ${avgTemp.toFixed(1)}°C`);
        }
        
        if (humidities.length > 0) {
          const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;
          summary.push(`- Humidity: ${avgHumidity.toFixed(0)}%`);
        }
        
        if (lightLevels.length > 0) {
          const avgLight = lightLevels.reduce((a, b) => a + b, 0) / lightLevels.length;
          summary.push(`- Light level: ${avgLight.toFixed(0)} lux`);
        }
        
        summary.push(`- Motion: ${hasMotion ? 'Detected' : 'No motion'}`);
        summary.push(`- Total sensors: ${roomSensors.length}`);
        
        return {
          content: [{
            type: "text",
            text: summary.join('\n')
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to get room environment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}