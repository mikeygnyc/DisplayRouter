import os
from dataclasses import dataclass


@dataclass(frozen=True)
class DisplaySettings:
    router_ws_url: str = os.getenv("ROUTER_WS_URL", "ws://localhost:8000/display/ws")
    display_id: str = os.getenv("DISPLAY_ID", "disp_main")
    display_secret: str = os.getenv("DISPLAY_SECRET", "dev-display-secret")
    heartbeat_interval_seconds: int = int(os.getenv("HEARTBEAT_INTERVAL_SECONDS", "10"))
    renderer: str = os.getenv("DISPLAY_RENDERER", "console")
    matrix_width: int = int(os.getenv("MATRIX_WIDTH", "64"))
    matrix_height: int = int(os.getenv("MATRIX_HEIGHT", "32"))
    matrix_chain: int = int(os.getenv("MATRIX_CHAIN", "1"))
    matrix_parallel: int = int(os.getenv("MATRIX_PARALLEL", "1"))
    matrix_brightness: int = int(os.getenv("MATRIX_BRIGHTNESS", "60"))
    matrix_gpio_slowdown: int = int(os.getenv("MATRIX_GPIO_SLOWDOWN", "2"))
    matrix_hardware_mapping: str = os.getenv("MATRIX_HARDWARE_MAPPING", "regular")
    matrix_font_path: str = os.getenv("MATRIX_FONT_PATH", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    matrix_font_size: int = int(os.getenv("MATRIX_FONT_SIZE", "10"))


settings = DisplaySettings()
