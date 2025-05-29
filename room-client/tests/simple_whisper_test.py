#!/usr/bin/env python3

import requests
import os

# Simple direct test of OpenAI Whisper with proper MP3
def test_whisper_simple():
    # Get API key
    with open('../backend/.env', 'r') as f:
        for line in f:
            if line.startswith('OPENAI_API_KEY='):
                api_key = line.split('=', 1)[1].strip()
                break
    
    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    # Test with proper MP3
    with open('test_audio_proper.mp3', 'rb') as f:
        files = {
            'file': ('test.mp3', f, 'audio/mpeg'),
            'model': (None, 'whisper-1')
        }
        
        print("Testing proper MP3 with OpenAI Whisper...")
        response = requests.post(url, headers=headers, files=files, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_whisper_simple()
