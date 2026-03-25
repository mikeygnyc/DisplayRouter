from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class RenderFrame:
    text: str
    style: Dict[str, Any]
    payload_type: str = "simple_text_scroll"
    raw_data: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Per-type render helpers — each returns a RenderFrame from resolved data
# ---------------------------------------------------------------------------

def _render_simple_text_scroll(resolved: dict, style: dict) -> RenderFrame:
    lines = resolved.get("lines") or [resolved.get("text", "")]
    text = " | ".join(str(l) for l in lines if l)
    merged_style = {**style, "scroll": True}
    if "color" in resolved and resolved.get("color"):
        merged_style["color"] = resolved.get("color")
    colors = resolved.get("colors")
    if colors:
        merged_style["colors"] = colors
    if "scroll_ms_per_px" in resolved:
        merged_style["scroll_ms_per_px"] = resolved["scroll_ms_per_px"]
    return RenderFrame(text=text, style=merged_style, payload_type="simple_text_scroll", raw_data=resolved)


def _render_simple_text_page(resolved: dict, style: dict) -> RenderFrame:
    pages = resolved.get("pages") or [[resolved.get("text", "")]]
    # Flatten first page for console/sim display; full data in raw_data
    first_page = pages[0] if pages else [""]
    text = " / ".join(str(l) for l in first_page if l)
    merged_style = {**style, "page_ms": resolved.get("page_ms", 3000)}
    if "color" in resolved and resolved.get("color"):
        merged_style["color"] = resolved.get("color")
    colors = resolved.get("colors")
    if colors:
        merged_style["colors"] = colors
    return RenderFrame(text=text, style=merged_style, payload_type="simple_text_page", raw_data=resolved)


def _render_clock(resolved: dict, style: dict) -> RenderFrame:
    tz_name = resolved.get("timezone", "UTC")
    fmt = resolved.get("format", "%H:%M")
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc
    now = datetime.now(tz)
    text = now.strftime(fmt)
    return RenderFrame(text=text, style=style, payload_type="clock", raw_data=resolved)


def _render_weather(resolved: dict, style: dict) -> RenderFrame:
    # Stub: render whatever forecast data is present
    location = resolved.get("location", "")
    forecast = resolved.get("forecast") or {}
    temp = forecast.get("temp") or resolved.get("temp", "")
    condition = forecast.get("condition") or resolved.get("condition", "")
    parts = [p for p in [location, str(temp) if temp else "", condition] if p]
    text = " ".join(parts) or "weather"
    return RenderFrame(text=text, style=style, payload_type="weather", raw_data=resolved)


def _render_image(resolved: dict, style: dict) -> RenderFrame:
    url = resolved.get("image_url", "")
    text = f"[image:{url}]" if url else "[image]"
    return RenderFrame(text=text, style=style, payload_type="image", raw_data=resolved)


def _render_animation(resolved: dict, style: dict) -> RenderFrame:
    frames = resolved.get("frames") or []
    text = f"[animation:{len(frames)}frames]"
    return RenderFrame(text=text, style=style, payload_type="animation", raw_data=resolved)


def _render_template(resolved: dict, style: dict) -> RenderFrame:
    text = resolved.get("text") or resolved.get("rendered", "")
    if not text:
        text = " ".join(f"{k}={v}" for k, v in resolved.items() if k not in ("template", "data"))
    return RenderFrame(text=text, style=style, payload_type="template", raw_data=resolved)


def _render_billboard(resolved: dict, style: dict) -> RenderFrame:
    text = resolved.get("text", "")
    return RenderFrame(text=text, style=style, payload_type="billboard", raw_data=resolved)


def _render_rich_text(resolved: dict, style: dict, payload_type: str) -> RenderFrame:
    text = resolved.get("text", "")
    return RenderFrame(text=text, style=style, payload_type=payload_type, raw_data=resolved)


def _render_clear(resolved: dict, style: dict) -> RenderFrame:
    return RenderFrame(text="", style=style, payload_type="clear", raw_data={})


_TYPE_DISPATCH = {
    "simple_text_scroll": _render_simple_text_scroll,
    "simple_text_page": _render_simple_text_page,
    "clock": _render_clock,
    "weather": _render_weather,
    "image": _render_image,
    "animation": _render_animation,
    "template": _render_template,
    "billboard": _render_billboard,
    "rich_text_scroll": lambda r, s: _render_rich_text(r, s, "rich_text_scroll"),
    "rich_text_page": lambda r, s: _render_rich_text(r, s, "rich_text_page"),
    "clear": _render_clear,
}


def render_payload(message: Dict[str, Any]) -> RenderFrame:
    render = message.get("render", {})
    resolved = render.get("resolved", {})
    style = render.get("style", {})
    payload_type = message.get("payload_type") or resolved.get("payload_type", "")

    if payload_type.startswith("raw_"):
        text = resolved.get("text")
        if not text:
            text = f"[{payload_type}]"
        return RenderFrame(text=text, style=style, payload_type=payload_type, raw_data=resolved)

    # Commands/pixels are handled upstream in client.py before render_payload is called
    if not payload_type:
        # Infer from resolved keys
        if "lines" in resolved:
            payload_type = "simple_text_scroll"
        elif "pages" in resolved:
            payload_type = "simple_text_page"
        elif "clock_type" in resolved or "format" in resolved and "timezone" in resolved:
            payload_type = "clock"
        elif "forecast" in resolved or "location" in resolved:
            payload_type = "weather"
        elif "image_url" in resolved or "image_bytes" in resolved:
            payload_type = "image"
        elif "frames" in resolved:
            payload_type = "animation"

    dispatch = _TYPE_DISPATCH.get(payload_type)
    if dispatch:
        return dispatch(resolved, style)

    # Raw / unknown: stringify resolved
    text = resolved.get("text")
    if not text:
        text = " ".join(f"{k}={v}" for k, v in resolved.items())
    return RenderFrame(text=text or "", style=style, payload_type=payload_type or "raw", raw_data=resolved)


def render_to_console(frame: RenderFrame) -> None:
    style = frame.style or {}
    color = style.get("color", "default")
    print(f"[display] render type={frame.payload_type} text='{frame.text}' color={color}")
