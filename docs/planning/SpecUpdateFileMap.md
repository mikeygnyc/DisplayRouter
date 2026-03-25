# SpecUpdates → File-Level Mapping

This maps each SpecUpdates requirement to the most likely files/modules to change. It’s organized by spec section for implementation sequencing.

**Admin UI (tabs, wizards, validation, pickers)**
- UI shell + layout: `admin/ui/src/App.tsx`, `admin/ui/src/index.css` (React app)
- UI logic/data fetch: `admin/ui/src/App.tsx`
- Admin API surface (if new endpoints needed for UI): `router/api/admin.py`
- Shared validation schemas for UI forms: `shared/schemas.py`

**Admin UI framework modernization**
- Frontend build under `admin/ui/` (Vite/React), with `admin/main.py` serving the bundle.
- Server-rendered pages/static assets live under `admin/ui/web/`.

**Payload type editor + dictionary/chooser inputs**
- Admin UI editor UI: `admin/ui/src/App.tsx`
- Payload type schema (for generating fields): `shared/schemas.py` (new enums / typed payload definitions)
- Router validation: `router/api/client.py`, `router/services/commands.py` (if command payloads share validation)

**Color picker (defaults/recents)**
- UI: `admin/ui/src/App.tsx`, `admin/ui/src/index.css`
- Optional storage: browser localStorage (JS) or router settings in `router/core/config.py` / new admin endpoints.

**Admin sim display inside admin container**
- Compose change (move sim endpoints into admin container or add internal route): `docker-compose.yml`
- Sim server/UI: `display/sim_server.py`, `display/sim_ui.py`, `display/sim_playground.py`
- Admin UI embed: `admin/ui/src/App.tsx`, sim UI files under `admin/ui/web/static/`

**Playground rework (smart editor + parameter pickers)**
- Playground UI: `display/sim_playground.py` (currently a basic HTML/JS blob)
- Possibly migrate playground into admin UI: `admin/ui/src/App.tsx`, `admin/ui/src/index.css`
- Shared schemas: `shared/schemas.py` for payload field metadata

**Jinja scratchpad + live linting + preview output**
- Router template rendering: `router/services/templates.py`
- Add template validation/linting: new service module under `router/services/` (e.g., `templates_lint.py`), API endpoint under `router/api/admin.py` or `router/api/client.py`
- Admin UI: `admin/ui/src/App.tsx` to expose scratchpad UI
- Sim preview: `display/sim_server.py`, `display/sim_ui.py` (for live output)

**Interactive API docs in admin UI**
- OpenAPI/AsyncAPI sources: `docs/openapi.yaml`, `docs/asyncapi.yaml`
- Hosting docs UI: new admin route in `admin/main.py` or `router/main.py` (serve Swagger/Redoc or third-party bundle)
- Admin UI embed: `admin/ui/src/App.tsx`

**Broadcast tools: text, image, animation, playground output, stream commands**
- Admin endpoints: `router/api/admin.py` (existing `/admin/broadcasts/text`, `/admin/broadcasts/commands`)
- Extend with `/admin/broadcasts/image`, `/admin/broadcasts/animation`, `/admin/broadcasts/preview` as needed.
- Display handling: `display/client.py`, `display/render.py`, `display/command_executor.py`
- Admin UI: `admin/ui/src/App.tsx`

---

**API Updates**

**Payload `tags` array**
- Schema: `shared/schemas.py` (already has tags), `docs/openapi.yaml`, `docs/api_contracts.md`
- Storage: `router/domain/models.py` (already has tags)
- Rule matching: `router/services/rules.py` (already uses tags)

**Payload validity window (start/stop timestamps)**
- Schema: `shared/schemas.py`, `docs/openapi.yaml`, `docs/api_contracts.md`
- Storage: `router/domain/models.py` (add fields)
- Router logic: `router/api/client.py` (store and enforce), `router/services/display_manager.py` (cache/expiry), `router/services/rules.py` (skip outside window)
- Display clearing on expiry: `display/client.py`, `display/transitions.py` (clear payload)

**Transition types + parameters**
- Schema: `shared/schemas.py`, `docs/openapi.yaml`, `docs/asyncapi.yaml`
- Router send payload: `router/api/client.py`, `router/api/admin.py`
- Display transitions: `display/transitions.py`, `display/client.py`

**Payload types (raw_*, simple_text_*, clock, weather, image, animation, template, rich_text_*, billboard, clear)**
- Schema: `shared/schemas.py` (add payload type enum + typed payload definitions)
- Router ingestion + routing: `router/api/client.py`
- Template rendering: `router/services/templates.py`
- Display renderers: `display/render.py`, `display/rgbmatrix_renderer.py`, `display/sim_renderer.py` (expand for new types)
- Command/pixel support: `display/command_executor.py`
- Admin UI: payload type editor and preview UI (`admin/ui/src/App.tsx`)

**Carousel entity + admin UI**
- Schema: `shared/schemas.py` (Carousel/Window types)
- Storage: `router/domain/models.py` (new table)
- Admin endpoints: `router/api/admin.py`
- Router scheduler: new service under `router/services/` (e.g., `carousel.py`)
- Admin UI: `admin/ui/src/App.tsx`

**Preview endpoint**
- API: `router/api/client.py` or `router/api/admin.py` (new `POST /api/preview` or `/admin/preview`)
- Display manager: `router/services/display_manager.py` to send to admin sim display
- Admin UI: `admin/ui/src/App.tsx` or playground integration

**Validate endpoint**
- API: `router/api/client.py` or `router/api/admin.py` (new `POST /api/validate`)
- Validation logic: new shared validation module, likely under `router/services/`
- Schema: `shared/schemas.py`, `docs/openapi.yaml`

---

**Simulator/Admin Sim Display**
- Default sim endpoints and UI: `display/sim_server.py`, `display/sim_ui.py`, `display/sim_playground.py`
- Compose wiring: `docker-compose.yml`, `scripts/run_display_sim.sh`
- Option to host sim endpoints inside admin container: `admin/main.py` (proxy or static embed), plus compose updates.
