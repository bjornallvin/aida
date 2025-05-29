import { config as dotenvConfig } from "dotenv";
import { AppConfig } from "../types";
import os from "os";
import path from "path";

// Load environment variables
dotenvConfig();

/**
 * Application configuration with environment variable validation
 * Follows Azure best practices for configuration management
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private _config: AppConfig;

  private constructor() {
    this._config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public get config(): AppConfig {
    return this._config;
  }

  private loadConfig(): AppConfig {
    const audioDir =
      process.env.TTS_OUTPUT_DIR || path.join(process.cwd(), "audio");

    return {
      port: parseInt(process.env.PORT || "3000", 10),
      mopidyUrl: process.env.MOPIDY_URL || "http://localhost:6680",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || "",
      audioDir,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      maxTextLength: 5000,
      environment:
        (process.env.NODE_ENV as "development" | "production" | "test") ||
        "development",
    };
  }

  private validateConfig(): void {
    const requiredVars = ["MOPIDY_URL", "OPENAI_API_KEY", "ELEVENLABS_API_KEY"];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }

    if (this._config.port < 1 || this._config.port > 65535) {
      throw new Error("Port must be between 1 and 65535");
    }
  }

  public isPlatform(platform: "darwin" | "linux" | "win32"): boolean {
    return os.platform() === platform;
  }

  public get isMacOS(): boolean {
    return this.isPlatform("darwin");
  }

  public get isLinux(): boolean {
    return this.isPlatform("linux");
  }

  public get isWindows(): boolean {
    return this.isPlatform("win32");
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
export const config = configManager.config;
export { uploadConfig } from "./upload";
