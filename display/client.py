from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import websockets

from display.config import settings
from display.render import render_payload, render_to_console
from display import state
from display.transitions import Transition, apply_transition
from display.heartbeat import start_heartbeat_sender
from display.sim_renderer import render_frame as render_to_sim, render_pixels as render_pixels_to_sim
from display.command_executor import execute_commands, CommandError


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.rstrip("Z"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _clear_display(render_fn) -> None:
    from display.render import RenderFrame
    render_fn(RenderFrame(text="", style={}, payload_type="clear"))


async def _schedule_expiry(delay_seconds: float, render_fn) -> None:
    await asyncio.sleep(delay_seconds)
    _clear_display(render_fn)


def _get_render_fn():
    if settings.renderer == "rgbmatrix":
        try:
            from display.rgbmatrix_renderer import render_frame as render_to_matrix
            def safe_render(frame):
                try:
                    render_to_matrix(frame)
                except Exception as exc:
                    print(f"[display] rgbmatrix render failed: {exc}")
                    render_to_console(frame)
            return safe_render
        except Exception as exc:
            print(f"[display] rgbmatrix unavailable: {exc}")
    elif settings.renderer == "sim":
        return render_to_sim
    return render_to_console


async def handle_message(message: Dict[str, Any]) -> None:
    if message.get("type") != "display_payload":
        return

    state.last_payload = message
    now = datetime.now(timezone.utc)

    valid_from = _parse_dt(message.get("valid_from"))
    valid_to = _parse_dt(message.get("valid_to"))

    # Already expired
    if valid_to and valid_to <= now:
        return

    # Not yet valid — defer
    if valid_from and valid_from > now:
        delay = (valid_from - now).total_seconds()
        asyncio.create_task(_deferred_handle(message, delay))
        return

    await _render_message(message, now, valid_to)


async def _deferred_handle(message: Dict[str, Any], delay: float) -> None:
    await asyncio.sleep(delay)
    now = datetime.now(timezone.utc)
    valid_to = _parse_dt(message.get("valid_to"))
    if valid_to and valid_to <= now:
        return
    await _render_message(message, now, valid_to)


async def _render_message(message: Dict[str, Any], now: datetime, valid_to: Optional[datetime]) -> None:
    render_payload_data = message.get("render", {})
    render_fn = _get_render_fn()

    # Command stream
    if isinstance(render_payload_data, dict) and render_payload_data.get("commands"):
        try:
            execute_commands(render_payload_data.get("commands", []))
        except CommandError as exc:
            print(f"[display] command error: {exc}")
        return

    # Pixel buffer
    if isinstance(render_payload_data, dict) and render_payload_data.get("pixels"):
        state.last_pixels = render_payload_data.get("pixels")
        if settings.renderer == "sim":
            try:
                render_pixels_to_sim(state.last_pixels)
            except Exception as exc:
                print(f"[display] sim push failed: {exc}")
        return

    # Clear type — blank the display immediately
    resolved = render_payload_data.get("resolved", {}) if isinstance(render_payload_data, dict) else {}
    payload_type = message.get("payload_type") or resolved.get("payload_type", "")
    if payload_type == "clear":
        _clear_display(render_fn)
        return

    frame = render_payload(message)
    state.last_frame = frame

    transition_data = message.get("transition", {}) if isinstance(message, dict) else {}
    transition = Transition.from_dict(transition_data if isinstance(transition_data, dict) else {})
    apply_transition(frame, transition, render_fn)

    # Schedule expiry clear
    if valid_to:
        remaining = (valid_to - now).total_seconds()
        if remaining > 0:
            asyncio.create_task(_schedule_expiry(remaining, render_fn))


async def connect_and_listen() -> None:
    url = f"{settings.router_ws_url}?display_id={settings.display_id}"
    headers = [("X-Display-Secret", settings.display_secret)]
    while True:
        try:
            async with websockets.connect(url, extra_headers=headers) as websocket:
                print("[display] connected to router")
                heartbeat_task = start_heartbeat_sender(websocket, settings.display_id)
                async for raw in websocket:
                    message = json.loads(raw)
                    await handle_message(message)
                heartbeat_task.cancel()
        except Exception as exc:
            print(f"[display] connection error: {exc}")
            await asyncio.sleep(2)


def run() -> None:
    asyncio.run(connect_and_listen())


if __name__ == "__main__":
    run()
