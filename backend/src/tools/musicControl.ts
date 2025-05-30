/**
 * Music control tool for Mopidy integration
 */
import { ToolDefinition, ToolExecutionResult } from "./types";

export const MUSIC_CONTROL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "control_music",
    description:
      "Control music playback throughout the apartment using Mopidy.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The music action to perform",
          enum: [
            "play",
            "pause",
            "stop",
            "next",
            "previous",
            "volume_up",
            "volume_down",
            "set_volume",
            "search_and_play",
          ],
        },
        volume: {
          type: "number",
          description: "Volume level from 0-100 (used with set_volume action)",
          minimum: 0,
          maximum: 100,
        },
        query: {
          type: "string",
          description:
            "Search query for music (artist, song, album, etc.) - used with search_and_play action",
        },
        source: {
          type: "string",
          description: "Music source to use for search",
          enum: ["spotify", "youtube", "soundcloud", "local"],
          default: "spotify",
        },
      },
      required: ["action"],
    },
  },
};

export class MusicController {
  async controlMusic(params: any): Promise<ToolExecutionResult> {
    // TODO: Integrate with Mopidy API
    const { action, volume, query, source } = params;

    await new Promise((resolve) => setTimeout(resolve, 100));

    let message = "Music ";
    switch (action) {
      case "play":
        message += "playback started";
        break;
      case "pause":
        message += "paused";
        break;
      case "set_volume":
        message += `volume set to ${volume}%`;
        break;
      case "search_and_play":
        message += `searching and playing "${query}" from ${source}`;
        break;
      default:
        message += `${action} completed`;
    }

    return {
      success: true,
      message,
      data: { action, volume, query, source },
    };
  }
}
