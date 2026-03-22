from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time
from typing import Iterable, List
from zoneinfo import ZoneInfo

from router.domain.models import Payload, Rule


def _parse_time(value: str | None) -> time | None:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) != 2:
        return None
    return time(hour=int(parts[0]), minute=int(parts[1]))


def _schedule_allows(rule: Rule, now: datetime) -> bool:
    if not rule.schedule_timezone:
        return True
    tz = ZoneInfo(rule.schedule_timezone)
    local_now = now.astimezone(tz)

    if rule.schedule_days:
        day = local_now.strftime("%a").lower()[:3]
        allowed_days = {d.lower()[:3] for d in rule.schedule_days}
        if day not in allowed_days:
            return False

    start = _parse_time(rule.schedule_start)
    end = _parse_time(rule.schedule_end)
    if not start or not end:
        return True

    current = local_now.time()
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


def _match(rule: Rule, payload: Payload) -> bool:
    if not rule.enabled:
        return False
    if rule.match_client_id and rule.match_client_id != payload.client_id:
        return False
    if rule.match_payload_type and rule.match_payload_type != payload.payload_type:
        return False
    if rule.match_tags:
        payload_tags = set(payload.tags or [])
        if not payload_tags.issuperset(set(rule.match_tags)):
            return False
    return _schedule_allows(rule, payload.received_at)


def select_rules(rules: Iterable[Rule], payload: Payload) -> List[Rule]:
    matched = [rule for rule in rules if _match(rule, payload)]
    return sorted(matched, key=lambda rule: rule.priority, reverse=True)
