#!/usr/bin/env python3

import requests
import json


def test_voice_to_text_and_chat():
    """Test the working parts: voice → STT → AI chat (without TTS)"""
    print("🎯 Testing Voice → STT → AI Chat (without TTS)")
    print("=" * 60)

    # Step 1: Test Speech-to-Text
    print("\n1️⃣ Testing Speech-to-Text...")
    try:
        with open("test_audio.flac", "rb") as audio_file:
            files = {"audio": ("test_audio.flac", audio_file, "audio/flac")}
            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

            if response.status_code == 200:
                stt_result = response.json()
                transcription = stt_result.get("text", "")
                print(f"✅ STT SUCCESS: '{transcription}'")
                stt_success = True
            else:
                print(f"❌ STT FAILED: {response.text}")
                transcription = None
                stt_success = False
    except Exception as e:
        print(f"❌ STT Exception: {e}")
        transcription = None
        stt_success = False

    # Step 2: Test AI Chat with the transcription
    print("\n2️⃣ Testing AI Chat...")
    if transcription:
        try:
            chat_data = {
                "message": transcription,
                "roomName": "test_room",
                "conversationHistory": [],
            }

            response = requests.post(
                "http://localhost:3000/chat", json=chat_data, timeout=30
            )

            if response.status_code == 200:
                chat_result = response.json()
                ai_response = chat_result.get("response", "")
                print(f"✅ AI CHAT SUCCESS: '{ai_response}'")
                chat_success = True
            else:
                print(f"❌ AI CHAT FAILED: {response.text}")
                chat_success = False
        except Exception as e:
            print(f"❌ AI CHAT Exception: {e}")
            chat_success = False
    else:
        print("⏭️  Skipping AI Chat (no transcription)")
        chat_success = False

    # Step 3: Test voice command pipeline (should fail at TTS but show us the progress)
    print("\n3️⃣ Testing Complete Voice Command Pipeline...")
    try:
        with open("test_audio.flac", "rb") as audio_file:
            files = {"audio": ("test_audio.flac", audio_file, "audio/flac")}
            data = {"roomName": "test_room", "conversationHistory": "[]"}

            response = requests.post(
                "http://localhost:3000/voice-command",
                files=files,
                data=data,
                timeout=60,
            )

            print(f"📬 Voice command status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"✅ VOICE COMMAND SUCCESS!")
                print(f"   📝 Transcription: '{result.get('transcription', 'N/A')}'")
                print(f"   🤖 AI Response: '{result.get('response', 'N/A')}'")
                print(f"   🎵 Audio File: {result.get('audioFile', 'N/A')}")
                voice_success = True
            elif response.status_code == 500:
                # Check if it's a TTS error but STT+Chat worked
                try:
                    error_data = response.json()
                    error_msg = error_data.get("details", "")
                    if "status code 401" in error_msg:
                        print(
                            f"⚠️  Voice command failed at TTS step (ElevenLabs API key issue)"
                        )
                        print(f"   But STT and AI Chat parts are working!")
                        voice_success = False
                    else:
                        print(f"❌ VOICE COMMAND FAILED: {response.text}")
                        voice_success = False
                except:
                    print(f"❌ VOICE COMMAND FAILED: {response.text}")
                    voice_success = False
            else:
                print(f"❌ VOICE COMMAND FAILED: {response.text}")
                voice_success = False

    except Exception as e:
        print(f"❌ Voice Command Exception: {e}")
        voice_success = False

    # Summary
    print("\n" + "=" * 60)
    print("🏁 VOICE-TO-VOICE PIPELINE TEST RESULTS:")
    print(f"   STT (Speech-to-Text): {'✅ SUCCESS' if stt_success else '❌ FAILED'}")
    print(f"   AI Chat: {'✅ SUCCESS' if chat_success else '❌ FAILED'}")
    print(
        f"   Complete Voice Command: {'✅ SUCCESS' if voice_success else '⚠️  TTS Issue'}"
    )

    if stt_success and chat_success:
        print(f"\n🎉 CORE FUNCTIONALITY WORKING!")
        print(f"   ✅ Voice input → Text transcription")
        print(f"   ✅ Text → AI conversation")
        if voice_success:
            print(f"   ✅ Text → Speech output")
            print(f"\n🏠 Complete voice-to-voice chat ready!")
        else:
            print(f"   ⚠️  Text → Speech needs ElevenLabs API key fix")
            print(
                f"\n🔧 To complete setup: Fix ElevenLabs API key (remove '§' character)"
            )
    else:
        print(f"\n❌ Core components need attention")

    print("=" * 60)


if __name__ == "__main__":
    test_voice_to_text_and_chat()
