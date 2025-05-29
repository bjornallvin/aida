#!/usr/bin/env python3
"""
Minimal Voice Test - Just test the endpoints directly
"""

import tempfile
import requests
import subprocess
import json
import os


def test_with_curl():
    """Test using curl equivalent with requests"""
    print("🔍 Testing with minimal audio file...")

    # Create a very simple WAV file
    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_wav.close()

    try:
        # Use say to create WAV directly
        result = subprocess.run(
            ["say", "-o", temp_wav.name, "--file-format=WAVE", "test message"],
            capture_output=True,
            text=True,
        )

        print(f"Say command result: {result.returncode}")
        if result.stderr:
            print(f"Say stderr: {result.stderr}")

        # Check file size
        file_size = os.path.getsize(temp_wav.name)
        print(f"Created WAV file size: {file_size} bytes")

        if file_size == 0:
            print("❌ WAV file is empty!")
            return

        # Test the endpoint
        print("📤 Uploading to speech-to-text...")
        with open(temp_wav.name, "rb") as f:
            files = {"audio": ("test.wav", f, "audio/wav")}
            response = requests.post(
                "http://localhost:3000/speech-to-text", files=files, timeout=30
            )

        print(f"📥 Response status: {response.status_code}")
        print(f"📥 Response headers: {dict(response.headers)}")
        print(f"📥 Response text: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
    finally:
        if os.path.exists(temp_wav.name):
            os.unlink(temp_wav.name)


if __name__ == "__main__":
    print("🧪 Minimal Voice Test")
    test_with_curl()
