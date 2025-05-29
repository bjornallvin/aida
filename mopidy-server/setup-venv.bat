@echo off
REM Virtual environment setup script for Mopidy server (Windows)

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%venv"
set "PYTHON_VERSION=3.9"

echo 🎵 Setting up Mopidy Server Virtual Environment...

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3 is not installed or not in PATH. Please install Python %PYTHON_VERSION% or later.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set "PYTHON_VER=%%i"
echo 📍 Found Python version: %PYTHON_VER%

REM Create virtual environment
if not exist "%VENV_DIR%" (
    echo 📦 Creating virtual environment...
    python -m venv "%VENV_DIR%"
) else (
    echo 📦 Virtual environment already exists at %VENV_DIR%
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
if exist "%SCRIPT_DIR%requirements.txt" (
    echo 📥 Installing Python dependencies...
    pip install -r "%SCRIPT_DIR%requirements.txt"
) else (
    echo ❌ requirements.txt not found!
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "%SCRIPT_DIR%.env" (
    if exist "%SCRIPT_DIR%.env.example" (
        echo 📄 Creating .env file from example...
        copy "%SCRIPT_DIR%.env.example" "%SCRIPT_DIR%.env"
        echo ⚠️  Please edit .env file with your Spotify credentials
    )
)

echo ✅ Virtual environment setup complete!
echo.
echo To activate the environment in the future, run:
echo     %VENV_DIR%\Scripts\activate.bat
echo.
echo To start the Mopidy server:
echo     python -m mopidy_server
echo.
echo For help:
echo     python -m mopidy_server --help

pause
