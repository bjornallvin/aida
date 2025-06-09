import { Sonos, DeviceDiscovery } from "sonos";
import { logger } from "../utils";

export interface SonosDevice {
  host: string;
  port: number;
  uuid: string;
  model: string;
  roomName: string;
  zoneDisplayName: string;
}

export interface SonosTrack {
  title: string;
  artist: string;
  album: string;
  uri: string;
  duration: number;
  position: number;
}

export interface SonosPlaybackState {
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  currentTrack?: SonosTrack;
  playMode: string;
  playbackState: string;
}

/**
 * Sonos client for discovering and controlling Sonos speakers
 * Implements Azure best practices for external device communication
 */
export class SonosClient {
  private devices: Map<string, Sonos> = new Map();
  private discoveredDevices: SonosDevice[] = [];
  private discoveryTimeout: number = 10000; // 10 seconds
  private discovery: DeviceDiscovery;

  constructor() {
    this.discovery = new DeviceDiscovery();
    this.initializeDiscovery();
  }

  /**
   * Initialize device discovery
   */
  private async initializeDiscovery(): Promise<void> {
    try {
      logger.info("Starting Sonos device discovery");
      await this.discoverDevices();
    } catch (error) {
      logger.error("Failed to initialize Sonos discovery", {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Manually retry device discovery (useful after network changes)
   */
  public async rediscoverDevices(): Promise<SonosDevice[]> {
    logger.info("Manually rediscovering Sonos devices after network change");
    this.devices.clear();
    this.discoveredDevices = [];

    // Create new discovery instance to reset state
    try {
      this.discovery = new DeviceDiscovery();
      return await this.discoverDevices();
    } catch (error) {
      logger.error("Failed to recreate discovery instance", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Discover Sonos devices on the network
   */
  public async discoverDevices(): Promise<SonosDevice[]> {
    return new Promise((resolve, reject) => {
      const foundDevices: SonosDevice[] = [];

      const timeout = setTimeout(() => {
        this.discoveredDevices = foundDevices;

        // Initialize Sonos instances for each device
        foundDevices.forEach((device) => {
          const sonos = new Sonos(device.host);
          this.devices.set(device.uuid, sonos);
        });

        logger.info("Sonos device discovery completed", {
          deviceCount: foundDevices.length,
          devices: foundDevices.map((d) => ({
            roomName: d.roomName,
            model: d.model,
          })),
        });

        resolve(foundDevices);
      }, this.discoveryTimeout);

      this.discovery.on("DeviceAvailable", async (device: any) => {
        logger.info("Sonos device discovered", {
          host: device.host,
          port: device.port,
          uuid: device.uuid,
          model: device.model,
          roomName: device.roomName,
          name: device.name,
        });

        try {
          // Create Sonos instance to get device info
          const sonos = new Sonos(device.host);

          // Try to get room name from the device
          let roomName = device.roomName || device.name;
          if (!roomName) {
            try {
              // Try to get device description
              const zoneAttrs = await (sonos as any).getZoneAttrs();
              roomName =
                zoneAttrs.CurrentZoneName ||
                `Sonos-${device.host.split(".").pop()}`;
              logger.info("Got room name from zone attributes", { roomName });
            } catch (error) {
              logger.error(
                "Could not get zone attributes, using fallback room name",
                {
                  error: (error as Error).message,
                }
              );
              roomName = `Sonos-${device.host.split(".").pop()}`;
            }
          }

          const sonosDevice: SonosDevice = {
            host: device.host,
            port: device.port || 1400,
            uuid: device.uuid || `sonos-${device.host}`,
            model: device.model || "Sonos Speaker",
            roomName: roomName,
            zoneDisplayName: device.zoneDisplayName || roomName,
          };

          logger.info("Processed Sonos device", {
            host: sonosDevice.host,
            model: sonosDevice.model,
            roomName: sonosDevice.roomName,
          });

          foundDevices.push(sonosDevice);
        } catch (error) {
          logger.error("Failed to process device", {
            host: device.host,
            error: (error as Error).message,
          });

          // Fallback device with generated room name
          const fallbackRoomName = `Sonos-${device.host.split(".").pop()}`;
          const fallbackDevice: SonosDevice = {
            host: device.host,
            port: device.port || 1400,
            uuid: device.uuid || `sonos-${device.host}`,
            model: device.model || "Sonos Speaker",
            roomName: fallbackRoomName,
            zoneDisplayName: device.zoneDisplayName || fallbackRoomName,
          };

          foundDevices.push(fallbackDevice);
        }
      });

      this.discovery.on("error", (error: Error) => {
        clearTimeout(timeout);
        logger.error("Sonos device discovery error", { error: error.message });
        reject(error);
      });

      // DeviceDiscovery starts automatically when instantiated
      // No need to call discover() method - it doesn't exist in this version
    });
  }

  /**
   * Get all discovered devices
   */
  public getDevices(): SonosDevice[] {
    return this.discoveredDevices;
  }

  /**
   * Get a Sonos device by room name
   */
  public getDeviceByRoom(roomName: string): Sonos | null {
    const device = this.discoveredDevices.find(
      (d) => d.roomName.toLowerCase() === roomName.toLowerCase()
    );
    return device ? this.devices.get(device.uuid) || null : null;
  }

  /**
   * Get a Sonos device by UUID
   */
  public getDeviceByUUID(uuid: string): Sonos | null {
    return this.devices.get(uuid) || null;
  }

  /**
   * Play music on a specific device
   */
  public async play(roomName: string, uri?: string): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      if (uri) {
        // Queue the URI first, then play
        await device.queue(uri);
      }

      await device.play();
      logger.info("Sonos playback started", { roomName, uri });
    } catch (error) {
      logger.error("Failed to start playback", {
        roomName,
        uri,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Pause playback on a specific device
   */
  public async pause(roomName: string): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    await device.pause();
    logger.info("Sonos playback paused", { roomName });
  }

  /**
   * Stop playback on a specific device
   */
  public async stop(roomName: string): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    await device.stop();
    logger.info("Sonos playback stopped", { roomName });
  }

  /**
   * Set volume on a specific device
   */
  public async setVolume(roomName: string, volume: number): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100");
    }

    await device.setVolume(volume);
    logger.info("Sonos volume set", { roomName, volume });
  }

  /**
   * Get volume from a specific device
   */
  public async getVolume(roomName: string): Promise<number> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    return await device.getVolume();
  }

  /**
   * Get current playback state from a specific device
   */
  public async getPlaybackState(roomName: string): Promise<SonosPlaybackState> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      const [state, volume, muted, currentTrack] = await Promise.allSettled([
        device.getCurrentState(),
        device.getVolume(),
        device.getMuted(),
        device.currentTrack(),
      ]);

      let track: SonosTrack | undefined;
      if (currentTrack.status === "fulfilled" && currentTrack.value) {
        const trackData = currentTrack.value;
        track = {
          title: trackData.title || "Unknown",
          artist: trackData.artist || "Unknown",
          album: trackData.album || "Unknown",
          uri: trackData.uri || "",
          duration: parseInt(trackData.duration || "0") || 0,
          position: parseInt(trackData.position || "0") || 0,
        };
      }

      const playbackState =
        state.status === "fulfilled" ? state.value : "STOPPED";
      const deviceVolume = volume.status === "fulfilled" ? volume.value : 0;
      const deviceMuted = muted.status === "fulfilled" ? muted.value : false;

      let playMode = "NORMAL";
      try {
        playMode = await device.getPlayMode();
      } catch (error) {
        logger.info("Could not get play mode", {
          roomName,
          error: (error as Error).message,
        });
      }

      return {
        isPlaying: playbackState === "PLAYING",
        volume: deviceVolume,
        muted: deviceMuted,
        currentTrack: track,
        playMode: playMode,
        playbackState: playbackState,
      } as SonosPlaybackState;
    } catch (error) {
      logger.error("Failed to get playback state", {
        roomName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search and play Spotify content with enhanced error handling
   */
  public async searchAndPlaySpotify(
    roomName: string,
    query: string
  ): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      logger.info("Attempting Spotify playback", { roomName, query });

      // First, try the primary Spotify URI approach
      await this.trySpotifyPlayback(device, query, roomName);

      logger.info("Sonos Spotify search and play successful", {
        roomName,
        query,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Check for UPnP error 804 (authentication/authorization issue)
      if (this.isUPnPError804(error)) {
        logger.warning(
          "UPnP error 804 detected - Spotify authentication issue",
          {
            roomName,
            query,
            error: errorMessage,
          }
        );

        // Try fallback approaches
        await this.handleSpotifyAuthError(device, query, roomName);
      } else {
        logger.error("Failed to search and play Spotify", {
          roomName,
          query,
          error: errorMessage,
        });
        throw new Error(
          `Spotify playback failed: ${errorMessage}. Please check your Spotify account connection in the Sonos app.`
        );
      }
    }
  }

  /**
   * Check if error is UPnP error 804 or related Spotify authentication errors
   */
  private isUPnPError804(error: any): boolean {
    const errorStr = error?.message || error?.toString() || "";
    return (
      errorStr.includes("804") ||
      errorStr.includes("800") ||
      errorStr.includes("upnpErrorCode") ||
      errorStr.includes("statusCode 500")
    );
  }

  /**
   * Get specific UPnP error code from error message
   */
  private getUPnPErrorCode(error: any): string | null {
    const errorStr = error?.message || error?.toString() || "";
    const match = errorStr.match(/<errorCode>(\d+)<\/errorCode>/);
    return match ? match[1] : null;
  }

  /**
   * Try primary Spotify playback method
   */
  private async trySpotifyPlayback(
    device: any,
    query: string,
    roomName: string
  ): Promise<void> {
    // Method 1: Standard Spotify search URI
    const spotifyUri = `spotify:search:${encodeURIComponent(query)}`;

    // Clear queue and add new content
    await device.flush();
    await device.queue(spotifyUri);
    await device.play();
  }

  /**
   * Handle Spotify authentication errors with fallback strategies
   */
  private async handleSpotifyAuthError(
    device: any,
    query: string,
    roomName: string
  ): Promise<void> {
    logger.info("Attempting Spotify fallback methods", { roomName, query });

    try {
      // Fallback 1: Try alternative Spotify URI format
      const alternativeUri = `spotify:track:${encodeURIComponent(query)}`;
      await device.flush();
      await device.queue(alternativeUri);
      await device.play();

      logger.info("Spotify fallback successful with track URI", {
        roomName,
        query,
      });
      return;
    } catch (fallbackError1) {
      const errorCode = this.getUPnPErrorCode(fallbackError1);
      logger.warning("Spotify track URI fallback failed", {
        roomName,
        query,
        upnpErrorCode: errorCode,
        error: (fallbackError1 as Error).message,
      });
    }

    try {
      // Fallback 2: Try artist search
      const artistUri = `spotify:artist:${encodeURIComponent(query)}`;
      await device.flush();
      await device.queue(artistUri);
      await device.play();

      logger.info("Spotify fallback successful with artist URI", {
        roomName,
        query,
      });
      return;
    } catch (fallbackError2) {
      const errorCode = this.getUPnPErrorCode(fallbackError2);
      logger.warning("Spotify artist URI fallback failed", {
        roomName,
        query,
        upnpErrorCode: errorCode,
        error: (fallbackError2 as Error).message,
      });
    }

    // If all fallbacks fail, provide specific guidance based on error patterns
    const errorMessage = this.getSpotifyErrorGuidance(query);
    throw new Error(errorMessage);
  }

  /**
   * Get specific error guidance based on UPnP error patterns
   */
  private getSpotifyErrorGuidance(query: string): string {
    return `Unable to play "${query}" from Spotify. Based on the error patterns, this appears to be a Spotify account integration issue.

**Common Causes:**
1. 🔗 Spotify account not properly linked to Sonos
2. 💳 Spotify Premium subscription required (free accounts have limited Sonos support)
3. 🌍 Content not available in your region
4. 🔄 Sonos-Spotify connection needs refresh

**Troubleshooting Steps:**
1. Open the Sonos app → Settings → Services & Voice → Spotify
2. Remove and re-add your Spotify account
3. Ensure you're using a Spotify Premium account
4. Try searching for the artist directly in the Sonos app first
5. Check if the content plays in the official Spotify app

**Alternative:** Try a more specific search term like "Tiësto best of" or the full artist name.`;
  }

  /**
   * Add device to group (for multi-room audio)
   */
  public async joinGroup(
    deviceRoomName: string,
    targetRoomName: string
  ): Promise<void> {
    const device = this.getDeviceByRoom(deviceRoomName);
    const targetDevice = this.getDeviceByRoom(targetRoomName);

    if (!device || !targetDevice) {
      throw new Error("One or both devices not found");
    }

    try {
      // In the newer sonos library, we need to get the group and join
      await device.join(targetDevice);
      logger.info("Sonos devices grouped", { deviceRoomName, targetRoomName });
    } catch (error) {
      logger.error("Failed to group devices", {
        deviceRoomName,
        targetRoomName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Remove device from group
   */
  public async leaveGroup(roomName: string): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      await device.leave();
      logger.info("Sonos device left group", { roomName });
    } catch (error) {
      logger.error("Failed to leave group", {
        roomName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Play audio from URL on a specific device
   * Updated to handle radio streams more effectively
   */
  public async playAudioFromUrl(
    roomName: string,
    audioUrl: string
  ): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      // Stop any current playback and clear queue
      await device.stop();
      await device.flush();

      // For radio streams, try different approaches
      logger.info("Attempting radio stream playback", { roomName, audioUrl });

      // Method 1: Try adding to queue and playing immediately
      await device.queue(audioUrl, 0); // Position 0 to play immediately
      await device.play();

      logger.info("Sonos playing audio from URL", { roomName, audioUrl });
    } catch (error) {
      logger.error("Failed to play audio from URL", {
        roomName,
        audioUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Play a temporary audio file (like TTS) on a specific device
   * This method is optimized for short audio clips and temporary files
   */
  public async playTempAudio(
    roomName: string,
    audioUrl: string,
    resumeAfter: boolean = true
  ): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      let previousState: any = null;

      // Store current playback state if we need to resume
      if (resumeAfter) {
        try {
          previousState = await device.getCurrentState();
          logger.info("Stored previous playback state", {
            roomName,
            state: previousState,
          });
        } catch (error) {
          logger.warning("Could not get previous state", {
            roomName,
            error: (error as Error).message,
          });
        }
      }

      // Stop current playback and clear queue
      await device.stop();
      await device.flush();

      // Play the temporary audio
      await device.queue(audioUrl);
      await device.play();

      logger.info("Sonos playing temporary audio", { roomName, audioUrl });

      // Note: For full implementation, you might want to add a listener
      // to detect when the audio finishes and resume previous playback
      // This would require more complex state management
    } catch (error) {
      logger.error("Failed to play temporary audio", {
        roomName,
        audioUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Play TuneIn Radio station on a specific device
   */
  public async playTuneInRadio(
    roomName: string,
    stationId: string,
    stationName: string
  ): Promise<void> {
    const device = this.getDeviceByRoom(roomName);
    if (!device) {
      throw new Error(`Sonos device not found for room: ${roomName}`);
    }

    try {
      // Use Sonos's built-in TuneIn Radio integration
      logger.info("Playing TuneIn Radio station", {
        roomName,
        stationId,
        stationName,
      });

      // Use the playTuneinRadio method we know works
      await (device as any).playTuneinRadio(stationId, stationName);

      logger.info("Sonos TuneIn Radio playback started", {
        roomName,
        stationId,
        stationName,
      });
    } catch (error) {
      logger.error("Failed to play TuneIn Radio", {
        roomName,
        stationId,
        stationName,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
