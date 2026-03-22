from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable

from display.render import RenderFrame


@dataclass
class Transition:
    type: str
    duration_ms: int = 0


def apply_transition(frame: RenderFrame, transition: Transition, render_fn: Callable[[RenderFrame], None]) -> None:
    if transition.type == "delay":
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_fn(frame)
        return

    if transition.type == "fade":
        # Placeholder: simulate fade with a short pause
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_fn(frame)
        return

    if transition.type == "slide":
        # Placeholder: simulate slide with a short pause
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_fn(frame)
        return

    # instant/default
    render_fn(frame)
