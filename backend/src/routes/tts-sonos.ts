import { Router } from "express";
import { TTSSonosService } from "../services";
import { logger } from "../utils";
import { validateRequired } from "../middleware";

const router = Router();
const ttsSonosService = new TTSSonosService();

/**
 * POST /tts-sonos
 * Generate TTS audio and play it on a Sonos speaker
 */
router.post("/", validateRequired(["text", "roomName"]), async (req, res) => {
  try {
    const { text, roomName, language, resumeAfter } = req.body;

    logger.info("TTS + Sonos request received", {
      roomName,
      textLength: text?.length,
      language,
      resumeAfter,
    });

    const result = await ttsSonosService.generateAndPlayOnSonos({
      text,
      roomName,
      language,
      resumeAfter,
    });

    res.json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("TTS + Sonos endpoint error", {
      error: (error as Error).message,
    });

    res.status(500).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /tts-sonos/devices
 * Get available Sonos devices for TTS playback
 */
router.get("/devices", async (req, res) => {
  try {
    logger.info("Getting Sonos devices for TTS");

    const devices = await ttsSonosService.getAvailableDevices();

    res.json({
      success: true,
      data: devices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Get TTS Sonos devices error", {
      error: (error as Error).message,
    });

    res.status(500).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /tts-sonos/test/:roomName
 * Test TTS + Sonos integration with a simple message
 */
router.post("/test/:roomName", async (req, res) => {
  try {
    const { roomName } = req.params;

    logger.info("Testing TTS + Sonos integration", { roomName });

    const result = await ttsSonosService.testTTSSonos(roomName);

    res.json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("TTS + Sonos test error", {
      error: (error as Error).message,
    });

    res.status(500).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Rediscover Sonos devices after network change
 */
router.post("/rediscover", async (req, res) => {
  try {
    logger.info("Manual Sonos device rediscovery requested");

    const devices = await ttsSonosService.rediscoverDevices();

    res.json({
      success: true,
      message: "Sonos device rediscovery completed",
      deviceCount: devices.length,
      devices: devices.map((device: any) => ({
        roomName: device.roomName,
        model: device.model,
        host: device.host,
        uuid: device.uuid,
      })),
    });
  } catch (error) {
    logger.error("Failed to rediscover Sonos devices", {
      error: (error as Error).message,
    });

    res.status(500).json({
      success: false,
      error: "Failed to rediscover Sonos devices",
      message: (error as Error).message,
    });
  }
});

export default router;
