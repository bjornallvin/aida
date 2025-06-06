import { Router, Request, Response } from "express";
import { HealthController } from "./health";
import { MusicController } from "./music";
import { TTSController } from "./tts";
import { AIController } from "./ai";
import { DeviceController } from "./devices";
import { uploadConfig } from "../config";
import { validateRequired } from "../middleware";

/**
 * Main router configuration
 * Sets up all API endpoints with proper middleware
 */
export function createRoutes(): Router {
  const router = Router();

  // Initialize controllers
  const musicController = new MusicController();
  const ttsController = new TTSController();
  const aiController = new AIController();
  const deviceController = new DeviceController();

  // Health check route
  router.get("/health", HealthController.getHealth);

  // Music control routes
  router.post(
    "/play",
    validateRequired(["room", "type"]),
    musicController.play.bind(musicController)
  );

  router.post("/pause", musicController.pause.bind(musicController));

  router.post(
    "/volume",
    validateRequired(["volume"]),
    musicController.setVolume.bind(musicController)
  );

  router.get("/volume", musicController.getVolume.bind(musicController));

  router.get("/state", musicController.getState.bind(musicController));

  // TTS routes
  router.post(
    "/tts",
    validateRequired(["text", "room"]),
    ttsController.generateAndPlay.bind(ttsController)
  );

  router.post(
    "/tts/generate",
    validateRequired(["text"]),
    ttsController.generateFile.bind(ttsController)
  );

  // AI routes
  router.post(
    "/speech-to-text",
    uploadConfig.single("audio"),
    (req: any, res: Response) => aiController.speechToText(req, res)
  );

  router.post(
    "/chat",
    validateRequired(["message"]),
    aiController.chat.bind(aiController)
  );

  router.post(
    "/voice-command",
    uploadConfig.single("audio"),
    (req: any, res: Response) => aiController.voiceCommand(req, res)
  );

  router.post(
    "/text-voice-command",
    validateRequired(["message"]),
    aiController.textVoiceCommand.bind(aiController)
  );

  // Device management routes
  router.get("/devices", deviceController.getDevices.bind(deviceController));

  router.get(
    "/devices/search",
    deviceController.searchDevices.bind(deviceController)
  );

  router.put(
    "/devices/:deviceId/name",
    validateRequired(["newName"]),
    (req: Request, res: Response) => {
      // Extract deviceId from URL params and add to body for validation
      req.body.deviceId = req.params.deviceId;
      deviceController.updateDeviceName(req, res);
    }
  );

  router.put(
    "/devices/:deviceId/light",
    validateRequired(["isOn"]),
    (req: Request, res: Response) => {
      // Extract deviceId from URL params and add to body for validation
      req.body.deviceId = req.params.deviceId;
      deviceController.controlLight(req, res);
    }
  );

  return router;
}
