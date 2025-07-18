import { Request } from "express";

export interface PlayRequest {
  room: string;
  type: "spotify" | "radio";
  query?: string;
  url?: string;
}

export interface TTSRequest {
  text: string;
  room: string;
  language?: "english" | "swedish" | "auto";
}

export interface ChatRequest {
  message: string;
  roomName?: string | undefined;
  conversationHistory?: ChatMessage[];
}

export interface VoiceCommandRequest {
  roomName?: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface AudioFileRequest extends Request {
  file?: Express.Multer.File;
  body: any;
}

export interface APIResponse<T = any> {
  success: boolean;
  error?: string;
  details?: string;
  timestamp: string;
  data?: T;
}

export interface PlayResponse {
  room: string;
  type: string;
  result: { uri: string };
}

export interface TTSResponse {
  room: string;
  filename: string;
  textLength: number;
}

export interface ChatResponse {
  response: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolExecutionResult[];
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface VoiceCommandResponse {
  transcription: string;
  response: string;
  audioFile: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolExecutionResult[];
  usage?:
    | {
        total_tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
      }
    | undefined;
}

export interface VoiceCommandSonosResponse {
  transcription: string;
  response: string;
  sonosPlayback: {
    room: string;
    filename: string;
    success: boolean;
    message: string;
  };
  toolCalls?: ToolCall[];
  toolResults?: ToolExecutionResult[];
  usage?:
    | {
        total_tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
      }
    | undefined;
}

export interface AppConfig {
  port: number;
  openaiApiKey: string;
  elevenlabsApiKey: string;
  audioDir: string;
  maxFileSize: number;
  maxTextLength: number;
  environment: "development" | "production" | "test";
  baseUrl?: string;
}

export interface LogData {
  [key: string]: any;
}

export type LogLevel = "info" | "error" | "warning" | "debug";
