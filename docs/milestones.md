# Display Router Milestones

## Milestone 1: Contracts and Skeleton
1. API contracts and data model docs approved.
2. Repo scaffolding for router, display server, and UI using FastAPI for router.
3. SQLite wired with ability to switch to Postgres via config.
4. CI pipeline with lint and unit test runner.

## Milestone 2: Router MVP
1. Client API endpoints live.
2. Rules engine resolves to display targets.
3. Template renderer produces display payloads.
4. Router can push payloads to a mocked display server.

## Milestone 3: Display Server MVP
1. Display server receives payloads and renders text.
2. Transitions supported: instant and fade.
3. Health checks and heartbeat functional.

## Milestone 4: Management UI MVP
1. CRUD for clients, templates, and rules.
2. Live status page for displays.
3. Logs view with filter by client and display.

## Milestone 5: Production Hardening
1. End-to-end tests for full flow.
2. Observability: metrics and alerts.
3. Deployment guides for router and Pi display server.

## Acceptance Criteria
1. A client can register, send a payload, and see it appear on the display.
2. Rules determine which display receives the payload.
3. Templates format data reliably with validation.
4. Admin can view logs and override a display target.
