import { useState, useCallback, useRef, useEffect } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { useConversation } from "./useConversation";
import { apiService, VoiceCommandResponse } from "../services/apiService";
import { audioPlaybackService } from "../services/audioPlaybackService";

export interface VoiceChatState {
  isListening: boolean;
  isProcessing: boolean;
  isPlayingResponse: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting";
  lastError: string | null;
  currentTranscript: string;
}

export const useVoiceChat = (roomId: string = "web-client") => {
  const [state, setState] = useState<VoiceChatState>({
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
    console.log("🎤 Voice: startListening called");
    if (processingRef.current || state.isListening) {
      console.log("🎤 Voice: Already processing or listening, returning");
      return;
    }

    try {
      console.log("🎤 Voice: Starting voice recording...");
      clearError();
      await audioRecorder.startRecording();
      setState((prev) => ({
        ...prev,
        isListening: true,
        currentTranscript: "",
      }));
    } catch (error) {
      console.error("🎤 Voice: Failed to start listening:", error);
      setError("Failed to start voice recording");
    }
  }, [audioRecorder, state.isListening, clearError, setError]);

  const stopListening = useCallback(async () => {
    console.log("🎤 Voice: stopListening called");
    if (!state.isListening || processingRef.current) {
      console.log("🎤 Voice: Not listening or already processing, returning");
      return;
    }

    try {
      console.log("🎤 Voice: Processing voice recording...");
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

      // For voice chat, we need to get the transcription separately
      // since the backend doesn't include it in the voice-command response
      const transcriptResponse = await apiService.speechToText(audioBlob);
      if (transcriptResponse.success && transcriptResponse.text) {
        conversation.addUserMessage(transcriptResponse.text);
        setState((prev) => ({
          ...prev,
          currentTranscript: transcriptResponse.text!,
        }));
      }

      // Add AI response to conversation
      if (response.text_response) {
        conversation.addAssistantMessage(response.text_response);
      }

      // For voice-to-voice, the audio is played through Sonos
      // We don't need to play it in the browser since it's handled by the backend
      if (response.audio_response === "sonos_played") {
        console.log("Audio played through Sonos:", response.message);
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
    stopAudioPlayback,
    checkConnection,
    clearError,
    clearConversation: conversation.clearConversation,

    // Audio recorder controls
    pauseRecording: audioRecorder.pauseRecording,
    resumeRecording: audioRecorder.resumeRecording,
  };
};
