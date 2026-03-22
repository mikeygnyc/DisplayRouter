#!/usr/bin/env bash
# Display Router — Raspberry Pi Display Server Bootstrap Installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/mikeygnyc/DisplayRouter/main/scripts/bootstrap_display.sh | bash
#
# Options (env vars):
#   REPO_URL              Git repo to clone (default: https://github.com/mikeygnyc/DisplayRouter.git)
#   INSTALL_DIR           Install root (default: /opt/display-router)
#   ROUTER_WS_URL         Router WebSocket URL (default: ws://localhost:8000/display/ws)
#   DISPLAY_ID            Display identifier (default: disp_main)
#   DISPLAY_SECRET        Shared secret (default: dev-display-secret)
#   DISPLAY_REQUIREMENTS  Set to 0 to skip rgbmatrix hardware bindings install (default: 1)

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/mikeygnyc/DisplayRouter.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/display-router}"
REPO_DIR="$INSTALL_DIR/DisplayRouter"
VENV_DIR="$REPO_DIR/.venv"
SERVICE_NAME="display-router"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
ROUTER_WS_URL="${ROUTER_WS_URL:-ws://localhost:8000/display/ws}"
DISPLAY_ID="${DISPLAY_ID:-disp_main}"
DISPLAY_SECRET="${DISPLAY_SECRET:-dev-display-secret}"
DISPLAY_REQUIREMENTS="${DISPLAY_REQUIREMENTS:-1}"
MIN_PYTHON_MINOR=10

# ── Helpers ───────────────────────────────────────────────────────────────────
info()  { echo "[display-router] $*"; }
warn()  { echo "[display-router] WARNING: $*" >&2; }
die()   { echo "[display-router] ERROR: $*" >&2; exit 1; }

require_cmd() {
    command -v "$1" &>/dev/null || die "'$1' not found. $2"
}

# ── Preflight checks ──────────────────────────────────────────────────────────
info "Running preflight checks..."

# Must be Linux
[[ "$(uname -s)" == "Linux" ]] || die "This installer is for Linux/Raspberry Pi only."

# Must have sudo
require_cmd sudo "Please install sudo or run as root."

# Must have apt-get (Debian/Raspberry Pi OS)
require_cmd apt-get "This installer requires a Debian-based OS (Raspberry Pi OS recommended)."

# Python 3.10+
if command -v python3 &>/dev/null; then
    py_minor=$(python3 -c 'import sys; print(sys.version_info.minor)')
    py_major=$(python3 -c 'import sys; print(sys.version_info.major)')
    if [[ "$py_major" -lt 3 || ( "$py_major" -eq 3 && "$py_minor" -lt "$MIN_PYTHON_MINOR" ) ]]; then
        die "Python 3.${MIN_PYTHON_MINOR}+ is required (found 3.${py_minor}). Install it with: sudo apt-get install python3.11"
    fi
    info "Python $(python3 --version) — OK"
else
    die "python3 not found. Install it with: sudo apt-get install python3"
fi

# Warn if not running on a Pi (non-fatal — emulator will be used)
if ! grep -qi "raspberry" /proc/cpuinfo 2>/dev/null && ! grep -qi "raspberry" /sys/firmware/devicetree/base/model 2>/dev/null; then
    warn "This does not appear to be a Raspberry Pi. Hardware rgbmatrix bindings may not work."
    warn "Set DISPLAY_REQUIREMENTS=0 to skip the hardware bindings install."
fi

# ── System dependencies ───────────────────────────────────────────────────────
info "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y \
    git \
    python3-venv \
    python3-pip \
    python-dev-is-python3 \
    python3-pil \
    cython3

# ── Clone or update repo ──────────────────────────────────────────────────────
if [ ! -d "$INSTALL_DIR" ]; then
    info "Creating install directory $INSTALL_DIR..."
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$USER":"$USER" "$INSTALL_DIR"
fi

if [ -d "$REPO_DIR/.git" ]; then
    info "Repo already exists — pulling latest..."
    git -C "$REPO_DIR" pull --ff-only
else
    info "Cloning $REPO_URL into $REPO_DIR..."
    git clone "$REPO_URL" "$REPO_DIR"
fi

# ── Python virtualenv ─────────────────────────────────────────────────────────
info "Setting up Python virtualenv at $VENV_DIR..."
python3 -m venv "$VENV_DIR"
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

info "Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r "$REPO_DIR/requirements-display.txt"

# ── rgbmatrix hardware bindings ───────────────────────────────────────────────
if [ "$DISPLAY_REQUIREMENTS" = "1" ]; then
    info "Installing rgbmatrix hardware bindings (hzeller/rpi-rgb-led-matrix)..."
    pip install --quiet git+https://github.com/hzeller/rpi-rgb-led-matrix
else
    info "Skipping rgbmatrix hardware bindings (DISPLAY_REQUIREMENTS=0)."
fi

deactivate

# ── systemd service ───────────────────────────────────────────────────────────
info "Installing systemd service to $SERVICE_FILE..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Display Router - Display Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$REPO_DIR
Environment=ROUTER_WS_URL=$ROUTER_WS_URL
Environment=DISPLAY_ID=$DISPLAY_ID
Environment=DISPLAY_SECRET=$DISPLAY_SECRET
Environment=HEARTBEAT_INTERVAL_SECONDS=10
ExecStart=$VENV_DIR/bin/python -m display.main
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# ── Done ──────────────────────────────────────────────────────────────────────
info ""
info "Install complete."
info ""
info "  Service:    $SERVICE_NAME"
info "  Router URL: $ROUTER_WS_URL"
info "  Display ID: $DISPLAY_ID"
info ""
info "To change settings, edit $SERVICE_FILE and run:"
info "  sudo systemctl daemon-reload && sudo systemctl restart $SERVICE_NAME"
info ""
info "Service status:"
systemctl status "$SERVICE_NAME" --no-pager || true
