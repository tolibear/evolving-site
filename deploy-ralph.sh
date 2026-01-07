#!/bin/bash
# Deploy local changes to Ralph VPS

set -e

# Load VPS config from private file
if [ ! -f "$HOME/Ralph/vps-config.sh" ]; then
    echo "Error: ~/Ralph/vps-config.sh not found"
    echo "Create it with: KEY=path/to/key.pem and HOST=user@ip"
    exit 1
fi
source "$HOME/Ralph/vps-config.sh"

echo "Pushing to git..."
git push

echo "Pulling on VPS and restarting Ralph..."
ssh -i "$KEY" "$HOST" 'cd ~/ralph && git pull && npm install && sudo systemctl restart ralph'

echo "Deployed! Checking status..."
ssh -i "$KEY" "$HOST" 'sudo systemctl status ralph --no-pager | head -15'
