/**
 * Temperature control tool for HVAC and thermostat management
 */
import { ToolDefinition, ToolExecutionResult } from "./types";

export const TEMPERATURE_CONTROL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "control_temperature",
    description: "Control the apartment's temperature and HVAC system.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The action to perform",
          enum: [
            "set_temperature",
            "increase",
            "decrease",
            "get_current",
            "set_mode",
          ],
        },
        temperature: {
          type: "number",
          description:
            "Target temperature in Celsius (used with set_temperature action)",
          minimum: 16,
          maximum: 30,
        },
        change_amount: {
          type: "number",
          description: "Amount to increase/decrease temperature by in Celsius",
          minimum: 0.5,
          maximum: 5,
        },
        mode: {
          type: "string",
          description: "HVAC mode (used with set_mode action)",
          enum: ["heat", "cool", "auto", "off", "fan"],
        },
      },
      required: ["action"],
    },
  },
};

export class TemperatureController {
  async controlTemperature(params: any): Promise<ToolExecutionResult> {
    // TODO: Integrate with thermostat API (Nest, Ecobee, etc.)
    const { action, temperature, change_amount, mode } = params;

    await new Promise((resolve) => setTimeout(resolve, 100));

    let message = "Temperature ";
    switch (action) {
      case "set_temperature":
        message += `set to ${temperature}°C`;
        break;
      case "increase":
        message += `increased by ${change_amount || 1}°C`;
        break;
      case "decrease":
        message += `decreased by ${change_amount || 1}°C`;
        break;
      case "set_mode":
        message += `mode set to ${mode}`;
        break;
      default:
        message += `${action} completed`;
    }

    return {
      success: true,
      message,
      data: { action, temperature, change_amount, mode },
    };
  }
}
