import { logger } from "../utils";

export interface TuneInStation {
  guide_id: string;
  text: string;
  URL: string;
  bitrate?: string;
  reliability?: number;
  type: string;
  formats?: string;
  playing?: string;
  subtext?: string;
  genre_id?: string;
  preset_id?: string;
}

export interface TuneInSearchResponse {
  head: {
    title: string;
    status: string;
  };
  body: TuneInStation[];
}

/**
 * TuneIn API service for searching radio stations
 * Uses TuneIn's public API to find stations dynamically
 */
export class TuneInAPIService {
  private readonly baseUrl = "http://opml.radiotime.com";
  private readonly partnerId = "RadioTime"; // Default partner ID
  private readonly username = "radiotime"; // Default username

  /**
   * Search for radio stations by query
   */
  public async searchStations(
    query: string,
    limit: number = 20
  ): Promise<TuneInStation[]> {
    try {
      logger.info("Searching TuneIn stations", { query, limit });

      const searchUrl = new URL(`${this.baseUrl}/Search.ashx`);
      searchUrl.searchParams.set("query", query);
      searchUrl.searchParams.set("partnerId", this.partnerId);
      searchUrl.searchParams.set("username", this.username);
      searchUrl.searchParams.set("formats", "mp3,aac,wma");
      searchUrl.searchParams.set("render", "json");
      searchUrl.searchParams.set("limit", limit.toString());

      const response = await fetch(searchUrl.toString(), {
        headers: {
          "User-Agent": "AIDA-Radio-Client/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `TuneIn API HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as TuneInSearchResponse;

      if (data.head.status !== "200") {
        throw new Error(`TuneIn API error: ${data.head.status}`);
      }

      // Filter for stations (not categories or other content)
      const stations = data.body.filter(
        (item) =>
          item.type === "audio" &&
          item.guide_id &&
          item.guide_id.startsWith("s")
      );

      logger.info("TuneIn search completed", {
        query,
        totalResults: data.body.length,
        stationResults: stations.length,
      });

      return stations;
    } catch (error) {
      logger.error("Failed to search TuneIn stations", {
        query,
        error: (error as Error).message,
      });
      throw new Error(`TuneIn search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get popular stations by category
   */
  public async getPopularStations(
    category?: string,
    limit: number = 20
  ): Promise<TuneInStation[]> {
    try {
      logger.info("Getting popular TuneIn stations", { category, limit });

      const browseUrl = new URL(`${this.baseUrl}/Browse.ashx`);
      browseUrl.searchParams.set("partnerId", this.partnerId);
      browseUrl.searchParams.set("username", this.username);
      browseUrl.searchParams.set("formats", "mp3,aac,wma");
      browseUrl.searchParams.set("render", "json");
      browseUrl.searchParams.set("limit", limit.toString());

      if (category) {
        browseUrl.searchParams.set("c", category);
      }

      const response = await fetch(browseUrl.toString(), {
        headers: {
          "User-Agent": "AIDA-Radio-Client/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `TuneIn API HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as TuneInSearchResponse;

      if (data.head.status !== "200") {
        throw new Error(`TuneIn API error: ${data.head.status}`);
      }

      const stations = data.body.filter(
        (item) =>
          item.type === "audio" &&
          item.guide_id &&
          item.guide_id.startsWith("s")
      );

      logger.info("TuneIn popular stations retrieved", {
        category,
        totalResults: data.body.length,
        stationResults: stations.length,
      });

      return stations;
    } catch (error) {
      logger.error("Failed to get popular TuneIn stations", {
        category,
        error: (error as Error).message,
      });
      throw new Error(
        `TuneIn popular stations failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get station details by ID
   */
  public async getStationDetails(
    stationId: string
  ): Promise<TuneInStation | null> {
    try {
      logger.info("Getting TuneIn station details", { stationId });

      const tuneUrl = new URL(`${this.baseUrl}/Tune.ashx`);
      tuneUrl.searchParams.set("id", stationId);
      tuneUrl.searchParams.set("partnerId", this.partnerId);
      tuneUrl.searchParams.set("username", this.username);
      tuneUrl.searchParams.set("formats", "mp3,aac,wma");
      tuneUrl.searchParams.set("render", "json");

      const response = await fetch(tuneUrl.toString(), {
        headers: {
          "User-Agent": "AIDA-Radio-Client/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `TuneIn API HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as TuneInSearchResponse;

      if (data.head.status !== "200") {
        throw new Error(`TuneIn API error: ${data.head.status}`);
      }

      const station = data.body.find((item) => item.guide_id === stationId);

      logger.info("TuneIn station details retrieved", {
        stationId,
        found: !!station,
      });

      return station || null;
    } catch (error) {
      logger.error("Failed to get TuneIn station details", {
        stationId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Convert TuneIn station to our internal format
   */
  public static convertToInternalFormat(station: TuneInStation) {
    return {
      name: station.text,
      tuneInId: station.guide_id,
      description: station.subtext || station.playing || "TuneIn Radio Station",
      type: "tunein" as const,
      bitrate: station.bitrate,
      genre: station.genre_id,
      reliability: station.reliability,
    };
  }
}
