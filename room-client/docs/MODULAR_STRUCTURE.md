# Room Client Modular Structure

The room client has been refactored into a more modular structure for better maintainability and extensibility.

## New Structure

```
room-client/
├── src/                          # Main source code
│   ├── __init__.py
│   ├── audio/                    # Audio handling
│   │   ├── __init__.py
│   │   ├── manager.py            # Audio input/output management
│   │   └── vad.py               # Voice Activity Detection
│   ├── client/                   # Snapcast client management
│   │   ├── __init__.py
│   │   └── snapcast.py          # Main client logic
│   ├── config/                   # Configuration management
│   │   ├── __init__.py
│   │   └── manager.py           # Config loading/saving
│   ├── optimization/             # Hardware optimizations
│   │   ├── __init__.py
│   │   └── hardware.py          # Pi and other optimizations
│   ├── stt/                      # Speech-to-Text
│   │   ├── __init__.py
│   │   └── faster_whisper.py    # Faster-whisper implementation
│   ├── utils/                    # Utilities
│   │   ├── __init__.py
│   │   ├── logging.py           # Logging setup
│   │   └── platform.py          # Platform detection
│   └── voice/                    # Voice command handling
│       ├── __init__.py
│       └── handler.py           # Voice recording and processing
├── main.py                       # New modular entry point
├── client.py                     # Legacy entry point (preserved)
└── setup_modular.py             # Setup for modular version
```

## Key Improvements

### 1. Separation of Concerns
- **Audio**: Isolated audio management and VAD
- **STT**: Clean speech-to-text abstraction
- **Voice**: Voice command logic separate from audio
- **Client**: Pure Snapcast client management
- **Config**: Centralized configuration handling

### 2. Better Testability
- Each module can be tested independently
- Clear interfaces between components
- Easier to mock dependencies

### 3. Platform Handling
- Centralized platform detection
- Hardware-specific optimizations
- Better cross-platform support

### 4. Configuration Management
- Structured config validation
- Default value handling
- Environment-specific paths

### 5. Extensibility
- Easy to add new STT engines
- Pluggable audio backends
- Modular voice processing

## Usage

### Running the Modular Version
```bash
# Use the new modular entry point
python main.py --config client.json

# Or with specific features
python main.py --enable-voice --optimize
```

### Legacy Compatibility
The original `client.py` is preserved for backward compatibility:
```bash
# Still works as before
python client.py --config client.json
```

## Migration Benefits

1. **Easier Development**: Smaller, focused files
2. **Better Organization**: Logical grouping of functionality
3. **Improved Testing**: Isolated components
4. **Future-Proof**: Easy to extend and modify
5. **Performance**: Optimized imports and initialization

## Dependencies

The modular version maintains the same external dependencies but organizes them better:

- Core: `requests`, `logging`
- Audio: `pyaudio`, `webrtcvad` 
- STT: `faster-whisper`, `torch`
- Platform: Standard library only

## Development Workflow

1. **Adding Features**: Create in appropriate module
2. **Testing**: Test individual components
3. **Configuration**: Update config manager
4. **Platform Support**: Add to platform utils

This modular structure makes the room client more maintainable and easier to understand while preserving all existing functionality.
