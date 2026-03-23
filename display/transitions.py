from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Optional

from display.render import RenderFrame


@dataclass
class Transition:
    type: str = "instant"
    delay_ms: int = 0
    duration_ms: int = 0
    direction: Optional[str] = None
    fade_in_ms: Optional[int] = None
    fade_out_ms: Optional[int] = None
    barn_direction: Optional[str] = None

    @classmethod
    def from_dict(cls, d: dict) -> "Transition":
        return cls(
            type=d.get("type", "instant"),
            delay_ms=d.get("delay_ms", 0),
            duration_ms=d.get("duration_ms", 0),
            direction=d.get("direction"),
            fade_in_ms=d.get("fade_in_ms"),
            fade_out_ms=d.get("fade_out_ms"),
            barn_direction=d.get("barn_direction"),
        )


def apply_transition(frame: RenderFrame, transition: Transition, render_fn: Callable[[RenderFrame], None]) -> None:
    if transition.delay_ms > 0:
        time.sleep(transition.delay_ms / 1000.0)

    if transition.type in ("cut", "instant"):
        render_fn(frame)
        return

    if transition.type == "fade":
        fade_ms = (transition.fade_in_ms or transition.duration_ms)
        time.sleep(max(fade_ms, 0) / 1000.0)
        render_fn(frame)
        return

    if transition.type in ("slide", "barn_door", "wipe"):
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_fn(frame)
        return

    # default
    render_fn(frame)
