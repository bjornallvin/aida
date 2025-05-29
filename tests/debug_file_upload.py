#!/usr/bin/env python3
"""
Debug script to check MIME type detection and file upload details
"""

import requests
import mimetypes
import os
from pathlib import Path


def check_mime_types():
    """Check what MIME types are detected for our audio files"""
    audio_files = ["test_audio.aiff", "test_audio.wav", "test_audio.mp3"]

    print("=== MIME Type Detection ===")
    for filename in audio_files:
        if os.path.exists(filename):
            # Check what Python's mimetypes module detects
            mime_type, encoding = mimetypes.guess_type(filename)
            print(f"{filename}: {mime_type} (encoding: {encoding})")

            # Check file size
            size = os.path.getsize(filename)
            print(f"  Size: {size} bytes")
        else:
            print(f"{filename}: File not found")
    print()


def test_file_upload_debug():
    """Test file upload with detailed error information"""
    backend_url = "http://localhost:3000"

    # Test with different audio files
    audio_files = ["test_audio.wav", "test_audio.mp3"]

    for audio_file in audio_files:
        if not os.path.exists(audio_file):
            print(f"Skipping {audio_file} - file not found")
            continue

        print(f"=== Testing upload: {audio_file} ===")

        try:
            # Check detected MIME type
            mime_type, _ = mimetypes.guess_type(audio_file)
            print(f"Detected MIME type: {mime_type}")

            with open(audio_file, "rb") as f:
                files = {"audio": (audio_file, f, mime_type)}

                print(f"Uploading to {backend_url}/speech-to-text...")
                response = requests.post(
                    f"{backend_url}/speech-to-text", files=files, timeout=30
                )

                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text}")

                if response.status_code == 200:
                    print("✅ Upload successful!")
                    break
                else:
                    print("❌ Upload failed")

        except Exception as e:
            print(f"❌ Error: {e}")
        print()


if __name__ == "__main__":
    check_mime_types()
    test_file_upload_debug()
