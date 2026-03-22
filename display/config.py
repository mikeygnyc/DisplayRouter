import os
from dataclasses import dataclass


@dataclass(frozen=True)
class DisplaySettings:
    router_ws_url: str = os.getenv("ROUTER_WS_URL", "ws://localhost:8000/display/ws")
    display_id: str = os.getenv("DISPLAY_ID", "disp_main")
    display_secret: str = os.getenv("DISPLAY_SECRET", "dev-display-secret")


settings = DisplaySettings()
