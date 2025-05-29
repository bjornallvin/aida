import { spawn } from "child_process";
import { configManager } from "../config";
import { logger } from "./logger";

/**
 * Audio playback utility with platform-specific support
 * Handles cross-platform audio playback with fallback mechanisms
 */
export class AudioPlayer {
  /**
   * Play an audio file using platform-appropriate player
   * Implements retry logic with fallback players
   */
  public static async playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info("Starting audio playback", { filePath });

      let playerCommand: string;
      let playerArgs: string[];

      if (configManager.isMacOS) {
        // macOS: Use afplay (built-in)
        playerCommand = "afplay";
        playerArgs = [filePath];
      } else {
        // Linux/Other: Use mpg123
        playerCommand = "mpg123";
        playerArgs = [filePath];
      }

      const player = spawn(playerCommand, playerArgs);

      player.on("close", (code) => {
        if (code === 0) {
          logger.info("Audio playback completed successfully", {
            player: playerCommand,
            filePath,
          });
          resolve();
        } else {
          logger.error("Audio playback failed", {
            player: playerCommand,
            exitCode: code,
            filePath,
          });

          // On macOS, try mpg123 as fallback if afplay fails
          if (configManager.isMacOS && playerCommand === "afplay") {
            logger.info("Retrying with mpg123 fallback");
            AudioPlayer.playWithFallback(filePath).then(resolve).catch(reject);
          } else {
            reject(new Error(`${playerCommand} exited with code ${code}`));
          }
        }
      });

      player.on("error", (error) => {
        logger.error("Audio playback error", {
          error: error.message,
          player: playerCommand,
          filePath,
        });

        // On macOS, try mpg123 as fallback if afplay fails
        if (configManager.isMacOS && playerCommand === "afplay") {
          logger.info("Retrying with mpg123 fallback due to error");
          AudioPlayer.playWithFallback(filePath).then(resolve).catch(reject);
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Fallback audio player for macOS when afplay fails
   */
  private static async playWithFallback(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fallbackPlayer = spawn("mpg123", [filePath]);

      fallbackPlayer.on("close", (fallbackCode) => {
        if (fallbackCode === 0) {
          logger.info("Audio playback completed with fallback player", {
            filePath,
          });
          resolve();
        } else {
          logger.error("Fallback audio playback failed", {
            exitCode: fallbackCode,
            filePath,
          });
          reject(new Error("Both afplay and mpg123 failed"));
        }
      });

      fallbackPlayer.on("error", (fallbackError) => {
        logger.error("Fallback audio playback error", {
          error: fallbackError.message,
          filePath,
        });
        reject(new Error(`Audio playback failed: ${fallbackError.message}`));
      });
    });
  }
}
