from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Client(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    description: Optional[str] = None
    contact: Optional[str] = None
    api_key_hash: str
    payload_types: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)
    disabled: bool = False


class Template(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    description: Optional[str] = None
    payload_type: str
    template: str
    default_style: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)


class Rule(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    match_client_id: Optional[str] = None
    match_payload_type: Optional[str] = None
    match_tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    template_id: Optional[str] = None
    priority: int = 0
    display_targets: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    transition_type: str = "instant"
    transition_delay_ms: int = 0
    transition_duration_ms: int = 0
    transition_direction: Optional[str] = None
    transition_fade_in_ms: Optional[int] = None
    transition_fade_out_ms: Optional[int] = None
    transition_barn_direction: Optional[str] = None
    cooldown_seconds: int = 0
    schedule_timezone: Optional[str] = None
    schedule_days: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    schedule_start: Optional[str] = None
    schedule_end: Optional[str] = None
    enabled: bool = True


class DisplayTarget(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    host: str
    port: int
    capabilities: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)
    disabled: bool = False


class Payload(SQLModel, table=True):
    id: str = Field(primary_key=True)
    client_id: str
    payload_type: str
    template_id: Optional[str] = None
    format_hint: Optional[str] = None
    priority: int = 0
    ttl_seconds: int = 60
    data: dict = Field(default_factory=dict, sa_column=Column(JSON))
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    received_at: datetime = Field(default_factory=utcnow)


class LogEvent(SQLModel, table=True):
    id: str = Field(primary_key=True)
    level: str
    message: str
    context: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)


class DisplayPayload(SQLModel):
    display_id: str
    payload_id: str
    render_template: str
    render_resolved: dict
    render_style: dict
    transition_type: str
    transition_duration_ms: int
    expires_at: datetime
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None


class Carousel(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    windows: List[Any] = Field(default_factory=list, sa_column=Column(JSON))
    cadence_seconds: int = 10
    created_at: datetime = Field(default_factory=utcnow)
