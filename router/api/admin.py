from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from router.storage.db import get_session
from router.domain.models import Client, DisplayTarget, Payload, Rule, Template
from shared.schemas import (
    ClientList,
    ClientOut,
    ClientUpdate,
    DisplayTargetCreate,
    DisplayTargetList,
    DisplayTargetOut,
    DisplayTargetUpdate,
    LogEventList,
    LogEventOut,
    MonitoringSummary,
    ReplayResult,
    ResponseMeta,
    RuleCreate,
    RuleOut,
    RuleUpdate,
    RuleMatch,
    RuleSchedule,
    RuleList,
    TemplateCreate,
    TemplateOut,
    TemplateUpdate,
    TemplateList,
    DisplayMonitor,
)
from shared.utils.ids import make_id
from shared.utils.pagination import paginate
from router.core.security import require_admin
from router.services.logs import get_log, list_logs
from router.services.logging import log_event
from router.services.display_manager import manager as display_manager
from router.services.rules import select_rules
from router.services.templates import render_template
from router.core.metrics import metrics

router = APIRouter(dependencies=[Depends(require_admin)])


def _get_or_404(session: Session, model, obj_id: str, label: str):
    obj = session.get(model, obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    return obj


@router.get("/admin/clients", response_model=ClientList)

def list_clients(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
) -> ClientList:
    clients = session.exec(select(Client)).all()
    data, meta = paginate(clients, page, page_size)
    return ClientList(
        data=[ClientOut.model_validate(client, from_attributes=True) for client in data],
        meta=meta,
    )


@router.put("/admin/clients/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str,
    payload: ClientUpdate,
    session: Session = Depends(get_session),
) -> ClientOut:
    client = _get_or_404(session, Client, client_id, "Client")
    if payload.name is not None:
        client.name = payload.name
    if payload.description is not None:
        client.description = payload.description
    if payload.contact is not None:
        client.contact = payload.contact
    if payload.payload_types is not None:
        client.payload_types = payload.payload_types
    if payload.disabled is not None:
        client.disabled = payload.disabled
    session.add(client)
    session.commit()
    session.refresh(client)
    log_event(session, "info", "client_updated", {"client_id": client.id})
    return ClientOut.model_validate(client, from_attributes=True)


@router.delete("/admin/clients/{client_id}", response_model=ClientOut)
def disable_client(
    client_id: str,
    session: Session = Depends(get_session),
) -> ClientOut:
    client = _get_or_404(session, Client, client_id, "Client")
    client.disabled = True
    session.add(client)
    session.commit()
    session.refresh(client)
    log_event(session, "info", "client_disabled", {"client_id": client.id})
    return ClientOut.model_validate(client, from_attributes=True)


@router.post("/admin/templates", response_model=TemplateOut)

def create_template(
    payload: TemplateCreate,
    session: Session = Depends(get_session),
) -> TemplateOut:
    template = Template(
        id=make_id("tpl"),
        name=payload.name,
        description=payload.description,
        payload_type=payload.payload_type,
        template=payload.template,
        default_style=payload.default_style,
        created_at=datetime.now(timezone.utc),
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    log_event(
        session,
        "info",
        "template_created",
        {"template_id": template.id, "payload_type": template.payload_type},
    )
    return TemplateOut.model_validate(template, from_attributes=True)


@router.get("/admin/templates", response_model=TemplateList)
def list_templates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
) -> TemplateList:
    templates = session.exec(select(Template)).all()
    data, meta = paginate(templates, page, page_size)
    return TemplateList(
        data=[TemplateOut.model_validate(template, from_attributes=True) for template in data],
        meta=meta,
    )


@router.put("/admin/templates/{template_id}", response_model=TemplateOut)
def update_template(
    template_id: str,
    payload: TemplateUpdate,
    session: Session = Depends(get_session),
) -> TemplateOut:
    template = _get_or_404(session, Template, template_id, "Template")
    if payload.name is not None:
        template.name = payload.name
    if payload.description is not None:
        template.description = payload.description
    if payload.payload_type is not None:
        template.payload_type = payload.payload_type
    if payload.template is not None:
        template.template = payload.template
    if payload.default_style is not None:
        template.default_style = payload.default_style
    session.add(template)
    session.commit()
    session.refresh(template)
    log_event(session, "info", "template_updated", {"template_id": template.id})
    return TemplateOut.model_validate(template, from_attributes=True)


@router.delete("/admin/templates/{template_id}", response_model=TemplateOut)
def delete_template(
    template_id: str,
    session: Session = Depends(get_session),
) -> TemplateOut:
    template = _get_or_404(session, Template, template_id, "Template")
    session.delete(template)
    session.commit()
    log_event(session, "info", "template_deleted", {"template_id": template_id})
    return TemplateOut.model_validate(template, from_attributes=True)


@router.post("/admin/rules", response_model=RuleOut)

def create_rule(payload: RuleCreate, session: Session = Depends(get_session)) -> RuleOut:
    rule = Rule(
        id=make_id("rule"),
        name=payload.name,
        match_client_id=payload.match.client_id,
        match_payload_type=payload.match.payload_type,
        match_tags=payload.match.tags,
        priority=payload.priority,
        display_targets=payload.display_targets,
        transition_type=payload.transition or "instant",
        cooldown_seconds=payload.cooldown_seconds or 0,
        schedule_timezone=payload.schedule.timezone,
        schedule_days=payload.schedule.days,
        schedule_start=payload.schedule.start,
        schedule_end=payload.schedule.end,
        enabled=True,
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)
    log_event(
        session,
        "info",
        "rule_created",
        {"rule_id": rule.id, "priority": rule.priority},
    )
    return RuleOut(
        id=rule.id,
        name=rule.name,
        match=payload.match,
        priority=rule.priority,
        display_targets=rule.display_targets,
        transition=rule.transition_type,
        cooldown_seconds=rule.cooldown_seconds,
        schedule=payload.schedule,
        enabled=rule.enabled,
    )


@router.get("/admin/rules", response_model=RuleList)
def list_rules(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
) -> RuleList:
    rules = session.exec(select(Rule)).all()
    data, meta = paginate(rules, page, page_size)
    return RuleList(data=[RuleOut(
        id=rule.id,
        name=rule.name,
        match=RuleMatch(
            client_id=rule.match_client_id,
            payload_type=rule.match_payload_type,
            tags=rule.match_tags,
        ),
        priority=rule.priority,
        display_targets=rule.display_targets,
        transition=rule.transition_type,
        cooldown_seconds=rule.cooldown_seconds,
        schedule=RuleSchedule(
            timezone=rule.schedule_timezone,
            days=rule.schedule_days,
            start=rule.schedule_start,
            end=rule.schedule_end,
        ),
        enabled=rule.enabled,
    ) for rule in data], meta=meta)


@router.put("/admin/rules/{rule_id}", response_model=RuleOut)
def update_rule(
    rule_id: str,
    payload: RuleUpdate,
    session: Session = Depends(get_session),
) -> RuleOut:
    rule = _get_or_404(session, Rule, rule_id, "Rule")
    if payload.name is not None:
        rule.name = payload.name
    if payload.match is not None:
        rule.match_client_id = payload.match.client_id
        rule.match_payload_type = payload.match.payload_type
        rule.match_tags = payload.match.tags
    if payload.priority is not None:
        rule.priority = payload.priority
    if payload.display_targets is not None:
        rule.display_targets = payload.display_targets
    if payload.transition is not None:
        rule.transition_type = payload.transition
    if payload.cooldown_seconds is not None:
        rule.cooldown_seconds = payload.cooldown_seconds
    if payload.schedule is not None:
        rule.schedule_timezone = payload.schedule.timezone
        rule.schedule_days = payload.schedule.days
        rule.schedule_start = payload.schedule.start
        rule.schedule_end = payload.schedule.end
    if payload.enabled is not None:
        rule.enabled = payload.enabled
    session.add(rule)
    session.commit()
    session.refresh(rule)
    log_event(session, "info", "rule_updated", {"rule_id": rule.id})
    return RuleOut(
        id=rule.id,
        name=rule.name,
        match=RuleMatch(
            client_id=rule.match_client_id,
            payload_type=rule.match_payload_type,
            tags=rule.match_tags,
        ),
        priority=rule.priority,
        display_targets=rule.display_targets,
        transition=rule.transition_type,
        cooldown_seconds=rule.cooldown_seconds,
        schedule=RuleSchedule(
            timezone=rule.schedule_timezone,
            days=rule.schedule_days,
            start=rule.schedule_start,
            end=rule.schedule_end,
        ),
        enabled=rule.enabled,
    )


@router.delete("/admin/rules/{rule_id}", response_model=RuleOut)
def delete_rule(
    rule_id: str,
    session: Session = Depends(get_session),
) -> RuleOut:
    rule = _get_or_404(session, Rule, rule_id, "Rule")
    session.delete(rule)
    session.commit()
    log_event(session, "info", "rule_deleted", {"rule_id": rule_id})
    return RuleOut(
        id=rule.id,
        name=rule.name,
        match=RuleMatch(
            client_id=rule.match_client_id,
            payload_type=rule.match_payload_type,
            tags=rule.match_tags,
        ),
        priority=rule.priority,
        display_targets=rule.display_targets,
        transition=rule.transition_type,
        cooldown_seconds=rule.cooldown_seconds,
        schedule=RuleSchedule(
            timezone=rule.schedule_timezone,
            days=rule.schedule_days,
            start=rule.schedule_start,
            end=rule.schedule_end,
        ),
        enabled=rule.enabled,
    )


@router.get("/admin/displays", response_model=DisplayTargetList)

def list_displays(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
) -> DisplayTargetList:
    displays = session.exec(select(DisplayTarget)).all()
    data, meta = paginate(displays, page, page_size)
    return DisplayTargetList(
        data=[DisplayTargetOut(**display.model_dump()) for display in data],
        meta=meta,
    )


@router.post("/admin/displays", response_model=DisplayTargetOut)

def create_display(
    payload: DisplayTargetCreate,
    session: Session = Depends(get_session),
) -> DisplayTargetOut:
    display = DisplayTarget(
        id=make_id("disp"),
        name=payload.name,
        host=payload.host,
        port=payload.port,
        capabilities=payload.capabilities,
        created_at=datetime.now(timezone.utc),
        disabled=False,
    )
    session.add(display)
    session.commit()
    session.refresh(display)
    log_event(
        session,
        "info",
        "display_created",
        {"display_id": display.id, "name": display.name},
    )
    return DisplayTargetOut.model_validate(display, from_attributes=True)


@router.put("/admin/displays/{display_id}", response_model=DisplayTargetOut)
def update_display(
    display_id: str,
    payload: DisplayTargetUpdate,
    session: Session = Depends(get_session),
) -> DisplayTargetOut:
    display = _get_or_404(session, DisplayTarget, display_id, "Display")
    if payload.name is not None:
        display.name = payload.name
    if payload.host is not None:
        display.host = payload.host
    if payload.port is not None:
        display.port = payload.port
    if payload.capabilities is not None:
        display.capabilities = payload.capabilities
    if payload.disabled is not None:
        display.disabled = payload.disabled
    session.add(display)
    session.commit()
    session.refresh(display)
    log_event(session, "info", "display_updated", {"display_id": display.id})
    return DisplayTargetOut.model_validate(display, from_attributes=True)


@router.delete("/admin/displays/{display_id}", response_model=DisplayTargetOut)
def disable_display(
    display_id: str,
    session: Session = Depends(get_session),
) -> DisplayTargetOut:
    display = _get_or_404(session, DisplayTarget, display_id, "Display")
    display.disabled = True
    session.add(display)
    session.commit()
    session.refresh(display)
    log_event(session, "info", "display_disabled", {"display_id": display.id})
    return DisplayTargetOut.model_validate(display, from_attributes=True)


@router.get("/admin/logs", response_model=LogEventList)
def list_log_events(
    level: str | None = Query(default=None),
    client_id: str | None = Query(default=None),
    display_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    session: Session = Depends(get_session),
) -> LogEventList:
    logs = list_logs(session, level=level, client_id=client_id, display_id=display_id, limit=limit)
    data = [
        LogEventOut(
            id=log.id,
            level=log.level,
            message=log.message,
            context=log.context,
            created_at=log.created_at,
        )
        for log in logs
    ]
    meta = ResponseMeta(page=1, page_size=len(data), total=len(data))
    return LogEventList(data=data, meta=meta)


@router.get("/admin/logs/{log_id}", response_model=LogEventOut)
def get_log_event(log_id: str, session: Session = Depends(get_session)) -> LogEventOut:
    log = get_log(session, log_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return LogEventOut(
        id=log.id,
        level=log.level,
        message=log.message,
        context=log.context,
        created_at=log.created_at,
    )


@router.post("/admin/logs/{log_id}/replay", response_model=ReplayResult)
async def replay_log_event(
    log_id: str,
    dry_run: bool = Query(default=False),
    session: Session = Depends(get_session),
) -> ReplayResult:
    log = get_log(session, log_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    if log.message != "payload_received":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only payload_received logs can be replayed")

    payload_id = log.context.get("payload_id") if isinstance(log.context, dict) else None
    if not payload_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Log missing payload_id")

    payload = session.get(Payload, payload_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payload not found")

    templates = session.exec(select(Template)).all()
    selected_template = None
    if payload.template_id:
        selected_template = session.get(Template, payload.template_id)
    if not selected_template:
        for template in templates:
            if template.payload_type == payload.payload_type:
                selected_template = template
                break
    if not selected_template and templates:
        selected_template = templates[0]

    render = {
        "template": "{data}",
        "resolved": payload.data,
        "style": {},
    }
    if selected_template:
        render = render_template(selected_template, payload.data)

    rules = session.exec(select(Rule)).all()
    matched_rules = select_rules(rules, payload)

    routed_displays = []
    for rule in matched_rules:
        for display_id in rule.display_targets:
            if display_id not in routed_displays:
                routed_displays.append(display_id)
    matched_rule_ids = [rule.id for rule in matched_rules]

    if not dry_run:
        connected_displays = [d for d in routed_displays if display_manager.is_connected(d)]
        if not connected_displays:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No connected displays available for replay",
            )
        for rule in matched_rules:
            for display_id in rule.display_targets:
                await display_manager.send(
                    display_id,
                    {
                        "type": "display_payload",
                        "display_id": display_id,
                        "payload_id": payload.id,
                        "render": render,
                        "transition": {
                            "type": rule.transition_type or "instant",
                            "duration_ms": 0,
                        },
                        "expires_at": (payload.received_at + timedelta(seconds=payload.ttl_seconds)).isoformat(),
                    },
                )

        log_event(
            session,
            "info",
            "payload_replayed",
            {"payload_id": payload.id, "routed_displays": routed_displays},
        )
    else:
        log_event(
            session,
            "info",
            "payload_replay_dry_run",
            {"payload_id": payload.id, "routed_displays": routed_displays},
        )

    return ReplayResult(
        log=LogEventOut(
            id=log.id,
            level=log.level,
            message=log.message,
            context=log.context,
            created_at=log.created_at,
        ),
        routed_displays=routed_displays,
        matched_rule_ids=matched_rule_ids,
        dry_run=dry_run,
    )


@router.get("/admin/monitoring", response_model=MonitoringSummary)
def get_monitoring(session: Session = Depends(get_session)) -> MonitoringSummary:
    displays = session.exec(select(DisplayTarget)).all()
    display_status = []
    for display in displays:
        last_payload = display_manager.last_payload(display.id) or {}
        display_status.append(
            DisplayMonitor(
                display_id=display.id,
                connected=display_manager.is_connected(display.id),
                last_payload_id=last_payload.get("payload_id"),
                last_payload_at=display_manager.last_payload_at(display.id),
                queue_length=0,
            )
        )
    return MonitoringSummary(
        router_status="ok",
        router_time=datetime.now(timezone.utc),
        payloads_received=metrics.get("payloads_received", 0),
        displays=display_status,
    )
