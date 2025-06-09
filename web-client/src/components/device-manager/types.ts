import { TradfriDevice } from "../../services/apiService";

export interface DeviceManagerProps {
  className?: string;
}

export interface DeviceFiltersProps {
  searchTerm: string;
  selectedRoom: string;
  selectedType: string;
  devices: TradfriDevice[];
  onSearchChange: (query: string) => void;
  onRoomChange: (room: string) => void;
  onTypeChange: (type: string) => void;
}

export interface DeviceCardProps {
  device: TradfriDevice;
  isEditing: boolean;
  editedName: string;
  onToggleEdit: () => void;
  onNameChange: (name: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onToggleDevice: () => void;
  onBrightnessChange: (brightness: number) => void;
  onColorHueChange: (hue: number) => void;
  onColorSaturationChange: (saturation: number) => void;
  onColorTemperatureChange: (temperature: number) => void;
}

export interface RoomControlsProps {
  roomName: string;
  devices: TradfriDevice[];
  onToggleRoom: (turnOn: boolean) => void;
  onSetRoomBrightness: (brightness: number) => void;
  onSetRoomColor: (color: { r: number; g: number; b: number }) => void;
  onSetRoomHue: (hue: number) => void;
  onSetRoomSaturation: (saturation: number) => void;
  onSetRoomTemperature: (temperature: number) => void;
}

export interface GlobalControlsProps {
  devices: TradfriDevice[];
  onToggleAll: (turnOn: boolean) => void;
  onSetGlobalBrightness: (brightness: number) => void;
  onSetGlobalColor: (color: { r: number; g: number; b: number }) => void;
  onRefreshDevices: () => void;
  isLoading: boolean;
}

export interface DeviceListProps {
  devices: TradfriDevice[];
  editingDeviceId: string | null;
  editedName: string;
  onToggleEdit: (deviceId: string) => void;
  onNameChange: (name: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onToggleDevice: (deviceId: string) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onColorHueChange: (deviceId: string, hue: number) => void;
  onColorSaturationChange: (deviceId: string, saturation: number) => void;
  onColorTemperatureChange: (deviceId: string, temperature: number) => void;
  onToggleRoom: (roomName: string, turnOn: boolean) => void;
  onSetRoomBrightness: (roomName: string, brightness: number) => void;
  onSetRoomColor: (
    roomName: string,
    color: { r: number; g: number; b: number }
  ) => void;
  onSetRoomHue: (roomName: string, hue: number) => void;
  onSetRoomSaturation: (roomName: string, saturation: number) => void;
  onSetRoomTemperature: (roomName: string, temperature: number) => void;
}

export interface DeviceControlsProps {
  device: TradfriDevice;
  onBrightnessChange: (device: TradfriDevice, brightness: number) => void;
  onColorHueChange: (device: TradfriDevice, hue: number) => void;
  onColorSaturationChange: (device: TradfriDevice, saturation: number) => void;
  onColorTemperatureChange: (
    device: TradfriDevice,
    temperature: number
  ) => void;
}

export interface DeviceManagerState {
  devices: TradfriDevice[];
  loading: boolean;
  error: string | null;
  editingDevice: string | null;
  newName: string;
  searchQuery: string;
  deviceTypeFilter: string;
  updating: string | null;
  togglingDevice: string | null;
  togglingRoom: string | null;
  expandedDevice: string | null;
  expandedRoom: string | null;
  expandedGlobalControls: boolean;
  togglingAllLights: boolean;
  globalBrightnessValue: number | null;
  globalColorHueValue: number | null;
  globalColorSaturationValue: number | null;
  globalColorTemperatureValue: number | null;
}

export const deviceTypes = ["light", "blinds", "outlet", "airPurifier"];
