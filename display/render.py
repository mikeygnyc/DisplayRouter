from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class RenderFrame:
    text: str
    style: Dict[str, Any]


def render_payload(message: Dict[str, Any]) -> RenderFrame:
    render = message.get("render", {})
    resolved = render.get("resolved", {})
    text = resolved.get("text")
    if not text:
        # Fallback: stringify resolved payload
        text = " ".join(f"{key}={value}" for key, value in resolved.items())
    style = render.get("style", {})
    return RenderFrame(text=text, style=style)


def render_to_console(frame: RenderFrame) -> None:
    style = frame.style or {}
    color = style.get("color", "default")
    print(f"[display] render text='{frame.text}' color={color}")
