import { useState, useCallback, useRef } from "react";
import { ChatMessage } from "../services/apiService";

export interface ConversationState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export const useConversation = () => {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const conversationRef = useRef<ChatMessage[]>([]);

  const addMessage = useCallback((message: ChatMessage) => {
    const newMessage = {
      ...message,
      timestamp: new Date(),
    };

    conversationRef.current = [...conversationRef.current, newMessage];
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      error: null,
    }));
  }, []);

  const addUserMessage = useCallback(
    (content: string) => {
      addMessage({
        role: "user",
        content,
        timestamp: new Date(),
      });
    },
    [addMessage]
  );

  const addAssistantMessage = useCallback(
    (content: string) => {
      addMessage({
        role: "assistant",
        content,
        timestamp: new Date(),
      });
    },
    [addMessage]
  );

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearConversation = useCallback(() => {
    conversationRef.current = [];
    setState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  const getLastMessage = useCallback((): ChatMessage | null => {
    const messages = conversationRef.current;
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }, []);

  const getMessageCount = useCallback((): number => {
    return conversationRef.current.length;
  }, []);

  const exportConversation = useCallback((): string => {
    return JSON.stringify(conversationRef.current, null, 2);
  }, []);

  const importConversation = useCallback(
    (jsonData: string) => {
      try {
        const messages: ChatMessage[] = JSON.parse(jsonData);
        // Validate that each message has the required structure
        const validMessages = messages
          .filter((msg) => msg.role && msg.content && msg.timestamp)
          .map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));

        conversationRef.current = validMessages;
        setState({
          messages: validMessages,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Failed to import conversation:", error);
        setError("Failed to import conversation data");
      }
    },
    [setError]
  );

  return {
    ...state,
    addMessage,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setError,
    clearError,
    clearConversation,
    getLastMessage,
    getMessageCount,
    exportConversation,
    importConversation,
  };
};
