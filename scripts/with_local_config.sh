#!/usr/bin/env sh
set -eu

DEFAULT_DIR=${DEFAULT_CONFIG_DIR:-/app/config}
LOCAL_DIR=${LOCAL_CONFIG_DIR:-/app/local_config}

mkdir -p "$LOCAL_DIR"

for name in router.json display.json router.toml display.toml; do
  if [ -f "$DEFAULT_DIR/$name" ] && [ ! -f "$LOCAL_DIR/$name" ]; then
    cp "$DEFAULT_DIR/$name" "$LOCAL_DIR/$name"
  fi
done

exec "$@"
