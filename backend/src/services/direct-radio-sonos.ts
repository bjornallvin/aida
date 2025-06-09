import { logger } from "../utils";
import { SonosService } from "./sonos";
import { TuneInAPIService, TuneInStation } from "./tunein-api";

export interface RadioSonosRequest {
  roomName: string;
  stationName?: string;
  streamUrl?: string;
  tuneInId?: string;
  action: "play" | "pause" | "stop" | "search";
}

export interface RadioSonosResponse {
  roomName: string;
  action: string;
  success: boolean;
  message: string;
  streamUrl?: string;
  stationInfo?: {
    name: string;
    description: string;
    url?: string;
    tuneInId?: string;
  };
}

/**
 * Direct radio streaming service for Sonos speakers
 * No local server required - streams directly from public radio URLs
 */
export class DirectRadioSonosService {
  private sonosService: SonosService;
  private tuneInAPI: TuneInAPIService;

  // Curated TuneIn Radio stations - these work reliably with Sonos built-in service
  private readonly tuneInStations = {
    bbc_radio1: {
      name: "BBC Radio 1",
      tuneInId: "s25111",
      description: "Pop and new music from BBC",
      type: "tunein",
    },
    bbc_radio2: {
      name: "BBC Radio 2",
      tuneInId: "s6949",
      description: "Classic hits and live music from BBC",
      type: "tunein",
    },
    bbc_radio4: {
      name: "BBC Radio 4",
      tuneInId: "s24861",
      description: "News, drama, and documentaries from BBC",
      type: "tunein",
    },
    npr_news: {
      name: "NPR News Now",
      tuneInId: "s71491",
      description: "Latest news from NPR",
      type: "tunein",
    },
    classic_fm: {
      name: "Classic FM",
      tuneInId: "s9395",
      description: "Classical music radio",
      type: "tunein",
    },
    jazz24: {
      name: "Jazz24",
      tuneInId: "s17762",
      description: "24/7 jazz music",
      type: "tunein",
    },
  };

  // HTTP streams as fallback (though these may not work reliably)
  private readonly httpStations = {
    soma_fm: {
      name: "SomaFM Groove Salad",
      url: "http://ice1.somafm.com/groovesalad-128-mp3",
      description: "Ambient electronic music",
      type: "http",
    },
  };

  constructor(sonosService?: SonosService, tuneInAPI?: TuneInAPIService) {
    this.sonosService = sonosService || new SonosService();
    this.tuneInAPI = tuneInAPI || new TuneInAPIService();
    logger.info("DirectRadioSonosService initialized", {
      tuneInStations: Object.keys(this.tuneInStations),
      httpStations: Object.keys(this.httpStations),
    });
  }

  /**
   * Get all available stations (both TuneIn and HTTP)
   */
  public getAllStations() {
    return {
      tunein: this.tuneInStations,
      http: this.httpStations,
    };
  }

  /**
   * Search for radio stations by name or description (includes dynamic TuneIn search)
   */
  public async searchStations(
    query: string,
    includeDynamic: boolean = true
  ): Promise<Array<{ key: string; station: any }>> {
    const queryLower = query.toLowerCase();
    const matches: Array<{ key: string; station: any }> = [];

    // Search curated TuneIn stations
    for (const [key, station] of Object.entries(this.tuneInStations)) {
      if (
        key.toLowerCase().includes(queryLower) ||
        station.name.toLowerCase().includes(queryLower) ||
        station.description.toLowerCase().includes(queryLower)
      ) {
        matches.push({ key, station });
      }
    }

    // Search HTTP stations
    for (const [key, station] of Object.entries(this.httpStations)) {
      if (
        key.toLowerCase().includes(queryLower) ||
        station.name.toLowerCase().includes(queryLower) ||
        station.description.toLowerCase().includes(queryLower)
      ) {
        matches.push({ key, station });
      }
    }

    // If no matches in curated stations and dynamic search is enabled, search TuneIn API
    if (matches.length === 0 && includeDynamic) {
      logger.info("No curated stations found, searching TuneIn API", { query });
      const dynamicMatches = await this.searchTuneInStations(query, 5);
      matches.push(...dynamicMatches);
    }

    return matches;
  }

  /**
   * Search TuneIn stations dynamically by query
   */
  public async searchTuneInStations(
    query: string,
    limit: number = 10
  ): Promise<Array<{ key: string; station: any }>> {
    try {
      logger.info("Searching TuneIn stations dynamically", { query, limit });

      const stations = await this.tuneInAPI.searchStations(query, limit);

      const results = stations.map((station, index) => ({
        key: `tunein_${station.guide_id || index}`,
        station: TuneInAPIService.convertToInternalFormat(station),
      }));

      logger.info("TuneIn search completed", {
        query,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error("Failed to search TuneIn stations", {
        query,
        error: (error as Error).message,
      });
      // Return empty array on error, don't throw
      return [];
    }
  }

  /**
   * Get popular TuneIn stations by category
   */
  public async getPopularTuneInStations(
    category?: string,
    limit: number = 20
  ): Promise<Array<{ key: string; station: any }>> {
    try {
      logger.info("Getting popular TuneIn stations", { category, limit });

      const stations = await this.tuneInAPI.getPopularStations(category, limit);

      const results = stations.map((station, index) => ({
        key: `popular_${station.guide_id || index}`,
        station: TuneInAPIService.convertToInternalFormat(station),
      }));

      logger.info("Popular TuneIn stations retrieved", {
        category,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error("Failed to get popular TuneIn stations", {
        category,
        error: (error as Error).message,
      });
      // Return empty array on error, don't throw
      return [];
    }
  }

  /**
   * Play a radio station by name or search query
   */
  public async playRadio(
    request: RadioSonosRequest
  ): Promise<RadioSonosResponse> {
    const { roomName, stationName, streamUrl, tuneInId } = request;

    try {
      // Option 1: TuneIn ID provided directly
      if (tuneInId) {
        logger.info("Playing TuneIn station by ID on Sonos", {
          roomName,
          tuneInId,
        });

        // Wait for device discovery before attempting to play
        logger.info("Checking for available Sonos devices...");
        const availableDevices = await this.sonosService.getDevices();

        if (availableDevices.length === 0) {
          logger.info("No devices found, refreshing discovery...");
          await this.sonosService.refreshDevices();
          // Wait a bit more to ensure devices are properly initialized
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        await this.sonosService.playTuneInRadio(
          roomName,
          tuneInId,
          stationName || "TuneIn Station"
        );

        return {
          roomName,
          action: "play_tunein_radio",
          success: true,
          message: `Playing TuneIn station on Sonos in ${roomName}`,
          stationInfo: {
            name: stationName || "TuneIn Station",
            description: "TuneIn Radio Station",
            tuneInId,
          },
        };
      }

      // Option 2: Direct stream URL provided
      if (streamUrl) {
        logger.info("Playing direct stream URL on Sonos", {
          roomName,
          streamUrl,
        });

        // Wait for device discovery before attempting to play
        logger.info("Checking for available Sonos devices...");
        const availableDevices = await this.sonosService.getDevices();

        if (availableDevices.length === 0) {
          logger.info("No devices found, refreshing discovery...");
          await this.sonosService.refreshDevices();
          // Wait a bit more to ensure devices are properly initialized
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        await this.sonosService.playAudioFromUrl(roomName, streamUrl);

        return {
          roomName,
          action: "play_direct_stream",
          success: true,
          message: `Playing direct stream on Sonos in ${roomName}`,
          streamUrl,
          stationInfo: {
            name: "Direct Stream",
            description: "Custom stream URL",
            url: streamUrl,
          },
        };
      }

      // Option 3: Station name provided - search for it
      if (!stationName) {
        throw new Error(
          "Either stationName, streamUrl, or tuneInId is required"
        );
      }

      const matches = await this.searchStations(stationName);

      if (matches.length === 0) {
        const tuneInStations = Object.keys(this.tuneInStations).join(", ");
        const httpStations = Object.keys(this.httpStations).join(", ");
        throw new Error(
          `No station found for "${stationName}". Available TuneIn: ${tuneInStations}. Available HTTP: ${httpStations}`
        );
      }

      // Use the first match
      const firstMatch = matches[0];
      if (!firstMatch) {
        throw new Error(`No station found for "${stationName}"`);
      }

      const { key, station } = firstMatch;

      logger.info("Playing radio station on Sonos", {
        roomName,
        stationKey: key,
        stationName: station.name,
        stationType: station.type,
      });

      // Wait for device discovery before attempting to play
      logger.info("Checking for available Sonos devices...");
      const availableDevices = await this.sonosService.getDevices();

      if (availableDevices.length === 0) {
        logger.info("No devices found, refreshing discovery...");
        await this.sonosService.refreshDevices();
        // Wait a bit more to ensure devices are properly initialized
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (station.type === "tunein") {
        // Use TuneIn Radio integration for better compatibility
        await this.sonosService.playTuneInRadio(
          roomName,
          station.tuneInId,
          station.name
        );

        return {
          roomName,
          action: "play_tunein_radio",
          success: true,
          message: `Playing ${station.name} via TuneIn on Sonos in ${roomName}`,
          stationInfo: {
            name: station.name,
            description: station.description,
            tuneInId: station.tuneInId,
          },
        };
      } else {
        // Fall back to direct HTTP stream (may not work reliably)
        await this.sonosService.playAudioFromUrl(roomName, station.url);

        return {
          roomName,
          action: "play_http_stream",
          success: true,
          message: `Playing ${station.name} via HTTP stream on Sonos in ${roomName}`,
          streamUrl: station.url,
          stationInfo: {
            name: station.name,
            description: station.description,
            url: station.url,
          },
        };
      }
    } catch (error) {
      logger.error("Failed to play radio on Sonos", {
        roomName,
        stationName,
        streamUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all available radio stations
   */
  public getAvailableStations(): Record<string, any> {
    return this.getAllStations();
  }

  /**
   * Get available Sonos devices
   */
  public async getAvailableDevices(): Promise<any[]> {
    try {
      return await this.sonosService.getDevices();
    } catch (error) {
      logger.error("Failed to get available devices", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Stop playback on Sonos
   */
  public async stopRadio(roomName: string): Promise<void> {
    try {
      await this.sonosService.stopMusic(roomName);
      logger.info("Radio playback stopped", { roomName });
    } catch (error) {
      logger.error("Failed to stop radio playback", {
        roomName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Pause playback on Sonos
   */
  public async pauseRadio(roomName: string): Promise<void> {
    try {
      await this.sonosService.pauseMusic(roomName);
      logger.info("Radio playback paused", { roomName });
    } catch (error) {
      logger.error("Failed to pause radio playback", {
        roomName,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
