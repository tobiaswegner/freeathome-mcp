import { FreeAtHome } from '@busch-jaeger/free-at-home';

export class FreeAtHomeService {
  private freeAtHome: FreeAtHome;
  private isConnected = false;

  constructor() {
    const baseUrl = process.env.FREEHOME_BASE_URL || undefined;
    this.freeAtHome = new FreeAtHome(baseUrl);
    this.initializeConnection();
  }

  private initializeConnection(): void {
    this.freeAtHome.on('open', () => {
      console.log('Connected to free@home system');
      this.isConnected = true;
    });

    this.freeAtHome.on('close', (reason: string) => {
      console.error('free@home connection closed:', reason);
      this.isConnected = false;
    });
  }

  private ensureConnected(): void {
    if (!this.freeAtHome || !this.isConnected) {
      throw new Error('Not connected to free@home system. Please check connection settings.');
    }
  }

  private parseChannelId(channelId: string): number {
    // Handle 'ch' prefix if present
    if (channelId.startsWith('ch')) {
      return parseInt(channelId.substring(2));
    }
    return parseInt(channelId);
  }

  async getDevices(): Promise<any> {
    this.ensureConnected();
    
    try {
      const deviceIterator = await this.freeAtHome.getAllDevices();
      const devices = Array.from(deviceIterator);
      return devices.map(device => ({
        id: device.serialNumber,
        name: device.displayName
      }));
    } catch (error) {
      throw new Error(`Failed to get devices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDeviceInfo(deviceId: string): Promise<any> {
    this.ensureConnected();
    
    try {
      const device = await this.freeAtHome.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      return {
        id: device.deviceId,
        name: device.displayName
      };
    } catch (error) {
      throw new Error(`Failed to get device info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async setDeviceState(deviceId: string, channelId: string, datapoint: string, value: string): Promise<boolean> {
    this.ensureConnected();
    
    try {
      const channelNumber = this.parseChannelId(channelId);
      
      // Parse datapoint to determine type and extract numeric index
      let datapointIndex: number;
      let isInput: boolean;
      
      if (datapoint.startsWith('idp')) {
        // Input datapoint - remove 'idp' prefix and parse as hex
        datapointIndex = parseInt(datapoint.substring(3), 16);
        isInput = true;
      } else if (datapoint.startsWith('odp')) {
        // Output datapoint - remove 'odp' prefix and parse as hex
        datapointIndex = parseInt(datapoint.substring(3), 16);
        isInput = false;
      } else {
        // Fallback: assume it's a plain number and treat as input
        datapointIndex = parseInt(datapoint);
        isInput = true;
      }
      
      // Use appropriate method based on datapoint type
      if (isInput) {
        await this.freeAtHome.freeAtHomeApi.setInputDatapoint(deviceId, channelNumber, datapointIndex, value);
      } else {
        await this.freeAtHome.freeAtHomeApi.setOutputDatapoint(deviceId, channelNumber, datapointIndex, value);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to set device state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDatapoints(deviceId: string, channelId: string): Promise<any> {
    this.ensureConnected();
    
    try {
      const device = await this.freeAtHome.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      const channel = device.channels?.[channelId];
      if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found on device ${deviceId}`);
      }
      
      return {
        inputs: channel.inputs || {},
        outputs: channel.outputs || {},
      };
    } catch (error) {
      throw new Error(`Failed to get datapoints: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.freeAtHome && this.isConnected) {
      try {
        this.freeAtHome.freeAtHomeApi.disconnect();
        this.isConnected = false;
        console.log('Disconnected from free@home system');
      } catch (error) {
        console.error('Error disconnecting from free@home:', error);
      }
    }
  }
}