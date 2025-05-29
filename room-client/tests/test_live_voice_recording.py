#!/usr/bin/env python3
"""
Live Voice Recording Test for Aida Apartment AI
Records audio from microphone, sends to backend, gets AI response, and plays it back.
"""

import pyaudio
import wave
import requests
import os
import subprocess
import time
from datetime import datetime

# Audio recording configuration
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
RECORD_SECONDS = 5  # Default recording time
WAVE_OUTPUT_FILENAME = "live_voice_input.wav"


class LiveVoiceRecorder:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.is_recording = False
        self.frames = []

    def list_audio_devices(self):
        """List available audio input devices"""
        print("\n🎤 Available Audio Input Devices:")
        print("-" * 50)

        for i in range(self.audio.get_device_count()):
            info = self.audio.get_device_info_by_index(i)
            if info["maxInputChannels"] > 0:
                print(f"  {i}: {info['name']}")
                print(
                    f"      Channels: {info['maxInputChannels']}, Rate: {int(info['defaultSampleRate'])}Hz"
                )
        print("-" * 50)

    def record_with_countdown(self, duration=RECORD_SECONDS, device_index=None):
        """Record audio with visual countdown"""
        print(f"\n🎙️  Recording for {duration} seconds...")
        print("🔴 Recording will start in:")

        for i in range(3, 0, -1):
            print(f"   {i}...")
            time.sleep(1)

        print("🎤 RECORDING NOW! Speak clearly...")

        self.frames = []

        try:
            stream = self.audio.open(
                format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                input_device_index=device_index,
                frames_per_buffer=CHUNK,
            )

            start_time = time.time()
            while time.time() - start_time < duration:
                data = stream.read(CHUNK)
                self.frames.append(data)

                # Visual progress indicator
                elapsed = time.time() - start_time
                progress = int((elapsed / duration) * 20)
                bar = "█" * progress + "░" * (20 - progress)
                print(f"\r🎤 [{bar}] {elapsed:.1f}s/{duration}s", end="", flush=True)

            print("\n✅ Recording completed!")

            stream.stop_stream()
            stream.close()

            return True

        except Exception as e:
            print(f"\n❌ Recording failed: {e}")
            return False

    def save_recording(self, filename=WAVE_OUTPUT_FILENAME):
        """Save recorded audio to WAV file"""
        try:
            wf = wave.open(filename, "wb")
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.audio.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b"".join(self.frames))
            wf.close()

            file_size = os.path.getsize(filename)
            print(f"💾 Audio saved as: {filename} ({file_size} bytes)")
            return filename

        except Exception as e:
            print(f"❌ Failed to save recording: {e}")
            return None

    def convert_to_flac(self, wav_filename):
        """Convert WAV to FLAC using ffmpeg for better compatibility"""
        flac_filename = wav_filename.replace(".wav", ".flac")

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-i",
                    wav_filename,
                    "-y",  # -y to overwrite
                    "-ac",
                    "1",  # mono
                    "-ar",
                    "44100",  # sample rate
                    flac_filename,
                ],
                check=True,
                capture_output=True,
            )

            file_size = os.path.getsize(flac_filename)
            print(f"🔄 Converted to FLAC: {flac_filename} ({file_size} bytes)")
            return flac_filename

        except subprocess.CalledProcessError as e:
            print(f"❌ FLAC conversion failed: {e}")
            return wav_filename  # Return original if conversion fails
        except FileNotFoundError:
            print("⚠️  ffmpeg not found, using WAV file directly")
            return wav_filename

    def cleanup(self):
        """Clean up PyAudio resources"""
        self.audio.terminate()


def send_to_voice_pipeline(audio_filename, room_name="living-room"):
    """Send audio to the complete voice pipeline and get AI response"""
    print(f"\n🚀 Sending to Aida AI voice pipeline...")
    print(f"   Room: {room_name}")
    print(f"   Audio file: {audio_filename}")

    try:
        with open(audio_filename, "rb") as audio_file:
            files = {
                "audio": (
                    audio_filename,
                    audio_file,
                    "audio/flac" if audio_filename.endswith(".flac") else "audio/wav",
                )
            }
            data = {"roomName": room_name}

            print("📤 Processing: Voice → STT → AI → TTS...")

            response = requests.post(
                "http://localhost:3000/voice-command",
                files=files,
                data=data,
                timeout=60,
            )

            print(f"📬 Response status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()

                print("✅ Voice pipeline completed successfully!")
                print(f'🗣️  You said: "{result["transcription"]}"')
                print(f'🤖 Aida responded: "{result["response"]}"')
                print(f"🔊 Audio file: {result['audioFile']}")

                # Download the AI response audio
                audio_url = f"http://localhost:3000{result['audioFile']}"
                audio_response = requests.get(audio_url)

                if audio_response.status_code == 200:
                    response_filename = (
                        f"aida_response_{datetime.now().strftime('%H%M%S')}.mp3"
                    )

                    with open(response_filename, "wb") as f:
                        f.write(audio_response.content)

                    file_size = os.path.getsize(response_filename)
                    print(
                        f"💾 AI response saved: {response_filename} ({file_size} bytes)"
                    )

                    return result, response_filename
                else:
                    print(
                        f"❌ Failed to download AI response audio: {audio_response.status_code}"
                    )
                    return result, None
            else:
                print(f"❌ Voice pipeline failed: {response.text}")
                return None, None

    except Exception as e:
        print(f"❌ Exception in voice pipeline: {e}")
        return None, None


def play_audio_response(audio_filename):
    """Play the AI response audio"""
    if not audio_filename or not os.path.exists(audio_filename):
        print("⚠️  No audio file to play")
        return False

    print(f"\n🔊 Playing Aida's response...")

    try:
        # Try afplay first (native macOS)
        subprocess.run(["afplay", audio_filename], check=True)
        print("✅ Aida's response played successfully!")
        return True

    except subprocess.CalledProcessError:
        print("❌ Failed to play audio with afplay")

        # Try mpg123 as fallback
        try:
            subprocess.run(["mpg123", audio_filename], check=True)
            print("✅ Aida's response played successfully (mpg123)!")
            return True
        except:
            print("❌ Could not play audio response")
            print(f"   You can manually play: {audio_filename}")
            return False


def main():
    """Main live voice recording test"""
    print("🎙️  AIDA LIVE VOICE RECORDING TEST")
    print("=" * 60)
    print("This test will:")
    print("1. 🎤 Record your voice from microphone")
    print("2. 🔄 Convert audio to optimal format")
    print("3. 🚀 Send to Aida AI voice pipeline")
    print("4. 🤖 Get AI response")
    print("5. 🔊 Play Aida's voice response back to you")
    print("=" * 60)

    recorder = LiveVoiceRecorder()

    try:
        # List available audio devices
        recorder.list_audio_devices()

        # Ask user for device selection
        print("\n❓ Select audio input device (or press Enter for default):")
        device_input = input("   Device number: ").strip()

        device_index = None
        if device_input.isdigit():
            device_index = int(device_input)
            print(f"✅ Using device {device_index}")
        else:
            print("✅ Using default microphone")

        # Ask for recording duration
        print("\n❓ Recording duration in seconds (default 5):")
        duration_input = input("   Seconds: ").strip()

        duration = RECORD_SECONDS
        if duration_input.isdigit():
            duration = int(duration_input)

        print(f"✅ Will record for {duration} seconds")

        # Record audio
        print("\n" + "=" * 60)
        if not recorder.record_with_countdown(duration, device_index):
            print("❌ Recording failed, exiting")
            return

        # Save recording
        wav_filename = recorder.save_recording()
        if not wav_filename:
            print("❌ Failed to save recording, exiting")
            return

        # Convert to FLAC for better API compatibility
        audio_filename = recorder.convert_to_flac(wav_filename)

        # Send to voice pipeline
        print("\n" + "=" * 60)
        result, response_audio = send_to_voice_pipeline(audio_filename)

        if result:
            # Play AI response
            print("\n" + "=" * 60)
            play_audio_response(response_audio)

            print("\n" + "=" * 60)
            print("🎉 LIVE VOICE TEST COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print(f"📝 Conversation Summary:")
            print(f'   🗣️  You: "{result["transcription"]}"')
            print(f'   🤖 Aida: "{result["response"]}"')
            print(f"   📁 Files created:")
            print(f"      - Input: {audio_filename}")
            if response_audio:
                print(f"      - Response: {response_audio}")
            print("=" * 60)

        else:
            print("\n❌ Voice pipeline test failed")

        # Clean up temporary files
        cleanup_input = (
            input("\n🗑️  Delete temporary audio files? (y/N): ").strip().lower()
        )
        if cleanup_input == "y":
            for file in [wav_filename, audio_filename]:
                if file and os.path.exists(file):
                    os.remove(file)
                    print(f"🗑️  Deleted: {file}")

    finally:
        recorder.cleanup()


if __name__ == "__main__":
    # Check dependencies
    try:
        import pyaudio
    except ImportError:
        print("❌ PyAudio not installed!")
        print("   Install with: pip install pyaudio")
        print("   On macOS, you may need: brew install portaudio")
        exit(1)

    # Check if backend is running
    try:
        response = requests.get("http://localhost:3000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running")
        else:
            print("⚠️  Backend server responded but may have issues")
    except:
        print("❌ Backend server not reachable!")
        print("   Start with: cd backend && node server.js")
        exit(1)

    main()
