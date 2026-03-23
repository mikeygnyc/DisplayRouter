from fastapi.testclient import TestClient

from router.main import app
from router.storage.db import init_db


def _auth_headers() -> dict:
    return {"Authorization": "Bearer dev-admin-token"}


def test_replay_dry_run_happy_path():
    init_db()
    client = TestClient(app)

    # Create client
    resp = client.post(
        "/api/clients",
        json={"name": "WeatherBot", "payload_types": ["weather.summary"]},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    client_id = resp.json()["id"]
    api_key = resp.json()["api_key"]

    # Create template
    resp = client.post(
        "/admin/templates",
        json={
            "name": "Weather",
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
        json={"name": "Main", "host": "127.0.0.1", "port": 8081},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    display_id = resp.json()["id"]

    # Create rule
    resp = client.post(
        "/admin/rules",
        json={
            "name": "Weather Main",
            "match": {"client_id": client_id, "payload_type": "weather.summary"},
            "priority": 10,
            "display_targets": [display_id],
            "transition": {"type": "instant"},
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

    # Find payload_received log
    logs = client.get("/admin/logs?level=info", headers=_auth_headers())
    assert logs.status_code == 200
    log_id = None
    for log in logs.json()["data"]:
        if log["message"] == "payload_received":
            log_id = log["id"]
            break
    assert log_id is not None

    # Replay dry run
    replay = client.post(f"/admin/logs/{log_id}/replay?dry_run=true", headers=_auth_headers())
    assert replay.status_code == 200
    data = replay.json()
    assert data["dry_run"] is True
    assert display_id in data["routed_displays"]
