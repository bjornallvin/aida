"use client";

import React from "react";

interface VoiceControlsProps {
  isListening: boolean;
  isProcessing: boolean;
  isPlayingResponse: boolean;
  recordingDuration: number;
  connectionStatus: "connected" | "disconnected" | "connecting";
  onToggleListening: () => void;
  onStopPlayback: () => void;
  className?: string;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isProcessing,
  isPlayingResponse,
  recordingDuration,
  connectionStatus,
  onToggleListening,
  onStopPlayback,
  className = "",
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-500";
      case "connecting":
        return "text-yellow-500";
      case "disconnected":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  const getMicrophoneButtonClass = () => {
    const baseClass =
      "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ";

    if (isProcessing) {
      return baseClass + "bg-yellow-500 text-white cursor-not-allowed";
    } else if (isListening) {
      return baseClass + "bg-red-500 text-white animate-pulse hover:bg-red-600";
    } else {
      return (
        baseClass + "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
      );
    }
  };

  const isDisabled = connectionStatus !== "connected" || isProcessing;

  return (
    <div className={`voice-controls ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-center mb-4">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            connectionStatus === "connected"
              ? "bg-green-500"
              : connectionStatus === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : "bg-red-500"
          }`}
        ></div>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Main Voice Control Area */}
      <div className="flex flex-col items-center space-y-4">
        {/* Recording Duration */}
        {isListening && (
          <div className="text-center">
            <div className="text-2xl font-mono text-red-500 font-bold">
              {formatDuration(recordingDuration)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Recording...</div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="text-center">
            <div className="text-lg text-yellow-600 font-medium">
              Processing...
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Analyzing your voice
            </div>
          </div>
        )}

        {/* Main Microphone Button */}
        <button
          onClick={onToggleListening}
          disabled={isDisabled}
          className={getMicrophoneButtonClass()}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          {/* Microphone Icon */}
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            {isListening ? (
              // Stop icon when recording
              <rect x="6" y="6" width="8" height="8" rx="1" />
            ) : (
              // Microphone icon when not recording
              <path d="M10 3C8.9 3 8 3.9 8 5v5c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2zm5 5v.5c0 2.5-2.5 4.5-5 4.5S5 11 5 8.5V8c0-.3-.2-.5-.5-.5S4 7.7 4 8v.5C4 11.4 6.6 14 10 14s6-2.6 6-5.5V8c0-.3-.2-.5-.5-.5S15 7.7 15 8zm-5 8v2h2v-2c2.2-.2 4-2.2 4-4.5h-1c0 1.9-1.6 3.5-3.5 3.5S7.5 13.4 7.5 11.5h-1c0 2.3 1.8 4.3 4 4.5z" />
            )}
          </svg>

          {/* Pulse animation overlay for listening state */}
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping"></div>
          )}
        </button>

        {/* Action Text */}
        <div className="text-center">
          {isListening ? (
            <p className="text-red-600 font-medium">Tap to stop recording</p>
          ) : isProcessing ? (
            <p className="text-yellow-600 font-medium">
              Processing your voice...
            </p>
          ) : isDisabled ? (
            <p className="text-gray-400">Connect to start talking</p>
          ) : (
            <p className="text-blue-600 font-medium">Tap to start talking</p>
          )}
        </div>

        {/* Audio Playback Controls */}
        {isPlayingResponse && (
          <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-medium">
                Playing response
              </span>
            </div>
            <button
              onClick={onStopPlayback}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
