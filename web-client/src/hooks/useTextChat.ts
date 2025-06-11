import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "./useConversation";
import { apiService } from "../services/apiService";

export interface TextChatState {
  isProcessing: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting";
  lastError: string | null;
}

export const useTextChat = (roomId: string = "web-client") => {
  const [state, setState] = useState<TextChatState>({
    isProcessing: false,
    connectionStatus: "disconnected",
    lastError: null,
  });

  const conversation = useConversation();
  const processingRef = useRef(false);

  const checkConnection = useCallback(async () => {
    setState((prev) => ({ ...prev, connectionStatus: "connecting" }));
    try {
      await apiService.checkHealth();
      setState((prev) => ({
        ...prev,
        connectionStatus: "connected",
        lastError: null,
      }));
    } catch (error) {
      console.error("Connection check failed:", error);
      setState((prev) => ({
        ...prev,
        connectionStatus: "disconnected",
        lastError: "Failed to connect to backend server",
      }));
    }
  }, []);

  // Check backend health on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const setError = useCallback(
    (error: string) => {
      setState((prev) => ({ ...prev, lastError: error }));
      conversation.setError(error);
    },
    [conversation]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, lastError: null }));
    conversation.clearError();
  }, [conversation]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      console.log("💬 Text: sendTextMessage called with:", text);
      if (processingRef.current || !text.trim()) {
        console.log("💬 Text: Already processing or empty text, returning");
        return;
      }

      try {
        processingRef.current = true;
        setState((prev) => ({ ...prev, isProcessing: true }));
        clearError();

        // Add user message
        conversation.addUserMessage(text);

        // Send to backend - use chat endpoint for text-only response
        const response = await apiService.sendChatMessage(text, roomId);
        console.log("Text chat response:", JSON.stringify(response, null, 2));

        if (!response || !response.response) {
          console.error(
            "Invalid response structure. Expected { response: string }, got:",
            response
          );
          throw new Error("Invalid response from chat service");
        }

        // Add AI response (text only, no audio)
        conversation.addAssistantMessage(response.response);
      } catch (error) {
        console.error("Text message failed:", error);
        setError(
          error instanceof Error ? error.message : "Failed to send message"
        );
      } finally {
        processingRef.current = false;
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [roomId, conversation, clearError, setError]
  );

  return {
    // State
    ...state,

    // Conversation state
    messages: conversation.messages,
    conversationError: conversation.error,
    isConversationLoading: conversation.isLoading,

    // Actions
    sendTextMessage,
    checkConnection,
    clearError,
    clearConversation: conversation.clearConversation,
  };
};
