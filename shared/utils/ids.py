import secrets


def make_id(prefix: str) -> str:
    token = secrets.token_hex(6)
    return f"{prefix}_{token}"
