# Display Router

## Summary

A system that allows one or more producers of data to feed one or more RGB LED matrix displays with a controlling router/formatter in the middle.

## Components

1. **Client API**: A set of APIs that allow various producers of data to connect to the router/formatter server, identify themselves, and send payloads for display.

2. **Router/Formatter Server**: A server that uses rules and templates to determine what client data should be formatted and routed to which display server.

3. **Display Server**: A Python-based server running on a Raspberry Pi that listens for incoming messages from clients (data producers) and renders them on an RGB LED matrix display using the `rgbmatrix` library.

4. **Management Interface**: A web-based interface for managing clients, reviewing logs, and setting rules for display priorities and transitions.

## Repository Structure
- `router/`: Router/Formatter API service (current MVP)
- `display/`: Display Server (Phase 3)
- `admin/`: Management Interface (Phase 4)
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

## Implementation Details
- The display server will be implemented using Python, utilizing the `rgbmatrix` library's python bindings for controlling the LED matrix display. This shall run on a Raspberry Pi.
- The router/formatter server will also be implemented in Python, using a web framework such as Flask or FastAPI to handle incoming client connections and manage routing logic.
- The management interface will be a web application, potentially built with a frontend framework like React or Vite.
- The client API will be designed to allow for easy integration by various data producers, with clear documentation on how to connect and send data.

## Testing

- Unit tests will be written for each component of the system to ensure functionality and reliability.
- Integration tests will be conducted to verify that the components work together as expected, particularly the communication between the router/formatter server and the display server, as well as the client API interactions.
- End-to-end tests will be performed to simulate real-world usage scenarios, ensuring that data flows correctly from clients to the display and that the management interface functions as intended.

## API Specifications
- OpenAPI (HTTP): `docs/openapi.yaml`
- AsyncAPI (WebSocket): `docs/asyncapi.yaml`

## Run Router API
```bash
pip install -r requirements.txt
uvicorn router.main:app --reload
```

Or via console script after install:
```bash
display-router --reload
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
Run the admin UI shell:
```bash
uvicorn admin.main:app --reload --port 8090
```
Use the token input at the top of the page to enable live monitoring calls.
Displays and logs render inline, and you can embed the simulator playground by providing its URL.

## Raspberry Pi (Display Server)
1. Clone this repo to `/opt/display-router/DisplayRouter`
2. Run `scripts/install_display.sh`
3. Edit `/etc/systemd/system/display-router.service` for router URL, display ID, and secret

Optional: set `DISPLAY_REQUIREMENTS=0` to skip rgbmatrix install on non-Pi dev machines.

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

### Management UI Notes
When the management UI arrives, we can embed the simulator and a real-time viewer that uses the same `/sim` interface.
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

## Conclusion

This system will provide a flexible and scalable solution for displaying data from various producers on RGB LED matrix displays, with a robust management interface for controlling the display logic and monitoring the system's performance.
