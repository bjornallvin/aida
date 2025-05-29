import { LogLevel, LogData } from "../types";
import { config } from "../config";

/**
 * Centralized logging utility with structured logging
 * Follows Azure best practices for monitoring and observability
 */
export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log a message with optional structured data
   */
  public log(level: LogLevel, message: string, data?: LogData): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data }),
      environment: config.environment,
    };

    if (config.environment === "development") {
      // Pretty print for development
      console.log(
        `[${timestamp}] ${level.toUpperCase()}: ${message}`,
        data ? JSON.stringify(data, null, 2) : ""
      );
    } else {
      // Structured JSON for production (easier for log aggregation)
      console.log(JSON.stringify(logEntry));
    }
  }

  public info(message: string, data?: LogData): void {
    this.log("info", message, data);
  }

  public error(message: string, data?: LogData): void {
    this.log("error", message, data);
  }

  public warning(message: string, data?: LogData): void {
    this.log("warning", message, data);
  }

  public debug(message: string, data?: LogData): void {
    if (config.environment === "development") {
      this.log("debug", message, data);
    }
  }

  /**
   * Log API request/response for monitoring
   */
  public logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    data?: LogData
  ): void {
    this.info("API Request", {
      method,
      path,
      statusCode,
      duration,
      ...data,
    });
  }

  /**
   * Log external service calls for debugging and monitoring
   */
  public logExternalCall(
    service: string,
    operation: string,
    success: boolean,
    duration?: number,
    data?: LogData
  ): void {
    this.info("External Service Call", {
      service,
      operation,
      success,
      duration,
      ...data,
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
