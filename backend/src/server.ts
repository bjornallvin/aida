import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config";
import { logger } from "./utils";
import { createRoutes } from "./routes";
import { requestLogger, errorHandler, notFoundHandler } from "./middleware";

/**
 * Aida Apartment AI Server
 * TypeScript refactored version with proper separation of concerns
 */
class AidaServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.ensureDirectories();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(cors());
    this.app.use(express.json());

    // Request logging
    this.app.use(requestLogger);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.use("/", createRoutes());

    // Serve static audio files
    this.app.use("/audio", express.static(config.audioDir));
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(config.audioDir)) {
      fs.mkdirSync(config.audioDir, { recursive: true });
      logger.info("Created audio directory", { path: config.audioDir });
    }

    const uploadsDir = path.join(config.audioDir, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info("Created uploads directory", { path: uploadsDir });
    }
  }

  /**
   * Start the server
   */
  public start(): void {
    this.app.listen(config.port, () => {
      logger.info(`Aida apartment AI server started on port ${config.port}`);
      logger.info("Environment check", {
        mopidyUrl: config.mopidyUrl,
        hasOpenAI: !!config.openaiApiKey,
        hasElevenLabs: !!config.elevenlabsApiKey,
        audioDir: config.audioDir,
        environment: config.environment,
      });
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  try {
    const server = new AidaServer();
    server.start();
  } catch (error) {
    logger.error("Failed to start server", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

export default AidaServer;
