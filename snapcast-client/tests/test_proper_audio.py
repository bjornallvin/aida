#!/usr/bin/env python3

import requests
import os
from pathlib import Path

# Test OpenAI Whisper API with proper audio formats
def test_openai_whisper(audio_file_path):
    """Test OpenAI Whisper API with an audio file"""
    # Get API key from backend .env file
    backend_env_path = Path(__file__).parent.parent / "backend" / ".env"
    
    api_key = None
    if backend_env_path.exists():
        with open(backend_env_path, 'r') as f:
            for line in f:
                if line.startswith('OPENAI_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break
    
    if not api_key:
        print("❌ No OpenAI API key found")
        return False
    
    print(f"🎯 Testing OpenAI Whisper API with {audio_file_path}")
    
    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        with open(audio_file_path, 'rb') as audio_file:
            files = {
                'file': (os.path.basename(audio_file_path), audio_file, 'audio/mpeg'),
                'model': (None, 'whisper-1')
            }
            
            print(f"📤 Sending request to OpenAI...")
            response = requests.post(url, headers=headers, files=files)
            
            print(f"📬 Response status: {response.status_code}")
            print(f"📝 Response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ SUCCESS! Transcription: '{result.get('text', 'No text')}'")
                return True
            else:
                print(f"❌ FAILED! Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def test_backend_speech_to_text(audio_file_path):
    """Test our backend /speech-to-text endpoint"""
    print(f"\n🎯 Testing backend /speech-to-text with {audio_file_path}")
    
    try:
        with open(audio_file_path, 'rb') as audio_file:
            files = {
                'audio': (os.path.basename(audio_file_path), audio_file, 'audio/mpeg')
            }
            
            print(f"📤 Sending request to backend...")
            response = requests.post('http://localhost:3000/speech-to-text', files=files)
            
            print(f"📬 Response status: {response.status_code}")
            print(f"📝 Response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ SUCCESS! Backend transcription: '{result.get('text', 'No text')}'")
                return True
            else:
                print(f"❌ FAILED! Backend error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    # Test files in order of likelihood to work
    test_files = [
        "test_audio_proper.mp3",  # Proper MP3 created with ffmpeg
        "test_audio.flac",        # FLAC format
        "test_audio.wav",         # WAV format
        "test_audio.aiff"         # Original AIFF
    ]
    
    for audio_file in test_files:
        if os.path.exists(audio_file):
            print(f"\n{'='*60}")
            print(f"🔍 Testing {audio_file}")
            print(f"{'='*60}")
            
            # Test direct OpenAI API first
            openai_success = test_openai_whisper(audio_file)
            
            # If OpenAI works, test our backend
            if openai_success:
                backend_success = test_backend_speech_to_text(audio_file)
                if backend_success:
                    print(f"\n🎉 COMPLETE SUCCESS with {audio_file}!")
                    break
            
            print(f"\n⏭️  Moving to next file format...")
        else:
            print(f"⚠️  File {audio_file} not found, skipping...")
    
    print(f"\n{'='*60}")
    print("🏁 Audio format testing complete!")
    print(f"{'='*60}")
