import axios, { AxiosResponse } from "axios";
import { Readable } from "stream";
import { logger } from "../utils";
import { config } from "../config";

/**
 * ElevenLabs TTS client with error handling and retry logic
 * Implements Azure best practices for external API integration
 */
export class ElevenLabsClient {
  private apiKey: string;
  private readonly baseUrl: string = "https://api.elevenlabs.io/v1";
  private readonly timeout: number = 30000; // 30 seconds for TTS
  private readonly maxRetries: number = 3;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.elevenlabsApiKey;
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key is required");
    }
  }

  /**
   * Generate TTS audio with retry logic and proper error handling
   */
  public async generateTTS(
    text: string,
    voiceId: string = "pNInz6obpgDQGcFmaJgB",
    modelId: string = "eleven_monolingual_v1"
  ): Promise<Readable> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for TTS generation");
    }

    if (text.length > config.maxTextLength) {
      throw new Error(
        `Text too long. Maximum ${config.maxTextLength} characters allowed`
      );
    }

    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`ElevenLabs TTS attempt ${attempt}`, {
          textLength: text.length,
          voiceId,
          modelId,
        });

        const response: AxiosResponse = await axios.post(
          `${this.baseUrl}/text-to-speech/${voiceId}`,
          {
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          },
          {
            headers: {
              Accept: "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": this.apiKey,
            },
            responseType: "stream",
            timeout: this.timeout,
          }
        );

        const duration = Date.now() - startTime;
        logger.logExternalCall("elevenlabs", "generateTTS", true, duration, {
          attempt,
          textLength: text.length,
          voiceId,
        });

        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.logExternalCall(
          "elevenlabs",
          "generateTTS",
          false,
          Date.now() - startTime,
          {
            attempt,
            error: lastError.message,
            textLength: text.length,
          }
        );

        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          1000 * Math.pow(2, attempt - 1) + Math.random() * 1000,
          10000
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.error(
      `ElevenLabs TTS generation failed after ${this.maxRetries} attempts`,
      {
        error: lastError!.message,
        textLength: text.length,
      }
    );
    throw lastError!;
  }

  /**
   * Get available voices
   */
  public async getVoices(): Promise<any[]> {
    const startTime = Date.now();

    try {
      const response: AxiosResponse = await axios.get(
        `${this.baseUrl}/voices`,
        {
          headers: {
            "xi-api-key": this.apiKey,
          },
          timeout: this.timeout,
        }
      );

      const duration = Date.now() - startTime;
      logger.logExternalCall("elevenlabs", "getVoices", true, duration);

      return response.data.voices;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.logExternalCall("elevenlabs", "getVoices", false, duration, {
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get user subscription info
   */
  public async getUserInfo(): Promise<any> {
    const startTime = Date.now();

    try {
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      logger.logExternalCall("elevenlabs", "getUserInfo", true, duration);

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.logExternalCall("elevenlabs", "getUserInfo", false, duration, {
        error: errorMessage,
      });

      throw error;
    }
  }
}
