from datetime import datetime, timedelta, timezone
import asyncio
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
    PreviewAccepted,
    PreviewRequest,
    TemplateList,
    TemplateOut,
    Transition,
    ValidateRequest,
    ValidateResult,
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


async def _deferred_send(mgr, display_id: str, message: dict, delay: float) -> None:
    await asyncio.sleep(delay)
    await mgr.send(display_id, message)


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
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
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
    templates_by_id = {template.id: template for template in templates}
    selected_template = None
    if payload.template_id:
        selected_template = templates_by_id.get(payload.template_id)
    if not selected_template:
        for template in templates:
            if template.payload_type == payload.payload_type:
                selected_template = template
                break
    if not selected_template and templates:
        selected_template = templates[0]

    default_render = {
        "template": "{data}",
        "resolved": payload.data,
        "style": {},
    }
    if "commands" in payload.data or "pixels" in payload.data:
        if "commands" in payload.data:
            errors = validate_commands(payload.data["commands"])
            if errors:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))
        default_render = {
            "template": "{commands}",
            "resolved": payload.data,
            "style": payload.data.get("style", {}),
        }
        if "commands" in payload.data:
            default_render["commands"] = payload.data["commands"]
        if "pixels" in payload.data:
            default_render["pixels"] = payload.data["pixels"]
    elif selected_template:
        default_render = render_template(selected_template, payload.data)

    rules = session.exec(select(Rule)).all()
    matched_rules = select_rules(rules, stored_payload)

    now = datetime.now(timezone.utc)
    # Skip routing if validity window has already closed
    if stored_payload.valid_to and stored_payload.valid_to.replace(tzinfo=timezone.utc) <= now:
        return PayloadAccepted(payload_id=stored_payload.id, routed_displays=[], status="expired")

    routed_displays: List[str] = []
    for rule in matched_rules:
        render = default_render
        if rule.template_id:
            template = templates_by_id.get(rule.template_id)
            if template and template.payload_type == payload.payload_type:
                render = render_template(template, payload.data)
        for display_id in rule.display_targets:
            if display_id not in routed_displays:
                routed_displays.append(display_id)
            ws_message = {
                "type": "display_payload",
                "display_id": display_id,
                "payload_id": stored_payload.id,
                "payload_type": stored_payload.payload_type,
                "render": render,
                "transition": {
                    "type": rule.transition_type or "instant",
                    "delay_ms": rule.transition_delay_ms,
                    "duration_ms": rule.transition_duration_ms,
                    "direction": rule.transition_direction,
                    "fade_in_ms": rule.transition_fade_in_ms,
                    "fade_out_ms": rule.transition_fade_out_ms,
                    "barn_direction": rule.transition_barn_direction,
                },
                "valid_from": stored_payload.valid_from.isoformat() if stored_payload.valid_from else None,
                "valid_to": stored_payload.valid_to.isoformat() if stored_payload.valid_to else None,
                "expires_at": (stored_payload.received_at + timedelta(seconds=stored_payload.ttl_seconds)).isoformat() + "Z",
            }
            # Defer send if valid_from is in the future
            if stored_payload.valid_from and stored_payload.valid_from.replace(tzinfo=timezone.utc) > now:
                delay = (stored_payload.valid_from.replace(tzinfo=timezone.utc) - now).total_seconds()
                asyncio.create_task(_deferred_send(display_manager, display_id, ws_message, delay))
            else:
                await display_manager.send(display_id, ws_message)
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


@router.post("/api/preview", response_model=PreviewAccepted, dependencies=[Depends(require_admin)])
async def preview_payload(
    payload: PreviewRequest,
    session: Session = Depends(get_session),
) -> PreviewAccepted:
    templates = session.exec(select(Template)).all()
    selected_template = None
    if payload.template_id:
        selected_template = session.get(Template, payload.template_id)
    if not selected_template:
        for template in templates:
            if template.payload_type == payload.payload_type:
                selected_template = template
                break

    render = {"template": "{data}", "resolved": payload.data, "style": {}}
    if "commands" in payload.data or "pixels" in payload.data:
        render = {"template": "{commands}", "resolved": payload.data, "style": {}}
        if "commands" in payload.data:
            render["commands"] = payload.data["commands"]
        if "pixels" in payload.data:
            render["pixels"] = payload.data["pixels"]
    elif selected_template:
        render = render_template(selected_template, payload.data)

    if payload.all_displays:
        from router.domain.models import DisplayTarget
        displays = session.exec(select(DisplayTarget)).all()
        target_ids = [d.id for d in displays]
    else:
        target_ids = payload.display_ids or []

    preview_id = make_id("prev")
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
    sent: List[str] = []
    for display_id in target_ids:
        await display_manager.send(
            display_id,
            {
                "type": "display_payload",
                "display_id": display_id,
                "payload_id": preview_id,
                "render": render,
                "transition": {"type": "instant", "delay_ms": 0, "duration_ms": 0},
                "expires_at": expires_at,
            },
        )
        sent.append(display_id)

    return PreviewAccepted(preview_id=preview_id, routed_displays=sent, status="accepted")


@router.post("/api/validate", response_model=ValidateResult, dependencies=[Depends(require_admin)])
def validate_payload(payload: ValidateRequest) -> ValidateResult:
    from jinja2 import TemplateSyntaxError
    from jinja2 import Environment

    errors: List[str] = []
    warnings: List[str] = []

    if "commands" in payload.data:
        cmd_errors = validate_commands(payload.data["commands"])
        errors.extend(cmd_errors)

    if payload.template:
        try:
            env = Environment()
            env.parse(payload.template)
        except TemplateSyntaxError as e:
            errors.append(f"Template syntax error: {e}")

    if not payload.data:
        warnings.append("data is empty")

    return ValidateResult(valid=len(errors) == 0, errors=errors, warnings=warnings)
