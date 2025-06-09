"use client";

import React from "react";
import Link from "next/link";
import { useVoiceInterface } from "../hooks/useVoiceInterface";
import { ConversationDisplay } from "../components/ConversationDisplay";
import { VoiceControls } from "../components/VoiceControls";
import { TextInput } from "../components/TextInput";
import { ErrorDisplay } from "../components/ErrorDisplay";

export default function Home() {
  const voiceInterface = useVoiceInterface("web-client");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Aida Voice Assistant
          </h1>
          <p className="text-gray-600">Your intelligent apartment companion</p>
        </header>

        {/* Navigation */}
        <nav className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-center space-x-6">
              <span className="text-gray-700 font-medium">Voice Assistant</span>
              <span className="text-gray-300">|</span>
              <Link
                href="/devices"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
                <span>Device Management</span>
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/sonos"
                className="text-green-600 hover:text-green-800 hover:bg-green-50 px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <span>Sonos Control</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Error Display */}
        <ErrorDisplay
          error={voiceInterface.lastError || voiceInterface.conversationError}
          onClear={voiceInterface.clearError}
        />

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Voice Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              Voice Interface
            </h2>

            <VoiceControls
              isListening={voiceInterface.isListening}
              isProcessing={voiceInterface.isProcessing}
              isPlayingResponse={voiceInterface.isPlayingResponse}
              recordingDuration={voiceInterface.recordingDuration}
              connectionStatus={voiceInterface.connectionStatus}
              onToggleListening={voiceInterface.toggleListening}
              onStopPlayback={voiceInterface.stopAudioPlayback}
              className="mb-6"
            />

            {/* Text Input Alternative */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Or type your message
              </h3>
              <TextInput
                onSendMessage={voiceInterface.sendTextMessage}
                disabled={
                  voiceInterface.isProcessing ||
                  voiceInterface.connectionStatus !== "connected"
                }
                placeholder="Type a message to Aida..."
              />
            </div>
          </div>

          {/* Right Column - Conversation */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Conversation
              </h2>
              <button
                onClick={voiceInterface.clearConversation}
                className="px-3 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                disabled={voiceInterface.messages.length === 0}
              >
                Clear
              </button>
            </div>

            <ConversationDisplay
              messages={voiceInterface.messages}
              isLoading={
                voiceInterface.isConversationLoading ||
                voiceInterface.isProcessing
              }
            />
          </div>
        </div>

        {/* Current Transcript Display */}
        {voiceInterface.currentTranscript && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Last Transcript:
            </h3>
            <p className="text-blue-700">
              &ldquo;{voiceInterface.currentTranscript}&rdquo;
            </p>
          </div>
        )}

        {/* Status Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Aida Web Client - Voice-enabled AI assistant for your smart
            apartment
          </p>
          <div className="mt-2 flex items-center justify-center space-x-4">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                voiceInterface.connectionStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : voiceInterface.connectionStatus === "connecting"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {voiceInterface.connectionStatus === "connected"
                ? "● Connected"
                : voiceInterface.connectionStatus === "connecting"
                ? "◐ Connecting"
                : "○ Disconnected"}
            </span>
            <span className="text-gray-400">
              {voiceInterface.messages.length} messages
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
