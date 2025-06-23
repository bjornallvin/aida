#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

// Check if this is a discovery request
if (args.length === 1 && args[0] === 'discover') {
  // Run the discovery process
  const discoverPath = join(__dirname, '..', 'dist', 'discover.js');
  const child = spawn('node', [discoverPath], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('error', (err) => {
    console.error('Failed to start discovery:', err);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
  
} else if (args.length === 2 && args[0] === 'authenticate') {
  const ip = args[1];
  
  // Validate IP address format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    console.error('Error: Invalid IP address format');
    process.exit(1);
  }
  
  // Run the authentication process
  const authPath = join(__dirname, '..', 'dist', 'authenticate.js');
  const child = spawn('node', [authPath, ip], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('error', (err) => {
    console.error('Failed to start authentication:', err);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
  
} else if (args.length === 2) {
  // Server mode with IP and token
  const [ip, token] = args;
  
  // Validate IP address format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    console.error('Error: Invalid IP address format');
    process.exit(1);
  }
  
  // Set environment variables
  process.env.DIRIGERA_IP = ip;
  process.env.DIRIGERA_TOKEN = token;
  
  // Run the MCP server
  const serverPath = join(__dirname, '..', 'dist', 'index.js');
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('error', (err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
  
} else {
  // Show usage
  console.error('Usage:');
  console.error('  mcp-dirigera discover                    # Find DIRIGERA hubs on network');
  console.error('  mcp-dirigera authenticate <ip-address>  # Get access token');
  console.error('  mcp-dirigera <ip-address> <access-token>  # Run MCP server');
  console.error('');
  console.error('Examples:');
  console.error('  mcp-dirigera discover');
  console.error('  mcp-dirigera authenticate 192.168.1.100');
  console.error('  mcp-dirigera 192.168.1.100 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}