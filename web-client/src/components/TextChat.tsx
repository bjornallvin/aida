"use client";

import React from "react";
import { ConversationDisplay } from "./ConversationDisplay";
import { TextInput } from "./TextInput";
import { ErrorDisplay } from "./ErrorDisplay";
import { useTextChat } from "../hooks/useTextChat";

interface TextChatProps {
  roomId?: string;
  className?: string;
}

export const TextChat: React.FC<TextChatProps> = ({
  roomId = "web-client",
  className = "",
}) => {
  const textChat = useTextChat(roomId);

  return (
    <div className={`text-chat ${className}`}>
      {/* Error Display */}
      <ErrorDisplay
        error={textChat.lastError || textChat.conversationError}
        onClear={textChat.clearError}
      />

      {/* Main Chat Interface */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Text Chat</h2>
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  textChat.connectionStatus === "connected"
                    ? "bg-green-500"
                    : textChat.connectionStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
              ></div>
              <span
                className={`text-sm font-medium ${
                  textChat.connectionStatus === "connected"
                    ? "text-green-500"
                    : textChat.connectionStatus === "connecting"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {textChat.connectionStatus === "connected"
                  ? "Connected"
                  : textChat.connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
              </span>
            </div>

            {/* Clear Button */}
            <button
              onClick={textChat.clearConversation}
              className="px-3 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              disabled={textChat.messages.length === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Conversation Display */}
        <div className="mb-6">
          <ConversationDisplay
            messages={textChat.messages}
            isLoading={textChat.isConversationLoading || textChat.isProcessing}
          />
        </div>

        {/* Text Input at the bottom */}
        <div className="border-t pt-4">
          <TextInput
            onSendMessage={textChat.sendTextMessage}
            disabled={
              textChat.isProcessing || textChat.connectionStatus !== "connected"
            }
            placeholder="Type your message to Aida..."
          />
        </div>
      </div>
    </div>
  );
};
