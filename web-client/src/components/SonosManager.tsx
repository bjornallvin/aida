'use client';

import React, { useState, useEffect } from 'react';
import { apiService, SonosDevice, SonosPlaybackState } from '@/services/apiService';

interface DeviceState {
  device: SonosDevice;
  state?: SonosPlaybackState;
  volume?: number;
  loading: boolean;
  error?: string;
}

const SonosManager: React.FC = () => {
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // Load devices on component mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getSonosDevices();
      
      if (response.success && response.data) {
        const deviceStates: DeviceState[] = response.data.devices.map(device => ({
          device,
          loading: false
        }));
        
        setDevices(deviceStates);
        
        // Load state and volume for each device
        deviceStates.forEach(deviceState => {
          loadDeviceState(deviceState.device.roomName);
        });
      } else {
        setError(response.error || 'Failed to load devices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceState = async (roomName: string) => {
    try {
      const [stateResponse, volumeResponse] = await Promise.all([
        apiService.getSonosState(roomName),
        apiService.getSonosVolume(roomName)
      ]);

      setDevices(prev => prev.map(deviceState => {
        if (deviceState.device.roomName === roomName) {
          return {
            ...deviceState,
            state: stateResponse.success ? stateResponse.data?.state : undefined,
            volume: volumeResponse.success ? volumeResponse.data?.volume : undefined,
            loading: false,
            error: stateResponse.success && volumeResponse.success ? undefined : 'Failed to load state'
          };
        }
        return deviceState;
      }));
    } catch (err) {
      setDevices(prev => prev.map(deviceState => {
        if (deviceState.device.roomName === roomName) {
          return {
            ...deviceState,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load state'
          };
        }
        return deviceState;
      }));
    }
  };

  const handlePlay = async (roomName: string) => {
    try {
      await apiService.playSonos({ room: roomName });
      loadDeviceState(roomName);
    } catch (err) {
      console.error('Failed to play:', err);
    }
  };

  const handlePause = async (roomName: string) => {
    try {
      await apiService.pauseSonos(roomName);
      loadDeviceState(roomName);
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  };

  const handleStop = async (roomName: string) => {
    try {
      await apiService.stopSonos(roomName);
      loadDeviceState(roomName);
    } catch (err) {
      console.error('Failed to stop:', err);
    }
  };

  const handleVolumeChange = async (roomName: string, volume: number) => {
    try {
      await apiService.setSonosVolume(roomName, volume);
      setDevices(prev => prev.map(deviceState => {
        if (deviceState.device.roomName === roomName) {
          return { ...deviceState, volume };
        }
        return deviceState;
      }));
    } catch (err) {
      console.error('Failed to set volume:', err);
    }
  };

  const handlePlaySpotify = async (roomName: string, query: string) => {
    if (!query.trim()) return;
    
    try {
      await apiService.playSonos({
        room: roomName,
        type: 'spotify',
        query: query.trim()
      });
      loadDeviceState(roomName);
    } catch (err) {
      console.error('Failed to play Spotify:', err);
    }
  };

  const handleGroupDevices = async () => {
    if (selectedDevices.length < 2) return;
    
    try {
      await apiService.groupSonos(selectedDevices);
      setSelectedDevices([]);
      setTimeout(() => loadDevices(), 1000); // Reload after grouping
    } catch (err) {
      console.error('Failed to group devices:', err);
    }
  };

  const handleUngroupDevice = async (roomName: string) => {
    try {
      await apiService.ungroupSonos(roomName);
      setTimeout(() => loadDevices(), 1000); // Reload after ungrouping
    } catch (err) {
      console.error('Failed to ungroup device:', err);
    }
  };

  const toggleDeviceSelection = (roomName: string) => {
    setSelectedDevices(prev => 
      prev.includes(roomName) 
        ? prev.filter(name => name !== roomName)
        : [...prev, roomName]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading Sonos devices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 font-medium">Error loading Sonos devices</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
        <button
          onClick={loadDevices}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh and grouping controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sonos Control</h2>
        <div className="flex space-x-2">
          {selectedDevices.length >= 2 && (
            <button
              onClick={handleGroupDevices}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Group Selected ({selectedDevices.length})
            </button>
          )}
          <button
            onClick={loadDevices}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No Sonos devices found on your network.</p>
          <p className="text-sm text-gray-500 mt-2">
            Make sure your Sonos speakers are powered on and connected to the same WiFi network.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((deviceState) => (
            <DeviceCard
              key={deviceState.device.uuid}
              deviceState={deviceState}
              isSelected={selectedDevices.includes(deviceState.device.roomName)}
              onToggleSelection={toggleDeviceSelection}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onVolumeChange={handleVolumeChange}
              onPlaySpotify={handlePlaySpotify}
              onUngroup={handleUngroupDevice}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DeviceCardProps {
  deviceState: DeviceState;
  isSelected: boolean;
  onToggleSelection: (roomName: string) => void;
  onPlay: (roomName: string) => void;
  onPause: (roomName: string) => void;
  onStop: (roomName: string) => void;
  onVolumeChange: (roomName: string, volume: number) => void;
  onPlaySpotify: (roomName: string, query: string) => void;
  onUngroup: (roomName: string) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  deviceState,
  isSelected,
  onToggleSelection,
  onPlay,
  onPause,
  onStop,
  onVolumeChange,
  onPlaySpotify,
  onUngroup,
}) => {
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const { device, state, volume, loading, error } = deviceState;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="p-6">
        {/* Device header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{device.roomName}</h3>
            <p className="text-sm text-gray-600">{device.model}</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(device.roomName)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <button
              onClick={() => onUngroup(device.roomName)}
              className="text-sm text-gray-500 hover:text-gray-700"
              title="Ungroup this device"
            >
              Ungroup
            </button>
          </div>
        </div>

        {/* Current track info */}
        {state?.currentTrack && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-900">{state.currentTrack.title}</div>
            <div className="text-sm text-gray-600">{state.currentTrack.artist}</div>
            <div className="text-sm text-gray-600">{state.currentTrack.album}</div>
            {state.currentTrack.duration > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {formatDuration(state.currentTrack.position)} / {formatDuration(state.currentTrack.duration)}
              </div>
            )}
          </div>
        )}

        {/* Playback controls */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <button
            onClick={() => onPlay(device.roomName)}
            disabled={loading}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => onPause(device.roomName)}
            disabled={loading}
            className="p-2 bg-yellow-600 text-white rounded-full hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => onStop(device.roomName)}
            disabled={loading}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Volume control */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {volume ?? 'Loading...'}
          </label>
          {volume !== undefined && (
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(device.roomName, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          )}
        </div>

        {/* Spotify search */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={spotifyQuery}
              onChange={(e) => setSpotifyQuery(e.target.value)}
              placeholder="Search Spotify..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onPlaySpotify(device.roomName, spotifyQuery);
                  setSpotifyQuery('');
                }
              }}
            />
            <button
              onClick={() => {
                onPlaySpotify(device.roomName, spotifyQuery);
                setSpotifyQuery('');
              }}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Play
            </button>
          </div>
        </div>

        {/* Status */}
        {state && (
          <div className="mt-3 text-xs text-gray-500">
            Status: {state.isPlaying ? 'Playing' : 'Paused'} • Mode: {state.playMode}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-3 text-xs text-red-600">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SonosManager;
