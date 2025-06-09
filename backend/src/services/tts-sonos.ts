import { TTSService } from "./audio";
import { SonosService } from "./sonos";
import { logger } from "../utils";
import { config } from "../config";
import path from "path";

export interface TTSSonosRequest {
  text: string;
  roomName: string;
  language?: "english" | "swedish" | "auto";
  resumeAfter?: boolean;
}

export interface TTSSonosResponse {
  room: string;
  filename: string;
  textLength: number;
  success: boolean;
  message: string;
}

/**
 * Combined TTS + Sonos service for playing text-to-speech on Sonos speakers
 * Integrates OpenAI TTS generation with Sonos speaker control
 */
export class TTSSonosService {
  private ttsService: TTSService;
  private sonosService: SonosService;

  constructor(ttsService?: TTSService, sonosService?: SonosService) {
    this.ttsService = ttsService || new TTSService();
    this.sonosService = sonosService || new SonosService();
  }

  /**
   * Generate TTS audio and play it on a specific Sonos speaker
   */
  public async generateAndPlayOnSonos(
    request: TTSSonosRequest
  ): Promise<TTSSonosResponse> {
    const { text, roomName, language, resumeAfter = false } = request;

    logger.info("Processing TTS + Sonos request", {
      roomName,
      textLength: text?.length,
      language: language || "auto",
      resumeAfter,
    });

    this.validateTTSSonosRequest(request);

    try {
      // Step 1: Generate TTS audio file
      logger.info("Generating TTS audio", {
        roomName,
        textLength: text.length,
      });
      const filename = await this.ttsService.generateTTSFile(text, language);

      // Step 2: Create URL for the audio file
      const audioUrl = this.getAudioFileUrl(filename);
      logger.info("Generated audio file URL", { roomName, filename, audioUrl });

      // Step 3: Play the audio on the Sonos speaker
      logger.info("Playing TTS audio on Sonos", { roomName, audioUrl });

      if (resumeAfter) {
        await this.sonosService.playTempAudio(roomName, audioUrl, true);
      } else {
        await this.sonosService.playAudioFromUrl(roomName, audioUrl);
      }

      logger.info("TTS + Sonos playback successful", {
        roomName,
        filename,
        textLength: text.length,
      });

      return {
        room: roomName,
        filename,
        textLength: text.length,
        success: true,
        message: "TTS audio generated and playing on Sonos speaker",
      };
    } catch (error) {
      logger.error("Failed to generate and play TTS on Sonos", {
        roomName,
        textLength: text?.length,
        error: (error as Error).message,
      });

      return {
        room: roomName,
        filename: "",
        textLength: text?.length || 0,
        success: false,
        message: `Failed to play TTS on Sonos: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get available Sonos devices for TTS playback
   */
  public async getAvailableDevices() {
    try {
      return await this.sonosService.getDevices();
    } catch (error) {
      logger.error("Failed to get Sonos devices for TTS", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Rediscover Sonos devices after network change
   */
  public async rediscoverDevices() {
    try {
      return await this.sonosService.rediscoverDevices();
    } catch (error) {
      logger.error("Failed to rediscover Sonos devices for TTS", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Test TTS + Sonos integration with a simple message
   */
  public async testTTSSonos(roomName: string): Promise<TTSSonosResponse> {
    const testMessage =
      "Hello! This is a test of the TTS and Sonos integration.";

    return this.generateAndPlayOnSonos({
      text: testMessage,
      roomName,
      language: "english",
      resumeAfter: false,
    });
  }

  /**
   * Generate audio file URL that Sonos can access
   * This assumes the backend serves static files from the audio directory
   */
  private getAudioFileUrl(filename: string): string {
    // Construct URL that Sonos can access
    // This assumes the backend serves audio files at /audio/{filename}
    const baseUrl = config.baseUrl || "http://localhost:3000";
    return `${baseUrl}/audio/${filename}`;
  }

  private validateTTSSonosRequest(request: TTSSonosRequest): void {
    const { text, roomName } = request;

    if (!text || !roomName) {
      throw new Error(
        "Missing required fields: text and roomName are required"
      );
    }

    if (text.length > config.maxTextLength) {
      throw new Error(
        `Text too long. Maximum ${config.maxTextLength} characters allowed`
      );
    }

    if (text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }
  }
}
