import { Router, Request, Response } from "express";
import { HealthController } from "./health";
import { MusicController } from "./music";
import { TTSController } from "./tts";
import { AIController } from "./ai";
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

  return router;
}
