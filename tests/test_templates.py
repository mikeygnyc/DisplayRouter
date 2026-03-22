from router.domain.models import Template
from router.services.templates import render_template


def test_template_rendering():
    template = Template(
        id="tpl_1",
        name="Weather",
        description=None,
        payload_type="weather.summary",
        template="{{temp_f}}F",
        default_style={"color": "#fff"},
    )
    result = render_template(template, {"temp_f": 72})
    assert result["resolved"]["text"] == "72F"
    assert result["style"]["color"] == "#fff"
