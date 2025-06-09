import { Request, Response } from "express";
import { AIService } from "../services";
import { TTSSonosService } from "../services/tts-sonos";
import {
  ChatRequest,
  VoiceCommandRequest,
  APIResponse,
  ChatResponse,
  VoiceCommandResponse,
  VoiceCommandSonosResponse,
  AudioFileRequest,
} from "../types";
import { logger } from "../utils";

/**
 * AI controller for handling AI-powered endpoints
 */
export class AIController {
  private aiService: AIService;
  private ttsSonosService: TTSSonosService;

  constructor(aiService?: AIService, ttsSonosService?: TTSSonosService) {
    this.aiService = aiService || new AIService();
    this.ttsSonosService = ttsSonosService || new TTSSonosService();
  }

  /**
   * Handle speech-to-text requests
   */
  public async speechToText(
    req: AudioFileRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.file) {
        const response: APIResponse = {
          success: false,
          error: "No audio file provided",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      AIService.validateAudioFile(req.file);
      const transcription = await this.aiService.transcribeAudio(req.file);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          text: transcription,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("Speech-to-text failed", {
        error: (error as Error).message,
        fileInfo: req.file
          ? {
              path: req.file.path,
              size: req.file.size,
              mimetype: req.file.mimetype,
              originalname: req.file.originalname,
            }
          : "No file info",
      });

      const response: APIResponse = {
        success: false,
        error: "Speech-to-text processing failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle chat completion requests
   */
  public async chat(req: Request, res: Response): Promise<void> {
    try {
      const chatRequest: ChatRequest = req.body;
      const result = await this.aiService.processChat(chatRequest);

      const response: APIResponse<ChatResponse> = {
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error("Chat completion failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Chat processing failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle combined voice command requests (STT + Chat + TTS + Sonos)
   */
  public async voiceCommand(
    req: AudioFileRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.file) {
        const response: APIResponse = {
          success: false,
          error: "No audio file provided",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      AIService.validateAudioFile(req.file);

      const voiceRequest: VoiceCommandRequest = {
        roomName: req.body.roomName,
        conversationHistory: req.body.conversationHistory
          ? JSON.parse(req.body.conversationHistory)
          : [],
      };

      // Process the voice command (STT + Chat)
      const aiResult = await this.aiService.processVoiceCommand(
        req.file,
        voiceRequest
      );

      // Play the AI response on Sonos speakers
      const roomName = voiceRequest.roomName || "Living Room"; // Default room if not specified
      const sonosResult = await this.ttsSonosService.generateAndPlayOnSonos({
        text: aiResult.response,
        roomName,
        language: "auto",
        resumeAfter: true, // Resume music after AI response
      });

      const result: VoiceCommandSonosResponse = {
        transcription: aiResult.transcription,
        response: aiResult.response,
        sonosPlayback: {
          room: sonosResult.room,
          filename: sonosResult.filename,
          success: sonosResult.success,
          message: sonosResult.message,
        },
        ...(aiResult.toolCalls &&
          aiResult.toolCalls.length > 0 && {
            toolCalls: aiResult.toolCalls,
          }),
        ...(aiResult.toolResults &&
          aiResult.toolResults.length > 0 && {
            toolResults: aiResult.toolResults,
          }),
        usage: aiResult.usage,
      };

      const response: APIResponse<VoiceCommandSonosResponse> = {
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error("Voice command processing failed", {
        error: (error as Error).message,
        fileInfo: req.file
          ? {
              path: req.file.path,
              size: req.file.size,
              mimetype: req.file.mimetype,
              originalname: req.file.originalname,
            }
          : "No file info",
      });

      const response: APIResponse = {
        success: false,
        error: "Voice command processing failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle text-based voice commands (Chat + TTS + Sonos)
   */
  public async textVoiceCommand(req: Request, res: Response): Promise<void> {
    try {
      const chatRequest: ChatRequest = req.body;

      // Process chat completion
      const chatResult = await this.aiService.processChat(chatRequest);

      // Play the AI response on Sonos speakers
      const roomName = chatRequest.roomName || "Living Room"; // Default room if not specified
      const sonosResult = await this.ttsSonosService.generateAndPlayOnSonos({
        text: chatResult.response,
        roomName,
        language: "auto",
        resumeAfter: true, // Resume music after AI response
      });

      const result: VoiceCommandSonosResponse = {
        transcription: chatRequest.message, // Use the input text as "transcription"
        response: chatResult.response,
        sonosPlayback: {
          room: sonosResult.room,
          filename: sonosResult.filename,
          success: sonosResult.success,
          message: sonosResult.message,
        },
        ...(chatResult.toolCalls &&
          chatResult.toolCalls.length > 0 && {
            toolCalls: chatResult.toolCalls,
          }),
        ...(chatResult.toolResults &&
          chatResult.toolResults.length > 0 && {
            toolResults: chatResult.toolResults,
          }),
        usage: chatResult.usage,
      };

      const response: APIResponse<VoiceCommandSonosResponse> = {
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error("Text voice command processing failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Text voice command processing failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }
}

export default AIController;
