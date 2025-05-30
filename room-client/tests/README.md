# Room-Client Tests

This directory contains tests specific to the Aida room-client implementation.

## Test Organization

Tests have been moved from the root `/tests/` directory to `/room-client/tests/` for:
- Simpler import paths
- Better project organization
- Easier maintenance

## Import Structure

All tests use the following import pattern:

```python
import sys
from pathlib import Path

# Add the room-client directory to path for proper module structure
room_client_path = str(Path(__file__).parent.parent)
if room_client_path not in sys.path:
    sys.path.insert(0, room_client_path)

# Import from src modules
from src.voice.wake_word_detector import WakeWordDetector
from src.client import SnapcastClient
```

## Running Tests

From the room-client directory:

```bash
# Run individual tests
python tests/test_wake_word_simple.py
python tests/test_wake_word_final.py
python tests/test_imports.py

# Run all tests (if test runner is set up)
python -m pytest tests/
```

## Test Categories

### Wake Word Tests
- `test_wake_word_simple.py` - Basic wake word detection tests
- `test_wake_word_final.py` - Comprehensive verification tests
- `test_wake_word_*.py` - Various wake word scenarios

### Voice Integration Tests
- `test_voice_integration.py` - End-to-end voice command testing
- `test_voice_communication.py` - Voice communication pipeline tests
- `test_voice_sensitivity.py` - Voice sensitivity and threshold tests

### Backend Communication Tests
- `test_backend_communication.py` - Backend API communication tests
- `test_backend_debug.py` - Backend debugging utilities
- `test_chat_endpoint.py` - Chat endpoint specific tests

### Component Tests
- `test_config.py` - Configuration management tests
- `test_elevenlabs_tts.py` - Text-to-speech service tests
- `test_native_stt.py` - Speech-to-text engine tests
- `test_stt_performance.py` - STT performance benchmarks

## Import Verification

Use `test_imports.py` to verify that all import paths are working correctly:

```bash
python tests/test_imports.py
```

This will test:
- WakeWordDetector import
- Main module import
- Basic wake word functionality

## Notes

- Tests now use relative imports from the room-client project structure
- No more complex path manipulation with `../../room-client/src`
- Consistent import pattern across all test files
- Better isolation from other project components
