import { Request, Response } from "express";
import { APIResponse } from "../types";

/**
 * Health check controller
 */
export class HealthController {
  /**
   * Health check endpoint
   */
  public static async getHealth(req: Request, res: Response): Promise<void> {
    const response: APIResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status: "ok",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
    };

    res.json(response);
  }
}

export default HealthController;
