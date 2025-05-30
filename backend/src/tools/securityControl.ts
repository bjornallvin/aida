/**
 * Security control tool for door locks and security system
 */
import { ToolDefinition, ToolExecutionResult } from "./types";

export const SECURITY_CONTROL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "control_security",
    description: "Control apartment security system and door locks.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The security action to perform",
          enum: [
            "arm",
            "disarm",
            "get_status",
            "lock_door",
            "unlock_door",
            "check_doors",
          ],
        },
        door: {
          type: "string",
          description:
            "Specific door to control (used with lock_door/unlock_door actions)",
          enum: ["front_door", "back_door", "balcony_door", "all"],
        },
        mode: {
          type: "string",
          description: "Security system mode (used with arm action)",
          enum: ["home", "away", "night"],
        },
      },
      required: ["action"],
    },
  },
};

export class SecurityController {
  async controlSecurity(params: any): Promise<ToolExecutionResult> {
    // TODO: Integrate with security system API
    const { action, door, mode } = params;

    await new Promise((resolve) => setTimeout(resolve, 100));

    let message = "Security ";
    switch (action) {
      case "arm":
        message += `system armed in ${mode} mode`;
        break;
      case "disarm":
        message += "system disarmed";
        break;
      case "lock_door":
        message += `${door} locked`;
        break;
      case "unlock_door":
        message += `${door} unlocked`;
        break;
      default:
        message += `${action} completed`;
    }

    return {
      success: true,
      message,
      data: { action, door, mode },
    };
  }
}
