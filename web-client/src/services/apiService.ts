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

export interface DeviceListResponse {
  success: boolean;
  devices?: TradfriDevice[];
  count?: number;
  timestamp?: string;
  error?: string;
}

export interface DeviceUpdateResponse {
  success: boolean;
  message?: string;
  device?: {
    id: string;
    oldName: string;
    newName: string;
  };
  timestamp?: string;
  error?: string;
}

export interface SonosDevice {
  host: string;
  port: number;
  uuid: string;
  model: string;
  roomName: string;
  zoneDisplayName: string;
}

export interface SonosTrack {
  title: string;
  artist: string;
  album: string;
  uri: string;
  duration: number;
  position: number;
}

export interface SonosPlaybackState {
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  currentTrack?: SonosTrack;
  playMode: string;
  playbackState: string;
}

export interface SonosDevicesResponse {
  success: boolean;
  data?: {
    devices: SonosDevice[];
  };
  error?: string;
  details?: string;
  timestamp: string;
}

export interface SonosPlayRequest {
  room: string;
  type?: "spotify" | "radio" | "queue";
  query?: string;
  uri?: string;
}

export interface SonosPlayResponse {
  success: boolean;
  data?: {
    room: string;
    type: string;
    success: boolean;
    message: string;
  };
  error?: string;
  details?: string;
  timestamp: string;
}

export interface SonosVolumeResponse {
  success: boolean;
  data?: {
    room: string;
    volume: number;
  };
  error?: string;
  details?: string;
  timestamp: string;
}

export interface SonosStateResponse {
  success: boolean;
  data?: {
    room: string;
    state: SonosPlaybackState;
  };
  error?: string;
  details?: string;
  timestamp: string;
}

export interface LightControlResponse {
  success: boolean;
  message?: string;
  device?: {
    id: string;
    name: string;
    isOn: boolean;
    brightness?: number;
    colorHue?: number;
    colorSaturation?: number;
    colorTemperature?: number;
  };
  timestamp?: string;
  error?: string;
}

export interface TradfriDevice {
  id: string;
  name: string;
  type: string;
  isReachable: boolean;
  brightness?: number;
  isOn?: boolean;
  targetLevel?: number;
  currentLevel?: number;
  colorHue?: number;
  colorSaturation?: number;
  colorTemperature?: number;
}

class ApiService {
  private baseUrl: string;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
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
      formData.append("roomName", roomId);

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

  async getDevices(): Promise<DeviceListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/devices`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get devices failed:", error);
      throw error;
    }
  }

  async searchDevices(
    query?: string,
    deviceType?: string
  ): Promise<DeviceListResponse> {
    try {
      const params = new URLSearchParams();
      if (query) params.append("query", query);
      if (deviceType) params.append("deviceType", deviceType);

      const response = await fetch(
        `${this.baseUrl}/devices/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Search devices failed:", error);
      throw error;
    }
  }

  async updateDeviceName(
    deviceId: string,
    newName: string
  ): Promise<DeviceUpdateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${deviceId}/name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Update device name failed:", error);
      throw error;
    }
  }

  async controlLight(
    deviceId: string,
    isOn: boolean,
    brightness?: number,
    colorHue?: number,
    colorSaturation?: number
  ): Promise<LightControlResponse> {
    try {
      const body: {
        isOn: boolean;
        brightness?: number;
        colorHue?: number;
        colorSaturation?: number;
      } = { isOn };

      if (brightness !== undefined) {
        body.brightness = brightness;
      }
      if (colorHue !== undefined) {
        body.colorHue = colorHue;
      }
      if (colorSaturation !== undefined) {
        body.colorSaturation = colorSaturation;
      }

      const response = await fetch(
        `${this.baseUrl}/devices/${deviceId}/light`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Control light failed:", error);
      throw error;
    }
  }

  async controlLightTemperature(
    deviceId: string,
    isOn: boolean,
    brightness?: number,
    colorTemperature?: number
  ): Promise<LightControlResponse> {
    try {
      const body: {
        isOn: boolean;
        brightness?: number;
        colorTemperature?: number;
      } = { isOn };

      if (brightness !== undefined) {
        body.brightness = brightness;
      }
      if (colorTemperature !== undefined) {
        body.colorTemperature = colorTemperature;
      }

      const response = await fetch(
        `${this.baseUrl}/devices/${deviceId}/light`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Control light temperature failed:", error);
      throw error;
    }
  }

  // Sonos API methods
  async getSonosDevices(): Promise<SonosDevicesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/devices`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get Sonos devices failed:", error);
      throw error;
    }
  }

  async playSonos(playRequest: SonosPlayRequest): Promise<SonosPlayResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(playRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Play Sonos failed:", error);
      throw error;
    }
  }

  async pauseSonos(
    room: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/pause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Pause Sonos failed:", error);
      throw error;
    }
  }

  async stopSonos(room: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Stop Sonos failed:", error);
      throw error;
    }
  }

  async setSonosVolume(
    room: string,
    volume: number
  ): Promise<SonosVolumeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/volume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room, volume }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Set Sonos volume failed:", error);
      throw error;
    }
  }

  async getSonosVolume(room: string): Promise<SonosVolumeResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sonos/${encodeURIComponent(room)}/volume`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get Sonos volume failed:", error);
      throw error;
    }
  }

  async getSonosState(room: string): Promise<SonosStateResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sonos/${encodeURIComponent(room)}/state`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get Sonos state failed:", error);
      throw error;
    }
  }

  async groupSonos(
    rooms: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rooms }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Group Sonos failed:", error);
      throw error;
    }
  }

  async ungroupSonos(
    room: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sonos/ungroup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Ungroup Sonos failed:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
