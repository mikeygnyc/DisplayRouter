from __future__ import annotations

from display.render import RenderFrame


def render_frame(frame: RenderFrame) -> None:
    print("[sim] " + frame.text)
