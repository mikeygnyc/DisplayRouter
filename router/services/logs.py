from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

from sqlmodel import Session, select

from router.core.config import settings
from router.domain.models import LogEvent


def apply_log_retention(session: Session) -> int:
    if settings.log_retention_days is None:
        return 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.log_retention_days)
    logs = session.exec(select(LogEvent).where(LogEvent.created_at < cutoff)).all()
    deleted = 0
    for log in logs:
        session.delete(log)
        deleted += 1
    if deleted:
        session.commit()
    return deleted


def _match_context(context: Dict[str, Any], key: str, value: str) -> bool:
    if not context:
        return False
    return str(context.get(key)) == value


def list_logs(
    session: Session,
    level: Optional[str] = None,
    client_id: Optional[str] = None,
    display_id: Optional[str] = None,
    limit: int = 100,
) -> List[LogEvent]:
    query = select(LogEvent).order_by(LogEvent.created_at.desc()).limit(limit * 3)
    logs = session.exec(query).all()
    filtered: List[LogEvent] = []
    for log in logs:
        if level and log.level != level:
            continue
        if client_id and not _match_context(log.context, "client_id", client_id):
            continue
        if display_id and not _match_context(log.context, "display_id", display_id):
            continue
        filtered.append(log)
        if len(filtered) >= limit:
            break
    return filtered


def get_log(session: Session, log_id: str) -> Optional[LogEvent]:
    return session.get(LogEvent, log_id)
