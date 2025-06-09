/**
 * Device state helper functions
 */
import { Device, Light, Blinds, Outlet } from "dirigera";

export function getDeviceBrightness(device: Device): number | undefined {
  if (device.type === "light") {
    const light = device as Light;
    return light.attributes.lightLevel;
  }
  return undefined;
}

export function getDeviceOnState(device: Device): boolean | undefined {
  if (device.type === "light") {
    const light = device as Light;
    return light.attributes.isOn;
  }
  if (device.type === "outlet") {
    const outlet = device as Outlet;
    return outlet.attributes.isOn;
  }
  return undefined;
}

export function getDeviceTargetLevel(device: Device): number | undefined {
  if (device.type === "blinds") {
    const blind = device as Blinds;
    return blind.attributes.blindsTargetLevel;
  }
  return undefined;
}

export function getDeviceCurrentLevel(device: Device): number | undefined {
  if (device.type === "blinds") {
    const blind = device as Blinds;
    return blind.attributes.blindsCurrentLevel;
  }
  return undefined;
}

export function getDeviceColorHue(device: Device): number | undefined {
  if (device.type === "light") {
    const light = device as Light;
    return light.attributes.colorHue;
  }
  return undefined;
}

export function getDeviceColorSaturation(device: Device): number | undefined {
  if (device.type === "light") {
    const light = device as Light;
    return light.attributes.colorSaturation;
  }
  return undefined;
}

export function getDeviceColorTemperature(device: Device): number | undefined {
  if (device.type === "light") {
    const light = device as Light;
    return light.attributes.colorTemperature;
  }
  return undefined;
}
