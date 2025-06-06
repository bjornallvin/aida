"use client";

import React from "react";
import { ChatMessage } from "../services/apiService";

interface ConversationDisplayProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  className?: string;
}

export const ConversationDisplay: React.FC<ConversationDisplayProps> = ({
  messages,
  isLoading = false,
  className = "",
}) => {
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`conversation-display ${className}`}>
      <div className="flex flex-col space-y-4 p-4 max-h-96 overflow-y-auto">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg">Start a conversation with Aida</p>
            <p className="text-sm mt-2">
              Click the microphone to speak or type a message
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-200 text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === "user" ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 ml-2">
                  Aida is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
