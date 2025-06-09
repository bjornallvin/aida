import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { OpenAITTSClient } from "../clients";
import { PlayRequest, TTSRequest, PlayResponse, TTSResponse } from "../types";
import { logger, AudioPlayer } from "../utils";
import { config } from "../config";

/**
 * Music service for handling music playback operations
 * NOTE: Mopidy integration has been disabled in favor of radio streaming
 */
export class MusicService {
  constructor() {
    logger.info("MusicService initialized (Mopidy features disabled)");
  }

  /**
   * Handle music playback requests
   * Returns error since Mopidy features are disabled
   */
  public async playMusic(request: PlayRequest): Promise<PlayResponse> {
    const { room, type } = request;

    logger.warning(
      "Music playback attempted but Mopidy features are disabled",
      {
        room,
        type,
      }
    );

    throw new Error(
      "Music playback via Mopidy is disabled. Please use the radio streaming endpoints instead (/radio/*)."
    );
  }

  /**
   * Pause current playback - disabled
   */
  public async pauseMusic(): Promise<void> {
    throw new Error(
      "Music controls via Mopidy are disabled. Please use radio streaming instead."
    );
  }

  /**
   * Resume playback - disabled
   */
  public async resumeMusic(): Promise<void> {
    throw new Error(
      "Music controls via Mopidy are disabled. Please use radio streaming instead."
    );
  }

  /**
   * Stop playback - disabled
   */
  public async stopMusic(): Promise<void> {
    throw new Error(
      "Music controls via Mopidy are disabled. Please use radio streaming instead."
    );
  }

  /**
   * Set volume - disabled
   */
  public async setVolume(volume: number): Promise<void> {
    throw new Error(
      "Volume control via Mopidy is disabled. Please use Sonos volume controls instead."
    );
  }

  /**
   * Get current volume - disabled
   */
  public async getVolume(): Promise<number> {
    throw new Error(
      "Volume control via Mopidy is disabled. Please use Sonos volume controls instead."
    );
  }

  /**
   * Get current playback state - disabled
   */
  public async getPlaybackState(): Promise<string> {
    throw new Error(
      "Playback state via Mopidy is disabled. Please use radio streaming instead."
    );
  }

  private validatePlayRequest(request: PlayRequest): void {
    const { room, type } = request;

    if (!room || !type) {
      throw new Error("Missing required fields: room and type are required");
    }

    if (!["spotify", "radio"].includes(type)) {
      throw new Error('Invalid type. Must be "spotify" or "radio"');
    }
  }
}

/**
 * Text-to-Speech service for handling TTS operations
 */
export class TTSService {
  private openaiTTSClient: OpenAITTSClient;

  constructor(openaiTTSClient?: OpenAITTSClient) {
    this.openaiTTSClient = openaiTTSClient || new OpenAITTSClient();
  }

  /**
   * Generate and play TTS audio
   */
  public async generateAndPlayTTS(request: TTSRequest): Promise<TTSResponse> {
    const { text, room, language } = request;

    logger.info("Processing TTS request", {
      room,
      textLength: text?.length,
      language: language || "auto",
    });

    this.validateTTSRequest(request);

    // Generate unique filename
    const filename = `tts_${uuidv4()}.mp3`;
    const filePath = path.join(config.audioDir, filename);

    // Ensure audio directory exists
    this.ensureAudioDirectoryExists();

    // Generate TTS audio with language parameter
    const audioStream = await this.openaiTTSClient.generateTTS(text, language);

    // Save to file
    await this.saveAudioStream(audioStream, filePath);

    logger.info("TTS audio saved", { filename, room });

    // Play the audio file
    await AudioPlayer.playAudio(filePath);

    // Schedule cleanup
    this.scheduleFileCleanup(filePath, filename);

    return {
      room,
      filename,
      textLength: text.length,
    };
  }

  /**
   * Generate TTS audio without playback (for API responses)
   */
  public async generateTTSFile(
    text: string,
    language?: "english" | "swedish" | "auto"
  ): Promise<string> {
    this.validateText(text);

    // Generate unique filename
    const filename = `response_${uuidv4()}.mp3`;
    const filePath = path.join(config.audioDir, filename);

    // Ensure audio directory exists
    this.ensureAudioDirectoryExists();

    // Generate TTS audio with language parameter
    const audioStream = await this.openaiTTSClient.generateTTS(text, language);

    // Save to file
    await this.saveAudioStream(audioStream, filePath);

    logger.info("TTS file generated", {
      filename,
      textLength: text.length,
      language,
    });

    return filename;
  }

  private validateTTSRequest(request: TTSRequest): void {
    const { text, room } = request;

    if (!text || !room) {
      throw new Error("Missing required fields: text and room are required");
    }

    this.validateText(text);
  }

  private validateText(text: string): void {
    if (text.length > config.maxTextLength) {
      throw new Error(
        `Text too long. Maximum ${config.maxTextLength} characters allowed`
      );
    }
  }

  private ensureAudioDirectoryExists(): void {
    if (!fs.existsSync(config.audioDir)) {
      fs.mkdirSync(config.audioDir, { recursive: true });
    }

    const uploadsDir = path.join(config.audioDir, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  private async saveAudioStream(
    audioStream: any,
    filePath: string
  ): Promise<void> {
    const writeStream = fs.createWriteStream(filePath);
    audioStream.pipe(writeStream);

    return new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });
  }

  private scheduleFileCleanup(filePath: string, filename: string): void {
    // Clean up file after playback (optional - comment out if you want to keep files)
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) {
          logger.error("Failed to delete TTS file", {
            filename,
            error: err.message,
          });
        } else {
          logger.info("TTS file cleaned up", { filename });
        }
      });
    }, 5000); // Delete after 5 seconds
  }
}
