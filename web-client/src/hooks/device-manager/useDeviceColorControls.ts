import { TradfriDevice, apiService } from "../../services/apiService";
import { DeviceManagerState } from "../../components/device-manager/types";

interface UseDeviceColorControlsProps {
  updateState: (updates: Partial<DeviceManagerState>) => void;
  updateDevice: (deviceId: string, updates: Partial<TradfriDevice>) => void;
}

export const useDeviceColorControls = ({
  updateState,
  updateDevice,
}: UseDeviceColorControlsProps) => {
  const handleBrightnessChange = async (
    device: TradfriDevice,
    brightness: number
  ) => {
    if (device.type !== "light" || device.brightness === undefined) return;

    try {
      const response = await apiService.controlLight(
        device.id,
        device.isOn || false,
        brightness
      );

      if (response.success) {
        updateDevice(device.id, { brightness });
      } else {
        updateState({ error: response.error || "Failed to adjust brightness" });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error ? err.message : "Failed to adjust brightness",
      });
    }
  };

  const handleColorHueChange = async (
    device: TradfriDevice,
    colorHue: number
  ) => {
    if (device.type !== "light" || device.colorHue === undefined) return;

    try {
      const response = await apiService.controlLight(
        device.id,
        device.isOn || false,
        device.brightness,
        colorHue,
        device.colorSaturation
      );

      if (response.success) {
        updateDevice(device.id, { colorHue });
      } else {
        updateState({ error: response.error || "Failed to adjust color hue" });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error ? err.message : "Failed to adjust color hue",
      });
    }
  };

  const handleColorSaturationChange = async (
    device: TradfriDevice,
    colorSaturation: number
  ) => {
    if (device.type !== "light" || device.colorSaturation === undefined) return;

    try {
      const response = await apiService.controlLight(
        device.id,
        device.isOn || false,
        device.brightness,
        device.colorHue,
        colorSaturation
      );

      if (response.success) {
        updateDevice(device.id, { colorSaturation });
      } else {
        updateState({
          error: response.error || "Failed to adjust color saturation",
        });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error
            ? err.message
            : "Failed to adjust color saturation",
      });
    }
  };

  const handleColorTemperatureChange = async (
    device: TradfriDevice,
    colorTemperature: number
  ) => {
    if (device.type !== "light" || device.colorTemperature === undefined)
      return;

    try {
      const response = await apiService.controlLightTemperature(
        device.id,
        device.isOn || false,
        device.brightness,
        colorTemperature
      );

      if (response.success) {
        updateDevice(device.id, { colorTemperature });
      } else {
        updateState({
          error: response.error || "Failed to adjust color temperature",
        });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error
            ? err.message
            : "Failed to adjust color temperature",
      });
    }
  };

  return {
    handleBrightnessChange,
    handleColorHueChange,
    handleColorSaturationChange,
    handleColorTemperatureChange,
  };
};
