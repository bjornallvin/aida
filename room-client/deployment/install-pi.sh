#!/bin/bash

# Aida Room Client Installation Script for Raspberry Pi
# Run this script on each Raspberry Pi that will act as a room client

set -e

INSTALL_DIR="/opt/aida"
SERVICE_USER="aida"
CONFIG_DIR="/etc/aida"

echo "🔊 Installing Aida Room Client for Raspberry Pi..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check if we're on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null && ! grep -q "BCM" /proc/cpuinfo 2>/dev/null; then
    echo "⚠️  This doesn't appear to be a Raspberry Pi. Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Updating system packages..."
apt-get update

echo "📦 Installing required packages..."
apt-get install -y \
    snapclient \
    alsa-utils \
    python3 \
    python3-pip \
    git \
    curl \
    systemd

echo "👤 Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/false -G audio "$SERVICE_USER"
    echo "Created user: $SERVICE_USER"
else
    echo "User $SERVICE_USER already exists"
fi

echo "📁 Creating directories..."
mkdir -p "$INSTALL_DIR/room-client"
mkdir -p "$CONFIG_DIR"
mkdir -p "/var/log/aida"

# Set permissions
chown -R "$SERVICE_USER:audio" "$INSTALL_DIR"
chown -R "$SERVICE_USER:audio" "$CONFIG_DIR"
chown -R "$SERVICE_USER:audio" "/var/log/aida"

echo "📥 Installing Aida Room Client..."

# If we have internet, clone from repo, otherwise copy local files
if curl -s --head https://github.com &>/dev/null; then
    echo "Downloading from repository..."
    # For now, we'll copy the files directly since they're local
    # In production, you'd clone from your git repo
    if [ -d "/tmp/aida-source/room-client" ]; then
        cp -r /tmp/aida-source/room-client/* "$INSTALL_DIR/room-client/"
    else
        echo "⚠️  Source files not found. Please ensure Aida source is available."
        exit 1
    fi
else
    echo "No internet connection. Using local files..."
    if [ -d "./room-client" ]; then
        cp -r ./room-client/* "$INSTALL_DIR/room-client/"
    else
        echo "❌ Local room-client directory not found"
        exit 1
    fi
fi

# Make scripts executable
chmod +x "$INSTALL_DIR/room-client/client.py"
chmod +x "$INSTALL_DIR/room-client/setup.py"

echo "🔧 Running interactive setup..."
python3 "$INSTALL_DIR/room-client/setup.py" "$CONFIG_DIR/client.json"

echo "🍓 Optimizing STT for Raspberry Pi..."
# Run Pi-specific STT optimization
python3 "$INSTALL_DIR/room-client/pi_optimization.py" > /tmp/pi_stt_optimization.log 2>&1

# Apply optimal STT configuration for this Pi
if [ -f "$INSTALL_DIR/room-client/pi_optimization.py" ]; then
    OPTIMAL_CONFIG=$(python3 -c "
import sys
sys.path.append('$INSTALL_DIR/room-client')
from pi_optimization import get_pi_info, get_optimal_stt_config
import json

pi_info = get_pi_info()
config = get_optimal_stt_config(pi_info)
print(json.dumps(config))
")
    
    if [ ! -z "$OPTIMAL_CONFIG" ]; then
        echo "Applying optimal STT config for this Pi: $OPTIMAL_CONFIG"
        python3 -c "
import json
import sys

# Read current config
with open('$CONFIG_DIR/client.json', 'r') as f:
    config = json.load(f)

# Update STT config
optimal = json.loads('$OPTIMAL_CONFIG')
config['stt_config'] = optimal

# Write back
with open('$CONFIG_DIR/client.json', 'w') as f:
    json.dump(config, f, indent=2)

print('STT configuration optimized for this Raspberry Pi')
"
    fi
fi

# Set optimal environment variables for ARM/Pi
echo 'export OMP_NUM_THREADS=$(nproc --ignore=1)' >> /etc/environment
echo 'export ONNX_NUM_THREADS=$(nproc --ignore=1)' >> /etc/environment

echo "🔧 Configuring audio..."

# Enable audio for the service user
usermod -a -G audio "$SERVICE_USER"

# Set default audio card (usually first card on Pi)
if [ -f "/proc/asound/cards" ]; then
    echo "Available audio devices:"
    cat /proc/asound/cards
fi

# Create audio configuration
cat > "/home/$SERVICE_USER/.asoundrc" << 'EOF'
pcm.!default {
    type hw
    card 0
    device 0
}
ctl.!default {
    type hw
    card 0
}
EOF

chown "$SERVICE_USER:audio" "/home/$SERVICE_USER/.asoundrc"

echo "📱 Audio configuration completed"

# Test audio if requested
echo "🔊 Test audio output now? (y/N)"
read -r test_audio
if [[ "$test_audio" =~ ^[Yy]$ ]]; then
    echo "Playing test tone..."
    speaker-test -t sine -f 1000 -l 1 || echo "Audio test failed, but continuing..."
fi

echo "🎯 Creating helper scripts..."

# Create control script
cat > "/usr/local/bin/aida-client" << EOF
#!/bin/bash
# Aida Room Client Control Script

ROOM_NAME=\$(cat $CONFIG_DIR/client.json | python3 -c "import sys, json; print(json.load(sys.stdin)['room_name'])" 2>/dev/null || echo "unknown")
SERVICE_NAME="aida-snapcast-\$(echo \$ROOM_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"

case "\$1" in
    start)
        echo "Starting Aida client for room: \$ROOM_NAME"
        systemctl start "\$SERVICE_NAME"
        ;;
    stop)
        echo "Stopping Aida client for room: \$ROOM_NAME"
        systemctl stop "\$SERVICE_NAME"
        ;;
    restart)
        echo "Restarting Aida client for room: \$ROOM_NAME"
        systemctl restart "\$SERVICE_NAME"
        ;;
    status)
        systemctl status "\$SERVICE_NAME"
        ;;
    logs)
        journalctl -u "\$SERVICE_NAME" -f
        ;;
    setup)
        python3 $INSTALL_DIR/room-client/setup.py $CONFIG_DIR/client.json
        ;;
    test-audio)
        python3 $INSTALL_DIR/room-client/client.py --config $CONFIG_DIR/client.json --test-audio
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status|logs|setup|test-audio}"
        exit 1
        ;;
esac
EOF

chmod +x "/usr/local/bin/aida-client"

echo "✅ Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your room settings if needed:"
echo "   aida-client setup"
echo ""
echo "2. Start the client:"
echo "   aida-client start"
echo ""
echo "3. Check status:"
echo "   aida-client status"
echo ""
echo "4. View logs:"
echo "   aida-client logs"
echo ""
echo "5. Test audio:"
echo "   aida-client test-audio"
echo ""
echo "🏠 Your Raspberry Pi is now ready as an Aida room client!"

# Show current configuration
echo ""
echo "📄 Current configuration:"
if [ -f "$CONFIG_DIR/client.json" ]; then
    cat "$CONFIG_DIR/client.json"
else
    echo "No configuration found. Run 'aida-client setup' to configure."
fi
