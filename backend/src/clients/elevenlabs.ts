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

  // Voice configurations for different languages
  private readonly voices = {
    english: {
      voiceId: "pNInz6obpgDQGcFmaJgB", // Current default voice (Adam)
      modelId: "eleven_monolingual_v1",
    },
    swedish: {
      voiceId: "aSLKtNoVBZlxQEMsnGL2", // Sanna Hartfield - Swedish Narration
      modelId: "eleven_multilingual_v2",
    },
    multilingual: {
      voiceId: "aSLKtNoVBZlxQEMsnGL2", // Sanna can handle both English and Swedish
      modelId: "eleven_multilingual_v2",
    },
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.elevenlabsApiKey;
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key is required");
    }
  }

  /**
   * Generate TTS audio with automatic language detection and voice selection
   */
  public async generateTTS(
    text: string,
    language?: "english" | "swedish" | "auto",
    customVoiceId?: string,
    customModelId?: string
  ): Promise<Readable> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for TTS generation");
    }

    if (text.length > config.maxTextLength) {
      throw new Error(
        `Text too long. Maximum ${config.maxTextLength} characters allowed`
      );
    }

    // Determine voice and model based on language
    const voiceConfig = this.getVoiceConfig(
      text,
      language,
      customVoiceId,
      customModelId
    );

    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`ElevenLabs TTS attempt ${attempt}`, {
          textLength: text.length,
          voiceId: voiceConfig.voiceId,
          modelId: voiceConfig.modelId,
        });

        const response: AxiosResponse = await axios.post(
          `${this.baseUrl}/text-to-speech/${voiceConfig.voiceId}`,
          {
            text,
            model_id: voiceConfig.modelId,
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
          voiceId: voiceConfig.voiceId,
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
   * Legacy method for backward compatibility
   */
  public async generateTTSLegacy(
    text: string,
    voiceId: string = "pNInz6obpgDQGcFmaJgB",
    modelId: string = "eleven_monolingual_v1"
  ): Promise<Readable> {
    return this.generateTTSWithConfig(text, voiceId, modelId);
  }

  /**
   * Generate TTS with explicit voice and model configuration
   */
  private async generateTTSWithConfig(
    text: string,
    voiceId: string,
    modelId: string
  ): Promise<Readable> {
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
   * Determine the best voice configuration based on text content and language preference
   */
  private getVoiceConfig(
    text: string,
    language?: "english" | "swedish" | "auto",
    customVoiceId?: string,
    customModelId?: string
  ): { voiceId: string; modelId: string } {
    // Use custom configuration if provided
    if (customVoiceId && customModelId) {
      return { voiceId: customVoiceId, modelId: customModelId };
    }

    // Use specified language configuration
    if (language && language !== "auto" && this.voices[language]) {
      return this.voices[language];
    }

    // Auto-detect language based on text content
    const hasSwedishChars = this.detectSwedishText(text);

    if (hasSwedishChars || language === "swedish") {
      logger.debug("Detected Swedish text, using Swedish voice configuration");
      return this.voices.swedish;
    }

    // Default to multilingual voice for mixed or unknown content
    if (language === "auto") {
      logger.debug("Auto mode: using multilingual voice");
      return this.voices.multilingual;
    }

    // Default to English voice
    return this.voices.english;
  }

  /**
   * Simple Swedish text detection based on common Swedish characters and words
   */
  private detectSwedishText(text: string): boolean {
    // Check for Swedish-specific characters
    const swedishChars = /[åäöÅÄÖ]/;
    if (swedishChars.test(text)) {
      return true;
    }

    // Check for common Swedish words
    const swedishWords = [
      "och",
      "att",
      "det",
      "en",
      "av",
      "är",
      "för",
      "den",
      "till",
      "på",
      "med",
      "var",
      "sig",
      "från",
      "ut",
      "när",
      "över",
      "man",
      "kan",
      "än",
      "vad",
      "hur",
      "så",
      "ska",
      "här",
      "där",
      "än",
      "mycket",
      "bara",
      "två",
    ];

    const words = text.toLowerCase().split(/\s+/);
    const swedishWordCount = words.filter((word) =>
      swedishWords.includes(word)
    ).length;

    // Consider it Swedish if more than 20% of words are Swedish common words
    return swedishWordCount > 0 && swedishWordCount / words.length > 0.2;
  }

  /**
   * Get available voice configurations
   */
  public getAvailableVoices(): Record<
    string,
    { voiceId: string; modelId: string; description: string }
  > {
    return {
      english: {
        ...this.voices.english,
        description: "English monolingual voice (Adam)",
      },
      swedish: {
        ...this.voices.swedish,
        description: "Professional Swedish narrator (Sanna Hartfield)",
      },
      multilingual: {
        ...this.voices.multilingual,
        description: "Multilingual voice supporting both English and Swedish",
      },
    };
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
