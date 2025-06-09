import React from "react";
import { DeviceFilters } from "./DeviceFilters";
import { GlobalControls } from "./GlobalControls";
import { DeviceList } from "./DeviceList";
import { useDeviceManager } from "../../hooks/device-manager/useDeviceManager";
import { useDeviceControls } from "../../hooks/device-manager/useDeviceControls";
import { useDeviceColorControls } from "../../hooks/device-manager/useDeviceColorControls";
import { rgbToHueSaturation } from "../../utils/colorConversion";

export const DeviceManager: React.FC = () => {
  const { state, loadDevices, updateState, updateDevice } = useDeviceManager();

  // Extract state properties for easier access
  const {
    devices,
    loading: isLoading,
    error,
    editingDevice: editingDeviceId,
    newName: editedName,
    searchQuery: searchTerm,
    deviceTypeFilter: selectedType,
  } = state;

  const deviceControls = useDeviceControls({
    updateState,
    updateDevice,
    devices,
  });
  const colorControls = useDeviceColorControls({ updateState, updateDevice });

  // Create filtered devices based on search and type filter
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      !searchTerm ||
      device.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || device.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Get selected room from search query (simplified)
  const selectedRoom = "";

  // Helper functions to match expected interface
  const setSearchTerm = (term: string) => updateState({ searchQuery: term });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setSelectedRoom = (_room: string) => {}; // Not implemented in original
  const setSelectedType = (type: string) =>
    updateState({ deviceTypeFilter: type });
  const refreshDevices = loadDevices;

  const startEditingDevice = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      updateState({ editingDevice: deviceId, newName: device.name });
    }
  };

  const setEditedName = (name: string) => updateState({ newName: name });

  const saveDeviceName = async () => {
    if (editingDeviceId && editedName) {
      await deviceControls.handleEditSave(editingDeviceId, editedName);
      updateState({ editingDevice: null, newName: "" });
    }
  };

  const cancelEditing = () => updateState({ editingDevice: null, newName: "" });

  // Map control functions to expected interface
  const toggleDevice = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      return deviceControls.handleDeviceToggle(device);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleAllDevices = (_turnOn: boolean) => {
    return deviceControls.handleToggleAllLights();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleRoomDevices = (roomName: string, _turnOn: boolean) => {
    const roomDevices = devices.filter((d) => d.name.startsWith(roomName));
    return deviceControls.handleRoomToggle(roomName, roomDevices);
  };

  const setBrightness = (deviceId: string, brightness: number) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      return colorControls.handleBrightnessChange(device, brightness);
    }
  };

  const setGlobalBrightness = async (brightness: number) => {
    // Get all reachable light devices and control them all
    const lightDevices = devices.filter(
      (d) => d.type === "light" && d.isReachable
    );
    if (lightDevices.length > 0) {
      await Promise.all(
        lightDevices.map(device => colorControls.handleBrightnessChange(device, brightness))
      );
    }
  };

  const setRoomBrightness = async (roomName: string, brightness: number) => {
    // Get all reachable lights in the room and control them all
    const roomDevices = devices.filter(
      (d) => d.name.startsWith(roomName) && d.type === "light" && d.isReachable
    );
    if (roomDevices.length > 0) {
      await Promise.all(
        roomDevices.map(device => colorControls.handleBrightnessChange(device, brightness))
      );
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setColor = (
    deviceId: string,
    color: { r: number; g: number; b: number }
  ) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      // Convert RGB to hue/saturation using proper conversion
      const { hue, saturation } = rgbToHueSaturation(color);
      console.log(
        "Setting color:",
        color,
        "converted to hue:",
        hue,
        "saturation:",
        saturation
      ); // For debugging
      return colorControls.handleColorHueChange(device, hue);
    }
  };

  const setRoomColor = async (
    roomName: string,
    color: { r: number; g: number; b: number }
  ) => {
    // Convert RGB to hue/saturation using proper conversion
    const { hue, saturation } = rgbToHueSaturation(color);
    console.log(
      "Setting room color:",
      roomName,
      color,
      "converted to hue:",
      hue,
      "saturation:",
      saturation
    ); // For debugging
    
    // Get all reachable lights in the room and control them all
    const roomDevices = devices.filter(
      (d) => d.name.startsWith(roomName) && d.type === "light" && d.isReachable
    );
    if (roomDevices.length > 0) {
      await Promise.all(
        roomDevices.map(device => colorControls.handleColorHueChange(device, hue))
      );
    }
  };

  const setColorTemperature = (deviceId: string, temperature: number) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      return colorControls.handleColorTemperatureChange(device, temperature);
    }
  };

  const setColorSaturation = (deviceId: string, saturation: number) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      return colorControls.handleColorSaturationChange(device, saturation);
    }
  };

  const setColorHue = (deviceId: string, hue: number) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      return colorControls.handleColorHueChange(device, hue);
    }
  };

  // Room control functions that affect all lights in the room
  const setRoomHue = async (roomName: string, hue: number) => {
    const roomDevices = devices.filter(
      (d) => d.name.startsWith(roomName) && d.type === "light" && d.isReachable
    );
    if (roomDevices.length > 0) {
      await Promise.all(
        roomDevices.map((device) =>
          colorControls.handleColorHueChange(device, hue)
        )
      );
    }
  };

  const setRoomSaturation = async (roomName: string, saturation: number) => {
    const roomDevices = devices.filter(
      (d) => d.name.startsWith(roomName) && d.type === "light" && d.isReachable
    );
    if (roomDevices.length > 0) {
      await Promise.all(
        roomDevices.map((device) =>
          colorControls.handleColorSaturationChange(device, saturation)
        )
      );
    }
  };

  const setRoomTemperature = async (roomName: string, temperature: number) => {
    const roomDevices = devices.filter(
      (d) => d.name.startsWith(roomName) && d.type === "light" && d.isReachable
    );
    if (roomDevices.length > 0) {
      await Promise.all(
        roomDevices.map((device) =>
          colorControls.handleColorTemperatureChange(device, temperature)
        )
      );
    }
  };

  // Global control functions that affect all lights
  const setGlobalHue = async (hue: number) => {
    const lightDevices = devices.filter(
      (d) => d.type === "light" && d.isReachable
    );
    if (lightDevices.length > 0) {
      await Promise.all(
        lightDevices.map(device => colorControls.handleColorHueChange(device, hue))
      );
    }
  };

  const setGlobalSaturation = async (saturation: number) => {
    const lightDevices = devices.filter(
      (d) => d.type === "light" && d.isReachable
    );
    if (lightDevices.length > 0) {
      await Promise.all(
        lightDevices.map(device => colorControls.handleColorSaturationChange(device, saturation))
      );
    }
  };

  const setGlobalTemperature = async (temperature: number) => {
    const lightDevices = devices.filter(
      (d) => d.type === "light" && d.isReachable
    );
    if (lightDevices.length > 0) {
      await Promise.all(
        lightDevices.map(device => colorControls.handleColorTemperatureChange(device, temperature))
      );
    }
  };

  if (error) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ padding: "1rem" }}>
          <div
            style={{
              backgroundColor: "#fee",
              color: "#c00",
              padding: "1rem",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Device Manager
          </h1>
          <p style={{ color: "#666" }}>
            Unable to load devices. Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ padding: "1rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Device Manager
        </h1>

        <DeviceFilters
          searchTerm={searchTerm}
          selectedRoom={selectedRoom}
          selectedType={selectedType}
          devices={devices}
          onSearchChange={setSearchTerm}
          onRoomChange={setSelectedRoom}
          onTypeChange={setSelectedType}
        />

        <GlobalControls
          devices={devices}
          onToggleAll={toggleAllDevices}
          onSetGlobalBrightness={setGlobalBrightness}
          onSetGlobalHue={setGlobalHue}
          onSetGlobalSaturation={setGlobalSaturation}
          onSetGlobalTemperature={setGlobalTemperature}
          onRefreshDevices={refreshDevices}
          isLoading={isLoading}
        />

        <DeviceList
          devices={filteredDevices}
          editingDeviceId={editingDeviceId}
          editedName={editedName}
          onToggleEdit={startEditingDevice}
          onNameChange={setEditedName}
          onSaveName={saveDeviceName}
          onCancelEdit={cancelEditing}
          onToggleDevice={toggleDevice}
          onBrightnessChange={setBrightness}
          onColorHueChange={setColorHue}
          onColorSaturationChange={setColorSaturation}
          onColorTemperatureChange={setColorTemperature}
          onToggleRoom={toggleRoomDevices}
          onSetRoomBrightness={setRoomBrightness}
          onSetRoomColor={setRoomColor}
          onSetRoomHue={setRoomHue}
          onSetRoomSaturation={setRoomSaturation}
          onSetRoomTemperature={setRoomTemperature}
        />
      </div>
    </div>
  );
};
