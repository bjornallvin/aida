import OpenAI from "openai";
import { Readable } from "stream";
import { logger } from "../utils";
import { config } from "../config";

/**
 * OpenAI TTS client with error handling and retry logic
 * Implements Azure best practices for external API integration
 * Maintains compatibility with ElevenLabs interface for seamless migration
 */
export class OpenAITTSClient {
  private client: OpenAI;
  private readonly timeout: number = 30000; // 30 seconds for TTS
  private readonly maxRetries: number = 3;

  // Voice configurations for different languages
  private readonly voices = {
    english: {
      voice: "alloy", // Clear, neutral voice
      model: "tts-1",
    },
    swedish: {
      voice: "nova", // Good for multilingual content
      model: "tts-1",
    },
    multilingual: {
      voice: "nova", // Nova handles multiple languages well
      model: "tts-1",
    },
  };

  constructor(apiKey?: string) {
    const key = apiKey || config.openaiApiKey;
    if (!key) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: key,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Generate TTS audio with automatic language detection and voice selection
   * Maintains compatibility with ElevenLabs interface
   */
  public async generateTTS(
    text: string,
    language?: "english" | "swedish" | "auto",
    customVoice?: string,
    customModel?: string
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
      customVoice,
      customModel
    );

    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`OpenAI TTS attempt ${attempt}`, {
          textLength: text.length,
          voice: voiceConfig.voice,
          model: voiceConfig.model,
        });

        const response = await this.client.audio.speech.create({
          model: voiceConfig.model as "tts-1" | "tts-1-hd",
          voice: voiceConfig.voice as
            | "alloy"
            | "echo"
            | "fable"
            | "onyx"
            | "nova"
            | "shimmer",
          input: text,
          response_format: "mp3",
          speed: 1.0,
        });

        const duration = Date.now() - startTime;
        logger.logExternalCall("openai", "generateTTS", true, duration, {
          attempt,
          textLength: text.length,
          voice: voiceConfig.voice,
        });

        // Convert the response to a Readable stream for compatibility
        const buffer = Buffer.from(await response.arrayBuffer());
        const stream = new Readable({
          read() {
            this.push(buffer);
            this.push(null); // End the stream
          },
        });

        return stream;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.logExternalCall(
          "openai",
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
      `OpenAI TTS generation failed after ${this.maxRetries} attempts`,
      {
        error: lastError!.message,
        textLength: text.length,
      }
    );
    throw lastError!;
  }

  /**
   * Legacy method for backward compatibility with ElevenLabs interface
   */
  public async generateTTSLegacy(
    text: string,
    voice: string = "alloy",
    model: string = "tts-1"
  ): Promise<Readable> {
    return this.generateTTSWithConfig(text, voice, model);
  }

  /**
   * Generate TTS with explicit voice and model configuration
   */
  private async generateTTSWithConfig(
    text: string,
    voice: string,
    model: string
  ): Promise<Readable> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`OpenAI TTS attempt ${attempt}`, {
          textLength: text.length,
          voice,
          model,
        });

        const response = await this.client.audio.speech.create({
          model: model as "tts-1" | "tts-1-hd",
          voice: voice as
            | "alloy"
            | "echo"
            | "fable"
            | "onyx"
            | "nova"
            | "shimmer",
          input: text,
          response_format: "mp3",
          speed: 1.0,
        });

        const duration = Date.now() - startTime;
        logger.logExternalCall("openai", "generateTTS", true, duration, {
          attempt,
          textLength: text.length,
          voice,
        });

        // Convert the response to a Readable stream for compatibility
        const buffer = Buffer.from(await response.arrayBuffer());
        const stream = new Readable({
          read() {
            this.push(buffer);
            this.push(null); // End the stream
          },
        });

        return stream;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.logExternalCall(
          "openai",
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
      `OpenAI TTS generation failed after ${this.maxRetries} attempts`,
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
    customVoice?: string,
    customModel?: string
  ): { voice: string; model: string } {
    // Use custom configuration if provided
    if (customVoice && customModel) {
      return { voice: customVoice, model: customModel };
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
   * Get available voice configurations for OpenAI TTS
   */
  public getAvailableVoices(): Record<
    string,
    { voice: string; model: string; description: string }
  > {
    return {
      english: {
        ...this.voices.english,
        description: "Clear, neutral English voice (Alloy)",
      },
      swedish: {
        ...this.voices.swedish,
        description: "Multilingual voice supporting Swedish (Nova)",
      },
      multilingual: {
        ...this.voices.multilingual,
        description:
          "Multilingual voice supporting both English and Swedish (Nova)",
      },
    };
  }

  /**
   * Get available OpenAI TTS voices (compatibility method)
   */
  public async getVoices(): Promise<any[]> {
    // OpenAI TTS has predefined voices, return them for compatibility
    const voices = [
      { voice_id: "alloy", name: "Alloy", description: "Clear, neutral voice" },
      { voice_id: "echo", name: "Echo", description: "Slightly deeper voice" },
      {
        voice_id: "fable",
        name: "Fable",
        description: "Warm, expressive voice",
      },
      {
        voice_id: "onyx",
        name: "Onyx",
        description: "Deep, authoritative voice",
      },
      {
        voice_id: "nova",
        name: "Nova",
        description: "Friendly, versatile voice",
      },
      {
        voice_id: "shimmer",
        name: "Shimmer",
        description: "Bright, energetic voice",
      },
    ];

    logger.logExternalCall("openai", "getVoices", true, 0, {
      voiceCount: voices.length,
    });

    return voices;
  }

  /**
   * Get user subscription info (compatibility method - returns basic info)
   */
  public async getUserInfo(): Promise<any> {
    // OpenAI doesn't have a direct equivalent, return basic info for compatibility
    const userInfo = {
      subscription: {
        tier: "openai-api",
        character_count: 0,
        character_limit: 1000000, // Reasonable default
        can_extend_character_limit: false,
        allowed_to_extend_character_limit: false,
        next_character_count_reset_unix: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    };

    logger.logExternalCall("openai", "getUserInfo", true, 0);

    return userInfo;
  }
}
