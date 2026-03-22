from __future__ import annotations

from typing import Any, Dict

from jinja2 import Template as JinjaTemplate

from router.domain.models import Template


def render_template(template: Template, data: Dict[str, Any]) -> Dict[str, Any]:
    jinja = JinjaTemplate(template.template)
    resolved_text = jinja.render(**data)
    render = {
        "template": template.template,
        "resolved": {"text": resolved_text, **data},
        "style": template.default_style or {},
    }
    if "commands" in data:
        render["commands"] = data["commands"]
    if "pixels" in data:
        render["pixels"] = data["pixels"]
    return render
