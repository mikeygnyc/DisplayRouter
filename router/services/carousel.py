from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from sqlmodel import Session, select

from router.domain.models import Carousel, Payload, Rule, Template, DisplayTarget
from router.services.display_manager import manager as display_manager
from router.services.rules import select_rules
from router.services.templates import render_template


@dataclass
class _CarouselState:
    index: int = -1
    cycle: int = 0
    next_run_at: Optional[datetime] = None
    current_window_id: Optional[str] = None


class CarouselScheduler:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._state: Dict[str, _CarouselState] = {}

    def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._run())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def _run(self) -> None:
        while True:
            try:
                await self._tick()
            except Exception:
                pass
            await asyncio.sleep(1)

    async def _tick(self) -> None:
        now = datetime.now(timezone.utc)
        async with self._lock:
            with Session(self._engine()) as session:
                carousels = session.exec(select(Carousel)).all()
                active_ids = {c.id for c in carousels}
                for carousel_id in list(self._state.keys()):
                    if carousel_id not in active_ids:
                        self._state.pop(carousel_id, None)

                for carousel in carousels:
                    state = self._state.setdefault(carousel.id, _CarouselState())
                    if state.next_run_at and state.next_run_at > now:
                        continue
                    await self._advance_and_send(session, carousel, state)

    async def preview(
        self,
        session: Session,
        carousel_id: str,
        display_ids: Optional[List[str]] = None,
        all_displays: bool = False,
        window_id: Optional[str] = None,
        advance: bool = False,
    ) -> tuple[list[str], Optional[str]]:
        async with self._lock:
            carousel = session.get(Carousel, carousel_id)
            if not carousel:
                return [], None
            state = self._state.setdefault(carousel.id, _CarouselState())
            window = self._select_window(carousel, state, window_id=window_id, advance=advance)
            if not window:
                return [], None
            sent = await self._send_window(session, carousel, window, display_ids, all_displays)
            return sent, window.id

    def _engine(self):
        # Late import to avoid circulars during app startup
        from router.storage.db import engine
        return engine

    def _select_window(
        self,
        carousel: Carousel,
        state: _CarouselState,
        window_id: Optional[str] = None,
        advance: bool = False,
    ):
        from shared.schemas import CarouselWindow

        windows = [CarouselWindow(**w) for w in (carousel.windows or [])]
        if not windows:
            return None

        if window_id:
            for w in windows:
                if w.id == window_id:
                    state.current_window_id = w.id
                    return w
            return None

        if advance or state.index < 0:
            for _ in range(len(windows)):
                state.index = (state.index + 1) % len(windows)
                if state.index == 0:
                    state.cycle += 1
                candidate = windows[state.index]
                if not candidate.enabled:
                    continue
                every_n = max(candidate.every_n_cycles or 1, 1)
                if state.cycle % every_n != 0:
                    continue
                state.current_window_id = candidate.id
                return candidate
            return None

        current = windows[state.index]
        state.current_window_id = current.id
        return current

    async def _advance_and_send(self, session: Session, carousel: Carousel, state: _CarouselState) -> None:
        window = self._select_window(carousel, state, advance=True)
        state.next_run_at = datetime.now(timezone.utc) + timedelta(seconds=max(carousel.cadence_seconds or 1, 1))
        if not window:
            return
        state.current_window_id = window.id
        await self._send_window(session, carousel, window, None, False)

    async def _send_window(
        self,
        session: Session,
        carousel: Carousel,
        window,
        display_ids: Optional[List[str]],
        all_displays: bool,
    ) -> List[str]:
        payload = self._resolve_payload(session, window)
        if not payload:
            return []
        now = datetime.now(timezone.utc)
        if payload.valid_to and payload.valid_to.replace(tzinfo=timezone.utc) <= now:
            return []
        if payload.valid_from and payload.valid_from.replace(tzinfo=timezone.utc) > now:
            return []

        templates = session.exec(select(Template)).all()
        templates_by_id = {template.id: template for template in templates}
        render = self._build_render(payload, templates, templates_by_id)
        rules = session.exec(select(Rule)).all()
        matched_rules = select_rules(rules, payload)

        target_ids: List[str] = []
        if all_displays:
            displays = session.exec(select(DisplayTarget)).all()
            target_ids = [d.id for d in displays]
        elif display_ids:
            target_ids = display_ids
        else:
            for rule in matched_rules:
                for display_id in rule.display_targets:
                    if display_id not in target_ids:
                        target_ids.append(display_id)

        sent: List[str] = []
        for display_id in target_ids:
            transition = None
            for rule in matched_rules:
                if display_id in rule.display_targets:
                    transition = {
                        "type": rule.transition_type or "instant",
                        "delay_ms": rule.transition_delay_ms,
                        "duration_ms": rule.transition_duration_ms,
                        "direction": rule.transition_direction,
                        "fade_in_ms": rule.transition_fade_in_ms,
                        "fade_out_ms": rule.transition_fade_out_ms,
                        "barn_direction": rule.transition_barn_direction,
                    }
                    break
            if transition is None:
                transition = {"type": "instant", "delay_ms": 0, "duration_ms": 0}

            await display_manager.send(
                display_id,
                {
                    "type": "display_payload",
                    "display_id": display_id,
                    "payload_id": payload.id,
                    "payload_type": payload.payload_type,
                    "render": render,
                    "transition": transition,
                    "valid_from": payload.valid_from.isoformat() if payload.valid_from else None,
                    "valid_to": payload.valid_to.isoformat() if payload.valid_to else None,
                    "expires_at": (payload.received_at + timedelta(seconds=payload.ttl_seconds)).isoformat() + "Z",
                },
            )
            sent.append(display_id)
        return sent

    def _resolve_payload(self, session: Session, window):
        ref = window.payload_ref
        if ref.payload_id:
            return session.get(Payload, ref.payload_id)

        query = select(Payload)
        if ref.client_id:
            query = query.where(Payload.client_id == ref.client_id)
        if ref.payload_type:
            query = query.where(Payload.payload_type == ref.payload_type)
        if ref.tags:
            query = query.where(Payload.tags.contains(ref.tags))
        query = query.order_by(Payload.received_at.desc())
        return session.exec(query).first()

    def _build_render(self, payload: Payload, templates: List[Template], templates_by_id: Dict[str, Template]) -> dict:
        selected_template = None
        if payload.template_id:
            selected_template = templates_by_id.get(payload.template_id)
        if not selected_template:
            for template in templates:
                if template.payload_type == payload.payload_type:
                    selected_template = template
                    break

        render = {"template": "{data}", "resolved": payload.data, "style": {}}
        if "commands" in payload.data or "pixels" in payload.data:
            render = {"template": "{commands}", "resolved": payload.data, "style": payload.data.get("style", {})}
            if "commands" in payload.data:
                render["commands"] = payload.data["commands"]
            if "pixels" in payload.data:
                render["pixels"] = payload.data["pixels"]
        elif selected_template:
            render = render_template(selected_template, payload.data)
        return render

    def status(self) -> List[dict]:
        snapshots = []
        for carousel_id, state in self._state.items():
            snapshots.append(
                {
                    "carousel_id": carousel_id,
                    "current_window_id": state.current_window_id,
                    "cycle": state.cycle,
                    "index": state.index,
                    "next_run_at": state.next_run_at,
                }
            )
        return snapshots


scheduler = CarouselScheduler()
