import React from "react";
import { DeviceFilters } from "./DeviceFilters";
import { GlobalControls } from "./GlobalControls";
import { DeviceList } from "./DeviceList";
import { useDeviceManager } from "../../hooks/device-manager/useDeviceManager";
import { useDeviceControls } from "../../hooks/device-manager/useDeviceControls";
import { useDeviceColorControls } from "../../hooks/device-manager/useDeviceColorControls";

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

  const setGlobalBrightness = (brightness: number) => {
    // Use first light device as proxy for global operation
    const lightDevice = devices.find((d) => d.type === "light");
    if (lightDevice) {
      return colorControls.handleBrightnessChange(lightDevice, brightness);
    }
  };

  const setRoomBrightness = (roomName: string, brightness: number) => {
    // Find first light in room and use as proxy
    const roomDevice = devices.find(
      (d) => d.name.startsWith(roomName) && d.type === "light"
    );
    if (roomDevice) {
      return colorControls.handleBrightnessChange(roomDevice, brightness);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setColor = (
    deviceId: string,
    _color: { r: number; g: number; b: number }
  ) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      // Convert RGB to hue/saturation - simplified
      const hue = Math.floor(Math.random() * 360); // Placeholder
      return colorControls.handleColorHueChange(device, hue);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setGlobalColor = (_color: { r: number; g: number; b: number }) => {
    const hue = Math.floor(Math.random() * 360); // Placeholder
    const lightDevice = devices.find((d) => d.type === "light");
    if (lightDevice) {
      return colorControls.handleColorHueChange(lightDevice, hue);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setRoomColor = (
    roomName: string,
    _color: { r: number; g: number; b: number }
  ) => {
    const hue = Math.floor(Math.random() * 360); // Placeholder
    const roomDevice = devices.find(
      (d) => d.name.startsWith(roomName) && d.type === "light"
    );
    if (roomDevice) {
      return colorControls.handleColorHueChange(roomDevice, hue);
    }
  };

  const setColorTemperature = (deviceId: string, temperature: number) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      return colorControls.handleColorTemperatureChange(device, temperature);
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
          onSetGlobalColor={setGlobalColor}
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
          onColorChange={setColor}
          onColorTemperatureChange={setColorTemperature}
          onToggleRoom={toggleRoomDevices}
          onSetRoomBrightness={setRoomBrightness}
          onSetRoomColor={setRoomColor}
        />
      </div>
    </div>
  );
};
