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

export interface AudioRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  isSupported: boolean;
}

export function useAudioRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 300000, // 5 minutes default
  mimeType = "audio/webm;codecs=opus",
}: UseAudioRecorderProps = {}): AudioRecorderState & AudioRecorderControls {
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
  const stopPromiseRef = useRef<{
    resolve: (blob: Blob | null) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Define stopRecording first - now returns a promise that resolves with the audio blob
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      if (mediaRecorderRef.current && state.isRecording) {
        // Store the promise resolvers
        stopPromiseRef.current = { resolve, reject };

        mediaRecorderRef.current.stop();

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        startTimeRef.current = 0;
      } else {
        resolve(null);
      }
    });
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
      console.log("🎤 AudioRecorder: Starting recording...");
      console.log("🎤 AudioRecorder: navigator:", typeof navigator);
      console.log("🎤 AudioRecorder: navigator.mediaDevices:", typeof navigator.mediaDevices);
      console.log("🎤 AudioRecorder: window.location:", window.location.href);
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Microphone access is not available. Please ensure you're using HTTPS and your browser supports audio recording."
        );
      }

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

        // Resolve the stop promise if it exists
        if (stopPromiseRef.current) {
          stopPromiseRef.current.resolve(audioBlob);
          stopPromiseRef.current = null;
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

        // Reject the stop promise if it exists
        if (stopPromiseRef.current) {
          stopPromiseRef.current.reject(error);
          stopPromiseRef.current = null;
        }
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

    // Clear any pending stop promise
    if (stopPromiseRef.current) {
      stopPromiseRef.current.resolve(null);
      stopPromiseRef.current = null;
    }
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
      // Clear any pending stop promise
      if (stopPromiseRef.current) {
        stopPromiseRef.current.resolve(null);
        stopPromiseRef.current = null;
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
