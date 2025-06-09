/**
 * Types and interfaces for TRADFRI control
 */

export interface TradfriConfig {
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
