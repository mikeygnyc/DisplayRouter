from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from router.core.config import settings
from shared.schemas import DisplayHealth
from router.services.display_manager import manager as display_manager
from router.services.logging import log_event
from router.storage.db import get_session
from router.domain.models import DisplayTarget
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
    client_host = websocket.client.host if websocket.client else "unknown"

    for session in get_session():
        display = session.get(DisplayTarget, display_id)
        if display is None:
            display = DisplayTarget(
                id=display_id,
                name=display_id,
                host=client_host,
                port=0,
                capabilities={},
            )
            session.add(display)
            session.commit()
            session.refresh(display)
            log_event(session, "info", "display_registered", {"display_id": display_id, "host": client_host})
        else:
            updated = False
            if client_host and display.host != client_host:
                display.host = client_host
                updated = True
            if display.disabled:
                display.disabled = False
                updated = True
            if updated:
                session.add(display)
                session.commit()
                session.refresh(display)
        log_event(
            session,
            "info",
            "display_connected",
            {"display_id": display_id},
        )
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "heartbeat":
                capabilities = {}
                if isinstance(message.get("matrix"), dict):
                    capabilities["matrix"] = message.get("matrix")
                if "renderer" in message:
                    capabilities["renderer"] = message.get("renderer")
                if capabilities:
                    for session in get_session():
                        display = session.get(DisplayTarget, display_id)
                        if display is None:
                            display = DisplayTarget(
                                id=display_id,
                                name=display_id,
                                host=client_host,
                                port=0,
                                capabilities=capabilities,
                            )
                            session.add(display)
                            session.commit()
                            session.refresh(display)
                            log_event(
                                session,
                                "info",
                                "display_registered",
                                {"display_id": display_id, "host": client_host, "capabilities": capabilities},
                            )
                        else:
                            updated = False
                            current = display.capabilities or {}
                            for key, value in capabilities.items():
                                if current.get(key) != value:
                                    current[key] = value
                                    updated = True
                            if display.disabled:
                                display.disabled = False
                                updated = True
                            if updated:
                                display.capabilities = current
                                session.add(display)
                                session.commit()
                                session.refresh(display)
                continue
    except WebSocketDisconnect:
        await display_manager.disconnect(display_id)
        for session in get_session():
            log_event(
                session,
                "info",
                "display_disconnected",
                {"display_id": display_id},
            )
