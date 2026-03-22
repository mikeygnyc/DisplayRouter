#!/usr/bin/env bash
set -euo pipefail

# Raspberry Pi Display Server install helper
# Assumes Python 3.10+ is available and user has sudo.

sudo apt-get update
sudo apt-get install -y python3-venv python3-pip git python-dev-is-python3 python3-pil cython3

if [ ! -d /opt/display-router ]; then
  sudo mkdir -p /opt/display-router
  sudo chown "$USER":"$USER" /opt/display-router
fi

if [ ! -d /opt/display-router/DisplayRouter ]; then
  echo "Clone your repo into /opt/display-router/DisplayRouter before running."
  exit 1
fi

cd /opt/display-router/DisplayRouter
python3 -m venv .venv
source .venv/bin/activate
DISPLAY_REQUIREMENTS=${DISPLAY_REQUIREMENTS:-1}

pip install -r requirements-display.txt
if [ "$DISPLAY_REQUIREMENTS" = "1" ]; then
  pip install git+https://github.com/hzeller/rpi-rgb-led-matrix
else
  echo "Skipping rgbmatrix install (DISPLAY_REQUIREMENTS=$DISPLAY_REQUIREMENTS)"
fi

sudo cp scripts/display.service /etc/systemd/system/display-router.service
sudo systemctl daemon-reload
sudo systemctl enable display-router.service
sudo systemctl restart display-router.service

systemctl status display-router.service --no-pager
