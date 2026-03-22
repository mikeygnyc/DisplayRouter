from fastapi.testclient import TestClient

from router.main import app


def test_health_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["time"].endswith("Z") or payload["time"].endswith("+00:00")
