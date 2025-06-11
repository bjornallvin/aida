"use client";

import React from "react";
import { ConversationDisplay } from "./ConversationDisplay";
import { VoiceControls } from "./VoiceControls";
import { ErrorDisplay } from "./ErrorDisplay";
import { SonosDeviceSelector } from "./SonosDeviceSelector";
import { useVoiceChat } from "../hooks/useVoiceChat";

interface VoiceChatProps {
  selectedSonosRoom: string;
  onSonosRoomChange: (room: string) => void;
  className?: string;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  selectedSonosRoom,
  onSonosRoomChange,
  className = "",
}) => {
  const voiceChat = useVoiceChat(selectedSonosRoom || "web-client");

  return (
    <div className={`voice-chat ${className}`}>
      {/* Error Display */}
      <ErrorDisplay
        error={voiceChat.lastError || voiceChat.conversationError}
        onClear={voiceChat.clearError}
      />

      {/* Main Voice Interface */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
          Voice to Voice Chat
        </h2>

        {/* Sonos Device Selection */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <SonosDeviceSelector
            selectedRoomName={selectedSonosRoom}
            onRoomChange={onSonosRoomChange}
          />
        </div>

        {/* Voice Controls */}
        <VoiceControls
          isListening={voiceChat.isListening}
          isProcessing={voiceChat.isProcessing}
          isPlayingResponse={voiceChat.isPlayingResponse}
          recordingDuration={voiceChat.recordingDuration}
          connectionStatus={voiceChat.connectionStatus}
          onToggleListening={voiceChat.toggleListening}
          onStopPlayback={voiceChat.stopAudioPlayback}
          className="mb-6"
        />

        {/* Conversation Display */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-700">
              Voice Conversation
            </h3>
            <button
              onClick={voiceChat.clearConversation}
              className="px-3 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              disabled={voiceChat.messages.length === 0}
            >
              Clear
            </button>
          </div>

          <ConversationDisplay
            messages={voiceChat.messages}
            isLoading={
              voiceChat.isConversationLoading || voiceChat.isProcessing
            }
          />
        </div>

        {/* Current Transcript Display */}
        {voiceChat.currentTranscript && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Last Transcript:
            </h4>
            <p className="text-blue-700">
              &ldquo;{voiceChat.currentTranscript}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
