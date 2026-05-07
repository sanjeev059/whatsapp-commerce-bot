#!/usr/bin/env bash
# Runs every time the Codespace starts — ensures MongoDB is up.
set -e

if ! pgrep -x mongod >/dev/null; then
  echo "🍃 Starting MongoDB…"
  sudo mkdir -p /data/db
  sudo chown -R "$USER" /data/db
  nohup mongod --bind_ip 127.0.0.1 --dbpath /data/db > /tmp/mongod.log 2>&1 &
  sleep 2
fi
echo "✅ MongoDB is running on 127.0.0.1:27017"
