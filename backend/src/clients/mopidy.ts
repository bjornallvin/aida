import axios, { AxiosResponse } from "axios";
import { MopidyTrack, MopidySearchResult } from "../types";
import { logger } from "../utils";
import { config } from "../config";

/**
 * Mopidy JSON-RPC client with retry logic and proper error handling
 * Implements Azure best practices for external service communication
 */
export class MopidyClient {
  private url: string;
  private id: number = 1;
  private readonly timeout: number = 10000; // 10 seconds
  private readonly maxRetries: number = 3;

  constructor(url?: string) {
    this.url = url || config.mopidyUrl;
  }

  /**
   * Make a JSON-RPC call to Mopidy with retry logic
   */
  public async call<T = any>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Mopidy RPC call attempt ${attempt}`, { method, params });

        const response: AxiosResponse = await axios.post(
          `${this.url}/mopidy/rpc`,
          {
            jsonrpc: "2.0",
            id: this.id++,
            method,
            params,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: this.timeout,
          }
        );

        if (response.data.error) {
          throw new Error(`Mopidy error: ${response.data.error.message}`);
        }

        const duration = Date.now() - startTime;
        logger.logExternalCall("mopidy", method, true, duration, { attempt });

        return response.data.result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.logExternalCall(
          "mopidy",
          method,
          false,
          Date.now() - startTime,
          {
            attempt,
            error: lastError.message,
          }
        );

        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          1000 * Math.pow(2, attempt - 1) + Math.random() * 1000,
          10000
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.error(`Mopidy call failed after ${this.maxRetries} attempts`, {
      method,
      error: lastError!.message,
    });
    throw lastError!;
  }

  /**
   * Search for tracks and start playback
   */
  public async searchAndPlay(query: string): Promise<MopidyTrack> {
    logger.info("Searching for music", { query });

    // Search for tracks
    const searchResults: MopidySearchResult[] = await this.call(
      "core.library.search",
      {
        query: { any: [query] },
        uris: ["spotify:"],
      }
    );

    if (
      !searchResults ||
      searchResults.length === 0 ||
      !searchResults[0]?.tracks
    ) {
      throw new Error("No tracks found");
    }

    const tracks = searchResults[0].tracks;
    if (tracks.length === 0) {
      throw new Error("No tracks found");
    }

    const track = tracks[0];
    if (!track) {
      throw new Error("No valid track found");
    }

    logger.info("Found track", {
      name: track.name,
      artist: track.artists?.[0]?.name || "Unknown Artist",
    });

    // Clear current tracklist and add the track
    await this.call("core.tracklist.clear");
    await this.call("core.tracklist.add", { tracks: [track] });

    // Start playback
    await this.call("core.playback.play");

    return track;
  }

  /**
   * Add and play a radio stream
   */
  public async addRadioStream(url: string): Promise<{ uri: string }> {
    logger.info("Adding radio stream", { url });

    // Clear current tracklist and add the stream
    await this.call("core.tracklist.clear");
    await this.call("core.tracklist.add", {
      tracks: [{ uri: url }],
    });

    // Start playback
    await this.call("core.playback.play");

    return { uri: url };
  }

  /**
   * Get current playback state
   */
  public async getPlaybackState(): Promise<string> {
    return this.call("core.playback.get_state");
  }

  /**
   * Pause playback
   */
  public async pause(): Promise<void> {
    return this.call("core.playback.pause");
  }

  /**
   * Resume playback
   */
  public async resume(): Promise<void> {
    return this.call("core.playback.resume");
  }

  /**
   * Stop playback
   */
  public async stop(): Promise<void> {
    return this.call("core.playback.stop");
  }

  /**
   * Set volume (0-100)
   */
  public async setVolume(volume: number): Promise<void> {
    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100");
    }
    return this.call("core.mixer.set_volume", { volume });
  }

  /**
   * Get current volume
   */
  public async getVolume(): Promise<number> {
    return this.call("core.mixer.get_volume");
  }
}
