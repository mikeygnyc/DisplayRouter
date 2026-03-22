# Display Router Data Models

## Persistence Notes
1. Start with SQLite for local development and MVP.
2. Support Postgres via configuration and environment variables.
3. Use a migration tool to keep schemas aligned across SQLite and Postgres.

## Client
- `id`: string
- `name`: string
- `description`: string
- `contact`: string
- `api_key_hash`: string
- `payload_types`: array of string
- `created_at`: ISO-8601 string
- `disabled`: boolean

## Payload
- `id`: string
- `client_id`: string
- `payload_type`: string
- `template_id`: string
- `format_hint`: string
- `priority`: integer
- `ttl_seconds`: integer
- `data`: object
- `tags`: array of string
- `received_at`: ISO-8601 string

## Template
- `id`: string
- `name`: string
- `description`: string
- `payload_type`: string
- `template`: string
- `default_style`: object
- `created_at`: ISO-8601 string

## Rule
- `id`: string
- `name`: string
- `match_client_id`: string
- `match_payload_type`: string
- `match_tags`: array of string
- `priority`: integer
- `display_targets`: array of string
- `transition_type`: string
- `cooldown_seconds`: integer
- `schedule_timezone`: string
- `schedule_days`: array of string
- `schedule_start`: string
- `schedule_end`: string
- `enabled`: boolean

## DisplayTarget
- `id`: string
- `name`: string
- `host`: string
- `port`: integer
- `capabilities`: object
- `created_at`: ISO-8601 string
- `disabled`: boolean

## DisplayPayload
- `display_id`: string
- `payload_id`: string
- `render_template`: string
- `render_resolved`: object
- `render_style`: object
- `transition_type`: string
- `transition_duration_ms`: integer
- `expires_at`: ISO-8601 string

## LogEvent
- `id`: string
- `level`: string
- `message`: string
- `context`: object
- `created_at`: ISO-8601 string
