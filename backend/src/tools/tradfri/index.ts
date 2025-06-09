/**
 * Main entry point for TRADFRI control functionality
 */
import { ToolDefinition } from "../types";
import { TradfriController } from "./tradfriController";

// Export a default instance
export const tradfriController = new TradfriController();

// Export types and classes for use elsewhere
export { TradfriController } from "./tradfriController";
export { TradfriDevice, TradfriConfig } from "./types";

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
