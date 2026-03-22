from __future__ import annotations

from typing import Optional

from display.config import settings
from display.render import RenderFrame

try:
    from rgbmatrix import RGBMatrix, RGBMatrixOptions  # type: ignore
    from PIL import Image, ImageDraw, ImageFont  # type: ignore
    _RGBMATRIX_AVAILABLE = True
except Exception:  # pragma: no cover
    RGBMatrix = None  # type: ignore
    RGBMatrixOptions = None  # type: ignore
    Image = None  # type: ignore
    ImageDraw = None  # type: ignore
    ImageFont = None  # type: ignore
    _RGBMATRIX_AVAILABLE = False

_matrix: Optional["RGBMatrix"] = None


def _build_matrix() -> "RGBMatrix":
    if not _RGBMATRIX_AVAILABLE:
        raise RuntimeError("rgbmatrix or PIL not available")
    options = RGBMatrixOptions()
    options.rows = settings.matrix_height
    options.cols = settings.matrix_width
    options.chain_length = settings.matrix_chain
    options.parallel = settings.matrix_parallel
    options.brightness = settings.matrix_brightness
    options.gpio_slowdown = settings.matrix_gpio_slowdown
    options.hardware_mapping = settings.matrix_hardware_mapping
    return RGBMatrix(options=options)


def _get_matrix() -> "RGBMatrix":
    global _matrix
    if _matrix is None:
        _matrix = _build_matrix()
    return _matrix


def _parse_color(value: str) -> tuple[int, int, int]:
    if not value:
        return (255, 255, 255)
    if value.startswith("#") and len(value) == 7:
        return tuple(int(value[i : i + 2], 16) for i in (1, 3, 5))  # type: ignore
    return (255, 255, 255)


def render_frame(frame: RenderFrame) -> None:
    matrix = _get_matrix()
    color = _parse_color(frame.style.get("color", "#FFFFFF"))
    image = Image.new("RGB", (settings.matrix_width, settings.matrix_height))
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype(settings.matrix_font_path, settings.matrix_font_size)
    except Exception:
        font = ImageFont.load_default()
    draw.text((0, 0), frame.text, fill=color, font=font)
    matrix.SetImage(image)
