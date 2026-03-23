from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import WebSocket


@dataclass
class DisplayConnection:
    display_id: str
    websocket: WebSocket


class DisplayManager:
    def __init__(self) -> None:
        self._connections: Dict[str, DisplayConnection] = {}
        self._lock = asyncio.Lock()
        self._last_payload: Dict[str, dict] = {}
        self._last_payload_at: Dict[str, datetime] = {}
        self._expiry_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, display_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[display_id] = DisplayConnection(display_id=display_id, websocket=websocket)

    async def disconnect(self, display_id: str) -> None:
        async with self._lock:
            self._connections.pop(display_id, None)
        task = self._expiry_tasks.pop(display_id, None)
        if task:
            task.cancel()

    async def send(self, display_id: str, message: dict) -> bool:
        self._last_payload[display_id] = message
        self._last_payload_at[display_id] = datetime.now(timezone.utc)

        # Cancel any existing expiry task for this display
        old_task = self._expiry_tasks.pop(display_id, None)
        if old_task:
            old_task.cancel()

        # Schedule expiry clear if valid_to is present
        valid_to_str = message.get("valid_to")
        if valid_to_str:
            try:
                valid_to = datetime.fromisoformat(valid_to_str.rstrip("Z"))
                if valid_to.tzinfo is None:
                    valid_to = valid_to.replace(tzinfo=timezone.utc)
                delay = (valid_to - datetime.now(timezone.utc)).total_seconds()
                if delay > 0:
                    self._expiry_tasks[display_id] = asyncio.create_task(
                        self._expire_payload(display_id, delay)
                    )
            except Exception:
                pass

        connection = self._connections.get(display_id)
        if not connection:
            return False
        await connection.websocket.send_json(message)
        return True

    async def _expire_payload(self, display_id: str, delay: float) -> None:
        await asyncio.sleep(delay)
        clear_msg = {
            "type": "display_payload",
            "display_id": display_id,
            "payload_id": "clear",
            "payload_type": "clear",
            "render": {"resolved": {}, "style": {}},
            "transition": {"type": "instant", "delay_ms": 0, "duration_ms": 0},
        }
        connection = self._connections.get(display_id)
        if connection:
            try:
                await connection.websocket.send_json(clear_msg)
            except Exception:
                pass

    async def broadcast(self, message: dict) -> None:
        for connection in list(self._connections.values()):
            await connection.websocket.send_json(message)

    def is_connected(self, display_id: str) -> bool:
        return display_id in self._connections

    def last_payload(self, display_id: str) -> Optional[dict]:
        return self._last_payload.get(display_id)

    def last_payload_at(self, display_id: str) -> Optional[datetime]:
        return self._last_payload_at.get(display_id)


manager = DisplayManager()
