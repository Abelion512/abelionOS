#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/mintdesk"
CONFIG_FILE="$CONFIG_DIR/hybrid-companion.env"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Configuration file not found. Run the Mintdesk companion installer first." >&2
  exit 1
fi

read_clipboard() {
  if command -v wl-paste >/dev/null 2>&1; then
    wl-paste --no-newline 2>/dev/null
  elif command -v xclip >/dev/null 2>&1; then
    xclip -selection clipboard -o 2>/dev/null
  elif command -v xsel >/dev/null 2>&1; then
    xsel --clipboard --output 2>/dev/null
  else
    return 1
  fi
}

PAIRING_CODE="$(read_clipboard || true)"
if [[ ! "$PAIRING_CODE" =~ ^[0-9a-fA-F-]{36}:[A-Za-z0-9_-]{32,256}$ ]]; then
  read -r -s -p "Paste the one-time Mintdesk pairing code: " PAIRING_CODE
  printf "\n"
fi

if [[ ! "$PAIRING_CODE" =~ ^([0-9a-fA-F-]{36}):([A-Za-z0-9_-]{32,256})$ ]]; then
  echo "The pairing code is invalid. Copy it again from Daily Focus and retry." >&2
  exit 1
fi

DEVICE_ID="${BASH_REMATCH[1]}"
DEVICE_SECRET="${BASH_REMATCH[2]}"
TEMP_FILE="$(mktemp "$CONFIG_DIR/.hybrid-companion.env.XXXXXX")"
trap 'rm -f "$TEMP_FILE"; unset PAIRING_CODE DEVICE_ID DEVICE_SECRET' EXIT

awk -v device_id="$DEVICE_ID" -v device_secret="$DEVICE_SECRET" '
  BEGIN { found_id = 0; found_secret = 0 }
  /^MINTDESK_DEVICE_ID=/ { print "MINTDESK_DEVICE_ID=" device_id; found_id = 1; next }
  /^MINTDESK_DEVICE_SECRET=/ { print "MINTDESK_DEVICE_SECRET=" device_secret; found_secret = 1; next }
  { print }
  END {
    if (!found_id) print "MINTDESK_DEVICE_ID=" device_id
    if (!found_secret) print "MINTDESK_DEVICE_SECRET=" device_secret
  }
' "$CONFIG_FILE" > "$TEMP_FILE"

chmod 600 "$TEMP_FILE"
mv "$TEMP_FILE" "$CONFIG_FILE"

if [[ "${MINTDESK_SKIP_SERVICE_RESTART:-}" == "1" ]]; then
  echo "Pairing saved. Service restart skipped for verification."
  exit 0
fi

systemctl --user daemon-reload
systemctl --user restart mintdesk-hybrid-companion.service
echo "Pairing saved and Mintdesk companion restarted."
