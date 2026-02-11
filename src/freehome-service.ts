import { SystemAccessPoint, ClientConfiguration } from "freeathome-api";
import { BroadcastMessage } from "freeathome-api/dist/lib/BroadcastMessage";
import { Subscriber } from "freeathome-api/dist/lib/Subscriber";

export class FreeAtHomeService implements Subscriber {
  private systemAccessPoint: SystemAccessPoint;
  private isConnected = false;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((err: Error) => void) | null = null;

  constructor() {
    const hostname = process.env.FREEATHOME_HOSTNAME;
    const username = process.env.FREEATHOME_USERNAME || "admin";
    const password = process.env.FREEATHOME_PASSWORD || "";

    if (!hostname) {
      throw new Error("FREEATHOME_HOSTNAME environment variable is required");
    }

    const config = new ClientConfiguration(hostname, username, password);
    this.systemAccessPoint = new SystemAccessPoint(config, this, null);
  }

  async connect(): Promise<void> {
    const ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    try {
      await this.systemAccessPoint.connect();
    } catch (error) {
      this.readyResolve = null;
      this.readyReject = null;
      throw new Error(
        `Failed to connect to free@home system: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Wait for master data + subscription confirmation via broadcastMessage
    await ready;
    this.isConnected = true;
    console.log("Connected to free@home system");
  }

  broadcastMessage(message: BroadcastMessage): void {
    switch (message.type) {
      case "update":
        break;
      case "error":
        console.error("free@home error:", message.result);
        if (this.readyReject) {
          this.readyReject(
            message.result instanceof Error
              ? message.result
              : new Error(String(message.result)),
          );
          this.readyResolve = null;
          this.readyReject = null;
        }
        break;
      case "subscribed":
        if (message.result) {
          console.log("Subscribed to free@home updates");
          if (this.readyResolve) {
            this.readyResolve();
            this.readyResolve = null;
            this.readyReject = null;
          }
        } else {
          console.warn("free@home subscription lost (SysAP may be offline)");
          this.isConnected = false;
        }
        break;
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error(
        "Not connected to free@home system. Please check connection settings.",
      );
    }
  }

  async getDevices(): Promise<any> {
    this.ensureConnected();

    try {
      const data = this.systemAccessPoint.getDeviceData();
      return Object.entries(data).map(([serialNo, device]: [string, any]) => {
        const activeChannels: any = {};

        if (device.channels) {
          for (const [chId, channel] of Object.entries<any>(device.channels)) {
            activeChannels[chId] = {
              displayName: channel.displayName || null,
              functionId: channel.functionId || null,
              floor: channel.floor || null,
              room: channel.room || null,
            };
          }
        }

        return {
          id: serialNo,
          name: device.typeName || serialNo,
          activeChannels,
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to get devices: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getDeviceInfo(deviceId: string): Promise<any> {
    this.ensureConnected();

    try {
      const data = this.systemAccessPoint.getDeviceData();
      const device = data[deviceId];
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      const activeChannels: any = {};
      if (device.channels) {
        for (const [chId, channel] of Object.entries<any>(device.channels)) {
          activeChannels[chId] = {
            displayName: channel.displayName || null,
            functionId: channel.functionId || null,
            floor: channel.floor || null,
            room: channel.room || null,
          };
        }
      }

      return {
        id: deviceId,
        name: device.typeName || deviceId,
        activeChannels,
      };
    } catch (error) {
      throw new Error(
        `Failed to get device info: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async setDeviceState(
    deviceId: string,
    channelId: string,
    datapoint: string,
    value: string,
  ): Promise<boolean> {
    this.ensureConnected();

    try {
      await this.systemAccessPoint.setDatapoint(
        deviceId,
        channelId,
        datapoint,
        value,
      );
      return true;
    } catch (error) {
      throw new Error(
        `Failed to set device state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getDatapoints(deviceId: string, channelId: string): Promise<any> {
    this.ensureConnected();

    try {
      const data = this.systemAccessPoint.getDeviceData();
      const device = data[deviceId];
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      const channel = device.channels?.[channelId];
      if (!channel) {
        throw new Error(
          `Channel with ID ${channelId} not found on device ${deviceId}`,
        );
      }

      // Split datapoints into inputs (idp*) and outputs (odp*)
      const inputs: Record<string, string> = {};
      const outputs: Record<string, string> = {};

      if (channel.datapoints) {
        for (const [dpId, dpValue] of Object.entries<any>(channel.datapoints)) {
          if (dpId.startsWith("idp")) {
            inputs[dpId] = dpValue;
          } else if (dpId.startsWith("odp")) {
            outputs[dpId] = dpValue;
          }
        }
      }

      return { inputs, outputs };
    } catch (error) {
      throw new Error(
        `Failed to get datapoints: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.systemAccessPoint.disconnect();
        this.isConnected = false;
        console.log("Disconnected from free@home system");
      } catch (error) {
        console.error("Error disconnecting from free@home:", error);
      }
    }
  }
}
