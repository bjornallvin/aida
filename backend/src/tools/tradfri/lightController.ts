/**
 * Light-specific control functionality
 */
import { DirigeraClient, Device } from "dirigera";
import { logger } from "../../utils";
import { findBestDeviceMatch, findDeviceMatches } from "../deviceMatching";
import { DeviceResolver } from "./deviceResolver";

export class LightController {
  constructor(
    private client: DirigeraClient,
    private deviceResolver: DeviceResolver
  ) {}

  async controlLight(
    deviceIdOrName: string,
    isOn: boolean,
    brightness?: number,
    colorHue?: number,
    colorSaturation?: number,
    colorTemperature?: number
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
          colorSaturation,
          colorTemperature
        );
      }

      // Check if this is a room-based command (try to find multiple devices)
      const roomDevices = await this.deviceResolver.findDevicesByRoom(
        deviceIdOrName,
        "light"
      );
      if (roomDevices.length > 1) {
        return await this.controlMultipleLights(
          roomDevices,
          isOn,
          brightness,
          undefined,
          colorHue,
          colorSaturation,
          colorTemperature
        );
      }

      // Single device control (existing logic)
      const device = await this.deviceResolver.resolveDevice(deviceIdOrName);
      if (!device) {
        // If no exact match, try to find devices by room name
        const allDevices = Array.from(
          (this.deviceResolver as any).devices.values()
        ) as Device[];
        const { findDeviceMatches } = await import("../deviceMatching");
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
            colorSaturation,
            colorTemperature
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
              `Failed to set color for device ${device.id} with percentage format, trying direct format:`,
              colorError
            );
          }
        }

        // Set color temperature if provided and light is on
        if (isOn && colorTemperature !== undefined) {
          try {
            await this.client.lights.setLightTemperature({
              id: device.id,
              colorTemperature: colorTemperature,
            });
          } catch (temperatureError) {
            console.warn("Failed to set color temperature:", temperatureError);
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
    colorSaturation?: number,
    colorTemperature?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    let lightDevices = devices.filter((d) => d.type === "light");

    // Filter out excluded devices if provided
    if (excludeDevices && excludeDevices.length > 0) {
      const allDevicesRaw = Array.from(
        (this.deviceResolver as any).devices.values()
      ) as Device[];

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
          }
        }

        // Set color temperature if provided and light is on
        if (isOn && colorTemperature !== undefined) {
          try {
            await this.client!.lights.setLightTemperature({
              id: device.id,
              colorTemperature: colorTemperature,
            });
          } catch (temperatureError) {
            console.warn(
              `Failed to set color temperature for device ${device.id}:`,
              temperatureError
            );
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
    colorSaturation?: number,
    colorTemperature?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const allDevices = Array.from(
        (this.deviceResolver as any).devices.values()
      ) as Device[];
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
        colorSaturation,
        colorTemperature
      );
    } catch (error) {
      console.error("Failed to control all lights:", error);
      return false;
    }
  }
}
