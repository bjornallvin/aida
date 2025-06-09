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
    this.discovery = new DeviceDiscovery();

    return await this.discoverDevices();
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
              const zoneAttrs = await sonos.getZoneAttributes();
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

      // Start discovery
      this.discovery.discover();
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
   * Search and play Spotify content
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
      // For Spotify search, we'll use a simplified approach
      // The newer sonos library has different methods for Spotify
      const spotifyUri = `spotify:search:${encodeURIComponent(query)}`;

      // Try to play from Spotify using queue
      await device.queue(spotifyUri);
      await device.play();

      logger.info("Sonos Spotify search and play", { roomName, query });
    } catch (error) {
      logger.error("Failed to search and play Spotify", {
        roomName,
        query,
        error: (error as Error).message,
      });
      throw error;
    }
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
      // Clear the queue first to ensure immediate playback
      await device.flush();

      // Queue the audio URL and play
      await device.queue(audioUrl);
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
}
