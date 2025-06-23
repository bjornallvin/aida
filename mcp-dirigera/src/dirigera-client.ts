import { createDirigeraClient } from 'dirigera';
import type { DirigeraClient } from 'dirigera';

export class DirigeraClientWrapper {
  private client: DirigeraClient | null = null;
  private ip: string;
  private token: string;

  constructor(ip: string, token: string) {
    this.ip = ip;
    this.token = token;
  }

  async connect(): Promise<void> {
    try {
      console.error(`Connecting to DIRIGERA hub at ${this.ip}...`);
      
      this.client = await createDirigeraClient({
        gatewayIP: this.ip,
        accessToken: this.token,
        rejectUnauthorized: false
      });
      
      console.error('Client created, testing connection...');
      
      // Test connection by fetching hub info
      const hubStatus = await this.client.hub.status();
      console.error('Connection successful! Hub status:', hubStatus.id);
      
    } catch (error) {
      console.error('Connection failed with error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('EHOSTUNREACH')) {
          throw new Error(`Cannot reach DIRIGERA hub at ${this.ip}:8443. Please check:\n- Hub is powered on\n- IP address is correct\n- Hub is on the same network`);
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error(`Access token is invalid or expired. Please re-authenticate with:\nnpx -y mcp-dirigera authenticate ${this.ip}`);
        } else if (error.message.includes('timeout')) {
          throw new Error(`Connection timeout to DIRIGERA hub. Please check network connectivity.`);
        }
      }
      
      throw new Error(`Failed to connect to DIRIGERA hub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getClient(): Promise<DirigeraClient> {
    if (!this.client) {
      await this.connect();
    }
    return this.client!;
  }

  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }
}