export class AudioPlaybackService {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;

  constructor() {
    // Initialize AudioContext on first user interaction
    if (typeof window !== "undefined") {
      this.initializeAudioContext();
    }
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch (error) {
      console.error("Failed to initialize AudioContext:", error);
    }
  }

  async playBase64Audio(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stop();

        // Create audio element
        this.currentAudio = new Audio();
        this.currentAudio.src = `data:audio/wav;base64,${base64Audio}`;

        this.currentAudio.onloadeddata = () => {
          console.log("Audio loaded, duration:", this.currentAudio?.duration);
        };

        this.currentAudio.onplay = () => {
          this.isPlaying = true;
          console.log("Audio playback started");
        };

        this.currentAudio.onended = () => {
          this.isPlaying = false;
          console.log("Audio playback ended");
          resolve();
        };

        this.currentAudio.onerror = (error) => {
          this.isPlaying = false;
          console.error("Audio playback error:", error);
          reject(new Error("Audio playback failed"));
        };

        this.currentAudio.onpause = () => {
          this.isPlaying = false;
          console.log("Audio playback paused");
        };

        // Start playback
        this.currentAudio.play().catch(reject);
      } catch (error) {
        console.error("Failed to play audio:", error);
        reject(error);
      }
    });
  }

  async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    if (!this.audioContext) {
      throw new Error("AudioContext not available");
    }

    return new Promise((resolve, reject) => {
      try {
        this.stop();

        this.audioContext!.decodeAudioData(
          audioBuffer,
          (decodedData) => {
            const source = this.audioContext!.createBufferSource();
            source.buffer = decodedData;
            source.connect(this.audioContext!.destination);

            source.onended = () => {
              this.isPlaying = false;
              resolve();
            };

            this.isPlaying = true;
            source.start();
          },
          (error) => {
            console.error("Audio decoding error:", error);
            reject(error);
          }
        );
      } catch (error) {
        console.error("Failed to play audio buffer:", error);
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(console.error);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setVolume(volume: number): void {
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentTime(): number {
    return this.currentAudio?.currentTime || 0;
  }

  getDuration(): number {
    return this.currentAudio?.duration || 0;
  }
}

export const audioPlaybackService = new AudioPlaybackService();
