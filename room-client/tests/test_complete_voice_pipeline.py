#!/usr/bin/env python3

import requests
import os
import subprocess


def test_voice_command_pipeline():
    """Test the complete voice command pipeline: voice → transcription → AI → TTS → audio"""
    print("🎯 Testing complete /voice-command pipeline...")

    try:
        # Use our working FLAC file
        with open("test_audio.flac", "rb") as audio_file:
            files = {"audio": ("test_audio.flac", audio_file, "audio/flac")}

            print("📤 Sending voice command to backend...")
            print("   Expected flow: Voice → STT → AI Chat → TTS → Audio Response")

            response = requests.post(
                "http://localhost:3000/voice-command", files=files, timeout=60
            )

            print(f"📬 Response status: {response.status_code}")

            if response.status_code == 200:
                # Save the audio response
                audio_filename = "ai_response_audio.mp3"
                with open(audio_filename, "wb") as f:
                    f.write(response.content)

                file_size = os.path.getsize(audio_filename)
                print(f"✅ SUCCESS! Received audio response ({file_size} bytes)")
                print(f"💾 Saved as: {audio_filename}")

                # Try to play the audio response
                print("🔊 Attempting to play AI response...")
                try:
                    # Try different audio players available on macOS
                    players = ["afplay", "mpg123", "ffplay"]
                    for player in players:
                        try:
                            result = subprocess.run(
                                ["which", player], capture_output=True, text=True
                            )
                            if result.returncode == 0:
                                print(f"🎵 Playing with {player}...")
                                subprocess.run([player, audio_filename], check=True)
                                print(f"✅ Audio playback completed with {player}")
                                break
                        except subprocess.CalledProcessError:
                            continue
                    else:
                        print("⚠️  No audio player found (tried afplay, mpg123, ffplay)")
                        print(f"   You can manually play: {audio_filename}")

                except Exception as e:
                    print(f"⚠️  Audio playback error: {e}")
                    print(f"   You can manually play: {audio_filename}")

                return True

            else:
                print(f"❌ FAILED! Error: {response.text}")
                return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


def test_text_to_speech_endpoint():
    """Test the TTS endpoint separately"""
    print("\n🎯 Testing /tts endpoint separately...")

    try:
        data = {
            "text": "Hello! This is a test of the text to speech functionality. Can you hear me clearly?",
            "room": "living-room",
        }

        print("📤 Sending text to TTS endpoint...")
        response = requests.post("http://localhost:3000/tts", json=data, timeout=30)

        print(f"📬 Response status: {response.status_code}")

        if response.status_code == 200:
            # Save the audio response
            audio_filename = "tts_test_audio.mp3"
            with open(audio_filename, "wb") as f:
                f.write(response.content)

            file_size = os.path.getsize(audio_filename)
            print(f"✅ SUCCESS! TTS generated audio ({file_size} bytes)")
            print(f"💾 Saved as: {audio_filename}")

            # Try to play it
            try:
                subprocess.run(["afplay", audio_filename], check=True)
                print("✅ TTS audio playback completed")
            except Exception as e:
                print(f"⚠️  Could not play TTS audio: {e}")

            return True
        else:
            print(f"❌ TTS FAILED! Error: {response.text}")
            return False

    except Exception as e:
        print(f"❌ TTS Exception: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Starting Voice-to-Voice Pipeline Test")
    print("=" * 60)

    # Test TTS endpoint first
    tts_success = test_text_to_speech_endpoint()

    print("\n" + "=" * 60)

    # Test complete voice command pipeline
    voice_success = test_voice_command_pipeline()

    print("\n" + "=" * 60)
    print("🏁 FINAL RESULTS:")
    print(f"   TTS Endpoint: {'✅ SUCCESS' if tts_success else '❌ FAILED'}")
    print(f"   Voice Pipeline: {'✅ SUCCESS' if voice_success else '❌ FAILED'}")

    if tts_success and voice_success:
        print("\n🎉 COMPLETE SUCCESS! Voice-to-voice chat is working!")
        print("   The Aida apartment AI system is ready for voice interaction!")
    else:
        print("\n⚠️  Some components need attention before full voice chat is ready.")

    print("=" * 60)
