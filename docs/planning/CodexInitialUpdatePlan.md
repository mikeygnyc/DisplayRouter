This spec is a great foundation—there’s a clear product vision here, and we can turn it into a concrete, staged implementation plan without losing momentum.

Below is a proposed implementation plan based on `docs/planning/SpecUpdates.md`, with phases, deliverables, and likely code touchpoints. I’ve also called out a few assumptions where the spec leaves options open.

**Plan (Phased)**

**Phase 0: Baseline inventory**
1. Locate current admin UI stack, simulator/playground, and API schema sources.
2. Identify where payload types, transitions, and validation currently live.
3. Identify how the simulator display is provisioned (docker-compose, admin container, etc).

Deliverable: short checklist of current files/modules and gaps.

**Phase 1: API contract updates (foundational)**
1. Add `tags` to payload schema.
2. Add `valid_from` / `valid_to` (or similar) fields with cache semantics and expiry behavior.
3. Extend transition types and parameters per spec.
4. Add new payload types to schema (including `raw_*`, `simple_text_*`, `clock`, `weather`, `image`, `animation`, `template`, `rich_text_*`, `billboard`, `clear`).
5. Implement `preview` and `validate` endpoints in the API.

Deliverables:
- Updated API schema and validation logic.
- Unit tests for schema validation and preview/validate endpoints.
- Basic in-memory or persisted cache behavior for validity windows.

**Phase 2: Renderer + router support**
1. Update router to understand and route new payload types.
2. Implement basic renderers for new types (start with text, image, animation, template; weather/clock can be stubbed with minimal renderer).
3. Implement `clear` behavior and expiry clearing logic.
4. Implement transition parameter handling across renderer pipeline.

Deliverables:
- Router supports new payload types and transitions.
- Expiry clears active payloads.
- Basic rendering works end-to-end for core types.

**Phase 3: Admin UI modernization**
1. Choose UI framework and apply it across admin pages (single layout + tabbed sections).
2. Rebuild data entry with wizard/editor patterns and validation.
3. Replace free-form fields with pickers / controlled dictionaries.
4. Add payload type editor with schema-guided UI.

Deliverables:
- Modern UI shell with tabs.
- CRUD flows guided and validated.
- Payload type editing and color picker support.

**Phase 4: Playground + Template tools**
1. Add dedicated admin sim display inside admin container.
2. Rework playground into preset + “smart” editor (schema-driven parameter selection).
3. Add Jinja scratchpad with linting, live preview, and integrated docs.
4. Add template creation flow with live output to admin sim.

Deliverables:
- Admin sim display in container.
- Playground builder + Jinja scratchpad with live validation.

**Phase 5: Carousel + Preview UX**
1. Implement `carousel` CRUD in admin UI.
2. Add preview/advance UI in carousel editor and render to admin sim.
3. Integrate `preview` endpoint flows in UI.

Deliverables:
- Carousel editor with preview and cadence controls.
- Preview endpoint exposed and wired in UI.

**Phase 6: Weather + Clock advanced configs**
1. Add admin UI config pages for weather sources, keys, units, timezone sources.
2. Add renderer configuration support for multiple clocks and forecasts.

Deliverables:
- Config pages for time and weather sources.
- Operational weather/clock payloads with labels.

---

**Assumptions / Decisions to confirm**
1. API schema format: I’m assuming OpenAPI/JSON schema is already present in `docs/api_contracts.md` or a schema file. If it’s elsewhere, we’ll prioritize that as the source of truth.
2. Router implementation language: likely Python (based on repo layout). Plan assumes Python-based validation and rendering.
3. Simulator/admin UI: there is an existing admin UI and simulator to iterate on.

---

**Suggested next steps**
1. I can do a quick codebase inventory (API schema, router, admin UI) and map each plan phase to specific files and modules.
2. Or, if you’d rather, we can start by drafting the updated API contract first and then drive everything off that.

If you want me to proceed, tell me which you prefer:
1. Inventory and map plan to file-level changes.
2. Draft API contract updates first.