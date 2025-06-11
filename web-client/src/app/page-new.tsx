"use client";

import React, { useState } from "react";
import Link from "next/link";
import { VoiceChat } from "../components/VoiceChat";
import { TextChat } from "../components/TextChat";

export default function Home() {
  const [selectedSonosRoom, setSelectedSonosRoom] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"voice" | "text">("voice");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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

        {/* Chat Mode Toggle */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={() => setActiveTab("voice")}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "voice"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Voice to Voice Chat
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "text"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Text Chat
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        {activeTab === "voice" ? (
          <VoiceChat
            selectedSonosRoom={selectedSonosRoom}
            onSonosRoomChange={setSelectedSonosRoom}
          />
        ) : (
          <TextChat roomId="web-client" />
        )}

        {/* Status Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Aida Web Client - Voice-enabled AI assistant for your smart
            apartment
          </p>
          <div className="mt-2 flex items-center justify-center space-x-4">
            <span className="text-gray-400">
              Mode: {activeTab === "voice" ? "Voice to Voice" : "Text Only"}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
