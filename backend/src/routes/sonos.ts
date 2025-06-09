import { Request, Response } from "express";
import { SonosService, SonosPlayRequest } from "../services/sonos";
import { APIResponse } from "../types";
import { logger } from "../utils";

/**
 * Sonos controller for handling Sonos-related endpoints
 */
export class SonosController {
  private sonosService: SonosService;

  constructor(sonosService?: SonosService) {
    this.sonosService = sonosService || new SonosService();
  }

  /**
   * Get all Sonos devices
   */
  public async getDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await this.sonosService.getDevices();

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { devices },
      };

      res.json(response);
    } catch (error) {
      logger.error("Get Sonos devices failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Failed to get Sonos devices",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Refresh device discovery
   */
  public async refreshDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await this.sonosService.refreshDevices();

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { devices, message: "Device discovery refreshed" },
      };

      res.json(response);
    } catch (error) {
      logger.error("Refresh Sonos devices failed", {
        error: (error as Error).message,
      });

      const response: APIResponse = {
        success: false,
        error: "Failed to refresh Sonos devices",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle Sonos play requests
   */
  public async play(req: Request, res: Response): Promise<void> {
    try {
      const playRequest: SonosPlayRequest = req.body;
      const result = await this.sonosService.playMusic(playRequest);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error("Sonos play request failed", { 
        error: (error as Error).message,
        request: req.body 
      });

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
      const { room } = req.body;

      if (!room) {
        const response: APIResponse = {
          success: false,
          error: "Room is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      await this.sonosService.pauseMusic(room);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { action: "paused", room },
      };

      res.json(response);
    } catch (error) {
      logger.error("Sonos pause request failed", { 
        error: (error as Error).message,
        request: req.body 
      });

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
   * Handle stop requests
   */
  public async stop(req: Request, res: Response): Promise<void> {
    try {
      const { room } = req.body;

      if (!room) {
        const response: APIResponse = {
          success: false,
          error: "Room is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      await this.sonosService.stopMusic(room);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { action: "stopped", room },
      };

      res.json(response);
    } catch (error) {
      logger.error("Sonos stop request failed", { 
        error: (error as Error).message,
        request: req.body 
      });

      const response: APIResponse = {
        success: false,
        error: "Stop failed",
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
      const { room, volume } = req.body;

      if (!room) {
        const response: APIResponse = {
          success: false,
          error: "Room is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

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

      await this.sonosService.setVolume(room, volume);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { room, volume },
      };

      res.json(response);
    } catch (error) {
      logger.error("Sonos volume request failed", {
        error: (error as Error).message,
        request: req.body,
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
      const { room } = req.params;

      if (!room) {
        const response: APIResponse = {
          success: false,
          error: "Room is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const volume = await this.sonosService.getVolume(room);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { room, volume },
      };

      res.json(response);
    } catch (error) {
      logger.error("Get Sonos volume request failed", {
        error: (error as Error).message,
        room: req.params.room,
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
      const { room } = req.params;

      if (!room) {
        const response: APIResponse = {
          success: false,
          error: "Room is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const state = await this.sonosService.getPlaybackState(room);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { room, state },
      };

      res.json(response);
    } catch (error) {
      logger.error("Get Sonos state request failed", {
        error: (error as Error).message,
        room: req.params.room,
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

  /**
   * Group devices for multi-room audio
   */
  public async joinGroup(req: Request, res: Response): Promise<void> {
    try {
      const { deviceRoom, targetRoom } = req.body;

      if (!deviceRoom || !targetRoom) {
        const response: APIResponse = {
          success: false,
          error: "Both deviceRoom and targetRoom are required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      await this.sonosService.joinGroup(deviceRoom, targetRoom);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { 
          action: "grouped",
          deviceRoom,
          targetRoom,
          message: `${deviceRoom} joined ${targetRoom}'s group`
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("Sonos group request failed", {
        error: (error as Error).message,
        request: req.body,
      });

      const response: APIResponse = {
        success: false,
        error: "Group operation failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Remove device from group
   */
  public async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const { room } = req.body;

      if (!room) {
        const response: APIResponse = {
          success: false,
          error: "Room is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      await this.sonosService.leaveGroup(room);

      const response: APIResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        data: { 
          action: "ungrouped",
          room,
          message: `${room} left the group`
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("Sonos ungroup request failed", {
        error: (error as Error).message,
        request: req.body,
      });

      const response: APIResponse = {
        success: false,
        error: "Ungroup operation failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }
}

export default SonosController;
