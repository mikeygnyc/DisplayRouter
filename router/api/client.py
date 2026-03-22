from datetime import datetime, timedelta, timezone
import secrets
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlmodel import Session, select

from router.storage.db import get_session
from router.core.metrics import metrics
from router.domain.models import Client, Payload, Rule, Template
from shared.schemas import (
    ClientCreate,
    ClientCreated,
    ClientOut,
    PayloadAccepted,
    PayloadSubmit,
    PayloadTypeList,
    TemplateList,
    TemplateOut,
)
from router.services.display_manager import manager as display_manager
from router.services.logging import log_event
from router.services.rules import select_rules
from router.services.templates import render_template
from router.services.commands import validate_commands
from shared.utils.ids import make_id
from shared.utils.pagination import paginate
from router.core.security import hash_api_key, is_admin_token, require_admin, require_client_api_key

router = APIRouter()


def _get_client(session: Session, client_id: str) -> Client:
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.post("/api/clients", response_model=ClientCreated, dependencies=[Depends(require_admin)])
def create_client(payload: ClientCreate, session: Session = Depends(get_session)) -> ClientCreated:
    api_key = secrets.token_urlsafe(24)
    client = Client(
        id=make_id("cli"),
        name=payload.name,
        description=payload.description,
        contact=payload.contact,
        payload_types=payload.payload_types,
        api_key_hash=hash_api_key(api_key),
        created_at=datetime.now(timezone.utc),
    )
    session.add(client)
    session.commit()
    session.refresh(client)
    log_event(
        session,
        "info",
        "client_created",
        {"client_id": client.id, "name": client.name},
    )
    return ClientCreated(id=client.id, api_key=api_key, created_at=client.created_at)


@router.get("/api/clients/{client_id}", response_model=ClientOut, dependencies=[Depends(require_admin)])
def get_client(client_id: str, session: Session = Depends(get_session)) -> ClientOut:
    client = _get_client(session, client_id)
    return ClientOut.model_validate(client, from_attributes=True)


@router.get("/api/clients/{client_id}/payload-types", response_model=PayloadTypeList)
def list_payload_types(
    client_id: str,
    session: Session = Depends(get_session),
    x_api_key: str = Header(default="", alias="X-API-Key"),
    authorization: str | None = Header(default=None),
) -> PayloadTypeList:
    client = _get_client(session, client_id)
    if not is_admin_token(authorization):
        if not x_api_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")
        if hash_api_key(x_api_key) != client.api_key_hash:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key for client")
    data, meta = paginate(client.payload_types, 1, len(client.payload_types) or 1)
    return PayloadTypeList(data=data, meta=meta)


@router.post("/api/payloads", response_model=PayloadAccepted)
async def submit_payload(
    payload: PayloadSubmit,
    session: Session = Depends(get_session),
    api_key: str = Depends(require_client_api_key),
) -> PayloadAccepted:
    client = _get_client(session, payload.client_id)
    if hash_api_key(api_key) != client.api_key_hash:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key for client")

    stored_payload = Payload(
        id=make_id("pld"),
        client_id=payload.client_id,
        payload_type=payload.payload_type,
        template_id=payload.template_id,
        format_hint=payload.format_hint,
        priority=payload.priority or 0,
        ttl_seconds=payload.ttl_seconds or 60,
        data=payload.data,
        tags=payload.tags,
        received_at=datetime.now(timezone.utc),
    )
    session.add(stored_payload)
    session.commit()
    metrics["payloads_received"] += 1
    log_event(
        session,
        "info",
        "payload_received",
        {
            "payload_id": stored_payload.id,
            "client_id": stored_payload.client_id,
            "payload_type": stored_payload.payload_type,
        },
    )

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
    if "commands" in payload.data or "pixels" in payload.data:
        if "commands" in payload.data:
            errors = validate_commands(payload.data["commands"])
            if errors:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))
        render = {
            "template": "{commands}",
            "resolved": payload.data,
            "style": payload.data.get("style", {}),
        }
        if "commands" in payload.data:
            render["commands"] = payload.data["commands"]
        if "pixels" in payload.data:
            render["pixels"] = payload.data["pixels"]
    elif selected_template:
        render = render_template(selected_template, payload.data)

    rules = session.exec(select(Rule)).all()
    matched_rules = select_rules(rules, stored_payload)

    routed_displays: List[str] = []
    for rule in matched_rules:
        for display_id in rule.display_targets:
            if display_id not in routed_displays:
                routed_displays.append(display_id)
            await display_manager.send(
                display_id,
                {
                    "type": "display_payload",
                    "display_id": display_id,
                    "payload_id": stored_payload.id,
                    "render": render,
                    "transition": {
                        "type": rule.transition_type or "instant",
                        "duration_ms": 0,
                    },
                    "expires_at": (stored_payload.received_at + timedelta(seconds=stored_payload.ttl_seconds)).isoformat() + "Z",
                },
            )
    if routed_displays:
        log_event(
            session,
            "info",
            "payload_routed",
            {
                "payload_id": stored_payload.id,
                "routed_displays": routed_displays,
                "rule_count": len(matched_rules),
            },
        )

    return PayloadAccepted(payload_id=stored_payload.id, routed_displays=routed_displays, status="accepted")


@router.get("/api/templates", response_model=TemplateList)
def list_templates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: Session = Depends(get_session),
    x_api_key: str = Header(default="", alias="X-API-Key"),
    authorization: str | None = Header(default=None),
) -> TemplateList:
    if not (x_api_key or is_admin_token(authorization)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")
    templates = session.exec(select(Template)).all()
    data, meta = paginate(templates, page, page_size)
    return TemplateList(
        data=[TemplateOut.model_validate(template, from_attributes=True) for template in data],
        meta=meta,
    )
