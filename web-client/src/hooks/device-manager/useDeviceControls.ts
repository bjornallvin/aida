import { TradfriDevice, apiService } from "../../services/apiService";
import { isControllableDevice } from "../../components/device-manager/utils";
import { DeviceManagerState } from "../../components/device-manager/types";

interface UseDeviceControlsProps {
  updateState: (updates: Partial<DeviceManagerState>) => void;
  updateDevice: (deviceId: string, updates: Partial<TradfriDevice>) => void;
  devices: TradfriDevice[];
}

export const useDeviceControls = ({
  updateState,
  updateDevice,
  devices,
}: UseDeviceControlsProps) => {
  const handleEditStart = (device: TradfriDevice) => {
    updateState({
      editingDevice: device.id,
      newName: device.name,
    });
  };

  const handleEditCancel = () => {
    updateState({
      editingDevice: null,
      newName: "",
    });
  };

  const handleEditSave = async (deviceId: string, newName: string) => {
    if (!newName.trim()) {
      return;
    }

    try {
      updateState({ updating: deviceId });
      const response = await apiService.updateDeviceName(
        deviceId,
        newName.trim()
      );

      if (response.success) {
        updateDevice(deviceId, { name: newName.trim() });
        updateState({
          editingDevice: null,
          newName: "",
        });
      } else {
        updateState({
          error: response.error || "Failed to update device name",
        });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error ? err.message : "Failed to update device name",
      });
    } finally {
      updateState({ updating: null });
    }
  };

  const handleDeviceToggle = async (device: TradfriDevice) => {
    if (!isControllableDevice(device)) {
      return;
    }

    try {
      updateState({ togglingDevice: device.id });
      const newIsOn = !device.isOn;
      const response = await apiService.controlLight(device.id, newIsOn);

      if (response.success) {
        updateDevice(device.id, { isOn: newIsOn });
      } else {
        updateState({
          error: response.error || `Failed to control ${device.type}`,
        });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error
            ? err.message
            : `Failed to control ${device.type}`,
      });
    } finally {
      updateState({ togglingDevice: null });
    }
  };

  const handleRoomToggle = async (
    roomName: string,
    roomDevices: TradfriDevice[]
  ) => {
    const controllableDevices = roomDevices.filter(isControllableDevice);

    if (controllableDevices.length === 0) {
      return;
    }

    // Determine if we should turn on or off based on current state
    const anyOn = controllableDevices.some((device) => device.isOn);
    const targetState = !anyOn;

    try {
      updateState({ togglingRoom: roomName });

      // Toggle all controllable devices in the room
      const promises = controllableDevices.map((device) =>
        apiService.controlLight(device.id, targetState)
      );

      const results = await Promise.allSettled(promises);

      // Update devices that were successfully toggled
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          const device = controllableDevices[index];
          updateDevice(device.id, { isOn: targetState });
        }
      });

      // Check if any requests failed
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length > 0) {
        updateState({
          error: `Failed to control ${failures.length} device(s) in ${roomName}`,
        });
      }
    } catch (err) {
      updateState({
        error:
          err instanceof Error
            ? err.message
            : `Failed to control devices in ${roomName}`,
      });
    } finally {
      updateState({ togglingRoom: null });
    }
  };

  const handleToggleAllLights = async () => {
    const lights = devices.filter(
      (device) => device.type === "light" && device.isOn !== undefined
    );

    if (lights.length === 0) return;

    // Determine target state based on current state
    const anyOn = lights.some((light) => light.isOn);
    const targetState = !anyOn;

    try {
      updateState({ togglingAllLights: true });

      const promises = lights.map((light) =>
        apiService.controlLight(light.id, targetState)
      );

      const results = await Promise.allSettled(promises);

      // Update lights that were successfully toggled
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          const light = lights[index];
          updateDevice(light.id, { isOn: targetState });
        }
      });

      // Check if any requests failed
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length > 0) {
        updateState({
          error: `Failed to control ${failures.length} light(s)`,
        });
      }
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : "Failed to control lights",
      });
    } finally {
      updateState({ togglingAllLights: false });
    }
  };

  return {
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    handleDeviceToggle,
    handleRoomToggle,
    handleToggleAllLights,
  };
};
