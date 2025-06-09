"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService, TradfriDevice } from "../services/apiService";

interface DeviceManagerProps {
  className?: string;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  className = "",
}) => {
  const [devices, setDevices] = useState<TradfriDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [togglingDevice, setTogglingDevice] = useState<string | null>(null);
  const [togglingRoom, setTogglingRoom] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedGlobalControls, setExpandedGlobalControls] = useState(false);
  const [togglingAllLights, setTogglingAllLights] = useState(false);
  const [globalBrightnessValue, setGlobalBrightnessValue] = useState<
    number | null
  >(null);
  const [globalColorHueValue, setGlobalColorHueValue] = useState<number | null>(
    null
  );
  const [globalColorSaturationValue, setGlobalColorSaturationValue] = useState<
    number | null
  >(null);
  const [globalColorTemperatureValue, setGlobalColorTemperatureValue] =
    useState<number | null>(null);

  const deviceTypes = ["light", "blinds", "outlet", "airPurifier"];

  // Helper function to determine if a light supports RGB color vs color temperature only
  const supportsRgbColor = (device: TradfriDevice): boolean => {
    // If device has colorHue or colorSaturation defined, it supports RGB
    return (
      device.colorHue !== undefined || device.colorSaturation !== undefined
    );
  };

  const supportsColorTemperature = (device: TradfriDevice): boolean => {
    // If device has colorTemperature defined, it supports color temperature
    return device.colorTemperature !== undefined;
  };

  // Helper function to extract room name from device name
  const getRoomName = (deviceName: string): string => {
    // For devices named like "room_name_number", extract only the first part "room"
    const parts = deviceName.split("_");
    if (parts.length >= 1) {
      // Use only the first part before the first underscore
      return parts[0];
    }
    // Fallback to full name if no underscore
    return deviceName;
  };

  // Helper function to group devices by room
  const groupDevicesByRoom = (devices: TradfriDevice[]) => {
    const grouped: { [room: string]: TradfriDevice[] } = {};

    devices.forEach((device) => {
      const roomName = getRoomName(device.name);
      if (!grouped[roomName]) {
        grouped[roomName] = [];
      }
      grouped[roomName].push(device);
    });

    // Sort devices within each room by name
    Object.keys(grouped).forEach((room) => {
      grouped[room].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  };

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        searchQuery || deviceTypeFilter
          ? await apiService.searchDevices(searchQuery, deviceTypeFilter)
          : await apiService.getDevices();

      if (response.success && response.devices) {
        setDevices(response.devices);
      } else {
        setError(response.error || "Failed to load devices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, deviceTypeFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleSearch = () => {
    loadDevices();
  };

  const handleEditStart = (device: TradfriDevice) => {
    setEditingDevice(device.id);
    setNewName(device.name);
  };

  const handleEditCancel = () => {
    setEditingDevice(null);
    setNewName("");
  };

  const handleEditSave = async (deviceId: string) => {
    if (!newName.trim()) {
      return;
    }

    try {
      setUpdating(deviceId);
      const response = await apiService.updateDeviceName(
        deviceId,
        newName.trim()
      );

      if (response.success) {
        // Update the device in the local state
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.id === deviceId
              ? { ...device, name: newName.trim() }
              : device
          )
        );
        setEditingDevice(null);
        setNewName("");
      } else {
        setError(response.error || "Failed to update device name");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update device name"
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleDeviceToggle = async (device: TradfriDevice) => {
    if (
      (device.type !== "light" && device.type !== "outlet") ||
      device.isOn === undefined
    ) {
      return;
    }

    try {
      setTogglingDevice(device.id);
      const newIsOn = !device.isOn;
      const response = await apiService.controlLight(device.id, newIsOn);

      if (response.success) {
        // Update the device in the local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            d.id === device.id ? { ...d, isOn: newIsOn } : d
          )
        );
      } else {
        setError(response.error || `Failed to control ${device.type}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to control ${device.type}`
      );
    } finally {
      setTogglingDevice(null);
    }
  };

  const handleRoomToggle = async (
    roomName: string,
    roomDevices: TradfriDevice[]
  ) => {
    // Get all controllable devices in the room (lights and outlets)
    const controllableDevices = roomDevices.filter(
      (device) =>
        (device.type === "light" || device.type === "outlet") &&
        device.isOn !== undefined &&
        device.isReachable
    );

    if (controllableDevices.length === 0) {
      return;
    }

    // Determine the new state - if any device is off, turn all on; if all are on, turn all off
    const anyDeviceOff = controllableDevices.some((device) => !device.isOn);
    const newState = anyDeviceOff;

    try {
      setTogglingRoom(roomName);

      // Toggle all controllable devices in the room
      const togglePromises = controllableDevices.map((device) =>
        apiService.controlLight(device.id, newState)
      );

      const results = await Promise.allSettled(togglePromises);

      // Check for any failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length > 0) {
        setError(
          `Failed to control ${failures.length} device(s) in ${roomName}`
        );
      }

      // Update successful devices in local state
      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          const isControllable = controllableDevices.find(
            (d) => d.id === device.id
          );
          if (isControllable) {
            const result = results[controllableDevices.indexOf(isControllable)];
            if (result.status === "fulfilled" && result.value.success) {
              return { ...device, isOn: newState };
            }
          }
          return device;
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to control room ${roomName}`
      );
    } finally {
      setTogglingRoom(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "light":
        return "💡";
      case "blinds":
        return "🪟";
      case "outlet":
        return "🔌";
      case "airPurifier":
        return "🌪️";
      default:
        return "📱";
    }
  };

  const getDeviceStatus = (device: TradfriDevice) => {
    if (!device.isReachable) {
      return { text: "Offline", color: "text-red-600 bg-red-100" };
    }

    if (device.isOn !== undefined) {
      return device.isOn
        ? { text: "On", color: "text-green-600 bg-green-100" }
        : { text: "Off", color: "text-gray-600 bg-gray-100" };
    }

    return { text: "Online", color: "text-blue-600 bg-blue-100" };
  };

  const handleBrightnessChange = async (
    device: TradfriDevice,
    brightness: number
  ) => {
    if (device.type !== "light" || !device.isOn) {
      return;
    }

    try {
      const response = await apiService.controlLight(
        device.id,
        true,
        brightness
      );

      if (response.success) {
        // Update the device in the local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            d.id === device.id ? { ...d, brightness } : d
          )
        );
      } else {
        setError(response.error || "Failed to adjust brightness");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to adjust brightness"
      );
    }
  };

  const handleColorChange = async (
    device: TradfriDevice,
    colorHue: number,
    colorSaturation: number
  ) => {
    if (device.type !== "light" || !device.isOn) {
      return;
    }

    try {
      const response = await apiService.controlLight(
        device.id,
        true,
        undefined,
        colorHue,
        colorSaturation
      );

      if (response.success) {
        // Update the device in the local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            d.id === device.id ? { ...d, colorHue, colorSaturation } : d
          )
        );
      } else {
        setError(response.error || "Failed to change color");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change color");
    }
  };

  const handleColorTemperatureChange = async (
    device: TradfriDevice,
    colorTemperature: number
  ) => {
    if (device.type !== "light" || !device.isOn) {
      return;
    }

    try {
      const response = await apiService.controlLightTemperature(
        device.id,
        true,
        undefined,
        colorTemperature
      );

      if (response.success) {
        // Update the device in the local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            d.id === device.id ? { ...d, colorTemperature } : d
          )
        );
      } else {
        setError(response.error || "Failed to change color temperature");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change color temperature"
      );
    }
  };

  // Room-level control handlers
  const handleRoomBrightnessChange = async (
    roomName: string,
    roomDevices: TradfriDevice[],
    brightness: number
  ) => {
    const lights = roomDevices.filter(
      (device) => device.type === "light" && device.isOn && device.isReachable
    );

    if (lights.length === 0) {
      return;
    }

    try {
      // Control all lights in the room
      const promises = lights.map((light) =>
        apiService.controlLight(light.id, true, brightness)
      );

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length === 0) {
        // Update all lights in local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            lights.some((light) => light.id === d.id) ? { ...d, brightness } : d
          )
        );
      } else {
        setError(
          `Failed to adjust brightness for ${failures.length} light(s) in ${roomName}`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to adjust room brightness`
      );
    }
  };

  const handleRoomColorChange = async (
    roomName: string,
    roomDevices: TradfriDevice[],
    colorHue: number,
    colorSaturation: number
  ) => {
    const lights = roomDevices.filter(
      (device) => device.type === "light" && device.isOn && device.isReachable
    );

    if (lights.length === 0) {
      return;
    }

    try {
      // Control all lights in the room
      const promises = lights.map((light) =>
        apiService.controlLight(
          light.id,
          true,
          undefined,
          colorHue,
          colorSaturation
        )
      );

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length === 0) {
        // Update all lights in local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            lights.some((light) => light.id === d.id)
              ? { ...d, colorHue, colorSaturation }
              : d
          )
        );
      } else {
        setError(
          `Failed to change color for ${failures.length} light(s) in ${roomName}`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to change room color`
      );
    }
  };

  const handleRoomColorTemperatureChange = async (
    roomName: string,
    roomDevices: TradfriDevice[],
    colorTemperature: number
  ) => {
    const lights = roomDevices.filter(
      (device) => device.type === "light" && device.isOn && device.isReachable
    );

    if (lights.length === 0) {
      return;
    }

    try {
      // Control all lights in the room
      const promises = lights.map((light) =>
        apiService.controlLightTemperature(
          light.id,
          true,
          undefined,
          colorTemperature
        )
      );

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length === 0) {
        // Update all lights in local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            lights.some((light) => light.id === d.id)
              ? { ...d, colorTemperature }
              : d
          )
        );
      } else {
        setError(
          `Failed to change color temperature for ${failures.length} light(s) in ${roomName}`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to change room color temperature`
      );
    }
  };

  // Helper functions for room-level values
  const getRoomBrightness = (roomDevices: TradfriDevice[]): number => {
    const lights = roomDevices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn &&
        device.brightness !== undefined
    );

    if (lights.length === 0) return 50; // Default brightness

    const avgBrightness =
      lights.reduce((sum, device) => sum + (device.brightness || 50), 0) /
      lights.length;
    return Math.round(avgBrightness);
  };

  const getRoomColorHue = (roomDevices: TradfriDevice[]): number => {
    const lights = roomDevices.filter(
      (device) =>
        device.type === "light" && device.isOn && device.colorHue !== undefined
    );

    if (lights.length === 0) return 0; // Default hue

    const avgHue =
      lights.reduce((sum, device) => sum + (device.colorHue || 0), 0) /
      lights.length;
    return Math.round(avgHue);
  };

  const getRoomColorSaturation = (roomDevices: TradfriDevice[]): number => {
    const lights = roomDevices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn &&
        device.colorSaturation !== undefined
    );

    if (lights.length === 0) return 100; // Default saturation

    const avgSaturation =
      lights.reduce((sum, device) => sum + (device.colorSaturation || 100), 0) /
      lights.length;
    return Math.round(avgSaturation);
  };

  const getRoomColorTemperature = (roomDevices: TradfriDevice[]): number => {
    const lights = roomDevices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn &&
        device.colorTemperature !== undefined
    );

    if (lights.length === 0) return 3000; // Default temperature

    const avgTemperature =
      lights.reduce(
        (sum, device) => sum + (device.colorTemperature || 3000),
        0
      ) / lights.length;
    return Math.round(avgTemperature);
  };

  // Helper function to check if room has RGB vs color temperature lights
  const roomSupportsRgbColor = (roomDevices: TradfriDevice[]): boolean => {
    const lights = roomDevices.filter((device) => device.type === "light");
    return lights.some((device) => supportsRgbColor(device));
  };

  const roomSupportsColorTemperature = (
    roomDevices: TradfriDevice[]
  ): boolean => {
    const lights = roomDevices.filter((device) => device.type === "light");
    return lights.some((device) => supportsColorTemperature(device));
  };

  // Global light control handlers
  const handleGlobalLightsToggle = async () => {
    const allLights = devices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn !== undefined &&
        device.isReachable
    );

    if (allLights.length === 0) {
      return;
    }

    // Determine the new state - if any light is off, turn all on; if all are on, turn all off
    const anyLightOff = allLights.some((light) => !light.isOn);
    const newState = anyLightOff;

    try {
      setTogglingAllLights(true);

      // Toggle all lights
      const togglePromises = allLights.map((light) =>
        apiService.controlLight(light.id, newState)
      );

      const results = await Promise.allSettled(togglePromises);

      // Check for any failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length > 0) {
        setError(`Failed to control ${failures.length} light(s)`);
      }

      // Update successful lights in local state
      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          const isLight = allLights.find((light) => light.id === device.id);
          if (isLight) {
            const result = results[allLights.indexOf(isLight)];
            if (result.status === "fulfilled" && result.value.success) {
              return { ...device, isOn: newState };
            }
          }
          return device;
        })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to control all lights"
      );
    } finally {
      setTogglingAllLights(false);
    }
  };

  const handleGlobalBrightnessChange = async (brightness: number) => {
    // Update local state immediately to prevent loops
    setGlobalBrightnessValue(brightness);

    const allLights = devices.filter(
      (device) => device.type === "light" && device.isOn && device.isReachable
    );

    if (allLights.length === 0) {
      return;
    }

    try {
      // Control all lights
      const promises = allLights.map((light) =>
        apiService.controlLight(light.id, true, brightness)
      );

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length === 0) {
        // Update all lights in local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            allLights.some((light) => light.id === d.id)
              ? { ...d, brightness }
              : d
          )
        );
        // Clear the local override since devices are now updated
        setGlobalBrightnessValue(null);
      } else {
        setError(`Failed to adjust brightness for ${failures.length} light(s)`);
        // Keep the local value on failure
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to adjust global brightness"
      );
    }
  };

  const handleGlobalColorChange = async (
    colorHue: number,
    colorSaturation: number
  ) => {
    // Update local state immediately to prevent loops
    setGlobalColorHueValue(colorHue);
    setGlobalColorSaturationValue(colorSaturation);

    const allLights = devices.filter(
      (device) => device.type === "light" && device.isOn && device.isReachable
    );

    if (allLights.length === 0) {
      return;
    }

    try {
      // Control all lights
      const promises = allLights.map((light) =>
        apiService.controlLight(
          light.id,
          true,
          undefined,
          colorHue,
          colorSaturation
        )
      );

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length === 0) {
        // Update all lights in local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            allLights.some((light) => light.id === d.id)
              ? { ...d, colorHue, colorSaturation }
              : d
          )
        );
        // Clear the local overrides since devices are now updated
        setGlobalColorHueValue(null);
        setGlobalColorSaturationValue(null);
      } else {
        setError(`Failed to change color for ${failures.length} light(s)`);
        // Keep the local values on failure
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change global color"
      );
    }
  };

  const handleGlobalColorTemperatureChange = async (
    colorTemperature: number
  ) => {
    // Update local state immediately to prevent loops
    setGlobalColorTemperatureValue(colorTemperature);

    const allLights = devices.filter(
      (device) => device.type === "light" && device.isOn && device.isReachable
    );

    if (allLights.length === 0) {
      return;
    }

    try {
      // Control all lights
      const promises = allLights.map((light) =>
        apiService.controlLightTemperature(
          light.id,
          true,
          undefined,
          colorTemperature
        )
      );

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failures.length === 0) {
        // Update all lights in local state
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            allLights.some((light) => light.id === d.id)
              ? { ...d, colorTemperature }
              : d
          )
        );
        // Clear the local override since devices are now updated
        setGlobalColorTemperatureValue(null);
      } else {
        setError(
          `Failed to change color temperature for ${failures.length} light(s)`
        );
        // Keep the local value on failure
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change global color temperature"
      );
    }
  };

  // Helper functions for global values
  const getGlobalBrightness = (): number => {
    // Use local override value if available (during user interaction)
    if (globalBrightnessValue !== null) {
      return globalBrightnessValue;
    }

    const lights = devices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn &&
        device.brightness !== undefined
    );

    if (lights.length === 0) return 50; // Default brightness

    const avgBrightness =
      lights.reduce((sum, device) => sum + (device.brightness || 50), 0) /
      lights.length;
    return Math.round(avgBrightness);
  };

  const getGlobalColorHue = (): number => {
    // Use local override value if available (during user interaction)
    if (globalColorHueValue !== null) {
      return globalColorHueValue;
    }

    const lights = devices.filter(
      (device) =>
        device.type === "light" && device.isOn && device.colorHue !== undefined
    );

    if (lights.length === 0) return 0; // Default hue

    const avgHue =
      lights.reduce((sum, device) => sum + (device.colorHue || 0), 0) /
      lights.length;
    return Math.round(avgHue);
  };

  const getGlobalColorSaturation = (): number => {
    // Use local override value if available (during user interaction)
    if (globalColorSaturationValue !== null) {
      return globalColorSaturationValue;
    }

    const lights = devices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn &&
        device.colorSaturation !== undefined
    );

    if (lights.length === 0) return 100; // Default saturation

    const avgSaturation =
      lights.reduce((sum, device) => sum + (device.colorSaturation || 100), 0) /
      lights.length;
    return Math.round(avgSaturation);
  };

  const getGlobalColorTemperature = (): number => {
    // Use local override value if available (during user interaction)
    if (globalColorTemperatureValue !== null) {
      return globalColorTemperatureValue;
    }

    const lights = devices.filter(
      (device) =>
        device.type === "light" &&
        device.isOn &&
        device.colorTemperature !== undefined
    );

    if (lights.length === 0) return 3000; // Default temperature

    const avgTemperature =
      lights.reduce(
        (sum, device) => sum + (device.colorTemperature || 3000),
        0
      ) / lights.length;
    return Math.round(avgTemperature);
  };

  // Helper functions to check global device capabilities
  const globalSupportsRgbColor = (): boolean => {
    const lights = devices.filter(
      (device) => device.type === "light" && device.isOn
    );
    return lights.some((device) => supportsRgbColor(device));
  };

  const globalSupportsColorTemperature = (): boolean => {
    const lights = devices.filter(
      (device) => device.type === "light" && device.isOn
    );
    return lights.some((device) => supportsColorTemperature(device));
  };

  if (loading && devices.length === 0) {
    return (
      <div className={`device-manager ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading devices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`device-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Device Management
        </h1>
        <p className="text-gray-600">
          Manage your IKEA DIRIGERA smart home devices
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search devices by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="sm:w-40">
            <select
              value={deviceTypeFilter}
              onChange={(e) => setDeviceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All types</option>
              {deviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </div>

      {/* Global Light Controls */}
      {(() => {
        const allLights = devices.filter((device) => device.type === "light");
        const reachableLights = allLights.filter(
          (device) => device.isReachable
        );
        const onLights = reachableLights.filter((device) => device.isOn);

        if (allLights.length === 0) return null;

        const anyLightOn = onLights.length > 0;
        const allLightsOn =
          reachableLights.length > 0 &&
          reachableLights.every((device) => device.isOn);

        return (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-medium text-gray-800">
                  💡 All Lights ({allLights.length})
                </h2>
                <span className="text-sm text-gray-600">
                  Status: {anyLightOn ? `${onLights.length} On` : "All Off"}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {/* Global Light Controls Button */}
                {onLights.length > 0 && (
                  <button
                    onClick={() =>
                      setExpandedGlobalControls(!expandedGlobalControls)
                    }
                    className="px-3 py-1 text-sm text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                  >
                    {expandedGlobalControls
                      ? "Hide Global Controls"
                      : "Global Controls"}
                  </button>
                )}

                {/* Global Toggle Switch */}
                <span className="text-sm text-gray-600">All Lights:</span>
                <button
                  onClick={handleGlobalLightsToggle}
                  disabled={togglingAllLights || reachableLights.length === 0}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 ${
                    allLightsOn ? "bg-orange-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      allLightsOn ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                {togglingAllLights && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                )}
              </div>
            </div>

            {/* Expanded Global Controls */}
            {expandedGlobalControls && onLights.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  Global Light Controls - {onLights.length} Active Light
                  {onLights.length !== 1 ? "s" : ""}
                </h3>
                <div className="space-y-4">
                  {/* Global Brightness Control */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Brightness: {getGlobalBrightness()}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={getGlobalBrightness()}
                      onChange={(e) =>
                        handleGlobalBrightnessChange(parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  {/* Conditional Global Color Controls */}
                  {globalSupportsRgbColor() ? (
                    // RGB Color Controls for global lights with RGB support
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Hue: {getGlobalColorHue()}°
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={getGlobalColorHue()}
                            onChange={(e) =>
                              handleGlobalColorChange(
                                parseInt(e.target.value),
                                getGlobalColorSaturation()
                              )
                            }
                            className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Saturation: {getGlobalColorSaturation()}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={getGlobalColorSaturation()}
                            onChange={(e) =>
                              handleGlobalColorChange(
                                getGlobalColorHue(),
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      </div>

                      {/* Global RGB Color Preview */}
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-gray-600">
                          Color Preview:
                        </span>
                        <div
                          className="w-8 h-8 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: `hsl(${getGlobalColorHue()}, ${getGlobalColorSaturation()}%, 50%)`,
                          }}
                        ></div>
                        <span className="text-xs text-gray-500">
                          (
                          {
                            devices.filter(
                              (device) =>
                                device.type === "light" &&
                                device.isOn &&
                                supportsRgbColor(device)
                            ).length
                          }{" "}
                          RGB lights)
                        </span>
                      </div>
                    </>
                  ) : globalSupportsColorTemperature() ? (
                    // Color Temperature Control for global lights with temperature support
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Color Temperature: {getGlobalColorTemperature()}K
                        </label>
                        <input
                          type="range"
                          min="2000"
                          max="6500"
                          value={getGlobalColorTemperature()}
                          onChange={(e) =>
                            handleGlobalColorTemperatureChange(
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background:
                              "linear-gradient(to right, #ffa500 0%, #ffffff 50%, #87ceeb 100%)",
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Warm (2000K)</span>
                          <span>Cool (6500K)</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-gray-600">
                          Global lights:
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {
                            devices.filter(
                              (device) =>
                                device.type === "light" &&
                                device.isOn &&
                                supportsColorTemperature(device)
                            ).length
                          }{" "}
                          temperature-controllable lights)
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg p-1.5 hover:bg-red-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="space-y-6">
        {devices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md">
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📱</div>
              <p className="text-gray-500 text-lg">No devices found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery || deviceTypeFilter
                  ? "Try adjusting your search criteria"
                  : "Make sure your DIRIGERA hub is connected"}
              </p>
            </div>
          </div>
        ) : (
          (() => {
            const groupedDevices = groupDevicesByRoom(devices);
            const roomNames = Object.keys(groupedDevices).sort();

            return roomNames.map((roomName) => {
              const roomDevices = groupedDevices[roomName];
              const controllableDevices = roomDevices.filter(
                (device) =>
                  (device.type === "light" || device.type === "outlet") &&
                  device.isOn !== undefined &&
                  device.isReachable
              );
              const hasControllableDevices = controllableDevices.length > 0;
              const anyDeviceOn = controllableDevices.some(
                (device) => device.isOn
              );
              const allDevicesOn =
                controllableDevices.length > 0 &&
                controllableDevices.every((device) => device.isOn);

              return (
                <div
                  key={roomName}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-800 capitalize">
                        {roomName} ({roomDevices.length})
                      </h2>

                      {/* Room Controls */}
                      {hasControllableDevices && (
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            Room: {anyDeviceOn ? "On" : "Off"}
                          </span>

                          {/* Room Light Controls Button */}
                          {roomDevices.some(
                            (device) =>
                              device.type === "light" &&
                              device.isOn &&
                              device.isReachable
                          ) && (
                            <button
                              onClick={() =>
                                setExpandedRoom(
                                  expandedRoom === roomName ? null : roomName
                                )
                              }
                              className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                            >
                              {expandedRoom === roomName
                                ? "Hide Room Controls"
                                : "Room Controls"}
                            </button>
                          )}

                          <button
                            onClick={() =>
                              handleRoomToggle(roomName, roomDevices)
                            }
                            disabled={togglingRoom === roomName}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                              allDevicesOn ? "bg-blue-600" : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                allDevicesOn ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          {togglingRoom === roomName && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded Room Controls */}
                    {expandedRoom === roomName &&
                      roomDevices.some(
                        (device) =>
                          device.type === "light" &&
                          device.isOn &&
                          device.isReachable
                      ) && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-700 mb-4">
                            Room Light Controls - {roomName}
                          </h3>
                          <div className="space-y-4">
                            {/* Room Brightness Control */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Room Brightness:{" "}
                                {getRoomBrightness(roomDevices)}%
                              </label>
                              <input
                                type="range"
                                min="1"
                                max="100"
                                value={getRoomBrightness(roomDevices)}
                                onChange={(e) =>
                                  handleRoomBrightnessChange(
                                    roomName,
                                    roomDevices,
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            {/* Conditional Room Color Controls */}
                            {roomSupportsRgbColor(roomDevices) ? (
                              // RGB Color Controls (Hue/Saturation) for rooms with RGB lights
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Room Hue: {getRoomColorHue(roomDevices)}°
                                    </label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="360"
                                      value={getRoomColorHue(roomDevices)}
                                      onChange={(e) =>
                                        handleRoomColorChange(
                                          roomName,
                                          roomDevices,
                                          parseInt(e.target.value),
                                          getRoomColorSaturation(roomDevices)
                                        )
                                      }
                                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                      style={{
                                        background:
                                          "linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))",
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Room Saturation:{" "}
                                      {getRoomColorSaturation(roomDevices)}%
                                    </label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={getRoomColorSaturation(
                                        roomDevices
                                      )}
                                      onChange={(e) =>
                                        handleRoomColorChange(
                                          roomName,
                                          roomDevices,
                                          getRoomColorHue(roomDevices),
                                          parseInt(e.target.value)
                                        )
                                      }
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Room RGB Color Preview */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">
                                    Room Color Preview:
                                  </span>
                                  <div
                                    className="w-8 h-8 rounded-full border border-gray-300"
                                    style={{
                                      backgroundColor: `hsl(${getRoomColorHue(
                                        roomDevices
                                      )}, ${getRoomColorSaturation(
                                        roomDevices
                                      )}%, 50%)`,
                                    }}
                                  ></div>
                                  <span className="text-xs text-gray-500">
                                    (
                                    {
                                      roomDevices.filter(
                                        (d) =>
                                          d.type === "light" &&
                                          d.isOn &&
                                          d.isReachable &&
                                          supportsRgbColor(d)
                                      ).length
                                    }{" "}
                                    RGB lights)
                                  </span>
                                </div>
                              </>
                            ) : roomSupportsColorTemperature(roomDevices) ? (
                              // Color Temperature Control for rooms with temperature-only lights
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Room Color Temperature:{" "}
                                  {getRoomColorTemperature(roomDevices)}K
                                </label>
                                <input
                                  type="range"
                                  min="2000"
                                  max="6500"
                                  value={getRoomColorTemperature(roomDevices)}
                                  onChange={(e) =>
                                    handleRoomColorTemperatureChange(
                                      roomName,
                                      roomDevices,
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                  style={{
                                    background:
                                      "linear-gradient(to right, #ffa500 0%, #ffffff 50%, #87ceeb 100%)",
                                  }}
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>Warm (2000K)</span>
                                  <span>Cool (6500K)</span>
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-sm text-gray-600">
                                    Room lights:
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    (
                                    {
                                      roomDevices.filter(
                                        (d) =>
                                          d.type === "light" &&
                                          d.isOn &&
                                          d.isReachable &&
                                          supportsColorTemperature(d)
                                      ).length
                                    }{" "}
                                    temperature-controllable lights)
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="divide-y divide-gray-200">
                    {roomDevices.map((device) => {
                      const status = getDeviceStatus(device);
                      const isEditing = editingDevice === device.id;
                      const isUpdating = updating === device.id;

                      return (
                        <React.Fragment key={device.id}>
                          <div className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-2xl">
                                  {getDeviceIcon(device.type)}
                                </div>
                                <div className="flex-1">
                                  {isEditing ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) =>
                                          setNewName(e.target.value)
                                        }
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                        onKeyPress={(e) => {
                                          if (e.key === "Enter") {
                                            handleEditSave(device.id);
                                          } else if (e.key === "Escape") {
                                            handleEditCancel();
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() =>
                                          handleEditSave(device.id)
                                        }
                                        disabled={isUpdating || !newName.trim()}
                                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                      >
                                        {isUpdating ? "..." : "Save"}
                                      </button>
                                      <button
                                        onClick={handleEditCancel}
                                        disabled={isUpdating}
                                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <h3 className="text-lg font-medium text-gray-800">
                                        {device.name}
                                      </h3>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-sm text-gray-500 capitalize">
                                          {device.type}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-gray-400">
                                          ID: {device.id}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                {/* Device Status */}
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}
                                >
                                  {status.text}
                                </span>

                                {/* Device Details */}
                                {device.brightness !== undefined && (
                                  <span className="text-sm text-gray-500">
                                    {device.brightness}%
                                  </span>
                                )}

                                {/* Device Toggle Switch */}
                                {(device.type === "light" ||
                                  device.type === "outlet") &&
                                  device.isOn !== undefined &&
                                  device.isReachable && (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-500 capitalize">
                                        {device.type}:
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleDeviceToggle(device)
                                        }
                                        disabled={togglingDevice === device.id}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                                          device.isOn
                                            ? "bg-blue-600"
                                            : "bg-gray-200"
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            device.isOn
                                              ? "translate-x-6"
                                              : "translate-x-1"
                                          }`}
                                        />
                                      </button>
                                      {togglingDevice === device.id && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                      )}
                                    </div>
                                  )}

                                {/* Edit Button */}
                                {!isEditing && (
                                  <button
                                    onClick={() => handleEditStart(device)}
                                    disabled={isUpdating}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                  >
                                    Edit Name
                                  </button>
                                )}

                                {/* Light Controls Button */}
                                {device.type === "light" &&
                                  device.isOn &&
                                  device.isReachable && (
                                    <button
                                      onClick={() =>
                                        setExpandedDevice(
                                          expandedDevice === device.id
                                            ? null
                                            : device.id
                                        )
                                      }
                                      className="px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    >
                                      {expandedDevice === device.id
                                        ? "Hide Controls"
                                        : "Controls"}
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Light Controls */}
                          {expandedDevice === device.id &&
                            device.type === "light" &&
                            device.isOn && (
                              <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                                <div className="mt-4 space-y-4">
                                  {/* Brightness Control */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Brightness: {device.brightness || 50}%
                                    </label>
                                    <input
                                      type="range"
                                      min="1"
                                      max="100"
                                      value={device.brightness || 50}
                                      onChange={(e) =>
                                        handleBrightnessChange(
                                          device,
                                          parseInt(e.target.value)
                                        )
                                      }
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>

                                  {/* Color Controls */}
                                  {supportsRgbColor(device) && (
                                    // RGB Color Controls (Hue/Saturation)
                                    <>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hue: {device.colorHue || 0}°
                                          </label>
                                          <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            value={device.colorHue || 0}
                                            onChange={(e) =>
                                              handleColorChange(
                                                device,
                                                parseInt(e.target.value),
                                                device.colorSaturation || 100
                                              )
                                            }
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                            style={{
                                              background:
                                                "linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))",
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Saturation:{" "}
                                            {device.colorSaturation || 100}%
                                          </label>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={
                                              device.colorSaturation || 100
                                            }
                                            onChange={(e) =>
                                              handleColorChange(
                                                device,
                                                device.colorHue || 0,
                                                parseInt(e.target.value)
                                              )
                                            }
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                      </div>

                                      {/* Color Preview */}
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600">
                                          Color Preview:
                                        </span>
                                        <div
                                          className="w-8 h-8 rounded-full border border-gray-300"
                                          style={{
                                            backgroundColor: `hsl(${
                                              device.colorHue || 0
                                            }, ${
                                              device.colorSaturation || 100
                                            }%, 50%)`,
                                          }}
                                        />
                                      </div>
                                    </>
                                  )}

                                  {supportsColorTemperature(device) && (
                                    // Color Temperature Control
                                    <div
                                      className={
                                        supportsRgbColor(device) ? "mt-4" : ""
                                      }
                                    >
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color Temperature:{" "}
                                        {device.colorTemperature || 3000}K
                                      </label>
                                      <input
                                        type="range"
                                        min="2000"
                                        max="6500"
                                        value={device.colorTemperature || 3000}
                                        onChange={(e) =>
                                          handleColorTemperatureChange(
                                            device,
                                            parseInt(e.target.value)
                                          )
                                        }
                                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                        style={{
                                          background:
                                            "linear-gradient(to right, #ffa500 0%, #ffffff 50%, #87ceeb 100%)",
                                        }}
                                      />
                                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Warm (2000K)</span>
                                        <span>Cool (6500K)</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={loadDevices}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "Refresh Devices"}
        </button>
      </div>
    </div>
  );
};
