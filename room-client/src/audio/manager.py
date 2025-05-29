"""
Audio system management and utilities
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    import pyaudio

    PYAUDIO_AVAILABLE = True
    PA_INT16 = pyaudio.paInt16
except ImportError:
    PYAUDIO_AVAILABLE = False
    pyaudio = None
    PA_INT16 = None


class AudioManager:
    """Manages audio input/output for the room client"""

    def __init__(self):
        """Initialize audio manager"""
        self.audio = None
        self.input_stream = None
        self.output_stream = None
        self._init_audio()

    def _init_audio(self):
        """Initialize PyAudio"""
        if not PYAUDIO_AVAILABLE:
            logger.warning("PyAudio not available. Install with: pip install pyaudio")
            return

        try:
            if pyaudio:
                self.audio = pyaudio.PyAudio()
                logger.info("Audio system initialized")
        except (OSError, IOError) as e:
            logger.error("Failed to initialize audio: %s", e)

    def get_input_devices(self) -> List[Dict[str, Any]]:
        """Get list of available audio input devices"""
        if not self.audio:
            return []

        devices = []
        try:
            for i in range(self.audio.get_device_count()):
                device_info = self.audio.get_device_info_by_index(i)
                if int(device_info["maxInputChannels"]) > 0:
                    devices.append(
                        {
                            "index": i,
                            "name": device_info["name"],
                            "channels": device_info["maxInputChannels"],
                            "sample_rate": device_info["defaultSampleRate"],
                        }
                    )
        except (OSError, IOError) as e:
            logger.error("Failed to get input devices: %s", e)

        return devices

    def get_output_devices(self) -> List[Dict[str, Any]]:
        """Get list of available audio output devices"""
        if not self.audio:
            return []

        devices = []
        try:
            for i in range(self.audio.get_device_count()):
                device_info = self.audio.get_device_info_by_index(i)
                if int(device_info["maxOutputChannels"]) > 0:
                    devices.append(
                        {
                            "index": i,
                            "name": device_info["name"],
                            "channels": device_info["maxOutputChannels"],
                            "sample_rate": device_info["defaultSampleRate"],
                        }
                    )
        except (OSError, IOError) as e:
            logger.error("Failed to get output devices: %s", e)

        return devices

    def get_default_input_device(self) -> Optional[Dict[str, Any]]:
        """Get default input device info"""
        if not self.audio:
            return None

        try:
            device_index = self.audio.get_default_input_device_info()["index"]
            device_info = self.audio.get_device_info_by_index(int(device_index))
            return {
                "index": device_index,
                "name": device_info["name"],
                "channels": device_info["maxInputChannels"],
                "sample_rate": device_info["defaultSampleRate"],
            }
        except (OSError, IOError) as e:
            logger.error("Failed to get default input device: %s", e)
            return None

    def test_audio_output(
        self, duration: float = 1.0, frequency: float = 440.0
    ) -> bool:
        """Test audio output by playing a tone"""
        if not self.audio:
            logger.error("Audio not available for testing")
            return False

        try:
            import math

            sample_rate = 44100
            frames = int(sample_rate * duration)

            # Generate sine wave
            samples = []
            for i in range(frames):
                value = math.sin(2 * math.pi * frequency * i / sample_rate)
                samples.append(int(value * 32767))

            # Convert to bytes
            audio_data = b"".join(
                [
                    sample.to_bytes(2, byteorder="little", signed=True)
                    for sample in samples
                ]
            )

            # Play audio
            if PYAUDIO_AVAILABLE and self.audio and PA_INT16:
                stream = self.audio.open(
                    format=PA_INT16, channels=1, rate=sample_rate, output=True
                )

                stream.write(audio_data)
                stream.stop_stream()
                stream.close()
            else:
                logger.error("PyAudio not available for audio playback")
                return False

            logger.info("Audio test completed successfully")
            return True

        except (OSError, IOError, ImportError) as e:
            logger.error("Audio test failed: %s", e)
            return False

    def cleanup(self):
        """Clean up audio resources"""
        if self.input_stream:
            self.input_stream.stop_stream()
            self.input_stream.close()
            self.input_stream = None

        if self.output_stream:
            self.output_stream.stop_stream()
            self.output_stream.close()
            self.output_stream = None

        if self.audio:
            self.audio.terminate()
            self.audio = None
