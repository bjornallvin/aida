/**
 * Device resolution and search functionality
 */
import { Device } from "dirigera";
import { logger } from "../../utils";
import {
  findBestDeviceMatch,
  findDeviceMatches,
  DeviceMatchResult,
} from "../deviceMatching";

export class DeviceResolver {
  constructor(private devices: Map<string, Device>) {}

  // Enhanced device resolution method that tries ID first, then name matching
  async resolveDevice(
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

  // Import the fuzzy matching utilities
  private async findDeviceByName(
    inputName: string,
    deviceType?: string
  ): Promise<Device | null> {
    const { findBestDeviceMatch } = await import("../deviceMatching");

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

  // Helper method to find similar device names for suggestions
  async findSimilarDevices(
    inputName: string,
    deviceType?: string,
    maxResults: number = 3
  ): Promise<
    Array<{ name: string; id: string; type: string; confidence: number }>
  > {
    const { findDeviceMatches } = await import("../deviceMatching");

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
}
