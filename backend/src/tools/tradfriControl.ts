import {
  createDirigeraClient,
  DirigeraClient,
  Device,
  Light,
  Blinds,
  Outlet,
  AirPurifier,
} from "dirigera";
import { ToolDefinition } from "./types";
import { logger } from "../utils";

interface TradfriConfig {
  gatewayIp?: string | undefined;
  accessToken?: string | undefined;
}

export interface TradfriDevice {
  id: string;
  name: string;
  type: string;
  isReachable: boolean;
  brightness?: number | undefined;
  isOn?: boolean | undefined;
  targetLevel?: number | undefined;
  currentLevel?: number | undefined;
}

export class TradfriController {
  private client: DirigeraClient | null = null;
  private devices: Map<string, Device> = new Map();
  private config: TradfriConfig;

  constructor(config: TradfriConfig = {}) {
    this.config = {
      gatewayIp:
        config.gatewayIp || process.env.DIRIGERA_GATEWAY_IP || undefined,
      accessToken:
        config.accessToken || process.env.DIRIGERA_ACCESS_TOKEN || undefined,
    };
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config.gatewayIp || !this.config.accessToken) {
        throw new Error("Gateway IP and access token are required");
      }

      this.client = await createDirigeraClient({
        gatewayIP: this.config.gatewayIp,
        accessToken: this.config.accessToken,
      });

      // Load all devices
      await this.loadDevices();
      console.log("Connected to DIRIGERA hub successfully");
      return true;
    } catch (error) {
      console.error("Failed to connect to DIRIGERA hub:", error);
      this.client = null;
      return false;
    }
  }

  private async loadDevices(): Promise<void> {
    if (!this.client) return;

    try {
      // Load all device types
      const [lights, blinds, outlets, airPurifiers] = await Promise.all([
        this.client.lights.list(),
        this.client.blinds.list(),
        this.client.outlets.list(),
        this.client.airPurifiers.list(),
      ]);

      this.devices.clear();

      // Add all devices to the map
      [...lights, ...blinds, ...outlets, ...airPurifiers].forEach((device) => {
        this.devices.set(device.id, device);
      });

      console.log(`Loaded ${this.devices.size} devices from DIRIGERA hub`);
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.devices.clear();
  }

  async getDevices(): Promise<TradfriDevice[]> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    // Refresh devices
    await this.loadDevices();

    const devices = Array.from(this.devices.values()).map((device) => ({
      id: device.id,
      name:
        device.attributes.customName ||
        device.attributes.model ||
        "Unknown Device",
      type: device.type,
      isReachable: device.isReachable,
      brightness: this.getDeviceBrightness(device),
      isOn: this.getDeviceOnState(device),
      targetLevel: this.getDeviceTargetLevel(device),
      currentLevel: this.getDeviceCurrentLevel(device),
    }));

    logger.info("Retrieved devices from DIRIGERA hub", {
      count: devices.length,
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
      })),
    });
    return devices;
  }

  private getDeviceBrightness(device: Device): number | undefined {
    if (device.type === "light") {
      const light = device as Light;
      return light.attributes.lightLevel;
    }
    return undefined;
  }

  private getDeviceOnState(device: Device): boolean | undefined {
    if (device.type === "light") {
      const light = device as Light;
      return light.attributes.isOn;
    }
    if (device.type === "outlet") {
      const outlet = device as Outlet;
      return outlet.attributes.isOn;
    }
    return undefined;
  }

  private getDeviceTargetLevel(device: Device): number | undefined {
    if (device.type === "blinds") {
      const blind = device as Blinds;
      return blind.attributes.blindsTargetLevel;
    }
    return undefined;
  }

  private getDeviceCurrentLevel(device: Device): number | undefined {
    if (device.type === "blinds") {
      const blind = device as Blinds;
      return blind.attributes.blindsCurrentLevel;
    }
    return undefined;
  }

  async controlLight(
    deviceId: string,
    isOn: boolean,
    brightness?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = this.devices.get(deviceId);
      if (!device || device.type !== "light") {
        throw new Error(`Light device with ID ${deviceId} not found`);
      }

      // Set light state
      await this.client.lights.setIsOn({ id: deviceId, isOn });

      // Set brightness if provided and light is on
      if (isOn && brightness !== undefined) {
        // Ensure brightness is within valid range (1-100)
        const validBrightness = Math.max(1, Math.min(100, brightness));
        await this.client.lights.setLightLevel({
          id: deviceId,
          lightLevel: validBrightness,
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to control light:", error);
      return false;
    }
  }

  async controlBlind(deviceId: string, targetLevel: number): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = this.devices.get(deviceId);
      if (!device || device.type !== "blinds") {
        throw new Error(`Blind device with ID ${deviceId} not found`);
      }

      // Ensure target level is within valid range (0-100)
      const validLevel = Math.max(0, Math.min(100, targetLevel));
      await this.client.blinds.setTargetLevel({
        id: deviceId,
        blindsTargetLevel: validLevel,
      });

      return true;
    } catch (error) {
      console.error("Failed to control blind:", error);
      return false;
    }
  }

  async controlOutlet(deviceId: string, isOn: boolean): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = this.devices.get(deviceId);
      if (!device || device.type !== "outlet") {
        throw new Error(`Outlet device with ID ${deviceId} not found`);
      }

      await this.client.outlets.setIsOn({ id: deviceId, isOn });
      return true;
    } catch (error) {
      console.error("Failed to control outlet:", error);
      return false;
    }
  }

  async setScene(sceneId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      await this.client.scenes.trigger({ id: sceneId });
      return true;
    } catch (error) {
      console.error("Failed to set scene:", error);
      return false;
    }
  }

  async getScenes(): Promise<
    Array<{ id: string; name: string; type: string }>
  > {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const scenes = await this.client.scenes.list();
      return scenes.map((scene) => ({
        id: scene.id,
        name: scene.info.name,
        type: scene.type,
      }));
    } catch (error) {
      console.error("Failed to get scenes:", error);
      return [];
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getDeviceCount(): number {
    return this.devices.size;
  }

  async getDeviceById(deviceId: string): Promise<TradfriDevice | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    return {
      id: device.id,
      name:
        device.attributes.customName ||
        device.attributes.model ||
        "Unknown Device",
      type: device.type,
      isReachable: device.isReachable,
      brightness: this.getDeviceBrightness(device),
      isOn: this.getDeviceOnState(device),
      targetLevel: this.getDeviceTargetLevel(device),
      currentLevel: this.getDeviceCurrentLevel(device),
    };
  }
}

// Export a default instance
export const tradfriController = new TradfriController();

// Control function for tool executor
export async function controlTradfri(params: any): Promise<any> {
  const { action, deviceId, ...options } = params;

  try {
    // Ensure connection before any operation
    if (!tradfriController.isConnected()) {
      console.log("DIRIGERA not connected, attempting to connect...");
      const connected = await tradfriController.connect();
      if (!connected) {
        return {
          success: false,
          message:
            "Failed to connect to DIRIGERA hub. Please check configuration and ensure hub is accessible.",
        };
      }
      console.log("DIRIGERA connected successfully");
    }

    switch (action) {
      case "list_devices":
        console.log("Listing all devices");
        return await tradfriController.getDevices();

      case "control_light":
        const { isOn, brightness } = options;
        const success = await tradfriController.controlLight(
          deviceId,
          isOn,
          brightness
        );
        return {
          success,
          message: success
            ? "Light controlled successfully"
            : "Failed to control light",
        };

      case "control_blind":
        const { targetLevel } = options;
        const blindSuccess = await tradfriController.controlBlind(
          deviceId,
          targetLevel
        );
        return {
          success: blindSuccess,
          message: blindSuccess
            ? "Blind controlled successfully"
            : "Failed to control blind",
        };

      case "control_outlet":
        const { isOn: outletOn } = options;
        const outletSuccess = await tradfriController.controlOutlet(
          deviceId,
          outletOn
        );
        return {
          success: outletSuccess,
          message: outletSuccess
            ? "Outlet controlled successfully"
            : "Failed to control outlet",
        };

      case "set_scene":
        const sceneSuccess = await tradfriController.setScene(deviceId);
        return {
          success: sceneSuccess,
          message: sceneSuccess
            ? "Scene activated successfully"
            : "Failed to activate scene",
        };

      case "list_scenes":
        return await tradfriController.getScenes();

      case "get_device":
        return await tradfriController.getDeviceById(deviceId);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Tool definition
export const TRADFRI_CONTROL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "tradfri_control",
    description:
      "Control IKEA DIRIGERA smart home devices including lights, blinds, outlets, and scenes",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "list_devices",
            "control_light",
            "control_blind",
            "control_outlet",
            "set_scene",
            "list_scenes",
            "get_device",
          ],
          description: "The action to perform",
        },
        deviceId: {
          type: "string",
          description:
            "The ID of the device to control (required for device-specific actions)",
        },
        isOn: {
          type: "boolean",
          description:
            "Whether to turn the device on or off (for lights and outlets)",
        },
        brightness: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Brightness level for lights (1-100)",
        },
        targetLevel: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description:
            "Target level for blinds (0-100, where 0 is closed and 100 is open)",
        },
      },
      required: ["action"],
    },
  },
};
