import React from "react";
import { GlobalControlsProps } from "./types";

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  devices,
  onToggleAll,
  onSetGlobalBrightness,
  onSetGlobalHue,
  onSetGlobalSaturation,
  onSetGlobalTemperature,
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
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginTop: "1rem",
          }}
        >
          {/* Global Brightness Control */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#555",
                marginBottom: "0.5rem",
              }}
            >
              Global Brightness
            </label>
            <input
              type="range"
              min="1"
              max="254"
              defaultValue="127"
              onChange={(e) => onSetGlobalBrightness(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "4px",
                background:
                  "linear-gradient(to right, #000000 0%, #ffffff 100%)",
                outline: "none",
                cursor: "pointer",
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>

          {/* Global Hue Control */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#555",
                marginBottom: "0.5rem",
              }}
            >
              Global Hue
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="range"
                min="0"
                max="360"
                defaultValue="180"
                onChange={(e) => {
                  const hue = parseInt(e.target.value);
                  onSetGlobalHue(hue);
                }}
                className="global-hue-slider"
                style={{
                  width: "100%",
                  height: "12px",
                  borderRadius: "6px",
                  background:
                    "linear-gradient(to right, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)",
                  outline: "none",
                  cursor: "pointer",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              />
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  .global-hue-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2px solid #333;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .global-hue-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2px solid #333;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border: none;
                  }
                `,
                }}
              />
            </div>
          </div>

          {/* Global Saturation Control */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#555",
                marginBottom: "0.5rem",
              }}
            >
              Global Saturation
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => onSetGlobalSaturation(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "4px",
                background:
                  "linear-gradient(to right, #ffffff 0%, #ff0000 100%)",
                outline: "none",
                cursor: "pointer",
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>

          {/* Global Temperature Control */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#555",
                marginBottom: "0.5rem",
              }}
            >
              Global Temperature
            </label>
            <input
              type="range"
              min="2000"
              max="6500"
              defaultValue="4000"
              onChange={(e) => onSetGlobalTemperature(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "4px",
                background:
                  "linear-gradient(to right, #ffa500 0%, #ffffff 50%, #87ceeb 100%)",
                outline: "none",
                cursor: "pointer",
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: "#666",
                marginTop: "0.5rem",
              }}
            >
              <span>Warm (2000K)</span>
              <span>Cool (6500K)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
