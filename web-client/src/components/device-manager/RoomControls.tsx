import React from "react";
import { RoomControlsProps } from "./types";

export const RoomControls: React.FC<RoomControlsProps> = ({
  roomName,
  devices,
  onToggleRoom,
  onSetRoomBrightness,
  onSetRoomColor,
}) => {
  const lightDevices = devices.filter(
    (d) => d.type === "light" && d.isReachable
  );
  const onDevices = lightDevices.filter((d) => d.isOn);
  const allOn =
    lightDevices.length > 0 && onDevices.length === lightDevices.length;
  const someOn = onDevices.length > 0;

  if (lightDevices.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: "1rem",
        marginBottom: "1rem",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h4
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: "600",
              color: "#333",
            }}
          >
            {roomName} Controls
          </h4>
          <span
            style={{
              padding: "2px 8px",
              backgroundColor: someOn ? "#4caf50" : "#757575",
              color: "white",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: "500",
            }}
          >
            {onDevices.length}/{lightDevices.length} on
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onToggleRoom(true)}
            disabled={allOn}
            style={{
              padding: "6px 12px",
              backgroundColor: allOn ? "#e0e0e0" : "#4caf50",
              color: allOn ? "#999" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: allOn ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
              fontWeight: "500",
            }}
          >
            All On
          </button>
          <button
            onClick={() => onToggleRoom(false)}
            disabled={!someOn}
            style={{
              padding: "6px 12px",
              backgroundColor: !someOn ? "#e0e0e0" : "#f44336",
              color: !someOn ? "#999" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: !someOn ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
              fontWeight: "500",
            }}
          >
            All Off
          </button>
        </div>
      </div>

      {someOn && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Room Brightness Control */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#555",
                marginBottom: "0.25rem",
              }}
            >
              Room Brightness
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => onSetRoomBrightness(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "#ddd",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Room Color Control */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#555",
                marginBottom: "0.25rem",
              }}
            >
              Room Color
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { name: "Warm White", color: { r: 255, g: 247, b: 220 } },
                { name: "Cool White", color: { r: 220, g: 235, b: 255 } },
                { name: "Red", color: { r: 255, g: 0, b: 0 } },
                { name: "Green", color: { r: 0, g: 255, b: 0 } },
                { name: "Blue", color: { r: 0, g: 0, b: 255 } },
                { name: "Purple", color: { r: 128, g: 0, b: 128 } },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onSetRoomColor(preset.color)}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})`,
                    color:
                      preset.color.r + preset.color.g + preset.color.b > 400
                        ? "#000"
                        : "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
