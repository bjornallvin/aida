declare module "node-sonos" {
  export interface SearchOptions {
    timeout?: number;
  }

  export interface SonosDeviceInfo {
    host: string;
    port: number;
    uuid: string;
    model: string;
    roomName: string;
    zoneDisplayName: string;
  }

  export interface Track {
    title?: string;
    artist?: string;
    album?: string;
    uri?: string;
    duration?: string;
    position?: string;
  }

  export class Sonos {
    constructor(host: string, port?: number);

    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getVolume(): Promise<number>;
    getMuted(): Promise<boolean>;
    getCurrentState(): Promise<string>;
    currentTrack(): Promise<Track>;
    getPlayMode(): Promise<string>;
    setSpotifyQueue(uri: string): Promise<void>;
    joinGroup(device: Sonos): Promise<void>;
    leaveGroup(): Promise<void>;
  }

  export function search(options?: SearchOptions): {
    on(
      event: "DeviceAvailable",
      callback: (device: SonosDeviceInfo) => void
    ): void;
    on(event: "error", callback: (error: Error) => void): void;
    destroy(): void;
  };
}
