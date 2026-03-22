#!/usr/bin/env sh
set -eu

python -m display.client &
uvicorn display.sim_server:app --host 0.0.0.0 --port 8082 &
uvicorn display.sim_ui:app --host 0.0.0.0 --port 8083 &
uvicorn display.sim_playground:app --host 0.0.0.0 --port 8084 &

wait
