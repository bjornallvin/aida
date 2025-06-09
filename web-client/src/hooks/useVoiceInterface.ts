import { useState, useCallback, useRef, useEffect } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { useConversation } from "./useConversation";
import { apiService, VoiceCommandResponse } from "../services/apiService";
import { audioPlaybackService } from "../services/audioPlaybackService";

export interface VoiceInterfaceState {
  isListening: boolean;
  isProcessing: boolean;
  isPlayingResponse: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting";
  lastError: string | null;
  currentTranscript: string;
}

export const useVoiceInterface = (roomId: string = "web-client") => {
  const [state, setState] = useState<VoiceInterfaceState>({
    isListening: false,
    isProcessing: false,
    isPlayingResponse: false,
    connectionStatus: "disconnected",
    lastError: null,
    currentTranscript: "",
  });

  const audioRecorder = useAudioRecorder({
    maxDuration: 30, // 30 seconds max recording
    onError: (error) => setError(error.message),
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

  const startListening = useCallback(async () => {
    if (processingRef.current || state.isListening) {
      return;
    }

    try {
      clearError();
      await audioRecorder.startRecording();
      setState((prev) => ({
        ...prev,
        isListening: true,
        currentTranscript: "",
      }));
    } catch (error) {
      console.error("Failed to start listening:", error);
      setError("Failed to start voice recording");
    }
  }, [audioRecorder, state.isListening, clearError, setError]);

  const stopListening = useCallback(async () => {
    if (!state.isListening || processingRef.current) {
      return;
    }

    try {
      processingRef.current = true;
      setState((prev) => ({
        ...prev,
        isListening: false,
        isProcessing: true,
      }));

      // Stop recording and wait for audio blob
      const audioBlob = await audioRecorder.stopRecording();

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error("No audio recorded");
      }

      // Send voice command to backend
      const response: VoiceCommandResponse = await apiService.sendVoiceCommand(
        audioBlob,
        roomId
      );

      if (!response.success) {
        throw new Error(response.error || "Voice command failed");
      }

      // Add transcribed user message to conversation
      if (response.text_response) {
        // Extract user message from the response if available
        // For now, we'll use speech-to-text separately to get the user's words
        const transcriptResponse = await apiService.speechToText(audioBlob);
        if (transcriptResponse.success && transcriptResponse.text) {
          conversation.addUserMessage(transcriptResponse.text);
          setState((prev) => ({
            ...prev,
            currentTranscript: transcriptResponse.text!,
          }));
        }
      }

      // Add AI response to conversation
      if (response.text_response) {
        conversation.addAssistantMessage(response.text_response);
      }

      // Play audio response if available
      if (response.audio_response) {
        setState((prev) => ({ ...prev, isPlayingResponse: true }));
        try {
          await audioPlaybackService.playBase64Audio(response.audio_response);
        } catch (audioError) {
          console.error("Failed to play audio response:", audioError);
          setError("Failed to play voice response");
        } finally {
          setState((prev) => ({ ...prev, isPlayingResponse: false }));
        }
      }
    } catch (error) {
      console.error("Voice command processing failed:", error);
      setError(
        error instanceof Error ? error.message : "Voice processing failed"
      );
    } finally {
      processingRef.current = false;
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [state.isListening, audioRecorder, roomId, conversation, setError]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (processingRef.current || !text.trim()) {
        return;
      }

      try {
        processingRef.current = true;
        setState((prev) => ({ ...prev, isProcessing: true }));
        clearError();

        // Add user message
        conversation.addUserMessage(text);

        // Send to backend
        const response = await apiService.sendChatMessage(text, roomId);
        console.log("Chat response:", response);
        if (!response || !response.response) {
          throw new Error("Invalid response from chat service");
        }

        // Add AI response
        conversation.addAssistantMessage(response.response);

        // Convert response to speech and play
        const ttsResponse = await apiService.textToSpeech(response.response);
        if (ttsResponse.success && ttsResponse.audio) {
          setState((prev) => ({ ...prev, isPlayingResponse: true }));
          try {
            await audioPlaybackService.playBase64Audio(ttsResponse.audio);
          } catch (audioError) {
            console.error("Failed to play TTS audio:", audioError);
          } finally {
            setState((prev) => ({ ...prev, isPlayingResponse: false }));
          }
        }
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

  const stopAudioPlayback = useCallback(() => {
    audioPlaybackService.stop();
    setState((prev) => ({ ...prev, isPlayingResponse: false }));
  }, []);

  const toggleListening = useCallback(async () => {
    if (state.isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  return {
    // State
    ...state,
    isRecording: audioRecorder.isRecording,
    recordingDuration: audioRecorder.duration,

    // Conversation state
    messages: conversation.messages,
    conversationError: conversation.error,
    isConversationLoading: conversation.isLoading,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    sendTextMessage,
    stopAudioPlayback,
    checkConnection,
    clearError,
    clearConversation: conversation.clearConversation,

    // Audio recorder controls
    pauseRecording: audioRecorder.pauseRecording,
    resumeRecording: audioRecorder.resumeRecording,
  };
};
