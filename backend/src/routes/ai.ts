import { Request, Response } from "express";
import { AIService } from "../services";
import {
  ChatRequest,
  VoiceCommandRequest,
  APIResponse,
  ChatResponse,
  VoiceCommandResponse,
  AudioFileRequest,
} from "../types";
import { logger } from "../utils";

/**
 * AI controller for handling AI-powered endpoints
 */
export class AIController {
  private aiService: AIService;

  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService();
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
   * Handle combined voice command requests (STT + Chat + TTS)
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

      const result = await this.aiService.processVoiceCommand(
        req.file,
        voiceRequest
      );

      const response: APIResponse<VoiceCommandResponse> = {
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
   * Handle text-based voice commands (Chat + TTS)
   */
  public async textVoiceCommand(req: Request, res: Response): Promise<void> {
    try {
      const chatRequest: ChatRequest = req.body;

      // Process chat completion
      const chatResult = await this.aiService.processChat(chatRequest);

      // Generate TTS audio file for the response
      const responseAudioFile = await this.aiService.generateResponseAudio(
        chatResult.response
      );

      const result: VoiceCommandResponse = {
        transcription: chatRequest.message, // Use the input text as "transcription"
        response: chatResult.response,
        audioFile: `/audio/${require("path").basename(responseAudioFile)}`,
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

      const response: APIResponse<VoiceCommandResponse> = {
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
