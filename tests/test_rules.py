from datetime import datetime, timezone

from router.domain.models import Payload, Rule
from router.services.rules import select_rules


def _payload(**kwargs) -> Payload:
    defaults = dict(
        id="pld_1",
        client_id="cli_1",
        payload_type="weather.summary",
        template_id=None,
        format_hint=None,
        priority=0,
        ttl_seconds=60,
        data={},
        tags=["priority"],
        received_at=datetime(2026, 3, 22, 12, 0, tzinfo=timezone.utc),
    )
    defaults.update(kwargs)
    return Payload(**defaults)


def _rule(**kwargs) -> Rule:
    defaults = dict(
        id="rule_1",
        name="Rule 1",
        match_client_id=None,
        match_payload_type=None,
        match_tags=[],
        priority=0,
        display_targets=["disp_main"],
        transition_type="instant",
        cooldown_seconds=0,
        schedule_timezone=None,
        schedule_days=[],
        schedule_start=None,
        schedule_end=None,
        enabled=True,
    )
    defaults.update(kwargs)
    return Rule(**defaults)


def test_rules_priority_order():
    payload = _payload()
    low = _rule(id="r1", priority=1)
    high = _rule(id="r2", priority=10)
    result = select_rules([low, high], payload)
    assert [r.id for r in result] == ["r2", "r1"]


def test_rules_match_filters():
    payload = _payload(client_id="cli_1", payload_type="weather.summary", tags=["priority"])
    rule = _rule(match_client_id="cli_1", match_payload_type="weather.summary", match_tags=["priority"])
    result = select_rules([rule], payload)
    assert len(result) == 1


def test_rules_schedule_respected():
    # 04:30 UTC == 23:30 previous day in America/Chicago (outside 06:00-22:00 window)
    payload = _payload(received_at=datetime(2026, 3, 22, 4, 30, tzinfo=timezone.utc))
    rule = _rule(
        schedule_timezone="America/Chicago",
        schedule_days=["sat"],
        schedule_start="06:00",
        schedule_end="22:00",
    )
    result = select_rules([rule], payload)
    assert result == []
