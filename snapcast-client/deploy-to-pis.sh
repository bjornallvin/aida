#!/bin/bash

# Bulk deployment script for multiple Raspberry Pi devices
# Usage: ./deploy-to-pis.sh [room1_ip] [room2_ip] [room3_ip] ...

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PI_USER="pi"
DEPLOY_DIR="/tmp/aida-snapcast"

echo "🔊 Aida Snapcast Client - Bulk Deployment"
echo "========================================"

# Check if any IPs provided
if [ $# -eq 0 ]; then
    echo "❌ No IP addresses provided"
    echo "Usage: $0 <pi1_ip> <pi2_ip> <pi3_ip> ..."
    echo "Example: $0 192.168.1.101 192.168.1.102 192.168.1.103"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
TEMP_DIR=$(mktemp -d)
cp -r "$SCRIPT_DIR" "$TEMP_DIR/snapcast-client"

# Create deployment info
cat > "$TEMP_DIR/snapcast-client/deploy-info.txt" << EOF
Aida Snapcast Client Deployment
Generated: $(date)
Version: 1.0.0
Source: $SCRIPT_DIR
EOF

echo "🚀 Deploying to ${#} Raspberry Pi devices..."

# Deploy to each Pi
for PI_IP in "$@"; do
    echo ""
    echo "📡 Deploying to Pi at $PI_IP..."
    
    # Test connection
    if ! ping -c 1 -W 5 "$PI_IP" &>/dev/null; then
        echo "❌ Cannot reach $PI_IP - skipping"
        continue
    fi
    
    # Test SSH connection
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$PI_USER@$PI_IP" "echo 'SSH OK'" &>/dev/null; then
        echo "❌ SSH connection failed to $PI_IP - skipping"
        echo "   Make sure SSH is enabled and key-based auth is set up"
        continue
    fi
    
    echo "✅ Connection to $PI_IP successful"
    
    # Copy files
    echo "📁 Copying files to $PI_IP..."
    rsync -av --delete "$TEMP_DIR/snapcast-client/" "$PI_USER@$PI_IP:$DEPLOY_DIR/"
    
    # Run installation
    echo "🔧 Running installation on $PI_IP..."
    ssh "$PI_USER@$PI_IP" "sudo $DEPLOY_DIR/install-pi.sh" || {
        echo "❌ Installation failed on $PI_IP"
        continue
    }
    
    echo "✅ Successfully deployed to $PI_IP"
done

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "🎉 Bulk deployment completed!"
echo ""
echo "📋 Next steps for each Pi:"
echo "1. SSH to each Pi and run: aida-client setup"
echo "2. Configure room-specific settings"
echo "3. Start the client: aida-client start"
echo "4. Check status: aida-client status"
echo ""
echo "💡 Tips:"
echo "- Use different room names for each Pi"
echo "- Adjust volume levels per room"
echo "- Test audio output: aida-client test-audio"
