import { Router, Request, Response } from "express";
import { HealthController } from "./health";
import { MusicController } from "./music";
import { TTSController } from "./tts";
import { AIController } from "./ai";
import { DeviceController } from "./devices";
import { SonosController } from "./sonos";
import createTTSSonosRoutes from "./tts-sonos";
import createRadioRoutes from "./radio";
import { uploadConfig } from "../config";
import { validateRequired } from "../middleware";
import { SonosService } from "../services/sonos";
import { TTSSonosService } from "../services/tts-sonos";
import { AIService } from "../services/ai";
import { DirectRadioSonosService } from "../services/direct-radio-sonos";

/**
 * Main router configuration
 * Sets up all API endpoints with proper middleware
 */
interface CreateRoutesOptions {
  sonosService: SonosService;
}

export function createRoutes(options: CreateRoutesOptions): Router {
  const router = Router();
  const { sonosService } = options;

  // Create shared service instances
  const ttsSonosService = new TTSSonosService(undefined, sonosService);
  const radioService = new DirectRadioSonosService(sonosService);

  // Initialize controllers
  const musicController = new MusicController();
  const ttsController = new TTSController();
  const aiController = new AIController(new AIService(undefined, undefined, sonosService, radioService), ttsSonosService);
  const deviceController = new DeviceController();
  const sonosController = new SonosController(sonosService);

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

  // Sonos control routes
  router.get(
    "/sonos/devices",
    sonosController.getDevices.bind(sonosController)
  );

  router.post(
    "/sonos/devices/refresh",
    sonosController.refreshDevices.bind(sonosController)
  );

  router.post(
    "/sonos/play",
    validateRequired(["room"]),
    sonosController.play.bind(sonosController)
  );

  router.post(
    "/sonos/pause",
    validateRequired(["room"]),
    sonosController.pause.bind(sonosController)
  );

  router.post(
    "/sonos/stop",
    validateRequired(["room"]),
    sonosController.stop.bind(sonosController)
  );

  router.post(
    "/sonos/volume",
    validateRequired(["room", "volume"]),
    sonosController.setVolume.bind(sonosController)
  );

  router.get(
    "/sonos/:room/volume",
    sonosController.getVolume.bind(sonosController)
  );

  router.get(
    "/sonos/:room/state",
    sonosController.getState.bind(sonosController)
  );

  router.post(
    "/sonos/group",
    validateRequired(["deviceRoom", "targetRoom"]),
    sonosController.joinGroup.bind(sonosController)
  );

  router.post(
    "/sonos/ungroup",
    validateRequired(["room"]),
    sonosController.leaveGroup.bind(sonosController)
  );

  // TTS + Sonos combined routes
  router.use("/tts-sonos", createTTSSonosRoutes(sonosService));

  // Direct radio streaming routes
  router.use("/radio", createRadioRoutes(sonosService, radioService));

  return router;
}
