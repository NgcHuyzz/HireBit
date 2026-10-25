import inspect

from app.api.v1.health import live
from app.core.config import Settings
from app.main import app


def test_liveness() -> None:
    assert inspect.iscoroutinefunction(live)
    assert "/internal/v1/health/live" in app.openapi()["paths"]


def test_settings_reject_invalid_database_url() -> None:
    try:
        Settings(database_url="sqlite://local", redis_url="redis://localhost:6379/1")
    except ValueError:
        return
    raise AssertionError("Invalid database URL was accepted")
