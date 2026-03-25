# Project Inventory (Display Router)

**Purpose**
This document maps the current codebase structure, core flows, and key files to help plan SpecUpdates work.

**Top-Level Layout**
- `router/`: FastAPI router/formatter service (Client API, Admin API, display WebSocket).
- `display/`: Display client + simulator endpoints and render pipeline.
- `admin/`: Admin UI web app (FastAPI + static HTML/JS/CSS).
- `shared/`: Pydantic schemas + shared utilities.
- `rgbmatrix/`: Emulator of `rpi-rgb-led-matrix` bindings.
- `config/`: Example JSON/TOML config files.
- `docs/`: OpenAPI/AsyncAPI specs, data model docs.
- `scripts/`: Helper scripts for local/dev and Docker.
- `tests/`: Unit and integration tests.
- `docker-compose.yml`: Multi-service dev stack (router, display sim, admin UI).

**System Entry Points**
- Router API service: `router/main.py`
- Admin UI service: `admin/main.py`
- Display client: `display/client.py` (entry via `python -m display.main`)
- Simulator endpoints: `display/sim_server.py`, `display/sim_ui.py`, `display/sim_playground.py`
- Compose: `docker-compose.yml`

**API Surfaces and Contracts**
- OpenAPI: `docs/openapi.yaml`
- AsyncAPI (WebSocket): `docs/asyncapi.yaml`
- Human-readable API contract notes: `docs/api_contracts.md`
- Data model summary: `docs/data_models.md`

**Router Service (`router/`)**
- API wiring: `router/main.py`
- Client API: `router/api/client.py` — `POST /api/clients`, `GET /api/clients/{id}`, `GET /api/clients/{id}/payload-types`, `POST /api/payloads`, `GET /api/templates`.
- Admin API: `router/api/admin.py` — clients/templates/rules/displays CRUD, logs + replay, monitoring summary, broadcasts, router restart.
- Display API/WebSocket: `router/api/display.py` — `/display/health`, `/display/ws`.
- Domain models (SQLModel tables): `router/domain/models.py`.
- Storage + DB setup: `router/storage/db.py`.
- Config + secrets: `router/core/config.py`, `router/core/security.py`.
- Metrics: `router/core/metrics.py`.
- Rule selection: `router/services/rules.py`.
- Template rendering (Jinja): `router/services/templates.py`.
- Command validation: `router/services/commands.py`.
- Display connection management: `router/services/display_manager.py`.
- Logging and retention: `router/services/logging.py`, `router/services/logs.py`.

**Display Service (`display/`)**
- WebSocket client: `display/client.py` (connects to router WS, handles payloads, renders frames).
- Rendering core: `display/render.py`.
- Transitions: `display/transitions.py`.
- Command execution (rgbmatrix API emulation): `display/command_executor.py`.
- Renderer implementations: `display/render.py` (console), `display/rgbmatrix_renderer.py` (matrix), `display/sim_renderer.py` (sim push).
- Simulator endpoints: `display/sim_server.py` (`GET /sim`, `POST /push`), `display/sim_ui.py` (viewer), `display/sim_playground.py` (JSON editor + presets).
- Display state: `display/state.py`.
- Heartbeat sender: `display/heartbeat.py`.
- Config: `display/config.py`.

**Admin UI (`admin/`)**
- FastAPI shell + web assets: `admin/main.py`, `admin/ui/web/templates/index.html`, `admin/ui/web/static/sim_ui.*`.
- React admin UI source: `admin/ui/src/App.tsx` (clients/templates/rules/displays CRUD, logs, monitoring, broadcasts, router restart, token bootstrap/rotate).

**Shared Schemas and Utilities**
- Pydantic schemas used by APIs: `shared/schemas.py`.
- ID utilities: `shared/utils/ids.py`.
- Pagination helpers: `shared/utils/pagination.py`.
- Config loader (JSON/TOML): `shared/utils/config.py`.

**Config and Runtime**
- Example config files: `config/router.json`, `config/router.toml`, `config/display.json`, `config/display.toml`.
- Local overrides (compose): `local_config/` (created at runtime).
- Compose environment defaults in `docker-compose.yml`.

**Scripts**
- `scripts/run_display_sim.sh` (starts display sim stack).
- `scripts/run_router.sh`.
- `scripts/with_local_config.sh` (copy default config to local overrides).
- `scripts/bootstrap_display.sh`, `scripts/install_display.sh`.

**Tests**
- Rules engine: `tests/test_rules.py`.
- Transitions: `tests/test_transitions.py`.
- RGB matrix API emulation: `tests/test_rgbmatrix_api.py`.
- Integration: `tests/test_integration.py`, `tests/test_replay.py`.
- Health endpoints: `tests/test_health.py`.
- Display rendering: `tests/test_display_renderer.py`.
- Templates: `tests/test_templates.py`.

**Current Flow Summary**
- Client payloads hit `POST /api/payloads` in `router/api/client.py`.
- Router stores payload (`router/domain/models.py`) and selects templates/rules.
- Router sends display payloads over WS via `router/services/display_manager.py`.
- Display client receives payload (`display/client.py`), applies transition, renders frame.
- Simulator and admin UI use separate FastAPI apps for preview and monitoring.

**Notable Gaps vs SpecUpdates (for later planning)**
- Admin UI is minimal static HTML/JS (no modern framework or wizard editors yet).
- Simulator playground exists but is basic JSON editor (no schema-driven builder or Jinja scratchpad).
- Payload types and transitions are currently limited (simple text, commands, pixels).
- No `preview` or `validate` API endpoints yet.
- Template linting/validation is not present.
- Carousel concept not implemented.
