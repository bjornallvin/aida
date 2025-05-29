#!/usr/bin/env python3
"""
Performance test comparing native STT vs backend STT
"""

import time
import tempfile
import wave
import logging
import sys
import os
import json

# Add the room-client directory to the path so we can import voice_commands
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "room-client"))
from voice_commands import VoiceCommandHandler

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_test_audio(duration=3, sample_rate=16000):
    """Create a test audio file with a simple tone"""
    import numpy as np

    # Generate a simple tone
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    frequency = 440  # A4 note
    audio_data = np.sin(2 * np.pi * frequency * t) * 0.3

    # Convert to 16-bit PCM
    audio_data = (audio_data * 32767).astype(np.int16)

    # Create temporary WAV file
    temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    with wave.open(temp_file.name, "wb") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data.tobytes())

    return temp_file.name


def test_stt_performance():
    """Test and compare STT performance"""
    print("🚀 STT Performance Comparison Test")
    print("=" * 60)

    # Load config
    with open("../client.json", "r") as f:
        config = json.load(f)

    # Create test audio file
    print("📄 Creating test audio file...")
    test_audio = create_test_audio(duration=2)
    print(f"   Test audio: {test_audio}")

    # Test 1: Native STT enabled
    print("\n🚀 Testing Native STT...")
    config_native = config.copy()
    config_native["use_native_stt"] = True

    handler_native = VoiceCommandHandler(config_native)
    status = handler_native.get_stt_status()

    print("📊 Native STT Status:")
    for key, value in status.items():
        if key != "stt_config":  # Skip showing full config
            print(f"   {key}: {value}")

    if handler_native.native_stt:
        start_time = time.time()
        result_native = handler_native.native_stt.transcribe_file(test_audio)
        native_time = time.time() - start_time

        print(f"⚡ Native STT Results:")
        print(f"   Time: {native_time:.3f}s")
        print(f"   Success: {result_native.get('success', False)}")
        print(f"   Text: '{result_native.get('text', 'No text')}'")
        print(f"   Language: {result_native.get('language', 'Unknown')}")
    else:
        print("❌ Native STT not available")
        native_time = None

    # Test 2: Backend STT
    print("\n🌐 Testing Backend STT...")
    config_backend = config.copy()
    config_backend["use_native_stt"] = False

    handler_backend = VoiceCommandHandler(config_backend)

    start_time = time.time()
    result_backend = handler_backend._transcribe_audio_backend(test_audio)
    backend_time = time.time() - start_time

    print(f"⚡ Backend STT Results:")
    print(f"   Time: {backend_time:.3f}s")
    print(f"   Text: '{result_backend}'")

    # Performance comparison
    print("\n📊 Performance Comparison:")
    print(
        f"   Native STT:  {native_time:.3f}s"
        if native_time
        else "   Native STT:  Not available"
    )
    print(f"   Backend STT: {backend_time:.3f}s")

    if native_time:
        speedup = backend_time / native_time
        print(f"   Speedup:     {speedup:.1f}x faster with native STT")

        if speedup > 10:
            print("🚀 EXCELLENT: Native STT is significantly faster!")
        elif speedup > 3:
            print("✅ GOOD: Native STT provides good performance improvement")
        elif speedup > 1.5:
            print("👍 MODERATE: Native STT is somewhat faster")
        else:
            print("⚠️  MINIMAL: Performance improvement is small")

    # Cleanup
    import os

    os.unlink(test_audio)

    print("\n🎯 Performance test complete!")


if __name__ == "__main__":
    try:
        test_stt_performance()
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
