from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from router.storage.db import get_session
from router.domain.models import Client, DisplayTarget, Rule, Template
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
)
from shared.utils.ids import make_id
from shared.utils.pagination import paginate
from router.core.security import require_admin
from router.services.logs import list_logs
from router.services.logging import log_event

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
    return ClientList(data=[ClientOut(**client.model_dump()) for client in data], meta=meta)


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
    return ClientOut(**client.model_dump())


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
    return ClientOut(**client.model_dump())


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
        created_at=datetime.utcnow(),
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
    return TemplateOut(**template.model_dump())


@router.get("/admin/templates", response_model=TemplateList)
def list_templates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
) -> TemplateList:
    templates = session.exec(select(Template)).all()
    data, meta = paginate(templates, page, page_size)
    return TemplateList(data=[TemplateOut(**template.model_dump()) for template in data], meta=meta)


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
    return TemplateOut(**template.model_dump())


@router.delete("/admin/templates/{template_id}", response_model=TemplateOut)
def delete_template(
    template_id: str,
    session: Session = Depends(get_session),
) -> TemplateOut:
    template = _get_or_404(session, Template, template_id, "Template")
    session.delete(template)
    session.commit()
    log_event(session, "info", "template_deleted", {"template_id": template_id})
    return TemplateOut(**template.model_dump())


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
        created_at=datetime.utcnow(),
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
    return DisplayTargetOut(**display.model_dump())


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
    return DisplayTargetOut(**display.model_dump())


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
    return DisplayTargetOut(**display.model_dump())


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
