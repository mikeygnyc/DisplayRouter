from types import SimpleNamespace

import display.rgbmatrix_renderer as renderer
from display.render import (
    RenderFrame,
    render_payload,
    _render_simple_text_scroll,
    _render_simple_text_page,
    _render_clock,
    _render_weather,
    _render_image,
    _render_animation,
    _render_template,
    _render_billboard,
    _render_clear,
)


def test_rgbmatrix_renderer_with_mocks(monkeypatch):
    calls = {}

    class FakeOptions:
        def __init__(self):
            self.rows = None
            self.cols = None
            self.chain_length = None
            self.parallel = None
            self.brightness = None
            self.gpio_slowdown = None
            self.hardware_mapping = None

    class FakeRGBMatrix:
        def __init__(self, options=None):
            calls['options'] = options
        def SetImage(self, image):
            calls['image'] = image

    class FakeImage:
        def __init__(self, mode, size):
            self.mode = mode
            self.size = size

    class FakeImageDraw:
        def __init__(self, image):
            self.image = image
        def text(self, pos, text, fill=None, font=None):
            calls['text'] = text

    class FakeImageFont:
        @staticmethod
        def truetype(path, size):
            return 'font'
        @staticmethod
        def load_default():
            return 'font'

    monkeypatch.setattr(renderer, '_RGBMATRIX_AVAILABLE', True)
    monkeypatch.setattr(renderer, 'RGBMatrixOptions', FakeOptions)
    monkeypatch.setattr(renderer, 'RGBMatrix', FakeRGBMatrix)
    monkeypatch.setattr(renderer, 'Image', SimpleNamespace(new=lambda mode, size: FakeImage(mode, size)))
    monkeypatch.setattr(renderer, 'ImageDraw', SimpleNamespace(Draw=lambda img: FakeImageDraw(img)))
    monkeypatch.setattr(renderer, 'ImageFont', FakeImageFont)

    frame = RenderFrame(text='HELLO', style={'color': '#ffcc00'})
    renderer._matrix = None
    renderer.render_frame(frame)

    assert 'options' in calls
    assert calls.get('text') == 'HELLO'
    assert 'image' in calls


# --- payload type renderer unit tests ---

def test_simple_text_scroll_lines():
    frame = _render_simple_text_scroll({"lines": ["Hello", "World"], "scroll_ms_per_px": 20}, {})
    assert frame.payload_type == "simple_text_scroll"
    assert "Hello" in frame.text
    assert "World" in frame.text
    assert frame.style.get("scroll_ms_per_px") == 20


def test_simple_text_scroll_fallback_text():
    frame = _render_simple_text_scroll({"text": "Hi"}, {})
    assert "Hi" in frame.text


def test_simple_text_page_pages():
    frame = _render_simple_text_page({"pages": [["Line1", "Line2"], ["Page2"]], "page_ms": 5000}, {})
    assert frame.payload_type == "simple_text_page"
    assert "Line1" in frame.text
    assert frame.style.get("page_ms") == 5000


def test_clock_renders_time():
    frame = _render_clock({"timezone": "UTC", "format": "%H:%M"}, {"color": "#fff"})
    assert frame.payload_type == "clock"
    assert ":" in frame.text


def test_weather_renders_location():
    frame = _render_weather({"location": "Chicago", "forecast": {"temp": 72, "condition": "Sunny"}}, {})
    assert frame.payload_type == "weather"
    assert "Chicago" in frame.text
    assert "72" in frame.text


def test_image_renders_url():
    frame = _render_image({"image_url": "http://example.com/img.png"}, {})
    assert frame.payload_type == "image"
    assert "image" in frame.text


def test_animation_renders_frame_count():
    frame = _render_animation({"frames": [{}, {}, {}], "fps": 30}, {})
    assert frame.payload_type == "animation"
    assert "3" in frame.text


def test_template_renders_text():
    frame = _render_template({"text": "rendered output"}, {})
    assert frame.payload_type == "template"
    assert "rendered output" in frame.text


def test_billboard_renders_text():
    frame = _render_billboard({"text": "Big message"}, {})
    assert frame.payload_type == "billboard"
    assert "Big message" in frame.text


def test_clear_renders_empty():
    frame = _render_clear({}, {})
    assert frame.payload_type == "clear"
    assert frame.text == ""


def test_render_payload_dispatch_simple_text_scroll():
    msg = {
        "payload_type": "simple_text_scroll",
        "render": {"resolved": {"lines": ["Hello"]}, "style": {}},
    }
    frame = render_payload(msg)
    assert frame.payload_type == "simple_text_scroll"
    assert "Hello" in frame.text


def test_render_payload_dispatch_clock():
    msg = {
        "payload_type": "clock",
        "render": {"resolved": {"timezone": "UTC", "format": "%H:%M"}, "style": {}},
    }
    frame = render_payload(msg)
    assert frame.payload_type == "clock"
    assert ":" in frame.text


def test_render_payload_infer_lines():
    msg = {
        "render": {"resolved": {"lines": ["A", "B"]}, "style": {}},
    }
    frame = render_payload(msg)
    assert frame.payload_type == "simple_text_scroll"


def test_render_payload_infer_pages():
    msg = {
        "render": {"resolved": {"pages": [["P1"]]}, "style": {}},
    }
    frame = render_payload(msg)
    assert frame.payload_type == "simple_text_page"


def test_render_payload_clear():
    msg = {
        "payload_type": "clear",
        "render": {"resolved": {}, "style": {}},
    }
    frame = render_payload(msg)
    assert frame.payload_type == "clear"
    assert frame.text == ""
