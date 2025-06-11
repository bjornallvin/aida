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
import { SonosController } from "./sonosControl";
import { SonosService } from "../services/sonos";
import { DirectRadioSonosService } from "../services/direct-radio-sonos";

export class SmartHomeToolExecutor {
  //private lightController = new LightController();
  private temperatureController = new TemperatureController();
  private musicController = new MusicController();
  private securityController = new SecurityController();
  private deviceStatusController = new DeviceStatusController();
  private tradfriController = controlTradfri; // Assuming this is a function, not a class
  private sonosController: SonosController;

  constructor(
    sonosService?: SonosService,
    radioService?: DirectRadioSonosService
  ) {
    this.sonosController = new SonosController(sonosService, radioService);
  }

  /**
   * Execute a tool call
   */
  public async executeToolCall(
    toolName: string,
    parameters: any
  ): Promise<ToolExecutionResult> {
    try {
      let result: ToolExecutionResult;

      switch (toolName) {
        //case "control_lights":
        //  return await this.lightController.controlLights(parameters);
        case "control_temperature":
          result = await this.temperatureController.controlTemperature(
            parameters
          );
          break;
        case "control_music":
          result = await this.musicController.controlMusic(parameters);
          break;
        case "control_security":
          result = await this.securityController.controlSecurity(parameters);
          break;
        case "get_device_status":
          result = await this.deviceStatusController.getDeviceStatus(
            parameters
          );
          break;
        case "control_lights":
          result = await this.tradfriController(parameters);
          break;
        case "control_sonos":
          result = await this.sonosController.controlSonos(parameters);
          break;
        default:
          result = {
            success: false,
            message: `Unknown tool: ${toolName}`,
            error: "UNKNOWN_TOOL",
          };
          break;
      }

      // Add tool name to the result
      result.toolName = toolName;
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Error executing ${toolName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error: "EXECUTION_ERROR",
        toolName: toolName,
      };
    }
  }
}
