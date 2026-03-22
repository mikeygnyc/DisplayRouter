from __future__ import annotations

import os

import httpx

from display.render import RenderFrame

PUSH_URL = os.getenv("SIM_SERVER_PUSH_URL", "http://localhost:8082/push")


def _push(payload: dict) -> None:
    try:
        httpx.post(PUSH_URL, json=payload, timeout=1.0)
    except Exception as exc:
        print(f"[sim] push failed: {exc}")


def render_frame(frame: RenderFrame) -> None:
    _push({"text": frame.text, "style": frame.style})


def render_pixels(pixels: dict) -> None:
    _push({"pixels": pixels})
