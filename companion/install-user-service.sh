#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${HOME}/.local/share/mintdesk"
CONFIG_DIR="${HOME}/.config/mintdesk"
SERVICE_DIR="${HOME}/.config/systemd/user"

command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install Node.js 20+ first." >&2; exit 1; }
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$SERVICE_DIR"
install -m 0755 "$ROOT_DIR/mintdesk-bridge.mjs" "$INSTALL_DIR/mintdesk-bridge.mjs"

if [[ ! -f "$CONFIG_DIR/bridge.env" ]]; then
  TOKEN="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
  umask 077
  cat > "$CONFIG_DIR/bridge.env" <<EOF
MINTDESK_TOKEN=${TOKEN}
MINTDESK_ALLOWED_ORIGINS=http://localhost:3000,https://mintdash-khcj34hp.manus.space
EOF
fi

install -m 0644 "$ROOT_DIR/systemd/mintdesk-bridge.service" "$SERVICE_DIR/mintdesk-bridge.service"
systemctl --user daemon-reload
systemctl --user enable --now mintdesk-bridge.service

echo "Mintdesk bridge installed."
echo "Status: systemctl --user status mintdesk-bridge.service"
echo "Logs:   journalctl --user -u mintdesk-bridge.service -f"
echo "Health: curl -H \"Authorization: Bearer $(sed -n 's/^MINTDESK_TOKEN=//p' "$CONFIG_DIR/bridge.env")\" http://127.0.0.1:18765/health"
