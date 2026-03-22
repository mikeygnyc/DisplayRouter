import os
from dataclasses import dataclass

from shared.utils.config import load_config_file


@dataclass(frozen=True)
class DisplaySettings:
    router_ws_url: str
    display_id: str
    display_secret: str
    heartbeat_interval_seconds: int
    renderer: str
    matrix_width: int
    matrix_height: int
    matrix_chain: int
    matrix_parallel: int
    matrix_brightness: int
    matrix_gpio_slowdown: int
    matrix_hardware_mapping: str
    matrix_font_path: str
    matrix_font_size: int


def _build_settings() -> DisplaySettings:
    defaults = {
        "router_ws_url": "ws://localhost:8000/display/ws",
        "display_id": "disp_main",
        "display_secret": "dev-display-secret",
        "heartbeat_interval_seconds": 10,
        "renderer": "console",
        "matrix_width": 64,
        "matrix_height": 32,
        "matrix_chain": 1,
        "matrix_parallel": 1,
        "matrix_brightness": 60,
        "matrix_gpio_slowdown": 2,
        "matrix_hardware_mapping": "regular",
        "matrix_font_path": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "matrix_font_size": 10,
    }
    config_path = os.getenv("DISPLAY_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    file_cfg = load_config_file(config_path)
    merged = {**defaults, **file_cfg}

    # Env overrides
    numeric_fields = {
        "heartbeat_interval_seconds",
        "matrix_width",
        "matrix_height",
        "matrix_chain",
        "matrix_parallel",
        "matrix_brightness",
        "matrix_gpio_slowdown",
        "matrix_font_size",
    }
    for env_key, field in [
        ("ROUTER_WS_URL", "router_ws_url"),
        ("DISPLAY_ID", "display_id"),
        ("DISPLAY_SECRET", "display_secret"),
        ("HEARTBEAT_INTERVAL_SECONDS", "heartbeat_interval_seconds"),
        ("DISPLAY_RENDERER", "renderer"),
        ("MATRIX_WIDTH", "matrix_width"),
        ("MATRIX_HEIGHT", "matrix_height"),
        ("MATRIX_CHAIN", "matrix_chain"),
        ("MATRIX_PARALLEL", "matrix_parallel"),
        ("MATRIX_BRIGHTNESS", "matrix_brightness"),
        ("MATRIX_GPIO_SLOWDOWN", "matrix_gpio_slowdown"),
        ("MATRIX_HARDWARE_MAPPING", "matrix_hardware_mapping"),
        ("MATRIX_FONT_PATH", "matrix_font_path"),
        ("MATRIX_FONT_SIZE", "matrix_font_size"),
    ]:
        if os.getenv(env_key):
            value = os.getenv(env_key)
            if field in numeric_fields:
                value = int(value)
            merged[field] = value

    return DisplaySettings(**merged)


settings = _build_settings()
