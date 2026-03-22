# Display Router API Contracts

## Overview
The API is split into two surfaces.
1. Client API for data producers.
2. Admin API for management UI and operations.
Client to router traffic is HTTP POST. Router to display traffic is WebSocket.

## Authentication
1. Client API uses API keys per client.
2. Admin API uses user accounts with token auth.
3. Display servers use a shared secret or mTLS on WebSocket connections.

## Transport Between Router and Display Server
1. Default transport: WebSocket push from router to display server.
2. Display servers connect to the router and maintain a persistent WebSocket.
3. All display payloads are signed by the router.

## Client API Endpoints

### Register Client
- Method: `POST`
- Path: `/api/clients`
- Auth: Admin only
- Request body:
```json
{
  "name": "string",
  "description": "string",
  "contact": "string",
  "payload_types": ["string"]
}
```
- Response body:
```json
{
  "id": "string",
  "api_key": "string",
  "created_at": "string"
}
```

### Get Client
- Method: `GET`
- Path: `/api/clients/{client_id}`
- Auth: Admin only

### List Client Payload Types
- Method: `GET`
- Path: `/api/clients/{client_id}/payload-types`
- Auth: Client or Admin

### Submit Payload
- Method: `POST`
- Path: `/api/payloads`
- Auth: Client
- Request body:
```json
{
  "client_id": "string",
  "payload_type": "string",
  "template_id": "string",
  "format_hint": "string",
  "priority": 0,
  "ttl_seconds": 60,
  "data": {}
}
```
- Response body:
```json
{
  "payload_id": "string",
  "routed_displays": ["string"],
  "status": "accepted"
}
```

### List Templates
- Method: `GET`
- Path: `/api/templates`
- Auth: Client or Admin

## Admin API Endpoints

### List Clients
- Method: `GET`
- Path: `/admin/clients`
- Auth: Admin

### Update Client
- Method: `PUT`
- Path: `/admin/clients/{client_id}`
- Auth: Admin

### Disable Client
- Method: `DELETE`
- Path: `/admin/clients/{client_id}`
- Auth: Admin

### Create Template
- Method: `POST`
- Path: `/admin/templates`
- Auth: Admin
- Request body:
```json
{
  "name": "string",
  "description": "string",
  "payload_type": "string",
  "template": "string",
  "default_style": {}
}
```

### List Templates (Admin)
- Method: `GET`
- Path: `/admin/templates`
- Auth: Admin

### Update Template
- Method: `PUT`
- Path: `/admin/templates/{template_id}`
- Auth: Admin

### Delete Template
- Method: `DELETE`
- Path: `/admin/templates/{template_id}`
- Auth: Admin

### Create Rule
- Method: `POST`
- Path: `/admin/rules`
- Auth: Admin
- Request body:
```json
{
  "name": "string",
  "match": {
    "client_id": "string",
    "payload_type": "string",
    "tags": ["string"]
  },
  "priority": 0,
  "display_targets": ["string"],
  "transition": "instant",
  "cooldown_seconds": 0,
  "schedule": {
    "timezone": "string",
    "days": ["mon","tue","wed","thu","fri","sat","sun"],
    "start": "HH:MM",
    "end": "HH:MM"
  }
}
```

### List Rules
- Method: `GET`
- Path: `/admin/rules`
- Auth: Admin

### Update Rule
- Method: `PUT`
- Path: `/admin/rules/{rule_id}`
- Auth: Admin

### Delete Rule
- Method: `DELETE`
- Path: `/admin/rules/{rule_id}`
- Auth: Admin

### List Display Targets
- Method: `GET`
- Path: `/admin/displays`
- Auth: Admin

### Create Display Target
- Method: `POST`
- Path: `/admin/displays`
- Auth: Admin
- Request body:
```json
{
  "name": "string",
  "host": "string",
  "port": 0,
  "capabilities": {
    "width": 64,
    "height": 32,
    "color_depth": 24
  }
}
```

### Update Display Target
- Method: `PUT`
- Path: `/admin/displays/{display_id}`
- Auth: Admin

### Disable Display Target
- Method: `DELETE`
- Path: `/admin/displays/{display_id}`
- Auth: Admin

### List Logs
- Method: `GET`
- Path: `/admin/logs`
- Auth: Admin
- Query params:
  - `level` (optional)
  - `client_id` (optional)
  - `display_id` (optional)
  - `limit` (optional, default 100)

## Display Server WebSocket

### Connect
- Method: `GET` (WebSocket upgrade)
- Path: `/display/ws`
- Auth: Router secret or mTLS

### Display Payload Message
- Sent from router to display server
- Message payload:
```json
{
  "type": "display_payload",
  "display_id": "string",
  "payload_id": "string",
  "render": {
    "template": "string",
    "resolved": {},
    "style": {}
  },
  "transition": {
    "type": "instant",
    "duration_ms": 0
  },
  "expires_at": "string"
}
```

### Heartbeat
- Sent from display server to router
- Message payload:
```json
{
  "type": "heartbeat",
  "display_id": "string",
  "uptime_seconds": 0
}
```

## Display Server HTTP Endpoints

### Health Check
- Method: `GET`
- Path: `/display/health`
- Auth: Router secret
- Response body:
```json
{
  "status": "ok",
  "uptime_seconds": 0
}
```
