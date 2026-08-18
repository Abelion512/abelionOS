#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${MINTDESK_COMPANION_DIR:-$HOME/.local/share/mintdesk-hybrid}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/mintdesk"
SERVICE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

mkdir -p "$APP_DIR" "$CONFIG_DIR" "$SERVICE_DIR"
cp "$(dirname "$0")/mintdesk-hybrid-companion.ts" "$APP_DIR/mintdesk-hybrid-companion.ts"
cp "$(dirname "$0")/dailyFocusPolicy.mjs" "$APP_DIR/dailyFocusPolicy.mjs"
cp "$(dirname "$0")/actionProposalPolicy.mjs" "$APP_DIR/actionProposalPolicy.mjs"
cp "$(dirname "$0")/reasonerResponsePolicy.mjs" "$APP_DIR/reasonerResponsePolicy.mjs"
cp "$(dirname "$0")/reasonerRetryPolicy.mjs" "$APP_DIR/reasonerRetryPolicy.mjs"
cp "$(dirname "$0")/pair-companion-credential.sh" "$APP_DIR/pair-companion-credential.sh"
chmod 700 "$APP_DIR/pair-companion-credential.sh"

if [[ ! -f "$CONFIG_DIR/hybrid-companion.env" ]]; then
  cat > "$CONFIG_DIR/hybrid-companion.env" <<'EOF'
MINTDESK_API_BASE_URL=https://mintdash-khcj34hp.manus.space
MINTDESK_DEVICE_ID=
MINTDESK_DEVICE_SECRET=
MINTDESK_9ROUTER_URL=http://127.0.0.1:20128/v1
MINTDESK_9ROUTER_TOKEN=
MINTDESK_9ROUTER_MODEL=claude-work
MINTDESK_TIME_ZONE=Asia/Jakarta
MINTDESK_POLL_MS=15000
EOF
  chmod 600 "$CONFIG_DIR/hybrid-companion.env"
fi

cat > "$SERVICE_DIR/mintdesk-hybrid-companion.service" <<EOF
[Unit]
Description=Mintdesk hybrid Bun companion
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=%h/.config/mintdesk/hybrid-companion.env
ExecStart=%h/.bun/bin/bun run $APP_DIR/mintdesk-hybrid-companion.ts
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
echo "Copy the one-time pairing code from Mintdesk Daily Focus, then run:"
echo "$APP_DIR/pair-companion-credential.sh"
