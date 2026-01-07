#!/bin/bash
# Stream Ralph logs from VPS

# Load VPS config from private file
if [ ! -f "$HOME/Ralph/vps-config.sh" ]; then
    echo "Error: ~/Ralph/vps-config.sh not found"
    echo "Create it with: KEY=path/to/key.pem and HOST=user@ip"
    exit 1
fi
source "$HOME/Ralph/vps-config.sh"

echo "Streaming Ralph logs (Ctrl+C to stop)..."
ssh -i "$KEY" -o ServerAliveInterval=30 -o ServerAliveCountMax=10 "$HOST" 'sudo journalctl -u ralph -f'
