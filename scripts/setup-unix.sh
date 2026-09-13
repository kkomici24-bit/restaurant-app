#!/usr/bin/env bash
# Auto-setup script for Unix-like systems (Linux/macOS).
# Tries to use nvm if available, otherwise offers instructions. Then runs npm install,
# optionally seeds DB and can start the app.

SEED=false
START=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --seed|-s) SEED=true; shift ;;
    --start|-S) START=true; shift ;;
    *) shift ;;
  esac
done

echo "[info] Checking for node..."
if command -v node >/dev/null 2>&1; then
  echo "[info] node found: $(node -v)"
else
  echo "[info] node not found. Trying to use nvm to install node..."
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
    nvm install --lts
    nvm use --lts
  else
    echo "[warn] nvm not detected. Please install Node.js (nvm recommended) and re-run this script: https://github.com/nvm-sh/nvm"
    exit 2
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[error] npm not available after installing node. Open a new terminal and retry."
  exit 3
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

echo "[info] Running npm install..."
npm install || { echo "[error] npm install failed"; exit 4; }

if [ "$SEED" = true ]; then
  echo "[info] Running npm run seed..."
  npm run seed || { echo "[error] npm run seed failed"; exit 5; }
fi

if [ "$START" = true ]; then
  echo "[info] Starting server (npm start)"
  npm start
fi

echo "[info] Setup complete."
