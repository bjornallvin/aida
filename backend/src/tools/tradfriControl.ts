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
import {
  findBestDeviceMatch,
  findDeviceMatches,
  DeviceMatchResult,
  FuzzyMatchOptions,
} from "./deviceMatching";

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
  colorHue?: number | undefined;
  colorSaturation?: number | undefined;
  colorTemperature?: number | undefined;
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
      colorHue: this.getDeviceColorHue(device),
      colorSaturation: this.getDeviceColorSaturation(device),
      colorTemperature: this.getDeviceColorTemperature(device),
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

  private getDeviceColorHue(device: Device): number | undefined {
    if (device.type === "light") {
      const light = device as Light;
      return light.attributes.colorHue;
    }
    return undefined;
  }

  private getDeviceColorSaturation(device: Device): number | undefined {
    if (device.type === "light") {
      const light = device as Light;
      return light.attributes.colorSaturation;
    }
    return undefined;
  }

  private getDeviceColorTemperature(device: Device): number | undefined {
    if (device.type === "light") {
      const light = device as Light;
      return light.attributes.colorTemperature;
    }
    return undefined;
  }

  async controlLight(
    deviceIdOrName: string,
    isOn: boolean,
    brightness?: number,
    colorHue?: number,
    colorSaturation?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      // Check for special cases like "all lights" or room-based commands
      if (
        deviceIdOrName.toLowerCase().includes("all lights") ||
        deviceIdOrName.toLowerCase() === "all"
      ) {
        return await this.controlAllLights(
          isOn,
          brightness,
          colorHue,
          colorSaturation
        );
      }

      // Check if this is a room-based command (try to find multiple devices)
      const roomDevices = await this.findDevicesByRoom(deviceIdOrName, "light");
      if (roomDevices.length > 1) {
        return await this.controlMultipleLights(
          roomDevices,
          isOn,
          brightness,
          undefined,
          colorHue,
          colorSaturation
        );
      }

      // Single device control (existing logic)
      const device = await this.resolveDevice(deviceIdOrName);
      if (!device) {
        // If no exact match, try to find devices by room name
        const allDevices = Array.from(this.devices.values());
        const { findDeviceMatches } = await import("./deviceMatching");
        const matches = findDeviceMatches(
          deviceIdOrName,
          allDevices,
          "light",
          {
            minSimilarity: 0.4,
            enablePhonetic: true,
            enablePartialMatch: true,
            strictMode: false,
          },
          5
        );

        if (matches.length > 0) {
          // Control all matched lights
          return await this.controlMultipleLights(
            matches.map((m) => m.device).filter((d) => d.type === "light"),
            isOn,
            brightness,
            undefined,
            colorHue,
            colorSaturation
          );
        }

        throw new Error(
          `Device "${deviceIdOrName}" not found. Try checking the exact name or use list_devices to see available devices.`
        );
      }

      // Check if device is controllable (light or outlet)
      if (device.type !== "light" && device.type !== "outlet") {
        throw new Error(
          `Device "${deviceIdOrName}" is not controllable (type: ${device.type}). Only lights and outlets can be controlled.`
        );
      }

      // Control light or outlet
      if (device.type === "light") {
        await this.client.lights.setIsOn({ id: device.id, isOn });

        // Set brightness if provided and light is on
        if (isOn && brightness !== undefined) {
          // Ensure brightness is within valid range (1-100)
          const validBrightness = Math.max(1, Math.min(100, brightness));
          await this.client.lights.setLightLevel({
            id: device.id,
            lightLevel: validBrightness,
          });
        }

        // Set color if provided and light is on
        if (isOn && colorHue !== undefined && colorSaturation !== undefined) {
          // Ensure color values are within valid range
          const validHue = Math.max(0, Math.min(360, colorHue));
          const validSaturation = Math.max(0, Math.min(100, colorSaturation));

          // Try the DIRIGERA API with proper format
          try {
            await this.client.lights.setLightColor({
              id: device.id,
              colorHue: validHue,
              colorSaturation: validSaturation / 100, // Convert percentage to 0-1 range
            });
          } catch (colorError) {
            console.warn(
              "Failed to set color with percentage format, trying direct format:",
              colorError
            );
            // Fallback: try with percentage format if decimal doesn't work
            await this.client.lights.setLightColor({
              id: device.id,
              colorHue: validHue,
              colorSaturation: validSaturation,
            });
          }
        }
      } else if (device.type === "outlet") {
        await this.client.outlets.setIsOn({ id: device.id, isOn });
      }

      return true;
    } catch (error) {
      console.error("Failed to control device:", error);
      return false;
    }
  }

  // Helper method to control multiple lights
  async controlMultipleLights(
    devices: Device[],
    isOn: boolean,
    brightness?: number,
    excludeDevices?: string[],
    colorHue?: number,
    colorSaturation?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    let lightDevices = devices.filter((d) => d.type === "light");

    // Filter out excluded devices if provided
    if (excludeDevices && excludeDevices.length > 0) {
      const allDevicesRaw = Array.from(this.devices.values());

      // Find the actual device IDs for excluded device names using fuzzy matching
      const excludedIds = new Set<string>();
      for (const excludeName of excludeDevices) {
        const match = findBestDeviceMatch(excludeName, allDevicesRaw);
        if (match && match.confidence > 0.6) {
          excludedIds.add(match.device.id);
          const deviceName =
            match.device.attributes.customName ||
            match.device.attributes.model ||
            "Unknown Device";
          logger.info(`Excluding device: ${deviceName} (${match.device.id})`);
        }
      }

      // Filter out excluded devices
      lightDevices = lightDevices.filter(
        (device) => !excludedIds.has(device.id)
      );

      logger.info(
        `Filtered devices: ${lightDevices.length} lights (excluded ${excludedIds.size} devices)`
      );
    }

    if (lightDevices.length === 0) {
      throw new Error(
        "No controllable lights found (all devices may be excluded)"
      );
    }

    try {
      const promises = lightDevices.map(async (device) => {
        await this.client!.lights.setIsOn({ id: device.id, isOn });

        // Set brightness if provided and light is on
        if (isOn && brightness !== undefined) {
          const validBrightness = Math.max(1, Math.min(100, brightness));
          await this.client!.lights.setLightLevel({
            id: device.id,
            lightLevel: validBrightness,
          });
        }

        // Set color if provided and light is on
        if (isOn && colorHue !== undefined && colorSaturation !== undefined) {
          const validHue = Math.max(0, Math.min(360, colorHue));
          const validSaturation = Math.max(0, Math.min(100, colorSaturation));

          try {
            await this.client!.lights.setLightColor({
              id: device.id,
              colorHue: validHue,
              colorSaturation: validSaturation / 100, // Convert percentage to 0-1 range
            });
          } catch (colorError) {
            console.warn(
              `Failed to set color for device ${device.id} with percentage format, trying direct format:`,
              colorError
            );
            // Fallback: try with percentage format if decimal doesn't work
            await this.client!.lights.setLightColor({
              id: device.id,
              colorHue: validHue,
              colorSaturation: validSaturation,
            });
          }
        }
      });

      await Promise.all(promises);
      console.log(`Successfully controlled ${lightDevices.length} lights`);
      return true;
    } catch (error) {
      console.error("Failed to control multiple lights:", error);
      return false;
    }
  }

  // Helper method to control all lights in the house
  private async controlAllLights(
    isOn: boolean,
    brightness?: number,
    colorHue?: number,
    colorSaturation?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const allDevices = Array.from(this.devices.values());
      const allLights = allDevices.filter((d) => d.type === "light");

      if (allLights.length === 0) {
        throw new Error("No lights found in the system");
      }

      return await this.controlMultipleLights(
        allLights,
        isOn,
        brightness,
        undefined,
        colorHue,
        colorSaturation
      );
    } catch (error) {
      console.error("Failed to control all lights:", error);
      return false;
    }
  }

  // Helper method to find devices by room name
  async findDevicesByRoom(
    roomName: string,
    deviceType?: string
  ): Promise<Device[]> {
    const allDevices = Array.from(this.devices.values());
    const roomDevices: Device[] = [];

    // Extract room name patterns
    const normalizedRoom = roomName
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/lights?/g, "")
      .replace(/room/g, "");

    for (const device of allDevices) {
      if (deviceType && device.type !== deviceType) continue;

      const deviceName = (
        device.attributes.customName ||
        device.attributes.model ||
        ""
      ).toLowerCase();

      // Check if device name starts with room name
      if (
        deviceName.startsWith(normalizedRoom + "_") ||
        deviceName.startsWith(normalizedRoom) ||
        deviceName.includes(normalizedRoom)
      ) {
        roomDevices.push(device);
      }
    }

    return roomDevices;
  }

  async controlBlind(
    deviceIdOrName: string,
    targetLevel: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = await this.resolveDevice(deviceIdOrName, "blinds");
      if (!device) {
        throw new Error(
          `Blind device "${deviceIdOrName}" not found. Try checking the exact name or use list_devices to see available blinds.`
        );
      }

      // Ensure target level is within valid range (0-100)
      const validLevel = Math.max(0, Math.min(100, targetLevel));
      await this.client.blinds.setTargetLevel({
        id: device.id,
        blindsTargetLevel: validLevel,
      });

      return true;
    } catch (error) {
      console.error("Failed to control blind:", error);
      return false;
    }
  }

  async controlOutlet(deviceIdOrName: string, isOn: boolean): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = await this.resolveDevice(deviceIdOrName, "outlet");
      if (!device) {
        throw new Error(
          `Outlet device "${deviceIdOrName}" not found. Try checking the exact name or use list_devices to see available outlets.`
        );
      }

      await this.client.outlets.setIsOn({ id: device.id, isOn });
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

  async getDeviceById(deviceIdOrName: string): Promise<TradfriDevice | null> {
    const device = await this.resolveDevice(deviceIdOrName);
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
      colorHue: this.getDeviceColorHue(device),
      colorSaturation: this.getDeviceColorSaturation(device),
      colorTemperature: this.getDeviceColorTemperature(device),
    };
  }

  async resolveDeviceName(
    deviceId: string,
    inputName: string
  ): Promise<DeviceMatchResult | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const deviceName =
      device.attributes.customName ||
      device.attributes.model ||
      `${device.type}_${device.id}`;

    // Use the imported fuzzy matching function
    const matchResult = findBestDeviceMatch(inputName, [device]);

    return matchResult;
  }

  // Import the fuzzy matching utilities
  private async findDeviceByName(
    inputName: string,
    deviceType?: string
  ): Promise<Device | null> {
    const { findBestDeviceMatch } = await import("./deviceMatching");

    // Get all devices as an array
    const allDevices = Array.from(this.devices.values());

    // Find the best match
    const match = findBestDeviceMatch(inputName, allDevices, deviceType, {
      minSimilarity: 0.6,
      enablePhonetic: true,
      enablePartialMatch: true,
      strictMode: false,
    });

    if (match) {
      logger.info("Device name resolved via fuzzy matching", {
        inputName,
        matchedDevice: match.originalName,
        method: match.matchMethod,
        confidence: match.confidence,
      });
      return match.device;
    }

    return null;
  }

  // Enhanced device resolution method that tries ID first, then name matching
  private async resolveDevice(
    deviceIdOrName: string,
    deviceType?: string
  ): Promise<Device | null> {
    // First try exact ID match
    const deviceById = this.devices.get(deviceIdOrName);
    if (deviceById && (!deviceType || deviceById.type === deviceType)) {
      return deviceById;
    }

    // Then try fuzzy name matching
    return await this.findDeviceByName(deviceIdOrName, deviceType);
  }

  // Helper method to find similar device names for suggestions
  async findSimilarDevices(
    inputName: string,
    deviceType?: string,
    maxResults: number = 3
  ): Promise<
    Array<{ name: string; id: string; type: string; confidence: number }>
  > {
    const { findDeviceMatches } = await import("./deviceMatching");

    const allDevices = Array.from(this.devices.values());
    const matches = findDeviceMatches(
      inputName,
      allDevices,
      deviceType,
      {
        minSimilarity: 0.3, // Lower threshold for suggestions
        enablePhonetic: true,
        enablePartialMatch: true,
        strictMode: false,
      },
      maxResults
    );

    return matches.map((match) => ({
      name: match.originalName,
      id: match.device.id,
      type: match.device.type,
      confidence: Math.round(match.confidence * 100) / 100,
    }));
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
    const { findDeviceMatches } = await import("./deviceMatching");
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
        brightness: this.getDeviceBrightness(device),
        isOn: this.getDeviceOnState(device),
        targetLevel: this.getDeviceTargetLevel(device),
        currentLevel: this.getDeviceCurrentLevel(device),
        colorHue: this.getDeviceColorHue(device),
        colorSaturation: this.getDeviceColorSaturation(device),
        colorTemperature: this.getDeviceColorTemperature(device),
      };
    });

    return matchedDevices;
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
}

// Export a default instance
export const tradfriController = new TradfriController();

// Control function for tool executor
export async function controlTradfri(params: any): Promise<any> {
  const { action, deviceId, deviceName, ...options } = params;

  // Support both deviceId and deviceName parameters for backwards compatibility
  const deviceIdentifier = deviceId || deviceName;

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

      case "search_devices":
        const { query, deviceType } = options;
        console.log(
          `Searching devices with query: "${query}", type: ${
            deviceType || "all"
          }`
        );
        return await tradfriController.searchDevices(query, deviceType);

      case "control_light":
        const { isOn, brightness } = options;
        const success = await tradfriController.controlLight(
          deviceIdentifier,
          isOn,
          brightness
        );
        return {
          success,
          message: success
            ? "Light controlled successfully"
            : "Failed to control light",
        };

      case "control_multiple_lights":
        const {
          isOn: multiIsOn,
          brightness: multiBrightness,
          excludeDevices,
        } = options;

        // Find devices in the specified room or area
        const roomDevices = await tradfriController.findDevicesByRoom(
          deviceIdentifier,
          "light"
        );
        if (roomDevices.length === 0) {
          return {
            success: false,
            message: `No lights found in "${deviceIdentifier}"`,
          };
        }

        const multiSuccess = await tradfriController.controlMultipleLights(
          roomDevices,
          multiIsOn,
          multiBrightness,
          excludeDevices
        );

        const excludeCount = excludeDevices ? excludeDevices.length : 0;
        const controlledCount =
          roomDevices.filter((d) => d.type === "light").length -
          (excludeDevices ? excludeDevices.length : 0);

        return {
          success: multiSuccess,
          message: multiSuccess
            ? `Successfully controlled ${controlledCount} lights${
                excludeCount > 0 ? ` (excluded ${excludeCount})` : ""
              }`
            : "Failed to control multiple lights",
        };

      case "control_blind":
        const { targetLevel } = options;
        const blindSuccess = await tradfriController.controlBlind(
          deviceIdentifier,
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
          deviceIdentifier,
          outletOn
        );
        return {
          success: outletSuccess,
          message: outletSuccess
            ? "Outlet controlled successfully"
            : "Failed to control outlet",
        };

      case "set_scene":
        const sceneSuccess = await tradfriController.setScene(deviceIdentifier);
        return {
          success: sceneSuccess,
          message: sceneSuccess
            ? "Scene activated successfully"
            : "Failed to activate scene",
        };

      case "list_scenes":
        return await tradfriController.getScenes();

      case "get_device":
        return await tradfriController.getDeviceById(deviceIdentifier);

      case "control_specific_lights":
        const {
          deviceNames,
          isOn: specificIsOn,
          brightness: specificBrightness,
        } = options;

        if (
          !deviceNames ||
          !Array.isArray(deviceNames) ||
          deviceNames.length === 0
        ) {
          return {
            success: false,
            message:
              "deviceNames array is required for control_specific_lights action",
          };
        }

        // Control each named device
        const results: boolean[] = [];
        const successfulDevices: string[] = [];
        const failedDevices: string[] = [];

        for (const deviceName of deviceNames) {
          try {
            const success = await tradfriController.controlLight(
              deviceName,
              specificIsOn,
              specificBrightness
            );
            results.push(success);
            if (success) {
              successfulDevices.push(deviceName);
            } else {
              failedDevices.push(deviceName);
            }
          } catch (error) {
            results.push(false);
            failedDevices.push(deviceName);
            console.error(`Failed to control device "${deviceName}":`, error);
          }
        }

        const overallSuccess = results.every((r) => r);
        const partialSuccess = results.some((r) => r);

        let message = "";
        if (overallSuccess) {
          message = `Successfully controlled ${
            successfulDevices.length
          } devices: ${successfulDevices.join(", ")}`;
        } else if (partialSuccess) {
          message = `Partially successful. Controlled: ${successfulDevices.join(
            ", "
          )}. Failed: ${failedDevices.join(", ")}`;
        } else {
          message = `Failed to control all devices: ${failedDevices.join(
            ", "
          )}`;
        }

        return {
          success: overallSuccess || partialSuccess,
          message,
          controlledDevices: successfulDevices,
          failedDevices,
        };

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
      "Control IKEA DIRIGERA smart home devices including lights, blinds, outlets, and scenes. For CONTROL commands: use control_light for single devices; use control_specific_lights for multiple named devices in one command (e.g., 'desk and workshop light in bedroom'); use control_multiple_lights ONLY for room-wide control with exclusions (e.g., 'all bedroom lights except bed light'). Built-in fuzzy matching will find the right devices. Only use search_devices for discovery/listing when user asks 'what devices are available'.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "list_devices",
            "search_devices",
            "control_light",
            "control_specific_lights",
            "control_multiple_lights",
            "control_blind",
            "control_outlet",
            "set_scene",
            "list_scenes",
            "get_device",
          ],
          description:
            "The action to perform. Use control_light for single devices. Use control_specific_lights for multiple named devices (e.g., 'desk and workshop light in bedroom'). Use control_multiple_lights ONLY for room-wide control with exclusions (e.g., 'all bedroom lights except bed light'). Use search_devices only for finding/listing devices.",
        },
        deviceId: {
          type: "string",
          description:
            "The exact ID of the device to control (optional if deviceName is provided)",
        },
        deviceName: {
          type: "string",
          description:
            "The name of the device to control. For control actions, use room names like 'bedroom', 'kitchen', 'living room' or device descriptions like 'bathroom light'. The tool has built-in fuzzy matching. (optional if deviceId is provided)",
        },
        deviceNames: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Array of device names to control when using control_specific_lights action (e.g., ['desk', 'workshop'] for 'desk and workshop light')",
        },
        excludeDevices: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Array of device names to exclude when controlling multiple lights. Used with control_multiple_lights action for selective control (e.g., 'turn off all bedroom lights except the bed light')",
        },
        query: {
          type: "string",
          description:
            "Search query for finding devices by name (used with search_devices action)",
        },
        deviceType: {
          type: "string",
          enum: ["light", "blinds", "outlet", "airPurifier"],
          description:
            "Filter devices by type (optional, used with search_devices action)",
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
