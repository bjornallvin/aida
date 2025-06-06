"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService, TradfriDevice } from "../services/apiService";

interface DeviceManagerProps {
  className?: string;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  className = "",
}) => {
  const [devices, setDevices] = useState<TradfriDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [togglingDevice, setTogglingDevice] = useState<string | null>(null);

  const deviceTypes = ["light", "blinds", "outlet", "airPurifier"];

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = searchQuery || deviceTypeFilter 
        ? await apiService.searchDevices(searchQuery, deviceTypeFilter)
        : await apiService.getDevices();
      
      if (response.success && response.devices) {
        setDevices(response.devices);
      } else {
        setError(response.error || "Failed to load devices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, deviceTypeFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleSearch = () => {
    loadDevices();
  };

  const handleEditStart = (device: TradfriDevice) => {
    setEditingDevice(device.id);
    setNewName(device.name);
  };

  const handleEditCancel = () => {
    setEditingDevice(null);
    setNewName("");
  };

  const handleEditSave = async (deviceId: string) => {
    if (!newName.trim()) {
      return;
    }

    try {
      setUpdating(deviceId);
      const response = await apiService.updateDeviceName(deviceId, newName.trim());
      
      if (response.success) {
        // Update the device in the local state
        setDevices(prevDevices =>
          prevDevices.map(device =>
            device.id === deviceId
              ? { ...device, name: newName.trim() }
              : device
          )
        );
        setEditingDevice(null);
        setNewName("");
      } else {
        setError(response.error || "Failed to update device name");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update device name");
    } finally {
      setUpdating(null);
    }
  };

  const handleDeviceToggle = async (device: TradfriDevice) => {
    if ((device.type !== "light" && device.type !== "outlet") || device.isOn === undefined) {
      return;
    }

    try {
      setTogglingDevice(device.id);
      const newIsOn = !device.isOn;
      const response = await apiService.controlLight(device.id, newIsOn);
      
      if (response.success) {
        // Update the device in the local state
        setDevices(prevDevices =>
          prevDevices.map(d =>
            d.id === device.id
              ? { ...d, isOn: newIsOn }
              : d
          )
        );
      } else {
        setError(response.error || `Failed to control ${device.type}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to control ${device.type}`);
    } finally {
      setTogglingDevice(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "light":
        return "💡";
      case "blinds":
        return "🪟";
      case "outlet":
        return "🔌";
      case "airPurifier":
        return "🌪️";
      default:
        return "📱";
    }
  };

  const getDeviceStatus = (device: TradfriDevice) => {
    if (!device.isReachable) {
      return { text: "Offline", color: "text-red-600 bg-red-100" };
    }
    
    if (device.isOn !== undefined) {
      return device.isOn 
        ? { text: "On", color: "text-green-600 bg-green-100" }
        : { text: "Off", color: "text-gray-600 bg-gray-100" };
    }
    
    return { text: "Online", color: "text-blue-600 bg-blue-100" };
  };

  if (loading && devices.length === 0) {
    return (
      <div className={`device-manager ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading devices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`device-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Device Management
        </h1>
        <p className="text-gray-600">
          Manage your IKEA DIRIGERA smart home devices
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search devices by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="sm:w-40">
            <select
              value={deviceTypeFilter}
              onChange={(e) => setDeviceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All types</option>
              {deviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg p-1.5 hover:bg-red-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">
            Devices ({devices.length})
          </h2>
        </div>

        {devices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📱</div>
            <p className="text-gray-500 text-lg">No devices found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery || deviceTypeFilter
                ? "Try adjusting your search criteria"
                : "Make sure your DIRIGERA hub is connected"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {devices.map((device) => {
              const status = getDeviceStatus(device);
              const isEditing = editingDevice === device.id;
              const isUpdating = updating === device.id;

              return (
                <div key={device.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleEditSave(device.id);
                                } else if (e.key === "Escape") {
                                  handleEditCancel();
                                }
                              }}
                            />
                            <button
                              onClick={() => handleEditSave(device.id)}
                              disabled={isUpdating || !newName.trim()}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              {isUpdating ? "..." : "Save"}
                            </button>
                            <button
                              onClick={handleEditCancel}
                              disabled={isUpdating}
                              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-lg font-medium text-gray-800">
                              {device.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-gray-500 capitalize">
                                {device.type}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-gray-400">
                                ID: {device.id}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Device Status */}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}
                      >
                        {status.text}
                      </span>

                      {/* Device Details */}
                      {device.brightness !== undefined && (
                        <span className="text-sm text-gray-500">
                          {device.brightness}%
                        </span>
                      )}

                      {/* Device Toggle Switch */}
                      {(device.type === "light" || device.type === "outlet") && device.isOn !== undefined && device.isReachable && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 capitalize">{device.type}:</span>
                          <button
                            onClick={() => handleDeviceToggle(device)}
                            disabled={togglingDevice === device.id}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                              device.isOn 
                                ? 'bg-blue-600' 
                                : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                device.isOn ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          {togglingDevice === device.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          )}
                        </div>
                      )}

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          onClick={() => handleEditStart(device)}
                          disabled={isUpdating}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        >
                          Edit Name
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={loadDevices}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "Refresh Devices"}
        </button>
      </div>
    </div>
  );
};
