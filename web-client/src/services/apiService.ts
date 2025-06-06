export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface VoiceCommandResponse {
  success: boolean;
  message?: string;
  audio_response?: string; // Base64 encoded audio
  text_response?: string;
  error?: string;
}

export interface SpeechToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export interface TTSResponse {
  success: boolean;
  audio?: string; // Base64 encoded audio
  error?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

class ApiService {
  private baseUrl: string;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  ) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  async sendVoiceCommand(
    audioBlob: Blob,
    roomId: string = "web-client"
  ): Promise<VoiceCommandResponse> {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("room_id", roomId);

      const response = await fetch(`${this.baseUrl}/voice-command`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Voice command failed:", error);
      throw error;
    }
  }

  async speechToText(audioBlob: Blob): Promise<SpeechToTextResponse> {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Speech to text failed:", error);
      throw error;
    }
  }

  async textToSpeech(text: string): Promise<TTSResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Text to speech failed:", error);
      throw error;
    }
  }

  async sendChatMessage(
    message: string,
    roomId: string = "web-client"
  ): Promise<{ response: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          room_id: roomId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Chat message failed:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
