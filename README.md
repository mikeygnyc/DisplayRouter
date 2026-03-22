# Display Router
[![CI](https://github.com/mikeygnyc/DisplayRouter/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeygnyc/DisplayRouter/actions/workflows/ci.yml)

Display Router connects data producers to HUB75 RGB LED matrix displays through a router/formatter that applies templates, rules, and transitions. Producers submit payloads over HTTP; the router matches rules, renders templates, and pushes rendered frames to display servers over WebSocket.

The included `rgbmatrix/` package is a drop-in emulator for the [rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix) Python bindings. Any Python application already written against that library can have its output intercepted and routed through Display Router — to hardware, the simulator, or both — without code changes.

## System Architecture

```
Producers ──► Client API ──► Router/Formatter ──► Display Server ──► RGB Matrix
                                   │                    │
                                   │                    └──► Simulator (/sim)
                                   │
                                   └──► Admin UI (monitoring + CRUD + broadcast)
```

### Components

| Component | Path | Description |
|---|---|---|
| Router API | `router/` | FastAPI service — client ingestion, rule engine, template renderer, WebSocket push |
| Display Server | `display/` | WebSocket client — renders to rgbmatrix, console, or simulator |
| Admin UI | `admin/` | HTML/JS management interface — CRUD, monitoring, broadcasts |
| Shared | `shared/` | Pydantic schemas and utilities shared across services |
| rgbmatrix emulator | `rgbmatrix/` | Drop-in emulator for [rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix) — lets existing apps route their output through Display Router without code changes |
| Config examples | `config/` | JSON and TOML config file examples |
| Docs | `docs/` | OpenAPI/AsyncAPI specs and implementation notes |

### Data Flow

```
Client payload ──► rule matching ──► template render ──► WebSocket push ──► display/sim output
```

1. A producer `POST /api/payloads` with a `client_id`, `payload_type`, and `data`.
2. The router matches enabled rules by `client_id`, `payload_type`, tags, and schedule.
3. Matched rules determine which display targets receive the payload and which transition to use.
4. The router renders the payload through a Jinja2 template (or passes raw commands/pixels).
5. The rendered frame is pushed over WebSocket to each connected display server.
6. The display server applies the transition and renders to the matrix, console, or simulator.

---

## Quickstart

### Prerequisites

- Python 3.10+
- `pip install -r requirements.txt`

### Run everything locally

```bash
# Router API (port 8000)
uvicorn router.main:app --reload

# Admin UI (port 8090)
uvicorn admin.main:app --reload --port 8090

# Display client in simulator mode
DISPLAY_RENDERER=sim python -m display.main

# Simulator JSON endpoint (port 8082)
uvicorn display.sim_server:app --reload --port 8082

# Simulator viewer UI (port 8083)
uvicorn display.sim_ui:app --reload --port 8083

# Simulator playground — editor + live preview (port 8084)
uvicorn display.sim_playground:app --reload --port 8084
```

### Via console script (after `pip install -e .`)

```bash
display-router --reload
```

### Via Docker Compose

```bash
docker compose up --build
```

This starts: `router` (8000), `admin-ui` (8081), and a `display` client in simulator mode that also hosts the sim endpoints (8082–8084).
The sim stack in compose is started by `scripts/run_display_sim.sh`.

### Sim Stack (No Docker)

```bash
scripts/run_display_sim.sh
```

### Compose Setup (Full Walkthrough)

1. Ensure Docker Desktop is running.
2. From the repo root, build and start the stack:
   ```bash
   docker compose up --build
   ```
3. Verify services are healthy:
   ```bash
   docker compose ps
   ```
4. Open the Admin UI:
   URL: `http://localhost:8081` (token: `dev-admin-token`)
5. Use the simulator UIs (hosted by the `display` container):
   Simulator JSON endpoint: `http://localhost:8082/sim`, viewer: `http://localhost:8083`, playground: `http://localhost:8084`
6. Optional: tail logs for a service:
   ```bash
   docker compose logs -f router
   ```
7. Stop the stack:
   ```bash
   docker compose down
   ```

Compose uses these defaults (see `docker-compose.yml`):
- `ADMIN_TOKEN=dev-admin-token`
- `DISPLAY_SECRET=dev-display-secret`
- `API_KEY_SALT=dev-salt`
- `DATABASE_URL=sqlite:////app/data/display_router.db` (persisted to `./data/`)
- `ROUTER_CONFIG_FILE=/app/local_config/router.json`
- `DISPLAY_CONFIG_FILE=/app/local_config/display.json`

If you want to reset all router state and logs, you can delete the `./data/` directory and restart compose.

### Local Config Overrides (Docker Compose)

Compose will auto-copy defaults from `config/` into `local_config/` if those files are missing.
This lets you keep local overrides out of git while still bootstrapping a new environment.

Default copy list:
- `router.json`
- `display.json`
- `router.toml`
- `display.toml`

### Compose Stack Diagram

```
HTTP (clients)        WebSocket                         HTTP
   │                      │                              │
   ▼                      ▼                              ▼
router (8000) ─────► display client (sim) ───────────► sim endpoints (8082–8084)
      │                                                   │
      └──────────────────────────────► admin-ui (8081)    └► sim-server (/sim), sim-ui, sim-playground
```

Notes:
- `display` is the real display client; in sim mode it renders into an in-memory simulator buffer and hosts the sim endpoints.
- `sim-server` (GET `/sim`), `sim-ui`, and `sim-playground` are served from the `display` container in compose.
- `admin-ui` is a separate service on port 8081.

### Via Makefile

```bash
make run      # uvicorn router.main:app --reload
make test     # pytest
make compile  # python -m compileall router shared display admin
```

### Release

```bash
make release VERSION=1.2.3        # tags and pushes vVERSION
make release-dry VERSION=1.2.3    # dry run
```

---

## Ports

| Service | URL |
|---|---|
| Router API (`/api`, `/admin`, `/display`) | `http://localhost:8000` |
| Admin UI | `http://localhost:8081` |
| Simulator JSON endpoint (`/sim`) | `http://localhost:8082` |
| Simulator viewer | `http://localhost:8083` |
| Simulator playground | `http://localhost:8084` |

---

## Authentication

| Surface | Header | Value |
|---|---|---|
| Admin API | `Authorization` | `Bearer <ADMIN_TOKEN>` |
| Client API | `X-API-Key` | `<client_api_key>` |
| Display WebSocket / health | `X-Display-Secret` | `<DISPLAY_SECRET>` |

- `ADMIN_TOKEN` is set on the router and pasted into the Admin UI token box.
- Client API keys are generated on `POST /api/clients` and stored as salted SHA-256 hashes (`API_KEY_SALT`).
- Display secret authenticates `/display/health` and the `/display/ws` WebSocket upgrade.

---

## Configuration

Config precedence: **defaults → config file → environment variables**

### Router (`config/router.json` or `config/router.toml`)

Point to a config file with `ROUTER_CONFIG_FILE` or `CONFIG_FILE`.

| Key / Env Var | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:////app/data/display_router.db` | SQLAlchemy database URL (compose persists to `./data/`) |
| `ADMIN_TOKEN` | `dev-admin-token` | Static admin bearer token |
| `API_KEY_SALT` | `dev-salt` | Salt for client API key hashing |
| `DISPLAY_SECRET` | `dev-display-secret` | Shared secret for display connections |
| `LOG_RETENTION_DAYS` | `30` | Days to retain log events (`none` = forever) |

Example `config/router.json`:
```json
{
  "database_url": "sqlite:///./display_router.db",
  "admin_token": "dev-admin-token",
  "api_key_salt": "dev-salt",
  "display_secret": "dev-display-secret",
  "log_retention_days": 30
}
```

### Display Server (`config/display.json` or `config/display.toml`)

Point to a config file with `DISPLAY_CONFIG_FILE` or `CONFIG_FILE`.

| Key / Env Var | Default | Description |
|---|---|---|
| `ROUTER_WS_URL` | `ws://localhost:8000/display/ws` | Router WebSocket URL |
| `DISPLAY_ID` | `disp_main` | Unique display identifier |
| `DISPLAY_SECRET` | `dev-display-secret` | Shared secret |
| `HEARTBEAT_INTERVAL_SECONDS` | `10` | Heartbeat interval |
| `DISPLAY_RENDERER` | `console` | `console`, `rgbmatrix`, or `sim` |
| `MATRIX_WIDTH` | `64` | Matrix width in pixels |
| `MATRIX_HEIGHT` | `32` | Matrix height in pixels |
| `MATRIX_CHAIN` | `1` | Chained panel count |
| `MATRIX_PARALLEL` | `1` | Parallel chain count |
| `MATRIX_BRIGHTNESS` | `60` | Brightness (0–100) |
| `MATRIX_GPIO_SLOWDOWN` | `2` | GPIO slowdown for Pi |
| `MATRIX_HARDWARE_MAPPING` | `regular` | rgbmatrix hardware mapping |
| `MATRIX_FONT_PATH` | `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf` | Font path |
| `MATRIX_FONT_SIZE` | `10` | Font size |

---

## API Reference

Full specs: [OpenAPI](https://mikeygnyc.github.io/DisplayRouter/swagger/) · [AsyncAPI](https://mikeygnyc.github.io/DisplayRouter/asyncapi/)

### Client API

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/clients` | Admin | Register a new client, returns `api_key` |
| `GET` | `/api/clients/{client_id}` | Admin | Get client details |
| `GET` | `/api/clients/{client_id}/payload-types` | Client or Admin | List registered payload types |
| `POST` | `/api/payloads` | Client | Submit a payload for routing |
| `GET` | `/api/templates` | Client or Admin | List templates |

#### Submit Payload

```http
POST /api/payloads
X-API-Key: <client_api_key>
Content-Type: application/json

{
  "client_id": "cli_abc123",
  "payload_type": "alert",
  "priority": 10,
  "ttl_seconds": 60,
  "data": { "text": "Hello World" },
  "tags": ["urgent"]
}
```

Response:
```json
{
  "payload_id": "pld_xyz",
  "routed_displays": ["disp_main"],
  "status": "accepted"
}
```

`data` can also contain:
- `commands` — rgbmatrix command stream (see [Command Stream](#command-stream))
- `pixels` — full pixel buffer `{ "width": 64, "height": 32, "pixels": [[[r,g,b], ...]] }`

### Admin API

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/clients` | List clients |
| `PUT` | `/admin/clients/{id}` | Update client |
| `DELETE` | `/admin/clients/{id}` | Disable client |
| `POST` | `/admin/templates` | Create template |
| `GET` | `/admin/templates` | List templates |
| `PUT` | `/admin/templates/{id}` | Update template |
| `DELETE` | `/admin/templates/{id}` | Delete template |
| `POST` | `/admin/rules` | Create routing rule |
| `GET` | `/admin/rules` | List rules |
| `PUT` | `/admin/rules/{id}` | Update rule |
| `DELETE` | `/admin/rules/{id}` | Delete rule |
| `POST` | `/admin/displays` | Register display target |
| `GET` | `/admin/displays` | List display targets |
| `PUT` | `/admin/displays/{id}` | Update display target |
| `DELETE` | `/admin/displays/{id}` | Disable display target |
| `GET` | `/admin/logs` | List log events (filter by `level`, `client_id`, `display_id`, `limit`) |
| `GET` | `/admin/logs/{id}` | Get log event |
| `POST` | `/admin/logs/{id}/replay` | Replay a `payload_received` log event (`?dry_run=true`) |
| `GET` | `/admin/monitoring` | Live display connection status and payload metrics |
| `POST` | `/admin/broadcasts/text` | Broadcast text to all (or selected) displays |
| `POST` | `/admin/broadcasts/commands` | Broadcast command stream to all (or selected) displays |

### Display Server WebSocket

```
WS /display/ws?display_id=<id>
X-Display-Secret: <DISPLAY_SECRET>
```

Router → Display (push):
```json
{
  "type": "display_payload",
  "display_id": "disp_main",
  "payload_id": "pld_xyz",
  "render": { "template": "{{text}}", "resolved": { "text": "Hello" }, "style": { "color": "#ffcc00" } },
  "transition": { "type": "slide", "duration_ms": 0 },
  "expires_at": "2025-01-01T00:01:00Z"
}
```

Display → Router (heartbeat):
```json
{ "type": "heartbeat", "display_id": "disp_main", "uptime_seconds": 120 }
```

### Router Health & Metrics

```
GET /health   → { "status": "ok", "time": "..." }
GET /metrics  → { "payloads_received": 42 }
```

---

## Rules Engine

Rules match incoming payloads and determine which displays receive them.

```json
{
  "name": "Urgent alerts to lobby",
  "match": {
    "client_id": "cli_abc123",
    "payload_type": "alert",
    "tags": ["urgent"]
  },
  "priority": 100,
  "display_targets": ["disp_main"],
  "transition": "slide",
  "cooldown_seconds": 5,
  "schedule": {
    "timezone": "America/New_York",
    "days": ["mon", "tue", "wed", "thu", "fri"],
    "start": "08:00",
    "end": "18:00"
  }
}
```

- Rules are matched by `client_id`, `payload_type`, and `tags` (all specified fields must match).
- Multiple rules can match; all are applied in descending priority order.
- `schedule` restricts when a rule is active by timezone, days of week, and time window.
- `cooldown_seconds` prevents a rule from firing more than once per interval.
- `transition` options: `instant`, `slide`, `fade`, `delay`.

---

## Templates

Templates use Jinja2 syntax and are matched by `payload_type`.

```json
{
  "name": "Alert template",
  "payload_type": "alert",
  "template": "⚠ {{ text }}",
  "default_style": {
    "color": "#ff0000",
    "scroll_ms_per_px": 20
  }
}
```

Clients can also specify a `template_id` directly in the payload to bypass auto-matching.

Style options passed to the display/simulator:
- `style.color` — single hex color (e.g. `#ffcc00`)
- `style.colors` — per-character color array (length must match text)
- `style.scroll_ms_per_px` — scroll speed in ms per pixel (default `15`)

---

## Command Stream

Send raw rgbmatrix operations via `data.commands` in a payload or broadcast. References use `@id` to refer to objects created by earlier commands.

```json
{
  "commands": [
    { "op": "RGBMatrixOptions", "id": "opts" },
    { "op": "setattr", "target": "@opts", "attr": "rows", "value": 32 },
    { "op": "RGBMatrix", "id": "matrix", "kwargs": { "options": "@opts" } },
    { "op": "CreateFrameCanvas", "id": "canvas", "target": "@matrix" },
    { "op": "Fill", "target": "@canvas", "args": [0, 0, 0] },
    { "op": "Color", "id": "red", "args": [255, 0, 0] },
    { "op": "DrawText", "args": ["@canvas", "@font", 0, 10, "@red", "HELLO"] },
    { "op": "SwapOnVSync", "target": "@matrix", "args": ["@canvas"] }
  ]
}
```

Supported ops: `RGBMatrixOptions`, `RGBMatrix`, `FrameCanvas`, `CreateFrameCanvas`, `SwapOnVSync`, `Fill`, `Clear`, `SetPixel`, `SetImage`, `SetPixelsPillow`, `setattr`, `Color`, `Font`, `LoadFont`, `DrawText`, `DrawCircle`, `DrawLine`.

Sample files: `display/sample_commands.json`, `display/sample_pixels.json`.

---

## Display Simulator

The simulator lets you preview display output without hardware.

```bash
# Start the display client in sim mode
DISPLAY_RENDERER=sim python -m display.main

# Simulator JSON endpoint — serves latest frame at GET /sim
uvicorn display.sim_server:app --reload --port 8082

# Viewer UI — polls /sim and renders in browser
uvicorn display.sim_ui:app --reload --port 8083

# Playground — interactive payload editor with live preview
uvicorn display.sim_playground:app --reload --port 8084
```

Playground features:
- Preset buttons with **Save Preset** (browser localStorage) and **Export/Import JSON**
- Auto-refresh preview toggle
- Imported presets are saved automatically using the filename

### rgbmatrix Emulator

`rgbmatrix/` is a drop-in Python emulator (based on commit `5225746` of `rpi-rgb-led-matrix`) that runs scripts without hardware.

Set `RGBMATRIX_EMULATOR_PUSH_URL` to push frames to an external endpoint (e.g. `http://localhost:8084/push`):

```json
{
  "width": 64,
  "height": 32,
  "pixels": [[[0, 0, 0], "..."]]
}
```

---

## Admin UI

```bash
uvicorn admin.main:app --reload --port 8090
```

- Paste `ADMIN_TOKEN` into the token box to enable live monitoring.
- Manage clients, templates, rules, and display targets inline.
- View and filter log events; replay any `payload_received` log.
- Broadcast text or command streams to all or selected displays.
- Embed the simulator playground by providing its URL.

---

## Raspberry Pi (Display Server)

### Install

```bash
curl -fsSL https://raw.githubusercontent.com/mikeygnyc/DisplayRouter/main/scripts/bootstrap_display.sh | bash
```

The bootstrap script handles everything end-to-end:
- Preflight checks — Linux, sudo, apt-get, Python 3.10+, Pi detection
- Installs system dependencies (`git`, `python3-venv`, `python3-pil`, `cython3`, etc.)
- Clones the repo to `/opt/display-router/DisplayRouter` (or pulls if already present)
- Creates a virtualenv and installs `requirements-display.txt`
- Installs the rgbmatrix hardware bindings from source (skip with `DISPLAY_REQUIREMENTS=0`)
- Writes, enables, and starts the systemd service

The script prompts for each setting interactively with sensible defaults:

```
Repo URL             [https://github.com/mikeygnyc/DisplayRouter.git]:
Install directory    [/opt/display-router]:
Router WebSocket URL [ws://localhost:8000/display/ws]: ws://192.168.1.10:8000/display/ws
Display ID           [disp_main]: disp_lobby
Display secret       [dev-display-secret]:
Install rgbmatrix hardware bindings? (y/n) [y]:
```

Press Enter to accept a default. The secret prompt is silent (no echo). On non-Pi hardware the rgbmatrix bindings default to `n`.

After install, edit `/etc/systemd/system/display-router.service` to change any setting, then:

```bash
sudo systemctl daemon-reload && sudo systemctl restart display-router
```

### rgbmatrix Python bindings

```bash
sudo apt-get install python-dev-is-python3 python3-pil cython3
pip install git+https://github.com/hzeller/rpi-rgb-led-matrix
```

Source: https://github.com/hzeller/rpi-rgb-led-matrix

### Skip rgbmatrix on non-Pi machines

```bash
DISPLAY_REQUIREMENTS=0 bash scripts/install_display.sh
# or just use the emulator:
DISPLAY_RENDERER=sim python -m display.main
```

---

## Testing

```bash
make test        # runs pytest
python -m pytest # directly
```

Test coverage:
- `test_rules.py` — rule matching, schedule filtering, priority ordering
- `test_templates.py` — Jinja2 template rendering
- `test_display_renderer.py` — console and sim renderer output
- `test_rgbmatrix_api.py` — rgbmatrix emulator API compatibility
- `test_transitions.py` — transition types (instant, slide, fade, delay)
- `test_replay.py` — log event replay (live and dry-run)
- `test_health.py` — router health and display health endpoints
- `test_integration.py` — end-to-end router → display WebSocket flow

---

## Docker

```bash
# Build and run router only
docker build -t display-router .
docker run -p 8000:8000 \
  -e ADMIN_TOKEN=<token> \
  -e DISPLAY_SECRET=<secret> \
  -e API_KEY_SALT=<salt> \
  display-router

# Full stack with simulator
docker compose up --build
```

`docker-compose.yml` services: `router`, `admin-ui`, `display` (which hosts the sim endpoints on 8082–8084).

---

## Scripts

| Script | Description |
|---|---|
| `scripts/run_router.sh` | Run router with default environment variables |
| `scripts/bootstrap_display.sh` | curl-pipeable Raspberry Pi bootstrap installer (dependency checks, clone, venv, systemd) |
| `scripts/install_display.sh` | Minimal install helper (assumes repo already cloned) |
| `scripts/display.service` | systemd service unit template |

---

## Repository Structure

```
router/
  api/          # FastAPI route handlers (client, admin, display)
  core/         # Config, security, metrics
  domain/       # SQLModel ORM models
  services/     # Rules engine, template renderer, display manager, logging, commands
  storage/      # SQLite/SQLAlchemy session and init
  cli.py        # console_scripts entry point
display/
  main.py       # WebSocket client entry point
  client.py     # WebSocket connection and message loop
  render.py     # RenderFrame and console renderer
  rgbmatrix_renderer.py  # Hardware renderer
  sim_renderer.py        # Simulator renderer
  sim_server.py          # /sim JSON endpoint
  sim_ui.py              # Viewer UI server
  sim_playground.py      # Playground server
  command_executor.py    # Command stream executor
  transitions.py         # Transition types
  heartbeat.py           # Heartbeat sender
  config.py              # Display settings
admin/
  main.py       # Admin UI FastAPI app
  api.py        # Admin UI proxy endpoints
  templates/    # Jinja2 HTML templates
  static/       # CSS and JS
shared/
  schemas.py    # Pydantic request/response models
  utils/        # Config loader, ID generator, pagination
rgbmatrix/      # Drop-in rgbmatrix emulator (core + graphics)
config/         # Example router.json, display.json, router.toml, display.toml
docs/           # api_contracts.md, data_models.md, openapi.yaml, asyncapi.yaml
tests/          # pytest test suite
scripts/        # Install and run helpers
```

---

## API Specifications

- OpenAPI (Swagger): https://mikeygnyc.github.io/DisplayRouter/swagger/
- AsyncAPI: https://mikeygnyc.github.io/DisplayRouter/asyncapi/
