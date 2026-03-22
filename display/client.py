from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

import websockets

from display.config import settings
from display.render import render_payload, render_to_console
from display.state import last_frame, last_payload
from display.transitions import Transition, apply_transition
from display.heartbeat import start_heartbeat_sender
from display.sim_renderer import render_frame as render_to_sim, render_pixels as render_pixels_to_sim
from display.command_executor import execute_commands, CommandError


async def handle_message(message: Dict[str, Any]) -> None:
    global last_payload
    global last_frame
    if message.get("type") == "display_payload":
        last_payload = message
        render_payload_data = message.get("render", {})
        if isinstance(render_payload_data, dict) and render_payload_data.get("commands"):
            try:
                execute_commands(render_payload_data.get("commands", []))
            except CommandError as exc:
                print(f"[display] command error: {exc}")
            return
        if isinstance(render_payload_data, dict) and render_payload_data.get("pixels"):
            from display import state
            state.last_pixels = render_payload_data.get("pixels")
            if settings.renderer == "sim":
                try:
                    render_pixels_to_sim(state.last_pixels)
                except Exception as exc:
                    print(f"[display] sim push failed: {exc}")
        frame = render_payload(message)
        last_frame = frame
        transition_data = message.get("transition", {}) if isinstance(message, dict) else {}
        transition = Transition(
            type=transition_data.get("type", "instant"),
            duration_ms=int(transition_data.get("duration_ms", 0) or 0),
        )
        render_fn = render_to_console
        if settings.renderer == "rgbmatrix":
            try:
                from display.rgbmatrix_renderer import render_frame as render_to_matrix
            except Exception as exc:
                print(f"[display] rgbmatrix unavailable: {exc}")
            else:
                def safe_render(frame_to_render):
                    try:
                        render_to_matrix(frame_to_render)
                    except Exception as exc:
                        print(f"[display] rgbmatrix render failed: {exc}")
                        render_to_console(frame_to_render)

                render_fn = safe_render
        elif settings.renderer == "sim":
            render_fn = render_to_sim
        apply_transition(frame, transition, render_fn)


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
