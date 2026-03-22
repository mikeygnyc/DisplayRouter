import uuid

from fastapi.testclient import TestClient

from router.main import app
from router.services.display_manager import manager as display_manager
from router.storage.db import init_db


def _auth_headers() -> dict:
    return {"Authorization": "Bearer dev-admin-token"}


def test_payload_routes_to_display():
    init_db()
    client = TestClient(app)

    suffix = uuid.uuid4().hex[:6]

    # Create client
    resp = client.post(
        "/api/clients",
        json={"name": f"WeatherBot-{suffix}", "payload_types": ["weather.summary"]},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    client_id = resp.json()["id"]
    api_key = resp.json()["api_key"]

    # Create template
    resp = client.post(
        "/admin/templates",
        json={
            "name": f"Weather-{suffix}",
            "payload_type": "weather.summary",
            "template": "{{temp_f}}F",
            "default_style": {},
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200

    # Create display
    resp = client.post(
        "/admin/displays",
        json={"name": f"Main-{suffix}", "host": "127.0.0.1", "port": 8081},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    display_id = resp.json()["id"]

    # Create rule
    resp = client.post(
        "/admin/rules",
        json={
            "name": f"Weather Main-{suffix}",
            "match": {"client_id": client_id, "payload_type": "weather.summary"},
            "priority": 10,
            "display_targets": [display_id],
            "transition": "instant",
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200

    # Submit payload
    resp = client.post(
        "/api/payloads",
        json={
            "client_id": client_id,
            "payload_type": "weather.summary",
            "data": {"temp_f": 72},
        },
        headers={"X-API-Key": api_key},
    )
    assert resp.status_code == 200
    payload_id = resp.json()["payload_id"]

    last = display_manager.last_payload(display_id)
    assert last is not None
    assert last.get("payload_id") == payload_id
    assert last.get("render", {}).get("resolved", {}).get("text") == "72F"
