# Display Router Implementation Plan

## Goals
Build a system that ingests payloads from data producers, formats and prioritizes them via rules and templates, and renders them on one or more RGB LED matrix displays, with an admin interface for configuration and monitoring.

## Assumptions
1. Router/Formatter and Management Interface run on a server or VM.
2. Display Server runs on Raspberry Pi and controls an RGB matrix via `rgbmatrix`.
3. Client producers are external apps or services calling the API over HTTP POST.
4. Router pushes display payloads over WebSocket to display servers.
5. A single router can manage multiple displays.
6. Router uses FastAPI.
7. Persistence starts with SQLite and supports Postgres via config.

## Phases

### Phase 1: Architecture and Contracts
1. Define data schemas for clients, payloads, templates, rules, transitions, and display targets.
2. Define transport between router and display server (WebSocket push).
3. Define API endpoints and authentication strategy for clients and admin.
4. Decide persistence layer and logging format (SQLite first, Postgres supported).

### Phase 2: Router/Formatter MVP
1. Build API for client registration, payload submission, and template listing.
2. Implement rules engine with priority resolution.
3. Implement templating to convert payloads into display-ready messages.
4. Implement display adapter to send formatted payloads to display servers over WebSocket.
5. Add logging, health checks, and metrics.

### Phase 3: Display Server MVP
1. Build listener that accepts routed display payloads.
2. Implement rendering pipeline for text and simple graphics.
3. Implement transitions: instant, fade, slide, delay.
4. Implement health check and heartbeat to router.

### Phase 4: Management Interface
1. CRUD for clients, rules, templates, and display targets.
2. Monitoring: last payload per display, queue length, and router health.
3. Logs viewer and replay tool for debugging.

### Phase 5: Hardening and Operations
1. Unit tests for rules engine, template renderer, and transitions.
2. Integration tests from client payload to display output.
3. Deployment scripts and Docker for router UI.
4. Raspberry Pi install script and systemd service for display server.

## Deliverables
1. Router service with API, routing, formatting, and logging.
2. Display server with renderer and transitions.
3. Admin UI with rules and template management.
4. Documentation and sample client.
