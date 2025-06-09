/**
 * Main TRADFRI controller class
 */
import {
  createDirigeraClient,
  DirigeraClient,
  Device,
} from "dirigera";
import { logger } from "../../utils";
import { TradfriConfig, TradfriDevice } from "./types";
import {
  getDeviceBrightness,
  getDeviceOnState,
  getDeviceTargetLevel,
  getDeviceCurrentLevel,
  getDeviceColorHue,
  getDeviceColorSaturation,
  getDeviceColorTemperature,
} from "./deviceStateHelpers";
import { DeviceResolver } from "./deviceResolver";
import { LightController } from "./lightController";
import { DeviceControllers } from "./deviceControllers";

export class TradfriController {
  private client: DirigeraClient | null = null;
  private devices: Map<string, Device> = new Map();
  private config: TradfriConfig;
  private deviceResolver: DeviceResolver;
  private lightController: LightController | null = null;
  private deviceControllers: DeviceControllers | null = null;

  constructor(config: TradfriConfig = {}) {
    this.config = {
      gatewayIp:
        config.gatewayIp || process.env.DIRIGERA_GATEWAY_IP || undefined,
      accessToken:
        config.accessToken || process.env.DIRIGERA_ACCESS_TOKEN || undefined,
    };
    
    this.deviceResolver = new DeviceResolver(this.devices);
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

      // Initialize controllers with the client
      this.lightController = new LightController(this.client, this.deviceResolver);
      this.deviceControllers = new DeviceControllers(this.client, this.deviceResolver);

      // Load all devices
      await this.loadDevices();
      console.log("Connected to DIRIGERA hub successfully");
      return true;
    } catch (error) {
      console.error("Failed to connect to DIRIGERA hub:", error);
      this.client = null;
      this.lightController = null;
      this.deviceControllers = null;
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
    this.lightController = null;
    this.deviceControllers = null;
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
      brightness: getDeviceBrightness(device),
      isOn: getDeviceOnState(device),
      targetLevel: getDeviceTargetLevel(device),
      currentLevel: getDeviceCurrentLevel(device),
      colorHue: getDeviceColorHue(device),
      colorSaturation: getDeviceColorSaturation(device),
      colorTemperature: getDeviceColorTemperature(device),
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

  // Enhanced device listing with search/filter capabilities
  async searchDevices(
    query?: string,
    deviceType?: string
  ): Promise<TradfriDevice[]> {
    let devices = await this.getDevices();

    // Filter by type if specified
    if (deviceType) {
      devices = devices.filter((d) => d.type === deviceType);
    }

    // If no query, return all (filtered) devices
    if (!query) {
      return devices;
    }

    // Use fuzzy matching to find relevant devices
    const { findDeviceMatches } = await import("../deviceMatching");
    const allDevices = Array.from(this.devices.values());
    const matches = findDeviceMatches(
      query,
      allDevices,
      deviceType,
      {
        minSimilarity: 0.2, // Very low threshold for search
        enablePhonetic: true,
        enablePartialMatch: true,
        strictMode: false,
      },
      10
    );

    // Convert matches back to TradfriDevice format
    const matchedDevices = matches.map((match) => {
      const device = match.device;
      return {
        id: device.id,
        name:
          device.attributes.customName ||
          device.attributes.model ||
          "Unknown Device",
        type: device.type,
        isReachable: device.isReachable,
        brightness: getDeviceBrightness(device),
        isOn: getDeviceOnState(device),
        targetLevel: getDeviceTargetLevel(device),
        currentLevel: getDeviceCurrentLevel(device),
        colorHue: getDeviceColorHue(device),
        colorSaturation: getDeviceColorSaturation(device),
        colorTemperature: getDeviceColorTemperature(device),
      };
    });

    return matchedDevices;
  }

  async getDeviceById(deviceIdOrName: string): Promise<TradfriDevice | null> {
    const device = await this.deviceResolver.resolveDevice(deviceIdOrName);
    if (!device) return null;

    return {
      id: device.id,
      name:
        device.attributes.customName ||
        device.attributes.model ||
        "Unknown Device",
      type: device.type,
      isReachable: device.isReachable,
      brightness: getDeviceBrightness(device),
      isOn: getDeviceOnState(device),
      targetLevel: getDeviceTargetLevel(device),
      currentLevel: getDeviceCurrentLevel(device),
      colorHue: getDeviceColorHue(device),
      colorSaturation: getDeviceColorSaturation(device),
      colorTemperature: getDeviceColorTemperature(device),
    };
  }

  async updateDeviceName(deviceId: string, newName: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        throw new Error(`Device with ID "${deviceId}" not found`);
      }

      // Use the generic devices.setCustomName method
      await this.client.devices.setCustomName({
        id: deviceId,
        customName: newName,
      });

      // Reload devices to get updated names
      await this.loadDevices();

      logger.info("Device name updated successfully", {
        deviceId,
        newName,
        deviceType: device.type,
      });

      return true;
    } catch (error) {
      logger.error("Failed to update device name", {
        deviceId,
        newName,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // Delegate methods to specialized controllers
  async controlLight(
    deviceIdOrName: string,
    isOn: boolean,
    brightness?: number,
    colorHue?: number,
    colorSaturation?: number,
    colorTemperature?: number
  ): Promise<boolean> {
    if (!this.lightController) {
      throw new Error("Not connected to DIRIGERA hub");
    }
    return this.lightController.controlLight(
      deviceIdOrName,
      isOn,
      brightness,
      colorHue,
      colorSaturation,
      colorTemperature
    );
  }

  async controlMultipleLights(
    devices: Device[],
    isOn: boolean,
    brightness?: number,
    excludeDevices?: string[],
    colorHue?: number,
    colorSaturation?: number,
    colorTemperature?: number
  ): Promise<boolean> {
    if (!this.lightController) {
      throw new Error("Not connected to DIRIGERA hub");
    }
    return this.lightController.controlMultipleLights(
      devices,
      isOn,
      brightness,
      excludeDevices,
      colorHue,
      colorSaturation,
      colorTemperature
    );
  }

  async findDevicesByRoom(
    roomName: string,
    deviceType?: string
  ): Promise<Device[]> {
    return this.deviceResolver.findDevicesByRoom(roomName, deviceType);
  }

  async findSimilarDevices(
    inputName: string,
    deviceType?: string,
    maxResults: number = 3
  ): Promise<
    Array<{ name: string; id: string; type: string; confidence: number }>
  > {
    return this.deviceResolver.findSimilarDevices(
      inputName,
      deviceType,
      maxResults
    );
  }

  async resolveDeviceName(deviceId: string, inputName: string) {
    return this.deviceResolver.resolveDeviceName(deviceId, inputName);
  }

  async controlBlind(
    deviceIdOrName: string,
    targetLevel: number
  ): Promise<boolean> {
    if (!this.deviceControllers) {
      throw new Error("Not connected to DIRIGERA hub");
    }
    return this.deviceControllers.controlBlind(deviceIdOrName, targetLevel);
  }

  async controlOutlet(deviceIdOrName: string, isOn: boolean): Promise<boolean> {
    if (!this.deviceControllers) {
      throw new Error("Not connected to DIRIGERA hub");
    }
    return this.deviceControllers.controlOutlet(deviceIdOrName, isOn);
  }

  async setScene(sceneId: string): Promise<boolean> {
    if (!this.deviceControllers) {
      throw new Error("Not connected to DIRIGERA hub");
    }
    return this.deviceControllers.setScene(sceneId);
  }

  async getScenes(): Promise<
    Array<{ id: string; name: string; type: string }>
  > {
    if (!this.deviceControllers) {
      throw new Error("Not connected to DIRIGERA hub");
    }
    return this.deviceControllers.getScenes();
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getDeviceCount(): number {
    return this.devices.size;
  }
}
