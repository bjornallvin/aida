/**
 * Smart home tool executor - combines all individual tool controllers
 */
import { ToolExecutionResult } from "./types";
import { LightController } from "./lightControl";
import { TemperatureController } from "./temperatureControl";
import { MusicController } from "./musicControl";
import { SecurityController } from "./securityControl";
import { DeviceStatusController } from "./deviceStatus";
import { controlTradfri } from "./tradfriControl";

export class SmartHomeToolExecutor {
  //private lightController = new LightController();
  private temperatureController = new TemperatureController();
  private musicController = new MusicController();
  private securityController = new SecurityController();
  private deviceStatusController = new DeviceStatusController();
  private tradfriController = controlTradfri; // Assuming this is a function, not a class

  /**
   * Execute a tool call
   */
  public async executeToolCall(
    toolName: string,
    parameters: any
  ): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        //case "control_lights":
        //  return await this.lightController.controlLights(parameters);
        case "control_temperature":
          return await this.temperatureController.controlTemperature(
            parameters
          );
        case "control_music":
          return await this.musicController.controlMusic(parameters);
        case "control_security":
          return await this.securityController.controlSecurity(parameters);
        case "get_device_status":
          return await this.deviceStatusController.getDeviceStatus(parameters);
        case "tradfri_control":
          return await controlTradfri(parameters);
        default:
          return {
            success: false,
            message: `Unknown tool: ${toolName}`,
            error: "UNKNOWN_TOOL",
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing ${toolName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error: "EXECUTION_ERROR",
      };
    }
  }
}
