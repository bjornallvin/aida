import { Request, Response } from "express";
import { tradfriController } from "../tools/tradfriControl";
import { logger } from "../utils";

export class DeviceController {
  /**
   * Get all devices from DIRIGERA hub
   */
  async getDevices(req: Request, res: Response): Promise<void> {
    try {
      logger.info("Device list requested");

      // Ensure connection to DIRIGERA hub
      if (!tradfriController.isConnected()) {
        const connected = await tradfriController.connect();
        if (!connected) {
          res.status(503).json({
            success: false,
            error: "Failed to connect to DIRIGERA hub",
          });
          return;
        }
      }

      const devices = await tradfriController.getDevices();

      res.json({
        success: true,
        devices: devices,
        count: devices.length,
        timestamp: new Date().toISOString(),
      });

      logger.info("Device list returned successfully", {
        deviceCount: devices.length,
      });
    } catch (error) {
      logger.error("Failed to get devices", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        success: false,
        error: "Failed to retrieve devices",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update device name
   */
  async updateDeviceName(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, newName } = req.body;

      if (!deviceId || !newName) {
        res.status(400).json({
          success: false,
          error: "Device ID and new name are required",
        });
        return;
      }

      logger.info("Device name update requested", {
        deviceId,
        newName,
      });

      // Ensure connection to DIRIGERA hub
      if (!tradfriController.isConnected()) {
        const connected = await tradfriController.connect();
        if (!connected) {
          res.status(503).json({
            success: false,
            error: "Failed to connect to DIRIGERA hub",
          });
          return;
        }
      }

      // Get the device to check if it exists
      const device = await tradfriController.getDeviceById(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: `Device with ID "${deviceId}" not found`,
        });
        return;
      }

      // Update device name using the DIRIGERA client
      const success = await tradfriController.updateDeviceName(
        deviceId,
        newName
      );

      if (success) {
        res.json({
          success: true,
          message: `Device name updated successfully`,
          device: {
            id: deviceId,
            oldName: device.name,
            newName: newName,
          },
          timestamp: new Date().toISOString(),
        });

        logger.info("Device name updated successfully", {
          deviceId,
          oldName: device.name,
          newName,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to update device name",
        });
      }
    } catch (error) {
      logger.error("Failed to update device name", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        success: false,
        error: "Failed to update device name",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Search devices by query
   */
  async searchDevices(req: Request, res: Response): Promise<void> {
    try {
      const { query, deviceType } = req.query;

      logger.info("Device search requested", {
        query,
        deviceType,
      });

      // Ensure connection to DIRIGERA hub
      if (!tradfriController.isConnected()) {
        const connected = await tradfriController.connect();
        if (!connected) {
          res.status(503).json({
            success: false,
            error: "Failed to connect to DIRIGERA hub",
          });
          return;
        }
      }

      const devices = await tradfriController.searchDevices(
        query as string,
        deviceType as string
      );

      res.json({
        success: true,
        devices: devices,
        count: devices.length,
        query: query || "all",
        deviceType: deviceType || "all",
        timestamp: new Date().toISOString(),
      });

      logger.info("Device search completed", {
        query,
        deviceType,
        resultCount: devices.length,
      });
    } catch (error) {
      logger.error("Failed to search devices", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        success: false,
        error: "Failed to search devices",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Control device (lights and outlets) - on/off, brightness for lights
   */
  async controlLight(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { isOn, brightness, colorHue, colorSaturation, colorTemperature } =
        req.body;

      if (!deviceId) {
        res.status(400).json({
          success: false,
          error: "Device ID is required",
        });
        return;
      }

      if (isOn === undefined) {
        res.status(400).json({
          success: false,
          error: "isOn parameter is required",
        });
        return;
      }

      logger.info("Device control requested", {
        deviceId,
        isOn,
        brightness,
        colorHue,
        colorSaturation,
        colorTemperature,
      });

      // Ensure connection to DIRIGERA hub
      if (!tradfriController.isConnected()) {
        const connected = await tradfriController.connect();
        if (!connected) {
          res.status(503).json({
            success: false,
            error: "Failed to connect to DIRIGERA hub",
          });
          return;
        }
      }

      // Get the device to check if it exists and is a light or outlet
      const device = await tradfriController.getDeviceById(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: `Device with ID "${deviceId}" not found`,
        });
        return;
      }

      logger.info("Device found for control", {
        deviceId,
        deviceName: device.name,
        deviceType: device.type,
        isOn,
        brightness,
        colorHue,
        colorSaturation,
        colorTemperature,
      });

      if (device.type !== "light" && device.type !== "outlet") {
        res.status(400).json({
          success: false,
          error: `Device "${device.name}" is not a controllable device (type: ${device.type}). Only lights and outlets can be controlled.`,
        });
        return;
      }

      // Control the light using the DIRIGERA client
      const success = await tradfriController.controlLight(
        deviceId,
        isOn,
        brightness,
        colorHue,
        colorSaturation,
        colorTemperature
      );

      if (success) {
        res.json({
          success: true,
          message: `${device.type} ${
            isOn ? "turned on" : "turned off"
          } successfully`,
          device: {
            id: deviceId,
            name: device.name,
            isOn: isOn,
            brightness: brightness,
            colorHue: colorHue,
            colorSaturation: colorSaturation,
            colorTemperature: colorTemperature,
          },
          timestamp: new Date().toISOString(),
        });

        logger.info("Device controlled successfully", {
          deviceId,
          deviceName: device.name,
          deviceType: device.type,
          isOn,
          brightness,
          colorHue,
          colorSaturation,
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Failed to control ${device.type}`,
        });
      }
    } catch (error) {
      logger.error("Failed to control device", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        success: false,
        error: "Failed to control device",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
