import uuid

from fastapi.testclient import TestClient

from router.main import app
from router.services.carousel import scheduler as carousel_scheduler
from router.storage.db import init_db


def _auth_headers() -> dict:
    return {"Authorization": "Bearer dev-admin-token"}


def _create_client_and_display(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    resp = client.post(
        "/api/clients",
        json={"name": f"CarouselClient-{suffix}", "payload_types": ["simple_text_scroll"]},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    client_id = resp.json()["id"]
    api_key = resp.json()["api_key"]

    resp = client.post(
        "/admin/displays",
        json={"name": f"CarouselDisplay-{suffix}", "host": "127.0.0.1", "port": 8081},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    display_id = resp.json()["id"]

    resp = client.post(
        "/admin/rules",
        json={
            "name": f"CarouselRule-{suffix}",
            "match": {"client_id": client_id, "payload_type": "simple_text_scroll"},
            "priority": 10,
            "display_targets": [display_id],
            "transition": {"type": "instant"},
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    return client_id, api_key, display_id


def _submit_payload(client: TestClient, client_id: str, api_key: str, text: str) -> str:
    resp = client.post(
        "/api/payloads",
        json={
            "client_id": client_id,
            "payload_type": "simple_text_scroll",
            "data": {"text": text, "color": "#ffffff", "scroll_ms_per_px": 15},
        },
        headers={"X-API-Key": api_key},
    )
    assert resp.status_code == 200
    return resp.json()["payload_id"]


def test_carousel_preview_sequence():
    init_db()
    carousel_scheduler._state.clear()
    client = TestClient(app)

    client_id, api_key, _ = _create_client_and_display(client)
    payload_a = _submit_payload(client, client_id, api_key, "A")
    payload_b = _submit_payload(client, client_id, api_key, "B")

    resp = client.post(
        "/admin/carousels",
        json={
            "name": "Test Carousel",
            "cadence_seconds": 10,
            "windows": [
                {
                    "id": "win-a",
                    "payload_ref": {"payload_id": payload_a},
                    "every_n_cycles": 1,
                    "enabled": True,
                },
                {
                    "id": "win-b",
                    "payload_ref": {"payload_id": payload_b},
                    "every_n_cycles": 2,
                    "enabled": True,
                },
            ],
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    carousel_id = resp.json()["id"]

    def advance():
        res = client.post(
            f"/admin/carousels/{carousel_id}/preview",
            json={"advance": True, "all_displays": True},
            headers=_auth_headers(),
        )
        assert res.status_code == 200
        return res.json()["window_id"]

    assert advance() == "win-a"
    assert advance() == "win-a"
    assert advance() == "win-b"


def test_monitoring_includes_carousel_state():
    init_db()
    carousel_scheduler._state.clear()
    client = TestClient(app)

    client_id, api_key, _ = _create_client_and_display(client)
    payload_a = _submit_payload(client, client_id, api_key, "A")

    resp = client.post(
        "/admin/carousels",
        json={
            "name": "Monitor Carousel",
            "cadence_seconds": 10,
            "windows": [
                {
                    "id": "win-a",
                    "payload_ref": {"payload_id": payload_a},
                    "every_n_cycles": 1,
                    "enabled": True,
                }
            ],
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    carousel_id = resp.json()["id"]

    res = client.post(
        f"/admin/carousels/{carousel_id}/preview",
        json={"advance": True, "all_displays": True},
        headers=_auth_headers(),
    )
    assert res.status_code == 200

    monitor = client.get("/admin/monitoring", headers=_auth_headers())
    assert monitor.status_code == 200
    data = monitor.json()
    assert "carousels" in data
    assert any(c["carousel_id"] == carousel_id for c in data["carousels"])
