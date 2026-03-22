from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

import websockets

from display.config import settings
from display.render import render_payload
from display.state import last_frame, last_payload
from display.transitions import Transition, apply_transition
from display.heartbeat import start_heartbeat_sender


async def handle_message(message: Dict[str, Any]) -> None:
    global last_payload
    global last_frame
    if message.get("type") == "display_payload":
        last_payload = message
        frame = render_payload(message)
        last_frame = frame
        transition_data = message.get("transition", {}) if isinstance(message, dict) else {}
        transition = Transition(
            type=transition_data.get("type", "instant"),
            duration_ms=int(transition_data.get("duration_ms", 0) or 0),
        )
        apply_transition(frame, transition)


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
