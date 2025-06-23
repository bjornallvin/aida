import { config } from 'dotenv';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DirigeraClientWrapper } from './dirigera-client.js';
import { registerDeviceResources } from './resources/devices.js';
import { registerLightTools } from './tools/lights.js';
import { registerOutletTools } from './tools/outlets.js';
import { registerBlindTools } from './tools/blinds.js';
import { registerSensorTools } from './tools/sensors.js';
import { registerDeviceTools } from './tools/devices.js';

// Load environment variables from .env file
config();

async function main() {
  const ip = process.env.DIRIGERA_IP;
  const token = process.env.DIRIGERA_TOKEN;

  if (!ip || !token) {
    console.error('Error: DIRIGERA_IP and DIRIGERA_TOKEN environment variables must be set');
    process.exit(1);
  }

  // Initialize DIRIGERA client (but don't connect yet)
  const dirigeraClient = new DirigeraClientWrapper(ip, token);
  
  console.error('DIRIGERA MCP server initialized');

  // Create MCP server
  const server = new McpServer({
    name: "mcp-dirigera",
    version: "1.0.0"
  });

  // Register resources
  registerDeviceResources(server, dirigeraClient);

  // Register tools
  registerDeviceTools(server, dirigeraClient);
  registerLightTools(server, dirigeraClient);
  registerOutletTools(server, dirigeraClient);
  registerBlindTools(server, dirigeraClient);
  registerSensorTools(server, dirigeraClient);

  // Create transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});