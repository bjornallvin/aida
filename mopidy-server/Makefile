# Makefile for Mopidy Server development

.PHONY: help setup install clean test lint format run status stop dev

# Default target
help:
	@echo "🎵 Mopidy Server Development Commands"
	@echo ""
	@echo "Setup and Installation:"
	@echo "  make setup     - Setup virtual environment and install dependencies"
	@echo "  make install   - Install package in development mode"
	@echo "  make clean     - Clean build artifacts and virtual environment"
	@echo ""
	@echo "Development:"
	@echo "  make format    - Format code with black"
	@echo "  make lint      - Run code linting with flake8"
	@echo "  make test      - Run tests with pytest"
	@echo "  make dev       - Start development server with auto-reload"
	@echo ""
	@echo "Server Control:"
	@echo "  make run       - Start Mopidy server in foreground"
	@echo "  make daemon    - Start Mopidy server as daemon"
	@echo "  make status    - Check server status"
	@echo "  make stop      - Stop running server"

# Setup virtual environment
setup:
	@echo "🔧 Setting up development environment..."
	./setup-venv.sh

# Install in development mode
install: setup
	@echo "📦 Installing package in development mode..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && pip install -e .; \
	else \
		pip install -e .; \
	fi

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf venv/
	rm -rf src/__pycache__/
	rm -rf __pycache__/
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete

# Format code
format:
	@echo "🎨 Formatting code..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && black src/ __main__.py setup.py; \
	else \
		black src/ __main__.py setup.py; \
	fi

# Lint code
lint:
	@echo "🔍 Linting code..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && flake8 src/ __main__.py setup.py; \
	else \
		flake8 src/ __main__.py setup.py; \
	fi

# Run tests
test:
	@echo "🧪 Running tests..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && pytest; \
	else \
		pytest; \
	fi

# Start server in foreground
run:
	@echo "🎵 Starting Mopidy server..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && python __main__.py; \
	else \
		python __main__.py; \
	fi

# Start server as daemon
daemon:
	@echo "🎵 Starting Mopidy server as daemon..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && python __main__.py --daemon; \
	else \
		python __main__.py --daemon; \
	fi

# Check server status
status:
	@echo "📊 Checking server status..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && python __main__.py --status; \
	else \
		python __main__.py --status; \
	fi

# Stop server
stop:
	@echo "🛑 Stopping Mopidy server..."
	@if [ -d "venv" ]; then \
		. venv/bin/activate && python __main__.py --stop; \
	else \
		python __main__.py --stop; \
	fi

# Development server with auto-reload (if available)
dev: run
