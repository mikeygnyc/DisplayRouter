from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from router.storage.db import get_session
from router.domain.models import Client, DisplayTarget, Rule, Template
from shared.schemas import (
    ClientList,
    ClientOut,
    DisplayTargetCreate,
    DisplayTargetList,
    DisplayTargetOut,
    RuleCreate,
    RuleOut,
    TemplateCreate,
    TemplateOut,
)
from shared.utils.ids import make_id
from shared.utils.pagination import paginate
from router.core.security import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/admin/clients", response_model=ClientList)

def list_clients(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
) -> ClientList:
    clients = session.exec(select(Client)).all()
    data, meta = paginate(clients, page, page_size)
    return ClientList(data=[ClientOut(**client.model_dump()) for client in data], meta=meta)


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
    return DisplayTargetOut(**display.model_dump())
