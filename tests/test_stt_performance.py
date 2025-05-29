#!/usr/bin/env python3
"""
STT Performance Comparison Test
Compare latency between native STT and backend STT
"""

import time
import requests
import logging
import sys
import os
from pathlib import Path

# Add the room-client directory to the path so we can import voice_commands
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "room-client"))

# Import native STT classes
try:
    from voice_commands import VoiceCommandHandler

    NATIVE_STT_AVAILABLE = True
except ImportError:
    NATIVE_STT_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_backend_stt(audio_file_path: str) -> tuple[str, float]:
    """Test backend STT and measure latency"""
    start_time = time.time()

    try:
        with open(audio_file_path, "rb") as audio_file:
            files = {"audio": ("test_audio.wav", audio_file, "audio/wav")}

            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

        latency = time.time() - start_time

        if response.status_code == 200:
            result = response.json()
            transcription = result.get("text", "")
            return transcription, latency
        else:
            logger.error(f"Backend STT failed: {response.text}")
            return "", latency

    except Exception as e:
        latency = time.time() - start_time
        logger.error(f"Backend STT error: {e}")
        return "", latency


def test_native_whisper(audio_file_path: str) -> tuple[str, float]:
    """Test native Whisper STT and measure latency"""
    if not NATIVE_STT_AVAILABLE:
        return "", 0.0

    try:
        start_time = time.time()

        stt = NativeSTTHandler(stt_engine="whisper", model_size="base")
        transcription = stt.transcribe_audio_file(audio_file_path)

        latency = time.time() - start_time
        return transcription, latency

    except Exception as e:
        latency = time.time() - start_time
        logger.error(f"Native Whisper error: {e}")
        return "", latency


def test_native_speechrecognition(audio_file_path: str) -> tuple[str, float]:
    """Test native SpeechRecognition STT and measure latency"""
    if not NATIVE_STT_AVAILABLE:
        return "", 0.0

    try:
        start_time = time.time()

        stt = NativeSTTHandler(stt_engine="speechrecognition", sr_engine="google")
        transcription = stt.transcribe_audio_file(audio_file_path)

        latency = time.time() - start_time
        return transcription, latency

    except Exception as e:
        latency = time.time() - start_time
        logger.error(f"Native SpeechRecognition error: {e}")
        return "", latency


def main():
    """Run STT performance comparison"""
    print("🚀 STT Performance Comparison Test")
    print("=" * 60)

    # Find test audio file
    test_files = ["test_audio.wav", "test_audio.mp3", "test_audio.flac"]
    test_file = None

    for file in test_files:
        if Path(file).exists():
            test_file = file
            break

    if not test_file:
        print("❌ No test audio files found!")
        print(
            "Create a test file with: say -o test_audio.wav 'Hello Aida, this is a test'"
        )
        return

    print(f"📁 Using test file: {test_file}")
    file_size = Path(test_file).stat().st_size
    print(f"📏 File size: {file_size} bytes\n")

    results = []

    # Test Backend STT
    print("1️⃣ Testing Backend STT...")
    try:
        transcription, latency = test_backend_stt(test_file)
        results.append(("Backend STT", transcription, latency, latency > 0))
        print(f"   ⏱️  Latency: {latency:.2f}s")
        print(f"   📝 Result: '{transcription}'")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        results.append(("Backend STT", "", 0.0, False))

    print()

    # Test Native Whisper
    if NATIVE_STT_AVAILABLE:
        print("2️⃣ Testing Native Whisper...")
        try:
            transcription, latency = test_native_whisper(test_file)
            results.append(("Native Whisper", transcription, latency, latency > 0))
            print(f"   ⏱️  Latency: {latency:.2f}s")
            print(f"   📝 Result: '{transcription}'")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            results.append(("Native Whisper", "", 0.0, False))

        print()

        # Test Native SpeechRecognition
        print("3️⃣ Testing Native SpeechRecognition...")
        try:
            transcription, latency = test_native_speechrecognition(test_file)
            results.append(
                ("Native SpeechRecognition", transcription, latency, latency > 0)
            )
            print(f"   ⏱️  Latency: {latency:.2f}s")
            print(f"   📝 Result: '{transcription}'")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            results.append(("Native SpeechRecognition", "", 0.0, False))
    else:
        print("⚠️  Native STT not available (install requirements_native_stt.txt)")

    # Summary
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE SUMMARY")
    print("=" * 60)

    working_results = [r for r in results if r[3]]  # Only working results

    if working_results:
        # Sort by latency
        working_results.sort(key=lambda x: x[2])

        print(f"{'Method':<25} {'Latency':<12} {'Improvement':<15}")
        print("-" * 60)

        baseline_latency = working_results[0][2] if working_results else 0

        for method, transcription, latency, success in working_results:
            if baseline_latency > 0:
                improvement = (
                    f"{baseline_latency / latency:.1f}x faster"
                    if latency > 0
                    else "N/A"
                )
            else:
                improvement = "N/A"

            print(f"{method:<25} {latency:.2f}s{'':<6} {improvement:<15}")

        print("\n🎯 RECOMMENDATIONS:")
        fastest = working_results[0]
        print(f"   🥇 Fastest: {fastest[0]} ({fastest[2]:.2f}s)")

        if len(working_results) > 1:
            backend_result = next(
                (r for r in results if r[0] == "Backend STT" and r[3]), None
            )
            native_result = next((r for r in working_results if "Native" in r[0]), None)

            if backend_result and native_result:
                speedup = backend_result[2] / native_result[2]
                print(f"   ⚡ Speedup: {speedup:.1f}x faster than backend")
                print(f"   💰 Cost: Native = Free, Backend = API costs")
                print(f"   🌐 Network: Native = Offline, Backend = Requires internet")

    else:
        print("❌ No STT methods working!")

    print("\n🔧 SETUP INSTRUCTIONS:")
    print("   pip install -r requirements_native_stt.txt")
    print("   # For Whisper: Will download model on first use (~74MB for 'base')")
    print("   # For Vosk: Download model from https://alphacephei.com/vosk/models")


if __name__ == "__main__":
    main()
