import hashlib
from fastapi import Header, HTTPException, status

from router.core.config import settings


def hash_api_key(api_key: str) -> str:
    digest = hashlib.sha256()
    digest.update(f"{settings.api_key_salt}:{api_key}".encode("utf-8"))
    return digest.hexdigest()


def require_admin(authorization: str = Header(default="")) -> None:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if token != settings.admin_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid admin token")


def is_admin_token(authorization: str | None) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.split(" ", 1)[1].strip()
    return token == settings.admin_token


def require_display_secret(x_display_secret: str = Header(default="")) -> None:
    if x_display_secret != settings.display_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid display secret")


class ClientAuth:
    def __init__(self, api_key_header: str = Header(default="", alias="X-API-Key")):
        self.api_key_header = api_key_header

    def __call__(self) -> str:
        if not self.api_key_header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")
        return self.api_key_header
