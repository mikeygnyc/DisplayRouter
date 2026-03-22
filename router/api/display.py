from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from router.core.config import settings
from shared.schemas import DisplayHealth
from router.services.display_manager import manager as display_manager
from router.core.security import require_display_secret

router = APIRouter()

start_time = datetime.now(timezone.utc)


@router.get("/display/health", response_model=DisplayHealth, dependencies=[Depends(require_display_secret)])

def display_health() -> DisplayHealth:
    uptime = int((datetime.now(timezone.utc) - start_time).total_seconds())
    return DisplayHealth(status="ok", uptime_seconds=uptime)


@router.websocket("/display/ws")
async def display_ws(
    websocket: WebSocket,
    display_id: str | None = Query(default=None),
    x_display_secret: str = Header(default="", alias="X-Display-Secret"),
) -> None:
    if x_display_secret != settings.display_secret:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    if not display_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await display_manager.connect(display_id, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "heartbeat":
                continue
    except WebSocketDisconnect:
        await display_manager.disconnect(display_id)
