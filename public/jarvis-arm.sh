#!/data/data/com.termux/files/usr/bin/bash
# Jarvis arm — Termux side.
# Connects to your Jarvis web brain over HTTPS, long-polls for commands,
# executes them via termux-api / shell, and posts the results back.
#
# Required environment variables:
#   JARVIS_URL         — origin of your Jarvis deployment, e.g. https://jarvis.vercel.app
#   JARVIS_DEVICE_ID   — issued when you paired the device
#   JARVIS_PAIR_KEY    — shared secret issued at pairing (only shown once)
#
# Quick install (one-liner from the Devices page):
#   curl -fsSL "$JARVIS_URL/jarvis-arm.sh" | \
#     JARVIS_URL=... JARVIS_DEVICE_ID=... JARVIS_PAIR_KEY=... bash
#
# Persistent install:
#   curl -fsSL "$JARVIS_URL/jarvis-arm.sh" -o ~/.jarvis-arm.sh
#   chmod +x ~/.jarvis-arm.sh
#   echo 'export JARVIS_URL=...'        >> ~/.jarvis.env
#   echo 'export JARVIS_DEVICE_ID=...'  >> ~/.jarvis.env
#   echo 'export JARVIS_PAIR_KEY=...'   >> ~/.jarvis.env
#   source ~/.jarvis.env && termux-wake-lock && ~/.jarvis-arm.sh

set -u
set -o pipefail

# ---------------- config ----------------
: "${JARVIS_URL:?JARVIS_URL is required}"
: "${JARVIS_DEVICE_ID:?JARVIS_DEVICE_ID is required}"
: "${JARVIS_PAIR_KEY:?JARVIS_PAIR_KEY is required}"

PLATFORM="termux-android"
POLL_URL="$JARVIS_URL/api/device/poll?deviceId=$JARVIS_DEVICE_ID&pairKey=$JARVIS_PAIR_KEY&platform=$PLATFORM"
RESULT_URL="$JARVIS_URL/api/device/result"

if ! command -v jq >/dev/null 2>&1; then
  echo "[jarvis] installing jq…"
  pkg install -y jq >/dev/null 2>&1 || { echo "[jarvis] please run: pkg install -y jq"; exit 1; }
fi

if ! command -v termux-battery-status >/dev/null 2>&1; then
  echo "[jarvis] WARNING: termux-api not installed. Install Termux:API APK + 'pkg install termux-api'."
fi

echo "[jarvis] arm online. device=$JARVIS_DEVICE_ID url=$JARVIS_URL"
echo "[jarvis] tip: run 'termux-wake-lock' to prevent Android from killing this process."

# Helper: JSON-encode a string safely
json_escape() {
  jq -Rs . <<<"$1"
}

# Send a result back to the brain.
post_result() {
  local cmd_id="$1"
  local ok="$2"
  local stdout="$3"
  local stderr="$4"
  local data="${5:-null}"
  local duration="${6:-0}"

  local payload
  payload=$(jq -n \
    --arg deviceId "$JARVIS_DEVICE_ID" \
    --arg pairKey "$JARVIS_PAIR_KEY" \
    --arg cmdId "$cmd_id" \
    --argjson ok "$ok" \
    --arg stdout "$stdout" \
    --arg stderr "$stderr" \
    --argjson data "$data" \
    --argjson durationMs "$duration" \
    '{deviceId:$deviceId, pairKey:$pairKey, cmdId:$cmdId,
      result:{ok:$ok, stdout:$stdout, stderr:$stderr, data:$data, durationMs:$durationMs}}')

  curl -fsS -m 15 -H 'content-type: application/json' \
    -X POST -d "$payload" "$RESULT_URL" >/dev/null 2>&1 || true
}

# Run a raw shell command, capture stdout / stderr / exit.
run_shell() {
  local cmd="$1"
  local out err rc
  out=$(mktemp)
  err=$(mktemp)
  bash -c "$cmd" >"$out" 2>"$err"
  rc=$?
  local stdout stderr
  stdout=$(<"$out")
  stderr=$(<"$err")
  rm -f "$out" "$err"
  echo "$rc"$'\x01'"$stdout"$'\x01'"$stderr"
}

# Try to parse json output as data; fallback to plain string in stdout.
try_json() {
  local raw="$1"
  if echo "$raw" | jq -e . >/dev/null 2>&1; then
    echo "$raw"
  else
    echo "null"
  fi
}

# Dispatch a single command. Reads JSON from $1, writes result via post_result.
dispatch() {
  local cmd_json="$1"
  local cmd_id kind
  cmd_id=$(echo "$cmd_json" | jq -r '.id')
  kind=$(echo "$cmd_json" | jq -r '.kind')

  echo "[jarvis] >> $kind ($cmd_id)"

  local start
  start=$(date +%s%N)

  local ok=true
  local stdout=""
  local stderr=""
  local data="null"

  case "$kind" in
    shell.exec)
      local cmd
      cmd=$(echo "$cmd_json" | jq -r '.args.cmd // ""')
      if [ -z "$cmd" ]; then
        ok=false; stderr="missing args.cmd"
      else
        local res rc
        res=$(run_shell "$cmd")
        rc=$(echo "$res" | awk -F$'\x01' '{print $1}')
        stdout=$(echo "$res" | awk -F$'\x01' '{print $2}')
        stderr=$(echo "$res" | awk -F$'\x01' '{print $3}')
        [ "$rc" -ne 0 ] && ok=false
      fi
      ;;

    shell.python)
      local code
      code=$(echo "$cmd_json" | jq -r '.args.code // ""')
      if [ -z "$code" ]; then
        ok=false; stderr="missing args.code"
      else
        local res rc
        res=$(run_shell "python3 -c $(printf %q "$code")")
        rc=$(echo "$res" | awk -F$'\x01' '{print $1}')
        stdout=$(echo "$res" | awk -F$'\x01' '{print $2}')
        stderr=$(echo "$res" | awk -F$'\x01' '{print $3}')
        [ "$rc" -ne 0 ] && ok=false
      fi
      ;;

    sms.send)
      local number message
      number=$(echo "$cmd_json" | jq -r '.args.number // ""')
      message=$(echo "$cmd_json" | jq -r '.args.message // ""')
      if [ -z "$number" ] || [ -z "$message" ]; then
        ok=false; stderr="missing number or message"
      else
        if termux-sms-send -n "$number" "$message" 2>/tmp/jarvis.err; then
          stdout="sent to $number"
        else
          ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null)
        fi
      fi
      ;;

    sms.list)
      local limit
      limit=$(echo "$cmd_json" | jq -r '.args.limit // 20')
      if data=$(termux-sms-list -l "$limit" 2>/tmp/jarvis.err); then
        stdout=""
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null); data="null"
      fi
      ;;

    call.dial)
      local number
      number=$(echo "$cmd_json" | jq -r '.args.number // ""')
      if [ -z "$number" ]; then
        ok=false; stderr="missing number"
      else
        if termux-telephony-call "$number" 2>/tmp/jarvis.err; then
          stdout="dialing $number"
        else
          ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null)
        fi
      fi
      ;;

    contacts.list)
      if data=$(termux-contact-list 2>/tmp/jarvis.err); then
        local limit
        limit=$(echo "$cmd_json" | jq -r '.args.limit // 100')
        data=$(echo "$data" | jq ".[0:$limit]")
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null); data="null"
      fi
      ;;

    location.get)
      if data=$(termux-location -p network 2>/tmp/jarvis.err); then
        :
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null); data="null"
      fi
      ;;

    battery.status)
      if data=$(termux-battery-status 2>/tmp/jarvis.err); then
        :
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null); data="null"
      fi
      ;;

    wifi.info)
      if data=$(termux-wifi-connectioninfo 2>/tmp/jarvis.err); then
        :
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null); data="null"
      fi
      ;;

    sensor.read)
      local sensor
      sensor=$(echo "$cmd_json" | jq -r '.args.sensorType // "accelerometer"')
      if data=$(termux-sensor -n 1 -s "$sensor" 2>/tmp/jarvis.err); then
        :
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null); data="null"
      fi
      ;;

    camera.photo)
      local camera path
      camera=$(echo "$cmd_json" | jq -r '.args.camera // "back"')
      local cam_id=0
      [ "$camera" = "front" ] && cam_id=1
      path="/sdcard/jarvis_$(date +%s).jpg"
      if termux-camera-photo -c "$cam_id" "$path" 2>/tmp/jarvis.err; then
        stdout="captured to $path"
        data=$(jq -n --arg p "$path" '{path:$p}')
      else
        ok=false; stderr=$(cat /tmp/jarvis.err 2>/dev/null)
      fi
      ;;

    torch.toggle)
      local on
      on=$(echo "$cmd_json" | jq -r '.args.on // "true"')
      if [ "$on" = "true" ]; then
        termux-torch on 2>/tmp/jarvis.err && stdout="torch on" || { ok=false; stderr=$(cat /tmp/jarvis.err); }
      else
        termux-torch off 2>/tmp/jarvis.err && stdout="torch off" || { ok=false; stderr=$(cat /tmp/jarvis.err); }
      fi
      ;;

    tts.speak)
      local message
      message=$(echo "$cmd_json" | jq -r '.args.message // ""')
      if [ -z "$message" ]; then
        ok=false; stderr="missing message"
      else
        echo "$message" | termux-tts-speak && stdout="spoke ${#message} chars" || { ok=false; stderr="tts failed"; }
      fi
      ;;

    vibrate)
      local dur
      dur=$(echo "$cmd_json" | jq -r '.args.durationMs // 500')
      termux-vibrate -d "$dur" && stdout="vibrated ${dur}ms" || { ok=false; stderr="vibrate failed"; }
      ;;

    notification.show)
      local title message
      title=$(echo "$cmd_json" | jq -r '.args.title // "Jarvis"')
      message=$(echo "$cmd_json" | jq -r '.args.message // ""')
      termux-notification --title "$title" --content "$message" && stdout="notified" || { ok=false; stderr="notify failed"; }
      ;;

    clipboard.get)
      stdout=$(termux-clipboard-get 2>/tmp/jarvis.err) || { ok=false; stderr=$(cat /tmp/jarvis.err); }
      ;;

    clipboard.set)
      local content
      content=$(echo "$cmd_json" | jq -r '.args.content // ""')
      echo -n "$content" | termux-clipboard-set && stdout="clipboard updated" || { ok=false; stderr="clipboard failed"; }
      ;;

    volume.set)
      local level
      level=$(echo "$cmd_json" | jq -r '.args.level // 50')
      termux-volume music "$level" && stdout="volume=$level" || { ok=false; stderr="volume failed"; }
      ;;

    brightness.set)
      local level
      level=$(echo "$cmd_json" | jq -r '.args.level // 128')
      termux-brightness "$level" && stdout="brightness=$level" || { ok=false; stderr="brightness failed"; }
      ;;

    file.read)
      local path
      path=$(echo "$cmd_json" | jq -r '.args.path // ""')
      if [ -z "$path" ]; then
        ok=false; stderr="missing path"
      elif [ ! -r "$path" ]; then
        ok=false; stderr="cannot read $path"
      else
        stdout=$(head -c 200000 "$path")
      fi
      ;;

    file.write)
      local path content
      path=$(echo "$cmd_json" | jq -r '.args.path // ""')
      content=$(echo "$cmd_json" | jq -r '.args.content // ""')
      if [ -z "$path" ]; then
        ok=false; stderr="missing path"
      else
        mkdir -p "$(dirname "$path")"
        printf "%s" "$content" >"$path" && stdout="wrote ${#content} bytes to $path" || { ok=false; stderr="write failed"; }
      fi
      ;;

    file.list)
      local path limit
      path=$(echo "$cmd_json" | jq -r '.args.path // "."')
      limit=$(echo "$cmd_json" | jq -r '.args.limit // 100')
      stdout=$(ls -la "$path" 2>/tmp/jarvis.err | head -n "$limit") || { ok=false; stderr=$(cat /tmp/jarvis.err); }
      ;;

    *)
      ok=false
      stderr="unknown kind: $kind"
      ;;
  esac

  local end duration
  end=$(date +%s%N)
  duration=$(( (end - start) / 1000000 ))

  local ok_json
  if [ "$ok" = "true" ]; then ok_json=true; else ok_json=false; fi

  # If `data` is a non-JSON string, normalise to null
  if ! echo "$data" | jq -e . >/dev/null 2>&1; then data="null"; fi

  echo "[jarvis] << $kind ${duration}ms ok=$ok_json"
  post_result "$cmd_id" "$ok_json" "$stdout" "$stderr" "$data" "$duration"
}

# ---------------- main loop ----------------
while true; do
  RESPONSE=$(curl -fsS -m 30 "$POLL_URL" 2>/dev/null || echo "")
  if [ -z "$RESPONSE" ]; then
    sleep 2
    continue
  fi

  CMD=$(echo "$RESPONSE" | jq -c '.command' 2>/dev/null || echo "null")
  if [ "$CMD" = "null" ] || [ -z "$CMD" ]; then
    # No command this round — short pause then poll again
    sleep 1
    continue
  fi

  dispatch "$CMD"
done
