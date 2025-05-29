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
}

export interface MopidyTrack {
  uri: string;
  name: string;
  artists?: Array<{ name: string }>;
}

export interface MopidySearchResult {
  tracks: MopidyTrack[];
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
  result: MopidyTrack | { uri: string };
}

export interface TTSResponse {
  room: string;
  filename: string;
  textLength: number;
}

export interface ChatResponse {
  response: string;
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
  mopidyUrl: string;
  openaiApiKey: string;
  elevenlabsApiKey: string;
  audioDir: string;
  maxFileSize: number;
  maxTextLength: number;
  environment: "development" | "production" | "test";
}

export interface LogData {
  [key: string]: any;
}

export type LogLevel = "info" | "error" | "warning" | "debug";
