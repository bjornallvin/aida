declare module "sonos" {
  export class Sonos {
    constructor(host: string, port?: number);

    // Playback control
    play(): Promise<boolean>;
    pause(): Promise<boolean>;
    stop(): Promise<boolean>;

    // Volume control
    setVolume(volume: number): Promise<boolean>;
    getVolume(): Promise<number>;
    getMuted(): Promise<boolean>;
    setMuted(muted: boolean): Promise<boolean>;

    // Queue management
    queue(uri: string, position?: number): Promise<boolean>;
    flush(): Promise<boolean>;

    // State and info
    getCurrentState(): Promise<string>;
    currentTrack(): Promise<Track>;
    getPlayMode(): Promise<string>;
    getZoneAttributes(): Promise<ZoneAttributes>;

    // Grouping
    join(master: Sonos): Promise<boolean>;
    leave(): Promise<boolean>;
  }

  export class DeviceDiscovery {
    constructor();
    discover(): void;
    on(event: "DeviceAvailable", listener: (device: Device) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export interface Device {
    host: string;
    port: number;
    uuid: string;
    model: string;
    roomName?: string;
    name?: string;
    zoneDisplayName?: string;
  }

  export interface Track {
    title: string;
    artist: string;
    album: string;
    uri: string;
    duration: string;
    position: string;
  }

  export interface ZoneAttributes {
    CurrentZoneName: string;
    CurrentIcon: string;
    CurrentConfiguration: string;
  }
}
