import OpenAI from "openai";
import { ChatMessage } from "../types";
import { logger } from "../utils";
import { config } from "../config";

/**
 * OpenAI client wrapper with error handling and logging
 * Implements Azure best practices for AI service integration
 */
export class OpenAIClient {
  private client: OpenAI;
  private readonly maxRetries: number = 3;
  private readonly timeout: number = 30000; // 30 seconds

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
   * Create chat completion with structured logging and error handling
   */
  public async createChatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{ response: string; usage?: any }> {
    const startTime = Date.now();

    const {
      model = "gpt-3.5-turbo",
      maxTokens = 300,
      temperature = 0.7,
    } = options;

    try {
      logger.debug("Creating chat completion", {
        messageCount: messages.length,
        model,
        maxTokens,
        temperature,
      });

      const completion = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const duration = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || "";

      logger.logExternalCall("openai", "chatCompletion", true, duration, {
        model,
        tokensUsed: completion.usage?.total_tokens,
        responseLength: response.length,
      });

      return {
        response,
        usage: completion.usage,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.logExternalCall("openai", "chatCompletion", false, duration, {
        error: errorMessage,
        model,
        messageCount: messages.length,
      });

      throw error;
    }
  }

  /**
   * Create speech-to-text transcription
   */
  public async createTranscription(
    audioFile: any,
    options: {
      model?: string;
      language?: string;
    } = {}
  ): Promise<string> {
    const startTime = Date.now();

    const { model = "whisper-1", language = "en" } = options;

    try {
      logger.debug("Creating transcription", {
        model,
        language,
      });

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model,
        language,
      });

      const duration = Date.now() - startTime;

      logger.logExternalCall("openai", "transcription", true, duration, {
        model,
        language,
        transcriptionLength: transcription.text.length,
      });

      return transcription.text;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.logExternalCall("openai", "transcription", false, duration, {
        error: errorMessage,
        model,
        language,
      });

      throw error;
    }
  }

  /**
   * Generate system prompt for Aida apartment AI
   */
  public generateSystemPrompt(roomName?: string): string {
    return `You are Aida, an intelligent apartment AI assistant. You control music playback, lighting, and other smart home features through voice commands. 

Key capabilities:
- Music control (play/pause/volume via Spotify, radio, etc.)
- Text-to-speech responses
- Multi-room audio distribution
- Smart home automation

Current context:
- Room: ${roomName || "Unknown"}
- Available music sources: Spotify, YouTube, SoundCloud, Radio

Keep responses conversational, helpful, and concise. When users ask about music, offer specific suggestions. For technical issues, provide clear guidance.

If the user requests music playback, respond with enthusiasm and mention that you're starting the music. For other requests, provide helpful guidance.`;
  }
}
