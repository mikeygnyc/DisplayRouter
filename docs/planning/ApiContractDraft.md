# API Contract Draft (SpecUpdates)

This is a draft update to the API contract based on `docs/planning/SpecUpdates.md`. It focuses on schema changes and new endpoints; it does not yet update `docs/openapi.yaml` or `shared/schemas.py` directly.

---

## 1) Schema Updates

### 1.1 Payload Submit (Client API)
Proposed update to `PayloadSubmit`:
```json
{
  "client_id": "string",
  "payload_type": "string",
  "template_id": "string (optional)",
  "format_hint": "string (optional)",
  "priority": 0,
  "ttl_seconds": 60,
  "tags": ["string"],
  "valid_from": "2026-03-22T12:00:00Z (optional)",
  "valid_to": "2026-03-22T12:05:00Z (optional)",
  "data": {}
}
```
Notes:
- `valid_from` / `valid_to` are optional. When present, the router should cache payloads until active and clear them on expiry.
- `tags` already exist in code but should be documented and used in rule matching.

### 1.2 Transition Model
Current transition fields are minimal. Proposed `Transition` object for WebSocket and rule definition:
```json
{
  "type": "cut|slide|fade|barn_door|wipe",
  "delay_ms": 0,
  "duration_ms": 500,
  "direction": "left|right|up|down",
  "fade_in_ms": 200,
  "fade_out_ms": 300,
  "barn_direction": "horizontal|vertical"
}
```
Notes:
- `delay_ms` applies to all transitions.
- `duration_ms` applies to slide/fade/barn_door/wipe.
- `direction` only applies to slide/wipe.
- `fade_in_ms` / `fade_out_ms` apply to fade.
- `barn_direction` applies to barn_door.

### 1.3 Payload Types (enum + per-type data)
Proposed additions to `payload_type` enum:
- `raw_*` (per rgbmatrix object type)
- `simple_text_scroll`
- `simple_text_page`
- `rich_text_scroll`
- `rich_text_page`
- `billboard`
- `clock`
- `weather`
- `image`
- `animation`
- `template`
- `clear`

Data expectations (draft):
- `raw_*`: `{ "commands": [...]} | {"pixels": {width,height,pixels}} | rgbmatrix object-specific fields`
- `simple_text_scroll`: `{ "lines": ["..."], "colors": ["#RRGGBB"], "scroll_ms_per_px": 15 }`
- `simple_text_page`: `{ "pages": [["line1","line2"]], "colors": [["#RRGGBB", "#RRGGBB"]], "page_ms": 3000 }`
- `rich_text_*`: text + embedded media references (image/animation ids)
- `billboard`: a single rich text page
- `clock`: `{ "clock_type": "digital|analog", "timezone": "America/Chicago", "format": "HH:mm", "color": "#RRGGBB" }`
- `weather`: `{ "location": "string", "units": "metric|imperial", "provider": "openweather|...", "color": "#RRGGBB", "forecast": {...} }`
- `image`: `{ "image_url": "..." | "image_bytes": "...", "scale": "fit|fill|stretch", "crop": {...} }`
- `animation`: `{ "frames": [...], "fps": 30, "loop": true }`
- `template`: `{ "template": "...", "data": {...}, "scroll": {...} }`
- `clear`: `{}`

These should be formalized into concrete schema definitions once we decide exact field names.

### 1.4 Carousel Entity
Proposed Admin-only model:
```json
{
  "id": "car_123",
  "name": "Lobby Carousel",
  "windows": [
    {
      "id": "win_1",
      "payload_ref": { "payload_id": "..." } | { "client_id": "...", "payload_type": "...", "tags": [...] },
      "every_n_cycles": 1,
      "enabled": true
    }
  ],
  "cadence_seconds": 10
}
```

---

## 2) New/Updated Endpoints

### 2.1 Preview Endpoint
**Goal**: Send payloads for temporary rendering on admin sim without creating persistent templates/commands.
- `POST /api/preview`
- Request: same as `POST /api/payloads` (or subset), with optional `display_id` or `all_displays` flags.
- Response:
```json
{
  "preview_id": "prev_123",
  "routed_displays": ["disp_main"],
  "status": "accepted"
}
```

### 2.2 Validate Endpoint
**Goal**: Validate payloads or templates and return errors/warnings.
- `POST /api/validate`
- Request:
```json
{
  "payload_type": "simple_text_scroll",
  "data": { ... },
  "template": "... (optional)",
  "context": { ... (optional) }
}
```
- Response:
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### 2.3 Carousel CRUD (Admin)
- `POST /admin/carousels`
- `GET /admin/carousels`
- `PUT /admin/carousels/{carousel_id}`
- `DELETE /admin/carousels/{carousel_id}`

---

## 3) WebSocket Contract (Display Payload)
Update `DisplayPayload` (AsyncAPI) to include expanded transition fields and validity:
```json
{
  "type": "display_payload",
  "display_id": "disp_main",
  "payload_id": "pld_123",
  "render": { "template": "...", "resolved": {...}, "style": {...} },
  "transition": { "type": "fade", "duration_ms": 500, "delay_ms": 0 },
  "valid_from": "2026-03-22T12:00:00Z",
  "valid_to": "2026-03-22T12:05:00Z",
  "expires_at": "2026-03-22T12:05:00Z"
}
```

---

## 4) Follow-up Changes (When Applying to Code)
- Update `docs/openapi.yaml` and `docs/api_contracts.md`.
- Update `shared/schemas.py` with new fields, enums, and models.
- Update `router/domain/models.py` for validity windows and carousel storage.
- Update `router/api/client.py` and `router/api/admin.py` for preview/validate + carousel CRUD.
- Update `docs/asyncapi.yaml` for expanded transition and validity fields.

