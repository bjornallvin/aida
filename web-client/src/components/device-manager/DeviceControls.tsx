import React from "react";
import { DeviceControlsProps } from "./types";
import { supportsRgbColor, supportsColorTemperature } from "./utils";

export const DeviceControls: React.FC<DeviceControlsProps> = ({
  device,
  onBrightnessChange,
  onColorHueChange,
  onColorSaturationChange,
  onColorTemperatureChange,
}) => {
  if (device.type !== "light") return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h5 className="text-sm font-medium text-gray-700 mb-3">Light Controls</h5>

      {/* Brightness Control */}
      {device.brightness !== undefined && (
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-1">
            Brightness: {device.brightness}%
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={device.brightness}
            onChange={(e) =>
              onBrightnessChange(device, parseInt(e.target.value))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* RGB Color Controls */}
      {supportsRgbColor(device) && (
        <div className="space-y-3">
          {/* Color Hue */}
          {device.colorHue !== undefined && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Color Hue: {device.colorHue}°
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={device.colorHue}
                  onChange={(e) =>
                    onColorHueChange(device, parseInt(e.target.value))
                  }
                  className="w-full h-3 rounded-lg cursor-pointer"
                  style={{
                    WebkitAppearance: "none",
                    appearance: "none",
                    background:
                      "linear-gradient(to right, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)",
                    outline: "none",
                  }}
                />
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                    input[type="range"]::-webkit-slider-thumb {
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
                    input[type="range"]::-moz-range-thumb {
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
          )}

          {/* Color Saturation */}
          {device.colorSaturation !== undefined && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Color Saturation: {device.colorSaturation}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={device.colorSaturation}
                onChange={(e) =>
                  onColorSaturationChange(device, parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Color Temperature Control */}
      {supportsColorTemperature(device) &&
        device.colorTemperature !== undefined && (
          <div className="mt-3">
            <label className="block text-xs text-gray-600 mb-1">
              Color Temperature: {device.colorTemperature}K
            </label>
            <input
              type="range"
              min="2000"
              max="6500"
              value={device.colorTemperature}
              onChange={(e) =>
                onColorTemperatureChange(device, parseInt(e.target.value))
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
  );
};
