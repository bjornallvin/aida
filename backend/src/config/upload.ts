import multer from "multer";
import path from "path";
import { config } from "../config";
import { logger } from "../utils";

/**
 * Multer configuration for file uploads
 * Implements secure file handling with proper validation
 */
export const uploadConfig = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadsPath = path.join(config.audioDir, "uploads");
      cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
      // Preserve original filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      cb(null, `${timestamp}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: config.maxFileSize, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Log file details for debugging
    logger.debug("File upload attempt", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Accept audio files - be more permissive
    if (file.mimetype && file.mimetype.startsWith("audio/")) {
      logger.debug("File accepted by mimetype", {
        originalname: file.originalname,
      });
      cb(null, true);
    } else if (!file.mimetype) {
      // If mimetype is not detected, check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (
        [".wav", ".mp3", ".aiff", ".m4a", ".flac", ".ogg", ".webm"].includes(
          ext
        )
      ) {
        logger.debug("File accepted by extension", {
          originalname: file.originalname,
        });
        cb(null, true);
      } else {
        logger.warning("File rejected - no mimetype and unknown extension", {
          originalname: file.originalname,
        });
        cb(new Error("Only audio files are allowed") as any, false);
      }
    } else {
      logger.warning("File rejected - wrong mimetype", {
        mimetype: file.mimetype,
        originalname: file.originalname,
      });
      cb(new Error("Only audio files are allowed") as any, false);
    }
  },
});
