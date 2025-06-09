"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService, SonosDevice } from "@/services/apiService";

interface SonosDeviceSelectorProps {
  selectedRoomName?: string;
  onRoomChange: (roomName: string) => void;
  className?: string;
}

export const SonosDeviceSelector: React.FC<SonosDeviceSelectorProps> = ({
  selectedRoomName,
  onRoomChange,
  className = "",
}) => {
  const [devices, setDevices] = useState<SonosDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getSonosDevices();

      if (response.success && response.data) {
        setDevices(response.data.devices);

        // Auto-select the first device if none is selected and devices are available
        if (!selectedRoomName && response.data.devices.length > 0) {
          onRoomChange(response.data.devices[0].roomName);
        }
      } else {
        setError(response.error || "Failed to load Sonos devices");
      }
    } catch (err) {
      setError("Error loading Sonos devices");
      console.error("Error loading Sonos devices:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedRoomName, onRoomChange]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sonos Speaker
        </label>
        <div className="bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-500">
          Loading speakers...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sonos Speaker
        </label>
        <div className="bg-red-50 border border-red-300 rounded-md px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={loadDevices}
              className="text-red-600 hover:text-red-800 text-sm underline ml-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sonos Speaker
        </label>
        <div className="bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2">
          <span className="text-yellow-700 text-sm">
            No Sonos speakers found
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label
        htmlFor="sonos-device-select"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Sonos Speaker
      </label>
      <select
        id="sonos-device-select"
        value={selectedRoomName || ""}
        onChange={(e) => onRoomChange(e.target.value)}
        className="block w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {!selectedRoomName && (
          <option value="" disabled>
            Select a Sonos speaker...
          </option>
        )}
        {devices.map((device) => (
          <option key={device.roomName} value={device.roomName}>
            {device.roomName} ({device.host})
          </option>
        ))}
      </select>

      {devices.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          Audio responses will play on the selected speaker
        </div>
      )}
    </div>
  );
};
