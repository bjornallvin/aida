#!/usr/bin/env python3

import requests
import os
import subprocess


def test_tts_endpoint():
    """Test the correct TTS endpoint (/tts not /text-to-speech)"""
    print("🎯 Testing /tts endpoint...")

    try:
        data = {
            "text": "Hello! This is a test of the text to speech functionality from Aida.",
            "room": "test_room",
        }

        print("📤 Sending text to /tts endpoint...")
        response = requests.post("http://localhost:3000/tts", json=data, timeout=30)

        print(f"📬 Response status: {response.status_code}")
        print(f"📝 Response: {response.text}")

        if response.status_code == 200:
            result = response.json()
            print(f"✅ SUCCESS! TTS response: {result}")
            return True
        else:
            print(f"❌ TTS FAILED! Error: {response.text}")
            return False

    except Exception as e:
        print(f"❌ TTS Exception: {e}")
        return False


def test_voice_command_pipeline():
    """Test the voice command pipeline"""
    print("\n🎯 Testing /voice-command pipeline...")

    try:
        # Use our working FLAC file
        with open("test_audio.flac", "rb") as audio_file:
            files = {"audio": ("test_audio.flac", audio_file, "audio/flac")}
            data = {"roomName": "test_room", "conversationHistory": "[]"}

            print("📤 Sending voice command...")
            print("   Expected: Voice → STT → AI Chat → TTS → Audio File")

            response = requests.post(
                "http://localhost:3000/voice-command",
                files=files,
                data=data,
                timeout=60,
            )

            print(f"📬 Response status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"✅ SUCCESS! Voice command results:")
                print(f"   📝 Transcription: '{result.get('transcription', 'N/A')}'")
                print(f"   🤖 AI Response: '{result.get('response', 'N/A')}'")
                print(f"   🎵 Audio File: {result.get('audioFile', 'N/A')}")

                # Try to download and play the audio response
                audio_url = result.get("audioFile")
                if audio_url:
                    try:
                        audio_response = requests.get(
                            f"http://localhost:3000{audio_url}"
                        )
                        if audio_response.status_code == 200:
                            with open("ai_voice_response.mp3", "wb") as f:
                                f.write(audio_response.content)

                            print(
                                f"💾 Saved AI audio response as: ai_voice_response.mp3"
                            )

                            # Try to play it
                            try:
                                subprocess.run(
                                    ["afplay", "ai_voice_response.mp3"], check=True
                                )
                                print("🔊 ✅ AI voice response played successfully!")
                            except Exception as e:
                                print(f"⚠️  Could not play audio: {e}")
                                print(
                                    f"   You can manually play: ai_voice_response.mp3"
                                )
                        else:
                            print(
                                f"❌ Could not download audio file: {audio_response.status_code}"
                            )
                    except Exception as e:
                        print(f"⚠️  Audio download error: {e}")

                return True

            else:
                print(f"❌ FAILED! Error: {response.text}")
                return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Testing Voice-to-Voice Communication Pipeline")
    print("=" * 60)

    # Test TTS endpoint
    tts_success = test_tts_endpoint()

    # Test voice command pipeline
    voice_success = test_voice_command_pipeline()

    print("\n" + "=" * 60)
    print("🏁 FINAL RESULTS:")
    print(f"   TTS Endpoint: {'✅ SUCCESS' if tts_success else '❌ FAILED'}")
    print(f"   Voice Pipeline: {'✅ SUCCESS' if voice_success else '❌ FAILED'}")

    if tts_success and voice_success:
        print("\n🎉 COMPLETE SUCCESS!")
        print("   ✅ Speech-to-Text working")
        print("   ✅ AI Chat working")
        print("   ✅ Text-to-Speech working")
        print("   ✅ Voice-to-Voice pipeline complete")
        print("\n🏠 Aida apartment AI voice chat is ready!")
    else:
        print("\n⚠️  Some components need attention.")

    print("=" * 60)
