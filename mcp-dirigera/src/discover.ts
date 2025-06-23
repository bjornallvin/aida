import { createSocket } from 'dgram';
import { networkInterfaces } from 'os';

interface DiscoveredHub {
  ip: string;
  hostname?: string;
}

function getLocalNetworks(): string[] {
  const nets = networkInterfaces();
  const networks: string[] = [];
  
  for (const name of Object.keys(nets)) {
    const netInfo = nets[name];
    if (!netInfo) continue;
    
    for (const net of netInfo) {
      // Skip over non-IPv4 and internal addresses
      if (net.family === 'IPv4' && !net.internal) {
        // Convert to network address (assuming /24 subnet)
        const parts = net.address.split('.');
        const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
        networks.push(networkBase);
      }
    }
  }
  
  return [...new Set(networks)]; // Remove duplicates
}

async function pingHost(ip: string, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createSocket('udp4');
    const timeoutId = setTimeout(() => {
      socket.close();
      resolve(false);
    }, timeout);
    
    socket.on('error', () => {
      clearTimeout(timeoutId);
      socket.close();
      resolve(false);
    });
    
    socket.on('message', () => {
      clearTimeout(timeoutId);
      socket.close();
      resolve(true);
    });
    
    // Try to send a UDP packet to port 8443 (DIRIGERA's HTTPS port)
    socket.send(Buffer.alloc(0), 8443, ip, (err) => {
      if (err) {
        clearTimeout(timeoutId);
        socket.close();
        resolve(false);
      }
    });
  });
}

async function checkDirigeraHub(ip: string): Promise<boolean> {
  try {
    // Try to connect to the DIRIGERA HTTPS port
    const response = await fetch(`https://${ip}:8443`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
      // @ts-ignore - Node.js specific option
      rejectUnauthorized: false
    });
    
    // DIRIGERA hubs typically return a specific response
    return response.status === 404 || response.status === 403 || response.status === 401;
  } catch (error: any) {
    // Look for SSL/certificate errors which are common with DIRIGERA
    if (error.code === 'CERT_HAS_EXPIRED' || 
        error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        error.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        error.message?.includes('certificate')) {
      return true; // This is likely a DIRIGERA hub
    }
    return false;
  }
}

async function discoverDirigeraHubs(): Promise<DiscoveredHub[]> {
  console.log('🔍 Scanning local network for DIRIGERA hubs...');
  console.log('This may take up to 30 seconds...');
  console.log('');
  
  const networks = getLocalNetworks();
  console.log(`📡 Scanning networks: ${networks.map(n => n + '.0/24').join(', ')}`);
  console.log('');
  
  const hubs: DiscoveredHub[] = [];
  const promises: Promise<void>[] = [];
  
  for (const network of networks) {
    for (let i = 1; i <= 254; i++) {
      const ip = `${network}.${i}`;
      
      promises.push(
        (async () => {
          // First do a quick ping to see if host is alive
          const isAlive = await pingHost(ip, 1000);
          if (!isAlive) return;
          
          // Then check if it's a DIRIGERA hub
          const isDirigera = await checkDirigeraHub(ip);
          if (isDirigera) {
            console.log(`✅ Found potential DIRIGERA hub at: ${ip}`);
            hubs.push({ ip });
          }
        })()
      );
    }
  }
  
  // Process in batches to avoid overwhelming the network
  const batchSize = 50;
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize);
    await Promise.all(batch);
    
    // Show progress
    const progress = Math.min(100, Math.round(((i + batchSize) / promises.length) * 100));
    process.stdout.write(`\r🔄 Progress: ${progress}%`);
  }
  
  console.log('\n');
  return hubs;
}

async function discover() {
  console.log('🏠 DIRIGERA Hub Discovery');
  console.log('========================');
  console.log('');
  
  try {
    const hubs = await discoverDirigeraHubs();
    
    if (hubs.length === 0) {
      console.log('❌ No DIRIGERA hubs found on the local network.');
      console.log('');
      console.log('Possible reasons:');
      console.log('• Hub is on a different network segment');
      console.log('• Hub is powered off or disconnected');
      console.log('• Firewall is blocking the scan');
      console.log('');
      console.log('💡 Try checking your router\'s device list or use the IKEA Home app.');
      process.exit(1);
    }
    
    console.log(`🎉 Found ${hubs.length} potential DIRIGERA hub(s):`);
    console.log('');
    
    hubs.forEach((hub, index) => {
      console.log(`${index + 1}. ${hub.ip}`);
    });
    
    console.log('');
    console.log('🔑 To authenticate with a hub, use:');
    hubs.forEach((hub, index) => {
      console.log(`${index + 1}. npx -y mcp-dirigera authenticate ${hub.ip}`);
    });
    
    if (hubs.length === 1) {
      console.log('');
      console.log('💡 Since only one hub was found, you can run:');
      console.log(`npx -y mcp-dirigera authenticate ${hubs[0].ip}`);
    }
    
  } catch (error) {
    console.error('❌ Discovery failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

discover().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});