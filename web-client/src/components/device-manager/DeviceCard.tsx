import React from "react";
import { DeviceCardProps } from "./types";
import { DeviceControls } from "./DeviceControls";

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isEditing,
  editedName,
  onToggleEdit,
  onNameChange,
  onSaveName,
  onCancelEdit,
  onToggleDevice,
  onBrightnessChange,
  onColorChange,
  onColorTemperatureChange,
}) => {
  const getDeviceIcon = () => {
    switch (device.type) {
      case "light":
        return device.isOn ? "💡" : "🔘";
      case "outlet":
        return device.isOn ? "🔌" : "⚫";
      case "blind":
        return "🪟";
      default:
        return "📱";
    }
  };

  const getStatusColor = () => {
    if (!device.isReachable) return "#f44336";
    return device.isOn ? "#4caf50" : "#757575";
  };

  const getStatusText = () => {
    if (!device.isReachable) return "Unreachable";
    return device.isOn ? "On" : "Off";
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "1rem",
        backgroundColor: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        transition: "all 0.3s ease",
        opacity: device.isReachable ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(0)";
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
          <span style={{ fontSize: "1.5rem" }}>{getDeviceIcon()}</span>
          <div>
            {isEditing ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => onNameChange(e.target.value)}
                  onBlur={onSaveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveName();
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  autoFocus
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "1.1rem",
                    fontWeight: "500",
                  }}
                />
                <button
                  onClick={onSaveName}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                {device.name}
              </h3>
            )}
            <p
              style={{
                margin: "0.25rem 0 0 0",
                fontSize: "0.9rem",
                color: "#666",
              }}
            >
              {device.type} • ID: {device.id}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              padding: "4px 8px",
              backgroundColor: getStatusColor(),
              color: "white",
              borderRadius: "12px",
              fontSize: "0.8rem",
              fontWeight: "500",
            }}
          >
            {getStatusText()}
          </span>
          <button
            onClick={onToggleEdit}
            disabled={!device.isReachable}
            style={{
              padding: "6px",
              backgroundColor: device.isReachable ? "#f5f5f5" : "#e0e0e0",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: device.isReachable ? "pointer" : "not-allowed",
              fontSize: "0.9rem",
            }}
          >
            ✏️
          </button>
        </div>
      </div>

      {device.type === "light" && device.isReachable && (
        <DeviceControls
          device={device}
          onBrightnessChange={(device, brightness) =>
            onBrightnessChange(brightness)
          }
          onColorHueChange={() => {
            // Convert hue to RGB for the color change callback
            const color = { r: 255, g: 0, b: 0 }; // Placeholder conversion
            onColorChange(color);
          }}
          onColorSaturationChange={() => {
            // Handle saturation change - placeholder
          }}
          onColorTemperatureChange={(device, temperature) =>
            onColorTemperatureChange(temperature)
          }
        />
      )}

      {device.type === "blind" && device.isReachable && (
        <div>
          <p
            style={{
              marginBottom: "0.5rem",
              fontSize: "0.9rem",
              color: "#666",
            }}
          >
            Position: {device.currentLevel ?? 0}%
          </p>
          <input
            type="range"
            min="0"
            max="100"
            value={device.targetLevel ?? 0}
            onChange={(e) => {
              // Handle blind position change
              // This would need to be implemented in the parent component
              console.log("Blind position change:", e.target.value);
            }}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {device.type === "outlet" && device.isReachable && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
            Status: {device.isOn ? "On" : "Off"}
          </p>
          <button
            onClick={onToggleDevice}
            style={{
              padding: "6px 12px",
              backgroundColor: device.isOn ? "#f44336" : "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {device.isOn ? "Turn Off" : "Turn On"}
          </button>
        </div>
      )}
    </div>
  );
};
