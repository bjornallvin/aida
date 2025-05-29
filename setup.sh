#!/bin/bash

# Aida Apartment AI - Development Setup Script
# This script helps set up the development environment

set -e

echo "🏠 Setting up Aida Apartment AI..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js 16+ and try again."
    exit 1
fi

# Check if mpg123 is installed (for TTS playback)
if ! command -v mpg123 &> /dev/null; then
    echo "⚠️  mpg123 not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install mpg123
    else
        echo "❌ Homebrew not found. Please install mpg123 manually:"
        echo "   brew install mpg123"
        exit 1
    fi
fi

echo "📦 Installing dependencies..."

# Install Node.js dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Install Python dependencies
echo "Installing Mopidy dependencies..."
cd mopidy-server && pip3 install -r requirements.txt && cd ..

echo "⚙️  Setting up configuration files..."

# Copy environment files if they don't exist
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "📝 Created backend/.env - please update with your API keys"
fi

if [ ! -f mopidy-server/.env ]; then
    cp mopidy-server/.env.example mopidy-server/.env
    echo "📝 Created mopidy-server/.env - please update with your Spotify credentials"
fi

# Create audio directory
mkdir -p backend/audio

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your API keys:"
echo "   - ElevenLabs API key for TTS"
echo "   - OpenAI API key for chat (future)"
echo ""
echo "2. Edit mopidy-server/.env with your Spotify credentials:"
echo "   - Get credentials from https://developer.spotify.com/dashboard"
echo ""
echo "3. Start the system:"
echo "   npm start              # Start both servers"
echo "   npm run dev            # Development mode"
echo "   npm run start:backend  # Backend only"
echo "   npm run start:mopidy   # Mopidy only"
echo ""
echo "🎵 Happy coding with Aida!"
