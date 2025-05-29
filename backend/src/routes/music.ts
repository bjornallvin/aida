import { Request, Response } from "express";
import { MusicService } from "../services";
import { PlayRequest, APIResponse, PlayResponse } from "../types";
import { logger } from "../utils";

/**
 * Music controller for handling music-related endpoints
 */
export class MusicController {
  private musicService: MusicService;

  constructor(musicService?: MusicService) {
    this.musicService = musicService || new MusicService();
  }

  /**
   * Handle music play requests
   */
  public async play(req: Request, res: Response): Promise<void> {
    try {
      const playRequest: PlayRequest = req.body;
      const result = await this.musicService.playMusic(playRequest);

      const response: APIResponse<PlayResponse> = {
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error("Play request failed", { error: (error as Error).message });

      const response: APIResponse = {
        success: false,
        error: "Playback failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle pause requests
   */
  public async pause(req: Request, res: Response): Promise<void> {
    try {
      await this.musicService.pauseMusic();

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { action: "paused" },
      };

      res.json(response);
    } catch (error) {
      logger.error("Pause request failed", { error: (error as Error).message });

      const response: APIResponse = {
        success: false,
        error: "Pause failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle volume control requests
   */
  public async setVolume(req: Request, res: Response): Promise<void> {
    try {
      const { volume } = req.body;

      if (typeof volume !== "number" || volume < 0 || volume > 100) {
        const response: APIResponse = {
          success: false,
          error: "Invalid volume value",
          details: "Volume must be a number between 0 and 100",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      await this.musicService.setVolume(volume);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { volume },
      };

      res.json(response);
    } catch (error) {
      logger.error("Volume request failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Volume control failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get current volume
   */
  public async getVolume(req: Request, res: Response): Promise<void> {
    try {
      const volume = await this.musicService.getVolume();

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { volume },
      };

      res.json(response);
    } catch (error) {
      logger.error("Get volume request failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Failed to get volume",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get current playback state
   */
  public async getState(req: Request, res: Response): Promise<void> {
    try {
      const state = await this.musicService.getPlaybackState();

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { state },
      };

      res.json(response);
    } catch (error) {
      logger.error("Get state request failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Failed to get playback state",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }
}

export default MusicController;
