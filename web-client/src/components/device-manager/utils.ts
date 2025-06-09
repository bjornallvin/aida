import { TradfriDevice } from "../../services/apiService";

// Helper function to determine if a light supports RGB color vs color temperature only
export const supportsRgbColor = (device: TradfriDevice): boolean => {
  // If device has colorHue or colorSaturation defined, it supports RGB
  return device.colorHue !== undefined || device.colorSaturation !== undefined;
};

export const supportsColorTemperature = (device: TradfriDevice): boolean => {
  // If device has colorTemperature defined, it supports color temperature
  return device.colorTemperature !== undefined;
};

// Helper function to extract room name from device name
export const getRoomName = (deviceName: string): string => {
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
export const groupDevicesByRoom = (devices: TradfriDevice[]) => {
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

// Helper function to check if device is controllable
export const isControllableDevice = (device: TradfriDevice): boolean => {
  return (
    (device.type === "light" || device.type === "outlet") &&
    device.isOn !== undefined
  );
};
