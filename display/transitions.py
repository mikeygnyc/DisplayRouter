from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable

from display.render import RenderFrame, render_to_console


@dataclass
class Transition:
    type: str
    duration_ms: int = 0


def apply_transition(frame: RenderFrame, transition: Transition) -> None:
    if transition.type == "delay":
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_to_console(frame)
        return

    if transition.type == "fade":
        # Placeholder: simulate fade with a short pause
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_to_console(frame)
        return

    if transition.type == "slide":
        # Placeholder: simulate slide with a short pause
        time.sleep(max(transition.duration_ms, 0) / 1000.0)
        render_to_console(frame)
        return

    # instant/default
    render_to_console(frame)
