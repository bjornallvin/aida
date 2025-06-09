import { SonosClient, SonosDevice, SonosPlaybackState } from "../clients/sonos";
import { logger } from "../utils";

export interface SonosPlayRequest {
  room: string;
  type?: "spotify" | "radio" | "queue";
  query?: string;
  uri?: string;
}

export interface SonosPlayResponse {
  room: string;
  type: string;
  success: boolean;
  message: string;
}

/**
 * Sonos service for handling Sonos speaker operations
 * Implements separation of concerns and business logic
 */
export class SonosService {
  private sonosClient: SonosClient;

  constructor(sonosClient?: SonosClient) {
    this.sonosClient = sonosClient || new SonosClient();
  }

  /**
   * Get all discovered Sonos devices
   */
  public async getDevices(): Promise<SonosDevice[]> {
    try {
      return this.sonosClient.getDevices();
    } catch (error) {
      logger.error("Failed to get Sonos devices", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Refresh device discovery
   */
  public async refreshDevices(): Promise<SonosDevice[]> {
    try {
      logger.info("Refreshing Sonos device discovery");
      return await this.sonosClient.discoverDevices();
    } catch (error) {
      logger.error("Failed to refresh Sonos devices", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Rediscover devices after network change
   */
  public async rediscoverDevices(): Promise<SonosDevice[]> {
    try {
      logger.info("Rediscovering Sonos devices after network change");
      return await this.sonosClient.rediscoverDevices();
    } catch (error) {
      logger.error("Failed to rediscover Sonos devices", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle Sonos play requests
   */
  public async playMusic(
    request: SonosPlayRequest
  ): Promise<SonosPlayResponse> {
    const { room, type = "queue", query, uri } = request;

    logger.info("Processing Sonos play request", {
      room,
      type,
      query: query || uri,
    });

    this.validatePlayRequest(request);

    try {
      if (type === "spotify" && query) {
        await this.sonosClient.searchAndPlaySpotify(room, query);
        return {
          room,
          type,
          success: true,
          message: `Playing "${query}" on Sonos in ${room}`,
        };
      } else if (uri) {
        await this.sonosClient.play(room, uri);
        return {
          room,
          type,
          success: true,
          message: `Playing content on Sonos in ${room}`,
        };
      } else {
        await this.sonosClient.play(room);
        return {
          room,
          type,
          success: true,
          message: `Resuming playback on Sonos in ${room}`,
        };
      }
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Log detailed error for debugging
      logger.error("Sonos play request failed", {
        room,
        type,
        query: query || uri,
        error: errorMessage,
      });

      // Re-throw with context for better user experience
      if (type === "spotify" && errorMessage.includes("Unable to play")) {
        // This is our enhanced user-friendly error message
        throw error;
      } else {
        // Wrap other errors with additional context
        throw new Error(
          `Failed to play ${type || "content"} in ${room}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Pause playback on a Sonos device
   */
  public async pauseMusic(room: string): Promise<void> {
    try {
      await this.sonosClient.pause(room);
      logger.info("Sonos music paused", { room });
    } catch (error) {
      logger.error("Failed to pause Sonos music", {
        room,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Stop playback on a Sonos device
   */
  public async stopMusic(room: string): Promise<void> {
    try {
      await this.sonosClient.stop(room);
      logger.info("Sonos music stopped", { room });
    } catch (error) {
      logger.error("Failed to stop Sonos music", {
        room,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Set volume on a Sonos device
   */
  public async setVolume(room: string, volume: number): Promise<void> {
    try {
      await this.sonosClient.setVolume(room, volume);
      logger.info("Sonos volume set", { room, volume });
    } catch (error) {
      logger.error("Failed to set Sonos volume", {
        room,
        volume,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get volume from a Sonos device
   */
  public async getVolume(room: string): Promise<number> {
    try {
      return await this.sonosClient.getVolume(room);
    } catch (error) {
      logger.error("Failed to get Sonos volume", {
        room,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get playback state from a Sonos device
   */
  public async getPlaybackState(room: string): Promise<SonosPlaybackState> {
    try {
      return await this.sonosClient.getPlaybackState(room);
    } catch (error) {
      logger.error("Failed to get Sonos playback state", {
        room,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Join devices into a group for multi-room audio
   */
  public async joinGroup(
    deviceRoom: string,
    targetRoom: string
  ): Promise<void> {
    try {
      await this.sonosClient.joinGroup(deviceRoom, targetRoom);
      logger.info("Sonos devices grouped", { deviceRoom, targetRoom });
    } catch (error) {
      logger.error("Failed to group Sonos devices", {
        deviceRoom,
        targetRoom,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Remove device from group
   */
  public async leaveGroup(room: string): Promise<void> {
    try {
      await this.sonosClient.leaveGroup(room);
      logger.info("Sonos device left group", { room });
    } catch (error) {
      logger.error("Failed to remove Sonos device from group", {
        room,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Play audio from URL on Sonos (for TTS integration)
   */
  public async playAudioFromUrl(
    roomName: string,
    audioUrl: string
  ): Promise<void> {
    try {
      await this.sonosClient.playAudioFromUrl(roomName, audioUrl);
      logger.info("Sonos audio from URL started", { roomName, audioUrl });
    } catch (error) {
      logger.error("Failed to play audio from URL on Sonos", {
        roomName,
        audioUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Play temporary audio on Sonos with optional resume (for TTS integration)
   */
  public async playTempAudio(
    roomName: string,
    audioUrl: string,
    resumeAfter: boolean = true
  ): Promise<void> {
    try {
      await this.sonosClient.playTempAudio(roomName, audioUrl, resumeAfter);
      logger.info("Sonos temporary audio started", {
        roomName,
        audioUrl,
        resumeAfter,
      });
    } catch (error) {
      logger.error("Failed to play temporary audio on Sonos", {
        roomName,
        audioUrl,
        resumeAfter,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Play TuneIn Radio station on Sonos (for radio integration)
   */
  public async playTuneInRadio(
    roomName: string,
    stationId: string,
    stationName: string
  ): Promise<void> {
    try {
      await this.sonosClient.playTuneInRadio(roomName, stationId, stationName);
      logger.info("Sonos TuneIn Radio started", {
        roomName,
        stationId,
        stationName,
      });
    } catch (error) {
      logger.error("Failed to play TuneIn Radio on Sonos", {
        roomName,
        stationId,
        stationName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Validate play request
   */
  private validatePlayRequest(request: SonosPlayRequest): void {
    const { room, type, query, uri } = request;

    if (!room) {
      throw new Error("Room is required");
    }

    if (type === "spotify" && !query) {
      throw new Error("Query is required for Spotify playback");
    }

    if (type === "radio" && !uri) {
      throw new Error("URI is required for radio playback");
    }
  }
}
