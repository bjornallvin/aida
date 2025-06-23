import { createDirigeraClient } from 'dirigera';
import * as readline from 'readline';

async function authenticate() {
  const ip = process.argv[2];
  
  if (!ip) {
    console.error('Usage: node authenticate.js <ip-address>');
    process.exit(1);
  }

  console.log(`🏠 Authenticating with DIRIGERA hub at ${ip}`);
  console.log('');
  console.log('Follow these steps:');
  console.log('1. Press the action button on your DIRIGERA hub');
  console.log('2. You have 90 seconds after pressing the button');
  console.log('3. Press Enter here when ready...');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Wait for user to press Enter
  await new Promise((resolve) => {
    rl.question('Press Enter when you have pressed the hub button: ', () => {
      rl.close();
      resolve(void 0);
    });
  });

  console.log('🔄 Attempting to authenticate...');

  try {
    const client = await createDirigeraClient({
      gatewayIP: ip,
      rejectUnauthorized: false
    });

    const token = await client.authenticate({ verbose: true });
    
    console.log('');
    console.log('✅ Authentication successful!');
    console.log('');
    console.log('🔑 Your access token:');
    console.log(token);
    console.log('');
    console.log('💡 To use this with your MCP client, run:');
    console.log(`npx -y mcp-dirigera ${ip} ${token}`);
    console.log('');
    console.log('📋 For Claude Desktop, add this to your config:');
    console.log('```json');
    console.log('{');
    console.log('  "mcpServers": {');
    console.log('    "dirigera": {');
    console.log('      "command": "npx",');
    console.log(`      "args": ["-y", "mcp-dirigera", "${ip}", "${token}"]`);
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```');
    console.log('');
    console.log('⚠️  Keep this token secure! It provides full access to your smart home.');
    
  } catch (error) {
    console.error('');
    console.error('❌ Authentication failed!');
    console.error('');
    console.error('Possible causes:');
    console.error('• The action button was not pressed');
    console.error('• More than 90 seconds passed since pressing the button');
    console.error('• The hub IP address is incorrect');
    console.error('• Network connectivity issues');
    console.error('');
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    console.error('💡 Try again with:');
    console.error(`npx -y mcp-dirigera authenticate ${ip}`);
    process.exit(1);
  }
}

authenticate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});