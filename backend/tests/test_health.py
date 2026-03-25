"""Smoke tests for the API."""

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_root() -> None:
    r = client.get("/")
    assert r.status_code == 200
