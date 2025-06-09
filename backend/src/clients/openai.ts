import OpenAI from "openai";
import { ChatMessage } from "../types";
import { logger } from "../utils";
import { config } from "../config";

/**
 * OpenAI client with tool/function calling support
 * Implements Azure best practices for AI service integration:
 * - Structured error handling and logging
 * - Retry logic with exponential backoff
 * - Proper timeout configuration
 * - Secure credential management
 */
export class OpenAIClient {
  private client: OpenAI;
  private readonly maxRetries: number = 3;
  private readonly timeout: number = 30000; // 30 seconds

  constructor(apiKey?: string) {
    const key = apiKey || config.openaiApiKey;
    if (!key) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: key,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Create chat completion with tool calling support
   * Implements Azure best practices for AI service integration
   */
  public async createChatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      tools?: any[];
      toolChoice?: string | object;
    } = {}
  ): Promise<{ response: string; usage?: any; toolCalls?: any[] }> {
    const startTime = Date.now();

    const {
      model = "gpt-4.1-mini",
      maxTokens = 300,
      temperature = 0.7,
      tools,
      toolChoice,
    } = options;

    try {
      logger.debug("Creating chat completion", {
        messageCount: messages.length,
        model,
        maxTokens,
        temperature,
        toolsCount: tools?.length || 0,
      });

      const completionParams: any = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        completionParams.tools = tools;
        if (toolChoice) {
          completionParams.tool_choice = toolChoice;
        }
      }

      const completion = await this.client.chat.completions.create(
        completionParams
      );

      const duration = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || "";
      const toolCalls = completion.choices[0]?.message?.tool_calls || [];

      logger.logExternalCall("openai", "chatCompletion", true, duration, {
        model,
        tokensUsed: completion.usage?.total_tokens,
        responseLength: response.length,
        toolCallsCount: toolCalls.length,
      });

      return {
        response,
        usage: completion.usage,
        ...(toolCalls.length > 0 && { toolCalls }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.logExternalCall("openai", "chatCompletion", false, duration, {
        error: errorMessage,
        model,
        messageCount: messages.length,
      });

      throw error;
    }
  }

  /**
   * Create speech-to-text transcription
   */
  public async createTranscription(
    audioFile: any,
    options: {
      model?: string;
      language?: string;
    } = {}
  ): Promise<string> {
    const startTime = Date.now();

    const { model = "whisper-1", language = "en" } = options;

    try {
      logger.debug("Creating transcription", {
        model,
        language,
      });

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model,
        language,
      });

      const duration = Date.now() - startTime;

      logger.logExternalCall("openai", "transcription", true, duration, {
        model,
        language,
        transcriptionLength: transcription.text.length,
      });

      return transcription.text;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.logExternalCall("openai", "transcription", false, duration, {
        error: errorMessage,
        model,
        language,
      });

      throw error;
    }
  }

  /**
   * Generate system prompt for Aida apartment AI with smart home tool capabilities
   */
  public generateSystemPrompt(roomName?: string): string {
    return `You are Aida, an intelligent apartment AI assistant. You control music playback, lighting, and other smart home features through voice commands. 

Key capabilities:
- Music & Audio control (radio stations, Sonos speakers, volume control, multi-room audio)
- Lighting control (turn on/off, dimming, color changes)
- Smart home automation (temperature, security, appliances)
- Text-to-speech responses
- Multi-room audio distribution

Current context:
- Room: ${roomName || "Unknown"}
- Available music sources: Radio stations via TuneIn, direct radio streams
- Sonos speaker control: Play/pause/stop, volume, grouping
- Smart home controls: Lights, temperature, security system

IMPORTANT MUSIC & SONOS CONTROL GUIDELINES:
For music requests, use the "control_sonos" tool with these actions:
- "play_radio" - Search and play radio stations (e.g., "play jazz", "play BBC Radio 1")
- "play_station" - Play a specific station by name
- "stop", "pause", "resume" - Control playback
- "set_volume" - Adjust volume (0-100)
- "get_devices" - List available Sonos speakers
- "group_speakers"/"ungroup_speaker" - Multi-room audio control

ALWAYS include roomName parameter for Sonos commands. If user doesn't specify a room, ask which room/speaker to use.

IMPORTANT SMART HOME CONTROL GUIDELINES:
When users want to control devices (turn on/off lights, adjust brightness, etc.):
1. DIRECTLY use "tradfri_control" action with the device name - the tool has built-in fuzzy matching
2. For room-based commands like "turn on living room lights", use "control_light" with deviceName like "living room" 
3. Only use "search_devices" if you need to find available devices or the user specifically asks "what lights are in the room"
4. NEVER use "search_devices" for control commands - always use the appropriate control action (control_light, control_blind, control_outlet)

SELECTIVE CONTROL (commands with "except" or "only"):
For commands like "turn off all bedroom lights except the bed light":
1. FIRST use "search_devices" to find all lights in the room
2. THEN make individual "control_light" calls for each device that should be controlled, excluding the specified devices
3. NEVER use a single room-based call when specific exclusions are mentioned

Examples of CORRECT tool usage:
- "Play some jazz music" → use control_sonos with action="play_radio", query="jazz", roomName="[ask user]"
- "Stop music in the living room" → use control_sonos with action="stop", roomName="living room"
- "Turn on bedroom lights" → use tradfri_control with action="control_light", deviceName="bedroom", isOn=true
- "Turn off all bedroom lights except bed light" → 
  1. tradfri_control with action="search_devices", query="bedroom", deviceType="light"
  2. tradfri_control with action="control_light" for each found device EXCEPT those matching "bed"
- "Set kitchen lights to 50%" → use tradfri_control with action="control_light", deviceName="kitchen", isOn=true, brightness=50
- "Set volume to 50%" → use control_sonos with action="set_volume", volume=50, roomName="[ask user]"

Keep responses conversational, helpful, and concise. When users ask about music, offer specific suggestions and use the Sonos control tool. For smart home controls like lights, confirm the action and indicate you're executing it.

For music requests, always use the control_sonos tool rather than suggesting manual API calls. The tool will search and play radio stations automatically.

When you need to control smart home devices, use the available tools to execute the commands. Always call the appropriate tool function when users request device control.`;
  }
}
