import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { MopidyClient, OpenAITTSClient } from "../clients";
import { PlayRequest, TTSRequest, PlayResponse, TTSResponse } from "../types";
import { logger, AudioPlayer } from "../utils";
import { config } from "../config";

/**
 * Music service for handling music playback operations
 * Implements separation of concerns and business logic
 */
export class MusicService {
  private mopidyClient: MopidyClient;

  constructor(mopidyClient?: MopidyClient) {
    this.mopidyClient = mopidyClient || new MopidyClient();
  }

  /**
   * Handle music playback requests
   */
  public async playMusic(request: PlayRequest): Promise<PlayResponse> {
    const { room, type, query, url } = request;

    logger.info("Processing music play request", {
      room,
      type,
      query: query || url,
    });

    this.validatePlayRequest(request);

    let result;

    if (type === "spotify") {
      if (!query) {
        throw new Error("Query is required for Spotify playback");
      }
      result = await this.mopidyClient.searchAndPlay(query);
      logger.info("Spotify track started", { track: result.name, room });
    } else if (type === "radio") {
      if (!url) {
        throw new Error("URL is required for radio playback");
      }
      result = await this.mopidyClient.addRadioStream(url);
      logger.info("Radio stream started", { url, room });
    } else {
      throw new Error('Invalid type. Must be "spotify" or "radio"');
    }

    return {
      room,
      type,
      result,
    };
  }

  /**
   * Pause current playback
   */
  public async pauseMusic(): Promise<void> {
    await this.mopidyClient.pause();
    logger.info("Music paused");
  }

  /**
   * Resume playback
   */
  public async resumeMusic(): Promise<void> {
    await this.mopidyClient.resume();
    logger.info("Music resumed");
  }

  /**
   * Stop playback
   */
  public async stopMusic(): Promise<void> {
    await this.mopidyClient.stop();
    logger.info("Music stopped");
  }

  /**
   * Set volume
   */
  public async setVolume(volume: number): Promise<void> {
    await this.mopidyClient.setVolume(volume);
    logger.info("Volume set", { volume });
  }

  /**
   * Get current volume
   */
  public async getVolume(): Promise<number> {
    return this.mopidyClient.getVolume();
  }

  /**
   * Get current playback state
   */
  public async getPlaybackState(): Promise<string> {
    return this.mopidyClient.getPlaybackState();
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
