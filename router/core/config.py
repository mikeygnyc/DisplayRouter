import os
from dataclasses import dataclass

from shared.utils.config import load_config_file


@dataclass(frozen=True)
class Settings:
    database_url: str
    admin_token: str
    api_key_salt: str
    display_secret: str
    log_retention_days: int | None


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
    if os.getenv("API_KEY_SALT"):
        merged["api_key_salt"] = os.getenv("API_KEY_SALT")
    if os.getenv("DISPLAY_SECRET"):
        merged["display_secret"] = os.getenv("DISPLAY_SECRET")
    if os.getenv("LOG_RETENTION_DAYS"):
        value = os.getenv("LOG_RETENTION_DAYS", "30")
        merged["log_retention_days"] = None if value.lower() == "none" else int(value)

    return Settings(
        database_url=merged["database_url"],
        admin_token=merged["admin_token"],
        api_key_salt=merged["api_key_salt"],
        display_secret=merged["display_secret"],
        log_retention_days=merged["log_retention_days"],
    )


settings = _build_settings()
