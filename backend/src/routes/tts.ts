import { Request, Response } from "express";
import { TTSService } from "../services";
import { TTSRequest, APIResponse, TTSResponse } from "../types";
import { logger } from "../utils";

/**
 * TTS controller for handling text-to-speech endpoints
 */
export class TTSController {
  private ttsService: TTSService;

  constructor(ttsService?: TTSService) {
    this.ttsService = ttsService || new TTSService();
  }

  /**
   * Handle TTS generation and playback requests
   */
  public async generateAndPlay(req: Request, res: Response): Promise<void> {
    try {
      const ttsRequest: TTSRequest = req.body;
      const result = await this.ttsService.generateAndPlayTTS(ttsRequest);

      const response: APIResponse<TTSResponse> = {
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error("TTS request failed", { error: (error as Error).message });

      const response: APIResponse = {
        success: false,
        error: "TTS generation failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Generate TTS file without playback
   */
  public async generateFile(req: Request, res: Response): Promise<void> {
    try {
      const { text, voiceId } = req.body;

      if (!text) {
        const response: APIResponse = {
          success: false,
          error: "Missing required field: text",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const filename = await this.ttsService.generateTTSFile(text, voiceId);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          filename,
          audioUrl: `/audio/${filename}`,
          textLength: text.length,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("TTS file generation failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "TTS file generation failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }
}

export default TTSController;
