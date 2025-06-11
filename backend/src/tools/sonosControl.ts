/**
 * Sonos speaker control tool for smart home automation
 * Provides comprehensive control over Sonos speakers including radio, volume, and playback
 */
import { ToolDefinition, ToolExecutionResult } from "./types";
import { SonosService } from "../services/sonos";
import { DirectRadioSonosService } from "../services/direct-radio-sonos";
import { logger } from "../utils";

export const SONOS_CONTROL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "control_sonos",
    description:
      "Control Sonos speakers in the apartment. Can play radio stations, control playback, adjust volume, and manage multi-room audio. " +
      "Supports TuneIn radio stations, direct radio streams, playback controls (play/pause/stop), volume control, and speaker grouping. " +
      "Use 'play_radio' action for music requests - this will search and play radio stations automatically.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The action to perform on the Sonos system",
          enum: [
            "play_radio",
            "search_radio",
            "stop",
            "pause",
            "resume",
            "set_volume",
            "get_volume",
            "get_status",
            "get_devices",
            "group_speakers",
            "ungroup_speaker",
            "play_station",
            "get_stations",
          ],
        },
        roomName: {
          type: "string",
          description:
            "The name of the Sonos speaker/room to control (e.g., 'Living Room', 'Kitchen', 'Bedroom')",
        },
        query: {
          type: "string",
          description:
            "Search query for radio stations (used with 'play_radio' and 'search_radio' actions). Can be genre, station name, or artist.",
        },
        stationName: {
          type: "string",
          description:
            "Specific radio station name to play (used with 'play_station' action)",
        },
        volume: {
          type: "number",
          description:
            "Volume level from 0-100 (used with 'set_volume' action)",
          minimum: 0,
          maximum: 100,
        },
        targetRoom: {
          type: "string",
          description:
            "Target room name for grouping speakers (used with 'group_speakers' action)",
        },
      },
      required: ["action"],
    },
  },
};

export class SonosController {
  private sonosService: SonosService;
  private radioService: DirectRadioSonosService;

  constructor(
    sonosService?: SonosService,
    radioService?: DirectRadioSonosService
  ) {
    this.sonosService = sonosService || new SonosService();
    this.radioService =
      radioService || new DirectRadioSonosService(this.sonosService);
  }

  async controlSonos(params: any): Promise<ToolExecutionResult> {
    const { action, roomName, query, stationName, volume, targetRoom } = params;

    logger.info("Sonos control requested", {
      action,
      roomName,
      query,
      stationName,
      volume,
    });

    try {
      switch (action) {
        case "play_radio":
          return await this.playRadio(roomName, query);

        case "search_radio":
          return await this.searchRadio(query);

        case "play_station":
          return await this.playStation(roomName, stationName);

        case "stop":
          return await this.stopPlayback(roomName);

        case "pause":
          return await this.pausePlayback(roomName);

        case "resume":
          return await this.resumePlayback(roomName);

        case "set_volume":
          return await this.setVolume(roomName, volume);

        case "get_volume":
          return await this.getVolume(roomName);

        case "get_status":
          return await this.getStatus(roomName);

        case "get_devices":
          return await this.getDevices();

        case "get_stations":
          return await this.getStations();

        case "group_speakers":
          return await this.groupSpeakers(roomName, targetRoom);

        case "ungroup_speaker":
          return await this.ungroupSpeaker(roomName);

        default:
          return {
            success: false,
            message: `Unknown Sonos action: ${action}`,
            error: "INVALID_ACTION",
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Sonos control failed", { action, error: errorMessage });

      return {
        success: false,
        message: `Failed to ${action} on Sonos: ${errorMessage}`,
        error: "SONOS_CONTROL_ERROR",
        data: {
          action,
          roomName,
          originalError: errorMessage,
        },
      };
    }
  }

  private async playRadio(
    roomName: string,
    query: string
  ): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to play radio",
        error: "MISSING_ROOM",
      };
    }

    if (!query) {
      return {
        success: false,
        message: "Search query is required to play radio",
        error: "MISSING_QUERY",
      };
    }

    try {
      // First search for stations
      const searchResults = await this.radioService.searchStations(query, true);

      if (searchResults.length === 0) {
        return {
          success: false,
          message: `No radio stations found for "${query}". Try searching for genres like "jazz", "classical", "news", or specific station names.`,
          error: "NO_STATIONS_FOUND",
        };
      }

      // Play the first matching station
      const firstResult = searchResults[0];
      if (!firstResult) {
        return {
          success: false,
          message: `No radio stations found for "${query}". Try searching for genres like "jazz", "classical", "news", or specific station names.`,
          error: "NO_STATIONS_FOUND",
        };
      }

      const station = firstResult.station as any; // Cast to any since station can have different shapes
      const playRequest = {
        roomName,
        action: "play" as const,
        stationName: station.name,
        tuneInId: station.tuneInId,
        streamUrl: station.url,
      };

      const result = await this.radioService.playRadio(playRequest);

      return {
        success: true,
        message: `Playing ${station.name} on ${roomName}`,
        data: {
          stationName: station.name,
          description: station.description,
          roomName,
          playResult: result,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to play radio: ${errorMessage}`,
        error: "RADIO_PLAY_ERROR",
      };
    }
  }

  private async searchRadio(query: string): Promise<ToolExecutionResult> {
    if (!query) {
      return {
        success: false,
        message: "Search query is required",
        error: "MISSING_QUERY",
      };
    }

    try {
      const searchResults = await this.radioService.searchStations(query, true);

      if (searchResults.length === 0) {
        return {
          success: false,
          message: `No radio stations found for "${query}"`,
          error: "NO_STATIONS_FOUND",
        };
      }

      const stations = searchResults.map((result) => {
        const station = result.station as any; // Cast to any since station can have different shapes
        return {
          name: station.name,
          description: station.description,
          genre: station.genre,
          country: station.country,
          type: station.type,
        };
      });

      return {
        success: true,
        message: `Found ${stations.length} radio stations for "${query}"`,
        data: {
          query,
          stations,
          count: stations.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to search radio stations: ${errorMessage}`,
        error: "RADIO_SEARCH_ERROR",
      };
    }
  }

  private async playStation(
    roomName: string,
    stationName: string
  ): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required",
        error: "MISSING_ROOM",
      };
    }

    if (!stationName) {
      return {
        success: false,
        message: "Station name is required",
        error: "MISSING_STATION",
      };
    }

    try {
      const playRequest = {
        roomName,
        action: "play" as const,
        stationName,
      };

      const result = await this.radioService.playRadio(playRequest);

      return {
        success: true,
        message: `Playing ${stationName} on ${roomName}`,
        data: {
          stationName,
          roomName,
          playResult: result,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to play station: ${errorMessage}`,
        error: "STATION_PLAY_ERROR",
      };
    }
  }

  private async stopPlayback(roomName: string): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to stop playback",
        error: "MISSING_ROOM",
      };
    }

    try {
      await this.sonosService.stopMusic(roomName);

      return {
        success: true,
        message: `Stopped playback on ${roomName}`,
        data: {
          action: "stop",
          roomName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to stop playback: ${errorMessage}`,
        error: "STOP_ERROR",
      };
    }
  }

  private async pausePlayback(roomName: string): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to pause playback",
        error: "MISSING_ROOM",
      };
    }

    try {
      await this.sonosService.pauseMusic(roomName);

      return {
        success: true,
        message: `Paused playback on ${roomName}`,
        data: {
          action: "pause",
          roomName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to pause playback: ${errorMessage}`,
        error: "PAUSE_ERROR",
      };
    }
  }

  private async resumePlayback(roomName: string): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to resume playback",
        error: "MISSING_ROOM",
      };
    }

    try {
      // Resume is typically implemented as a play command without arguments
      await this.sonosService.playMusic({
        room: roomName,
        type: "queue", // Play from current queue
      });

      return {
        success: true,
        message: `Resumed playback on ${roomName}`,
        data: {
          action: "resume",
          roomName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to resume playback: ${errorMessage}`,
        error: "RESUME_ERROR",
      };
    }
  }

  private async setVolume(
    roomName: string,
    volume: number
  ): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to set volume",
        error: "MISSING_ROOM",
      };
    }

    if (volume === undefined || volume < 0 || volume > 100) {
      return {
        success: false,
        message: "Volume must be between 0 and 100",
        error: "INVALID_VOLUME",
      };
    }

    try {
      await this.sonosService.setVolume(roomName, volume);

      return {
        success: true,
        message: `Set volume to ${volume}% on ${roomName}`,
        data: {
          action: "set_volume",
          roomName,
          volume,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to set volume: ${errorMessage}`,
        error: "VOLUME_ERROR",
      };
    }
  }

  private async getVolume(roomName: string): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to get volume",
        error: "MISSING_ROOM",
      };
    }

    try {
      const volume = await this.sonosService.getVolume(roomName);

      return {
        success: true,
        message: `Volume on ${roomName} is ${volume}%`,
        data: {
          roomName,
          volume,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to get volume: ${errorMessage}`,
        error: "VOLUME_GET_ERROR",
      };
    }
  }

  private async getStatus(roomName: string): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to get status",
        error: "MISSING_ROOM",
      };
    }

    try {
      const status = await this.sonosService.getPlaybackState(roomName);

      return {
        success: true,
        message: `Status for ${roomName}: ${
          status.isPlaying ? "Playing" : "Stopped"
        }, Volume: ${status.volume}%`,
        data: {
          roomName,
          isPlaying: status.isPlaying,
          volume: status.volume,
          muted: status.muted,
          currentTrack: status.currentTrack,
          playbackState: status.playbackState,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to get status: ${errorMessage}`,
        error: "STATUS_ERROR",
      };
    }
  }

  private async getDevices(): Promise<ToolExecutionResult> {
    try {
      const devices = await this.sonosService.getDevices();

      const deviceList = devices.map((device) => ({
        roomName: device.roomName,
        uuid: device.uuid,
        host: device.host, // Use host instead of ip
        model: device.model,
      }));

      return {
        success: true,
        message: `Found ${devices.length} Sonos device(s)`,
        data: {
          devices: deviceList,
          count: devices.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to get devices: ${errorMessage}`,
        error: "DEVICES_ERROR",
      };
    }
  }

  private async getStations(): Promise<ToolExecutionResult> {
    try {
      const stations = this.radioService.getAvailableStations();

      const stationList = {
        tunein: Object.entries(stations.tunein).map(([key, station]) => {
          const stationData = station as any; // Cast to any since station types vary
          return {
            key,
            name: stationData.name,
            description: stationData.description,
            type: stationData.type,
          };
        }),
        http: Object.entries(stations.http).map(([key, station]) => {
          const stationData = station as any; // Cast to any since station types vary
          return {
            key,
            name: stationData.name,
            description: stationData.description,
            type: stationData.type,
          };
        }),
      };

      const totalCount = stationList.tunein.length + stationList.http.length;

      return {
        success: true,
        message: `Found ${totalCount} available radio stations`,
        data: {
          stations: stationList,
          totalCount,
          tuneInCount: stationList.tunein.length,
          httpCount: stationList.http.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to get stations: ${errorMessage}`,
        error: "STATIONS_ERROR",
      };
    }
  }

  private async groupSpeakers(
    deviceRoom: string,
    targetRoom: string
  ): Promise<ToolExecutionResult> {
    if (!deviceRoom || !targetRoom) {
      return {
        success: false,
        message: "Both device room and target room are required for grouping",
        error: "MISSING_ROOMS",
      };
    }

    try {
      await this.sonosService.joinGroup(deviceRoom, targetRoom);

      return {
        success: true,
        message: `Grouped ${deviceRoom} with ${targetRoom}`,
        data: {
          action: "group",
          deviceRoom,
          targetRoom,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to group speakers: ${errorMessage}`,
        error: "GROUP_ERROR",
      };
    }
  }

  private async ungroupSpeaker(roomName: string): Promise<ToolExecutionResult> {
    if (!roomName) {
      return {
        success: false,
        message: "Room name is required to ungroup speaker",
        error: "MISSING_ROOM",
      };
    }

    try {
      await this.sonosService.leaveGroup(roomName);

      return {
        success: true,
        message: `Ungrouped ${roomName} from group`,
        data: {
          action: "ungroup",
          roomName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to ungroup speaker: ${errorMessage}`,
        error: "UNGROUP_ERROR",
      };
    }
  }
}
