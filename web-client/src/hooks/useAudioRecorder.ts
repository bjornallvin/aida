import { useState, useRef, useCallback, useEffect } from "react";

export interface UseAudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  maxDuration?: number; // in milliseconds
  mimeType?: string;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  mediaRecorder: MediaRecorder | null;
  audioBlob: Blob | null;
}

export function useAudioRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 300000, // 5 minutes default
  mimeType = "audio/webm;codecs=opus",
}: UseAudioRecorderProps = {}) {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    mediaRecorder: null,
    audioBlob: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define stopRecording first
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      startTimeRef.current = 0;
    }
  }, [state.isRecording]);

  const updateDuration = useCallback(() => {
    if (startTimeRef.current > 0) {
      const now = Date.now();
      const duration = now - startTimeRef.current;
      setState((prev) => ({ ...prev, duration }));

      // Auto-stop if max duration reached
      if (duration >= maxDuration) {
        stopRecording();
      }
    }
  }, [maxDuration, stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Check if the browser supports the preferred mime type
      const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: supportedMimeType,
        });
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob,
          mediaRecorder: null,
        }));

        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }

        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        if (onError) {
          onError(error);
        }
        console.error("MediaRecorder error:", event);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        mediaRecorder,
      }));

      // Start duration tracking
      durationIntervalRef.current = setInterval(updateDuration, 100);
    } catch (error) {
      const err = error as Error;
      if (onError) {
        onError(err);
      }
      console.error("Error starting recording:", err);
    }
  }, [mimeType, onRecordingComplete, onError, updateDuration]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState((prev) => ({ ...prev, isPaused: true }));

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState((prev) => ({ ...prev, isPaused: false }));

      // Resume duration tracking
      durationIntervalRef.current = setInterval(updateDuration, 100);
    }
  }, [state.isRecording, state.isPaused, updateDuration]);

  const clearRecording = useCallback(() => {
    setState((prev) => ({ ...prev, audioBlob: null, duration: 0 }));
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    isSupported:
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
  };
}
