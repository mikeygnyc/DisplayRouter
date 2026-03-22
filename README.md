# Display Router
[![CI](https://github.com/mikeygnyc/DisplayRouter/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeygnyc/DisplayRouter/actions/workflows/ci.yml)

## Summary

Display Router connects data producers to RGB LED matrix displays through a router/formatter that applies templates, rules, and transitions.

## Components

1. **Client API**: Allows producers to register and send payloads.
2. **Router/Formatter Server**: Applies rules/templates and routes to displays.
3. **Display Server**: Renders payloads to `rgbmatrix`, console, or simulator output.
4. **Management Interface**: Admin UI for monitoring, CRUD, and broadcasts.

## Repository Structure
- `router/`: Router/Formatter API service
- `display/`: Display Server
- `admin/`: Management Interface
- `shared/`: Shared schemas/utilities
- `docs/`: API contracts and implementation plan

### Client API
- Provides endpoints for clients to connect, identify themselves, list their available payload types, and send data.
- Clients may specify a format or template to use for their data.

### Router/Formatter Server
- Receives data from clients, applies formatting rules, and routes the data to the appropriate display based on priority rules.
- Generates any transition data needed for the display servers to render.

### Display Server
- Listens for incoming connections from router/formatter.
- Renders messages on the RGB LED matrix display based on received payloads.

### Management Interface
- Allows administrators to manage clients, set display templates, and define rules for how data is displayed including priority to certain sources, transition types between payload (instant, delayed, etc).
- Provides logging and monitoring capabilities for the system.

## Quickstart
Run the router:
```bash
pip install -r requirements.txt
uvicorn router.main:app --reload
```
Run the admin UI:
```bash
uvicorn admin.main:app --reload --port 8090
```
Run a display client in simulator mode:
```bash
DISPLAY_RENDERER=sim python -m display.main
```
Run simulator UI and playground:
```bash
uvicorn display.sim_ui:app --reload --port 8083
uvicorn display.sim_playground:app --reload --port 8084
```

### Configuration At A Glance
- Router config file: `ROUTER_CONFIG_FILE=./config/router.json`
- Display config file: `DISPLAY_CONFIG_FILE=./config/display.json`
- Simulator render mode: `DISPLAY_RENDERER=sim`
- Admin token: set `ADMIN_TOKEN` on the router and paste it into the Admin UI token box

### Ports
- Router API (`/api`, `/admin`): `http://localhost:8000`
- Admin UI (HTML shell): `http://localhost:8090`
- Simulator server (`/sim` JSON): `http://localhost:8082`
- Simulator UI (viewer): `http://localhost:8083`
- Simulator playground (editor + preview): `http://localhost:8084`

### System Diagram
```text
Producers -> Client API -> Router/Formatter -> Display Server -> RGB Matrix
                               |                   |
                               |                   +-> Simulator (/sim)
                               |
                               +-> Admin UI (monitoring + CRUD + broadcast)
```

### Data Flow Example
```text
Client payload -> template -> render payload -> display/sim output
```

## Testing

- Unit tests cover router rules, templates, display rendering, rgbmatrix compatibility, and command streams.
- Integration tests validate router-to-display flows and mock matrix rendering.
- Run tests via `make test`.

## API Specifications
- OpenAPI (HTTP): `docs/openapi.yaml`
- AsyncAPI (WebSocket): `docs/asyncapi.yaml`
GitHub Pages renders both specs from `docs/` (see repo Pages URL).

## Run Router API
Via console script after install:
```bash
display-router --reload
```
Optional config file:
```bash
ROUTER_CONFIG_FILE=./config/router.json uvicorn router.main:app --reload
```

## Makefile Helpers
- `make run`
- `make compile`
- `make test`

## Docker
Build and run the router:
```bash
docker build -t display-router .
docker run -p 8000:8000 display-router
```

Or with compose:
```bash
docker compose up --build
```

## Scripts
- `scripts/run_router.sh` (runs router with default envs)
- `scripts/install_display.sh` (Raspberry Pi display server install helper)

## Admin UI
Use the token input at the top of the page to enable live monitoring calls.
Displays and logs render inline, and you can embed the simulator playground by providing its URL.

## Raspberry Pi (Display Server)
1. Clone this repo to `/opt/display-router/DisplayRouter`
2. Run `scripts/install_display.sh`
3. Edit `/etc/systemd/system/display-router.service` for router URL, display ID, and secret

Optional: set `DISPLAY_REQUIREMENTS=0` to skip rgbmatrix install on non-Pi dev machines.
For simulator-only runs, you can skip rgbmatrix entirely and set `DISPLAY_RENDERER=sim`.

### rgbmatrix
Repo:
```text
https://github.com/hzeller/rpi-rgb-led-matrix/tree/master
```
Install prerequisites:
```bash
sudo apt-get install python-dev-is-python3 python3-pil cython3
```
Install Python bindings:
```bash
pip install git+https://github.com/hzeller/rpi-rgb-led-matrix
```

## Display Server Config
Config file support (JSON or TOML):
- `DISPLAY_CONFIG_FILE` or `CONFIG_FILE` to point at a config file.
- Precedence: defaults -> config file -> env vars.

- `ROUTER_WS_URL` (default `ws://localhost:8000/display/ws`)
- `DISPLAY_ID` (default `disp_main`)
- `DISPLAY_SECRET` (default `dev-display-secret`)
- `HEARTBEAT_INTERVAL_SECONDS` (default `10`)
- `DISPLAY_RENDERER` (`console`, `rgbmatrix`, or `sim`, default `console`)
- `MATRIX_WIDTH` (default `64`)
- `MATRIX_HEIGHT` (default `32`)
- `MATRIX_CHAIN` (default `1`)
- `MATRIX_PARALLEL` (default `1`)
- `MATRIX_BRIGHTNESS` (default `60`)
- `MATRIX_GPIO_SLOWDOWN` (default `2`)
- `MATRIX_HARDWARE_MAPPING` (default `regular`)
- `MATRIX_FONT_PATH` (default `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`)
- `MATRIX_FONT_SIZE` (default `10`)

Example:
```bash
DISPLAY_CONFIG_FILE=./config/display.json python -m display.main
```

## Router Config
Config file support (JSON or TOML):
- `ROUTER_CONFIG_FILE` or `CONFIG_FILE` to point at a config file.
- Precedence: defaults -> config file -> env vars.

Example:
```bash
ROUTER_CONFIG_FILE=./config/router.json uvicorn router.main:app --reload
```

## Display Simulator
Run a simple simulator web endpoint:
```bash
uvicorn display.sim_server:app --reload --port 8082
```
Use `DISPLAY_RENDERER=sim` to print compact frames in the client.

### Simulator UI
Run a simple web UI:
```bash
uvicorn display.sim_ui:app --reload --port 8083
```

### Simulator Playground
Interactive payload playground:
```bash
uvicorn display.sim_playground:app --reload --port 8084
```
Includes preset buttons and auto-refresh preview toggle.
Use **Save Preset** (stored in browser localStorage) and **Export JSON** for reuse in templates.
Use **Import JSON** to load a saved preset file.
Imported presets are saved automatically using the filename.

## rgbmatrix Emulator
This repo includes a drop-in `rgbmatrix` Python emulator (based on commit `5225746` of `rpi-rgb-led-matrix`) that can run scripts without hardware.

Optional client push:
- Set `RGBMATRIX_EMULATOR_PUSH_URL` to a JSON endpoint (e.g. the simulator playground `http://localhost:8084/push`) to receive frames.
The payload can include full pixel buffers:
```json
{
  "width": 64,
  "height": 32,
  "pixels": [[[0,0,0], ...]]
}
```

### Command Stream Payload
You can send a command stream in `data.commands` via `/api/payloads`. Example:
```json
{
  "commands": [
    {"op":"RGBMatrixOptions","id":"opts"},
    {"op":"setattr","target":"@opts","attr":"rows","value":32},
    {"op":"RGBMatrix","id":"matrix","kwargs":{"options":"@opts"}},
    {"op":"CreateFrameCanvas","id":"canvas","target":"@matrix"},
    {"op":"Fill","target":"@canvas","args":[0,0,0]},
    {"op":"Color","id":"red","args":[255,0,0]},
    {"op":"DrawText","args":["@canvas","@font",0,10,"@red","HELLO"]},
    {"op":"SwapOnVSync","target":"@matrix","args":["@canvas"]}
  ]
}
```
References use `@id` to refer to earlier objects. All rgbmatrix core and graphics ops are supported.

Admin UI also supports broadcasting command streams via **Broadcast Commands**.
Sample command stream: `display/sample_commands.json`.
Sample pixel buffer: `display/sample_pixels.json`.

### Management UI Notes
The management UI can embed the simulator playground and uses the same `/sim` interface for a real-time viewer.
Payload style options for simulator:
- `style.color`: single color (e.g., `#ffcc00`)
- `style.colors`: per-character colors array (length must match text)
- `style.scroll_ms_per_px`: scroll speed in ms per pixel (default 15)

## How to Render Docs
OpenAPI (Swagger UI):
```bash
docker run --rm -p 8080:8080 \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v "$(pwd)/docs/openapi.yaml:/spec/openapi.yaml" \
  swaggerapi/swagger-ui
```
AsyncAPI (HTML):
```bash
npx @asyncapi/generator docs/asyncapi.yaml @asyncapi/html-template -o docs/asyncapi-html
```

## Notes
The system supports command streams (`data.commands`), full pixel buffers, and simulator embeds that use the same `/sim` interface as the display server.

## Versioning
Versions are derived from git tags via `setuptools_scm`.
- Tag format: `vX.Y.Z` (e.g., `v1.2.3`)
- CI/release workflow triggers on tag pushes.
