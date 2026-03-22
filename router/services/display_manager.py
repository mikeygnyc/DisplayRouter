from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
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

    async def connect(self, display_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[display_id] = DisplayConnection(display_id=display_id, websocket=websocket)

    async def disconnect(self, display_id: str) -> None:
        async with self._lock:
            self._connections.pop(display_id, None)

    async def send(self, display_id: str, message: dict) -> bool:
        connection = self._connections.get(display_id)
        if not connection:
            return False
        await connection.websocket.send_json(message)
        return True

    async def broadcast(self, message: dict) -> None:
        for connection in list(self._connections.values()):
            await connection.websocket.send_json(message)

    def is_connected(self, display_id: str) -> bool:
        return display_id in self._connections


manager = DisplayManager()
