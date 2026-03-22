from __future__ import annotations

import asyncio
import time
from typing import Optional

import websockets

from display.config import settings


def start_heartbeat_sender(websocket: websockets.WebSocketClientProtocol, display_id: str) -> asyncio.Task:
    async def _run() -> None:
        started = time.monotonic()
        while True:
            uptime = int(time.monotonic() - started)
            await websocket.send(
                f'{{"type":"heartbeat","display_id":"{display_id}","uptime_seconds":{uptime}}}'
            )
            await asyncio.sleep(max(settings.heartbeat_interval_seconds, 1))

    return asyncio.create_task(_run())
