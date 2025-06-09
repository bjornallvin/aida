import { Request, Response, Router } from "express";
import {
  DirectRadioSonosService,
  RadioSonosRequest,
  RadioSonosResponse,
} from "../services/direct-radio-sonos";
import { logger } from "../utils";

const router = Router();
const radioService = new DirectRadioSonosService();

interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
  timestamp: string;
}

/**
 * GET /radio/stations
 * Get all available radio stations
 */
router.get("/stations", async (req: Request, res: Response) => {
  try {
    logger.info("Getting available radio stations");

    const stations = radioService.getAvailableStations();
    const devices = await radioService.getAvailableDevices();

    const response: APIResponse = {
      success: true,
      data: {
        stations,
        sonosDevices: devices,
        stationCount: Object.keys(stations).length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Get radio stations error", {
      error: (error as Error).message,
    });

    const response: APIResponse = {
      success: false,
      error: "Failed to get stations",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /radio/play
 * Play a radio station on Sonos
 * Body: { roomName: string, stationName?: string, streamUrl?: string }
 */
router.post("/play", async (req: Request, res: Response) => {
  try {
    const { roomName, stationName, streamUrl } = req.body;

    if (!roomName) {
      const response: APIResponse = {
        success: false,
        error: "roomName is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    if (!stationName && !streamUrl) {
      const response: APIResponse = {
        success: false,
        error: "Either stationName or streamUrl is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Radio play request", { roomName, stationName, streamUrl });

    const request: RadioSonosRequest = {
      roomName,
      stationName,
      streamUrl,
      action: "play",
    };

    const result = await radioService.playRadio(request);

    const response: APIResponse = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Radio play error", {
      error: (error as Error).message,
      request: req.body,
    });

    const response: APIResponse = {
      success: false,
      error: "Radio play failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /radio/search
 * Search for radio stations
 * Body: { query: string }
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      const response: APIResponse = {
        success: false,
        error: "query is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Radio search request", { query });

    const matches = await radioService.searchStations(query);

    const response: APIResponse = {
      success: true,
      data: {
        query,
        matches,
        count: matches.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Radio search error", {
      error: (error as Error).message,
      query: req.body.query,
    });

    const response: APIResponse = {
      success: false,
      error: "Radio search failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /radio/search/tunein
 * Search TuneIn stations dynamically
 * Body: { query: string, limit?: number }
 */
router.post("/search/tunein", async (req: Request, res: Response) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      const response: APIResponse = {
        success: false,
        error: "query is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    logger.info("TuneIn search request", { query, limit });

    const stations = await radioService.searchTuneInStations(query, limit);

    const response: APIResponse = {
      success: true,
      data: {
        query,
        stations,
        count: stations.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("TuneIn search error", {
      error: (error as Error).message,
      query: req.body.query,
    });

    const response: APIResponse = {
      success: false,
      error: "TuneIn search failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /radio/search-and-play
 * Search for a station and automatically play the first result
 * Body: { query: string, roomName: string, source?: 'tunein' | 'curated' | 'both' }
 */
router.post("/search-and-play", async (req: Request, res: Response) => {
  try {
    const { query, roomName, source = "both" } = req.body;

    if (!query) {
      const response: APIResponse = {
        success: false,
        error: "query is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    if (!roomName) {
      const response: APIResponse = {
        success: false,
        error: "roomName is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Search and play request", { query, roomName, source });

    let foundStationData: { key: string; station: any } | undefined;

    // Try different search sources based on preference
    if (source === "tunein" || source === "both") {
      // First try TuneIn search
      const tuneInStations = await radioService.searchTuneInStations(query, 1);
      if (tuneInStations.length > 0) {
        foundStationData = tuneInStations[0];
        if (foundStationData) {
          logger.info("Found station via TuneIn", {
            stationName: foundStationData.station.name,
            tuneInId: foundStationData.station.tuneInId,
          });
        }
      }
    }

    if (!foundStationData && (source === "curated" || source === "both")) {
      // Try curated stations if TuneIn didn't find anything
      const curatedStations = await radioService.searchStations(query);
      if (curatedStations.length > 0) {
        foundStationData = curatedStations[0];
        if (foundStationData) {
          logger.info("Found station via curated search", {
            stationName: foundStationData.station.name,
            url: foundStationData.station.url,
          });
        }
      }
    }

    if (!foundStationData) {
      const response: APIResponse = {
        success: false,
        error: `No stations found for query: "${query}"`,
        details: `Searched ${source} sources`,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
      return;
    }

    const station = foundStationData.station;

    // Now play the found station
    const playRequest: RadioSonosRequest = {
      roomName,
      action: "play",
      stationName: station.name,
    };

    // Add either tuneInId or streamUrl depending on the station type
    if (station.tuneInId) {
      playRequest.tuneInId = station.tuneInId;
    } else if (station.url) {
      playRequest.streamUrl = station.url;
    }

    const playResult = await radioService.playRadio(playRequest);

    const response: APIResponse = {
      success: true,
      data: {
        searchQuery: query,
        foundStation: {
          name: station.name,
          description: station.description,
          genre: station.genre,
          country: station.country,
          tuneInId: station.tuneInId,
          url: station.url,
          type: station.type,
        },
        playResult,
        roomName,
        source: station.tuneInId ? "tunein" : "curated",
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Search and play error", {
      error: (error as Error).message,
      query: req.body.query,
      roomName: req.body.roomName,
    });

    const response: APIResponse = {
      success: false,
      error: "Search and play failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * GET /radio/popular
 * Get popular TuneIn stations
 * Query params: category?, limit?
 */
router.get("/popular", async (req: Request, res: Response) => {
  try {
    const { category, limit = 20 } = req.query;

    logger.info("Popular stations request", { category, limit });

    const stations = await radioService.getPopularTuneInStations(
      category as string,
      parseInt(limit as string) || 20
    );

    const response: APIResponse = {
      success: true,
      data: {
        category: category || "all",
        stations,
        count: stations.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Popular stations error", {
      error: (error as Error).message,
      category: req.query.category,
    });

    const response: APIResponse = {
      success: false,
      error: "Failed to get popular stations",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /radio/stop
 * Stop radio playback on Sonos
 * Body: { roomName: string }
 */
router.post("/stop", async (req: Request, res: Response) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      const response: APIResponse = {
        success: false,
        error: "roomName is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Radio stop request", { roomName });

    await radioService.stopRadio(roomName);

    const response: APIResponse = {
      success: true,
      data: { action: "stopped", roomName },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Radio stop error", {
      error: (error as Error).message,
      roomName: req.body.roomName,
    });

    const response: APIResponse = {
      success: false,
      error: "Radio stop failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /radio/pause
 * Pause radio playback on Sonos
 * Body: { roomName: string }
 */
router.post("/pause", async (req: Request, res: Response) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      const response: APIResponse = {
        success: false,
        error: "roomName is required",
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Radio pause request", { roomName });

    await radioService.pauseRadio(roomName);

    const response: APIResponse = {
      success: true,
      data: { action: "paused", roomName },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error("Radio pause error", {
      error: (error as Error).message,
      roomName: req.body.roomName,
    });

    const response: APIResponse = {
      success: false,
      error: "Radio pause failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

export default router;
