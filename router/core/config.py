import os
import json
import secrets
from pathlib import Path
from dataclasses import dataclass

from shared.utils.config import load_config_file


@dataclass(frozen=True)
class Settings:
    database_url: str
    admin_token: str
    api_key_salt: str
    display_secret: str
    log_retention_days: int | None
    admin_token_generated: bool


def _should_auto_generate_token(config_path: str | None, token: str) -> bool:
    if os.getenv("AUTO_GENERATE_ADMIN_TOKEN", "").lower() not in {"1", "true", "yes"}:
        return False
    if not config_path or "local_config" not in config_path:
        return False
    if os.getenv("ADMIN_TOKEN"):
        return False
    return token.strip() in {"", "dev-admin-token"}


def _admin_token_path(config_path: str | None) -> Path | None:
    token_path = os.getenv("ADMIN_TOKEN_FILE")
    if token_path:
        return Path(token_path)
    if config_path:
        return Path(config_path).parent / "admin_token.txt"
    return None


def _read_admin_token_file(config_path: str | None) -> str | None:
    token_path = _admin_token_path(config_path)
    if token_path and token_path.exists():
        return token_path.read_text().strip()
    return None


def _write_admin_token(config_path: str | None, token: str) -> None:
    token_path = _admin_token_path(config_path)
    if not token_path:
        return
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(token + "\n")


def _build_settings() -> Settings:
    defaults = {
        "database_url": "sqlite:///./display_router.db",
        "admin_token": "dev-admin-token",
        "api_key_salt": "dev-salt",
        "display_secret": "dev-display-secret",
        "log_retention_days": 30,
    }
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    file_cfg = load_config_file(config_path)
    merged = {**defaults, **file_cfg}
    # Env overrides
    if os.getenv("DATABASE_URL"):
        merged["database_url"] = os.getenv("DATABASE_URL")
    if os.getenv("ADMIN_TOKEN"):
        merged["admin_token"] = os.getenv("ADMIN_TOKEN")
    else:
        token_file = _read_admin_token_file(config_path)
        if token_file:
            merged["admin_token"] = token_file
    if os.getenv("API_KEY_SALT"):
        merged["api_key_salt"] = os.getenv("API_KEY_SALT")
    if os.getenv("DISPLAY_SECRET"):
        merged["display_secret"] = os.getenv("DISPLAY_SECRET")
    if os.getenv("LOG_RETENTION_DAYS"):
        value = os.getenv("LOG_RETENTION_DAYS", "30")
        merged["log_retention_days"] = None if value.lower() == "none" else int(value)

    generated = False
    if _should_auto_generate_token(config_path, merged["admin_token"]):
        merged["admin_token"] = secrets.token_hex(32)
        _write_admin_token(config_path, merged["admin_token"])
        token_path = _admin_token_path(config_path)
        if token_path:
            print(f"[router] Generated admin token and saved to {token_path}: {merged['admin_token']}")
        generated = True

    return Settings(
        database_url=merged["database_url"],
        admin_token=merged["admin_token"],
        api_key_salt=merged["api_key_salt"],
        display_secret=merged["display_secret"],
        log_retention_days=merged["log_retention_days"],
        admin_token_generated=generated,
    )


settings = _build_settings()


def current_admin_token() -> str:
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    if os.getenv("ADMIN_TOKEN"):
        return os.getenv("ADMIN_TOKEN", "")
    token_file = _read_admin_token_file(config_path)
    if token_file:
        return token_file
    return settings.admin_token
