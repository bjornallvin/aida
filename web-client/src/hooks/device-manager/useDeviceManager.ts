import { useState, useEffect, useCallback } from "react";
import { TradfriDevice, apiService } from "../../services/apiService";
import { DeviceManagerState } from "../../components/device-manager/types";

export const useDeviceManager = () => {
  const [state, setState] = useState<DeviceManagerState>({
    devices: [],
    loading: true,
    error: null,
    editingDevice: null,
    newName: "",
    searchQuery: "",
    deviceTypeFilter: "",
    updating: null,
    togglingDevice: null,
    togglingRoom: null,
    expandedDevice: null,
    expandedRoom: null,
    expandedGlobalControls: false,
    togglingAllLights: false,
    globalBrightnessValue: null,
    globalColorHueValue: null,
    globalColorSaturationValue: null,
    globalColorTemperatureValue: null,
  });

  const loadDevices = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response =
        state.searchQuery || state.deviceTypeFilter
          ? await apiService.searchDevices(
              state.searchQuery,
              state.deviceTypeFilter
            )
          : await apiService.getDevices();

      if (response.success && response.devices) {
        setState((prev) => ({ ...prev, devices: response.devices! }));
      } else {
        setState((prev) => ({
          ...prev,
          error: response.error || "Failed to load devices",
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load devices",
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.searchQuery, state.deviceTypeFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const updateState = (updates: Partial<DeviceManagerState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const updateDevice = (deviceId: string, updates: Partial<TradfriDevice>) => {
    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((device) =>
        device.id === deviceId ? { ...device, ...updates } : device
      ),
    }));
  };

  return {
    state,
    updateState,
    updateDevice,
    loadDevices,
  };
};
