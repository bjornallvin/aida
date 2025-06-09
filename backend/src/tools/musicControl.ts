/**
 * Music control tool - Mopidy integration disabled
 * Redirects users to radio streaming functionality
 */
import { ToolDefinition, ToolExecutionResult } from "./types";

export const MUSIC_CONTROL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "control_music",
    description:
      "Music control via Mopidy is disabled. Recommends radio streaming instead.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The music action attempted",
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
        query: {
          type: "string",
          description: "Search query for music",
        },
      },
      required: ["action"],
    },
  },
};

export class MusicController {
  async controlMusic(params: any): Promise<ToolExecutionResult> {
    const { action, query } = params;

    let message = "Music control via Mopidy is disabled. ";

    if (action === "search_and_play" && query) {
      message += `To play "${query}", please use the radio search and play feature: POST /radio/search-and-play with your query.`;
    } else {
      message +=
        "Please use the radio streaming endpoints (/radio/*) or Sonos controls instead.";
    }

    return {
      success: false,
      message,
      data: {
        action,
        query,
        suggestion: "Use /radio/search-and-play for music playback",
      },
    };
  }
}
