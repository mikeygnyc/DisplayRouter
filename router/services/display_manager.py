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

    async def connect(self, display_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[display_id] = DisplayConnection(display_id=display_id, websocket=websocket)

    async def disconnect(self, display_id: str) -> None:
        async with self._lock:
            self._connections.pop(display_id, None)

    async def send(self, display_id: str, message: dict) -> bool:
        connection = self._connections.get(display_id)
        self._last_payload[display_id] = message
        self._last_payload_at[display_id] = datetime.now(timezone.utc)
        if not connection:
            return False
        await connection.websocket.send_json(message)
        return True

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
