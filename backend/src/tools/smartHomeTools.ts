/**
 * Combined tool definitions export
 */
import { ToolDefinition } from "./types";
//import { LIGHT_CONTROL_TOOL } from "./lightControl";
import { TEMPERATURE_CONTROL_TOOL } from "./temperatureControl";
import { MUSIC_CONTROL_TOOL } from "./musicControl";
import { SECURITY_CONTROL_TOOL } from "./securityControl";
import { DEVICE_STATUS_TOOL } from "./deviceStatus";
import { TRADFRI_CONTROL_TOOL } from "./tradfriControl";
import { SONOS_CONTROL_TOOL } from "./sonosControl";

export const SMART_HOME_TOOLS: ToolDefinition[] = [
  //LIGHT_CONTROL_TOOL,
  //TEMPERATURE_CONTROL_TOOL,
  //MUSIC_CONTROL_TOOL,
  //SECURITY_CONTROL_TOOL,
  //DEVICE_STATUS_TOOL,
  TRADFRI_CONTROL_TOOL,
  SONOS_CONTROL_TOOL,
];

// Re-export all individual tools for selective import
//export { LIGHT_CONTROL_TOOL } from "./lightControl";
export { TEMPERATURE_CONTROL_TOOL } from "./temperatureControl";
export { MUSIC_CONTROL_TOOL } from "./musicControl";
export { SECURITY_CONTROL_TOOL } from "./securityControl";
export { DEVICE_STATUS_TOOL } from "./deviceStatus";
export { TRADFRI_CONTROL_TOOL } from "./tradfriControl";
export { SONOS_CONTROL_TOOL } from "./sonosControl";

// Re-export tool executor
export { SmartHomeToolExecutor } from "./toolExecutor";

// Re-export types
export { ToolDefinition, ToolExecutionResult } from "./types";
