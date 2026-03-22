from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from sqlmodel import Session

from router.domain.models import LogEvent
from shared.utils.ids import make_id


def log_event(session: Session, level: str, message: str, context: Dict[str, Any] | None = None) -> LogEvent:
    event = LogEvent(
        id=make_id("log"),
        level=level,
        message=message,
        context=context or {},
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event
