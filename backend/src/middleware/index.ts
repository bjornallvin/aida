import { Request, Response, NextFunction } from "express";
import { logger } from "../utils";

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log the incoming request
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Override res.end to capture response data
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    logger.logRequest(req.method, req.path, res.statusCode, duration);
    return originalEnd(chunk, encoding, cb);
  } as any;

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error("Unhandled error", {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
  });

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    success: false,
    error: "Internal server error",
    ...(isDevelopment && { details: error.message, stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warning("Endpoint not found", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Validation middleware for required fields
 */
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      logger.warning("Validation failed - missing required fields", {
        missing,
        method: req.method,
        path: req.path,
      });

      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

/**
 * Request size validation middleware
 */
export const validateRequestSize = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get("content-length") || "0", 10);

    if (contentLength > maxSizeBytes) {
      logger.warning("Request too large", {
        contentLength,
        maxSizeBytes,
        method: req.method,
        path: req.path,
      });

      res.status(413).json({
        success: false,
        error: "Request entity too large",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};
