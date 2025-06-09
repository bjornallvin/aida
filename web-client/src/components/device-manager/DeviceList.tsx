import React, { useState } from "react";
import { DeviceListProps } from "./types";
import { DeviceCard } from "./DeviceCard";
import { RoomControls } from "./RoomControls";
import { groupDevicesByRoom } from "./utils";

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  editingDeviceId,
  editedName,
  onToggleEdit,
  onNameChange,
  onSaveName,
  onCancelEdit,
  onToggleDevice,
  onBrightnessChange,
  onColorChange,
  onColorTemperatureChange,
  onToggleRoom,
  onSetRoomBrightness,
  onSetRoomColor,
}) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const devicesByRoom = groupDevicesByRoom(devices);

  const toggleRoomExpansion = (roomName: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomName)) {
      newExpanded.delete(roomName);
    } else {
      newExpanded.add(roomName);
    }
    setExpandedRooms(newExpanded);
  };

  if (devices.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <h3 style={{ color: "#666", marginBottom: "0.5rem" }}>
          No devices found
        </h3>
        <p style={{ color: "#888", margin: 0 }}>
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div>
      {Object.entries(devicesByRoom).map(([roomName, roomDevices]) => {
        const isExpanded = expandedRooms.has(roomName);

        return (
          <div
            key={roomName}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              marginBottom: "1rem",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggleRoomExpansion(roomName)}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: "#f5f5f5",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "1.1rem",
                fontWeight: "bold",
              }}
            >
              <span>
                {roomName} ({roomDevices.length} devices)
              </span>
              <span
                style={{
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                ▼
              </span>
            </button>

            {isExpanded && (
              <div style={{ padding: "1rem" }}>
                <RoomControls
                  roomName={roomName}
                  devices={roomDevices}
                  onToggleRoom={(turnOn) => onToggleRoom(roomName, turnOn)}
                  onSetRoomBrightness={(brightness) =>
                    onSetRoomBrightness(roomName, brightness)
                  }
                  onSetRoomColor={(color) => onSetRoomColor(roomName, color)}
                />

                {roomDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    isEditing={editingDeviceId === device.id}
                    editedName={editedName}
                    onToggleEdit={() => onToggleEdit(device.id)}
                    onNameChange={onNameChange}
                    onSaveName={onSaveName}
                    onCancelEdit={onCancelEdit}
                    onToggleDevice={() => onToggleDevice(device.id)}
                    onBrightnessChange={(brightness) =>
                      onBrightnessChange(device.id, brightness)
                    }
                    onColorChange={(color) => onColorChange(device.id, color)}
                    onColorTemperatureChange={(temp) =>
                      onColorTemperatureChange(device.id, temp)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
