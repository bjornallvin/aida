import React from "react";
import { GlobalControlsProps } from "./types";

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  devices,
  onToggleAll,
  onSetGlobalBrightness,
  onSetGlobalColor,
  onRefreshDevices,
  isLoading,
}) => {
  const reachableDevices = devices.filter((d) => d.isReachable);
  const lightDevices = reachableDevices.filter((d) => d.type === "light");
  const onDevices = lightDevices.filter((d) => d.isOn);

  const allOn =
    lightDevices.length > 0 && onDevices.length === lightDevices.length;
  const someOn = onDevices.length > 0;

  return (
    <div
      style={{
        padding: "1.5rem",
        marginBottom: "1.5rem",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Global Controls</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span>
          {reachableDevices.length} devices ({onDevices.length} lights on)
        </span>

        <button
          onClick={onRefreshDevices}
          disabled={isLoading}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>

        {lightDevices.length > 0 && (
          <button
            onClick={() => onToggleAll(!allOn)}
            style={{
              padding: "0.5rem 1rem",
              border: allOn ? "1px solid #f44336" : "1px solid #4caf50",
              borderRadius: "4px",
              backgroundColor: allOn ? "#f44336" : "#4caf50",
              color: "white",
              cursor: "pointer",
            }}
          >
            {allOn ? "Turn All Off" : "Turn All On"}
          </button>
        )}
      </div>

      {someOn && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minWidth: "200px",
            }}
          >
            <span style={{ minWidth: "80px" }}>Global Brightness:</span>
            <input
              type="range"
              min="1"
              max="254"
              defaultValue="127"
              onChange={(e) => onSetGlobalBrightness(parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Global Color:</span>
            <input
              type="color"
              onChange={(e) => {
                // Convert hex to RGB
                const hex = e.target.value;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                onSetGlobalColor({ r, g, b });
              }}
              style={{
                width: "50px",
                height: "35px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
