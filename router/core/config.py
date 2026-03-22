import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./display_router.db")
    admin_token: str = os.getenv("ADMIN_TOKEN", "dev-admin-token")
    api_key_salt: str = os.getenv("API_KEY_SALT", "dev-salt")
    display_secret: str = os.getenv("DISPLAY_SECRET", "dev-display-secret")


settings = Settings()
