from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ResponseMeta(BaseModel):
    request_id: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = None
    total: Optional[int] = None
    next_page: Optional[int] = None
    prev_page: Optional[int] = None


class Error(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationError(Error):
    details: Optional[Dict[str, Any]] = None


class Envelope(BaseModel):
    data: Any
    meta: Optional[ResponseMeta] = None


class ClientCreate(BaseModel):
    name: str
    description: Optional[str] = None
    contact: Optional[str] = None
    payload_types: List[str] = Field(default_factory=list)


class ClientCreated(BaseModel):
    id: str
    api_key: str
    created_at: datetime


class ClientOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    contact: Optional[str] = None
    payload_types: List[str]
    created_at: datetime
    disabled: bool


class ClientList(Envelope):
    data: List[ClientOut]
    meta: ResponseMeta


class PayloadSubmit(BaseModel):
    client_id: str
    payload_type: str
    template_id: Optional[str] = None
    format_hint: Optional[str] = None
    priority: Optional[int] = 0
    ttl_seconds: Optional[int] = 60
    data: Dict[str, Any]
    tags: List[str] = Field(default_factory=list)


class PayloadAccepted(BaseModel):
    payload_id: str
    routed_displays: List[str]
    status: str


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    payload_type: str
    template: str
    default_style: Dict[str, Any] = Field(default_factory=dict)


class TemplateOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    payload_type: str
    template: str
    default_style: Dict[str, Any]
    created_at: datetime


class TemplateList(Envelope):
    data: List[TemplateOut]
    meta: ResponseMeta


class RuleMatch(BaseModel):
    client_id: Optional[str] = None
    payload_type: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class RuleSchedule(BaseModel):
    timezone: Optional[str] = None
    days: List[str] = Field(default_factory=list)
    start: Optional[str] = None
    end: Optional[str] = None


class RuleCreate(BaseModel):
    name: str
    match: RuleMatch = Field(default_factory=RuleMatch)
    priority: int
    display_targets: List[str]
    transition: Optional[str] = "instant"
    cooldown_seconds: Optional[int] = 0
    schedule: RuleSchedule = Field(default_factory=RuleSchedule)


class RuleOut(RuleCreate):
    id: str
    enabled: bool


class DisplayTargetCreate(BaseModel):
    name: str
    host: str
    port: int
    capabilities: Dict[str, Any] = Field(default_factory=dict)


class DisplayTargetOut(DisplayTargetCreate):
    id: str
    created_at: datetime
    disabled: bool


class DisplayTargetList(Envelope):
    data: List[DisplayTargetOut]
    meta: ResponseMeta


class PayloadTypeList(Envelope):
    data: List[str]
    meta: ResponseMeta


class DisplayHealth(BaseModel):
    status: str
    uptime_seconds: int
