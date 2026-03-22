from __future__ import annotations

from typing import Any, Dict, List

import rgbmatrix
from rgbmatrix import graphics

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None  # type: ignore


class CommandError(Exception):
    pass


def _resolve(value: Any, registry: Dict[str, Any]) -> Any:
    if isinstance(value, str) and value.startswith("@"):
        key = value[1:]
        if key not in registry:
            raise CommandError(f"Unknown reference '{value}'")
        return registry[key]
    if isinstance(value, list):
        return [_resolve(v, registry) for v in value]
    if isinstance(value, dict):
        return {k: _resolve(v, registry) for k, v in value.items()}
    return value


def _image_from_pixels(payload: dict):
    if Image is None:
        raise CommandError("PIL not available for SetImage")
    width = payload.get("width")
    height = payload.get("height")
    pixels = payload.get("pixels")
    if not width or not height or not pixels:
        raise CommandError("Invalid pixel payload for SetImage")
    image = Image.new("RGB", (width, height))
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[y][x]
            image.putpixel((x, y), (r, g, b))
    return image


def execute_commands(commands: List[dict]) -> Dict[str, Any]:
    registry: Dict[str, Any] = {}

    for cmd in commands:
        op = cmd.get("op")
        if not op:
            raise CommandError("Command missing op")

        target_ref = cmd.get("target")
        target = _resolve(target_ref, registry) if target_ref else None
        args = _resolve(cmd.get("args", []), registry)
        kwargs = _resolve(cmd.get("kwargs", {}), registry)
        ref = cmd.get("id")

        if op == "RGBMatrixOptions":
            obj = rgbmatrix.RGBMatrixOptions()
        elif op == "RGBMatrix":
            obj = rgbmatrix.RGBMatrix(*args, **kwargs)
        elif op == "FrameCanvas":
            obj = rgbmatrix.FrameCanvas(*args, **kwargs)
        elif op == "CreateFrameCanvas":
            obj = target.CreateFrameCanvas()
        elif op == "SwapOnVSync":
            obj = target.SwapOnVSync(*args, **kwargs)
        elif op in {"Fill", "Clear", "SetPixel", "SetImage", "SetPixelsPillow"}:
            if op == "SetImage" and args and isinstance(args[0], dict) and "pixels" in args[0]:
                args = [_image_from_pixels(args[0])] + args[1:]
            getattr(target, op)(*args, **kwargs)
            obj = target
        elif op == "setattr":
            setattr(target, cmd["attr"], _resolve(cmd["value"], registry))
            obj = target
        elif op == "Color":
            obj = graphics.Color(*args, **kwargs)
        elif op == "Font":
            obj = graphics.Font()
        elif op == "LoadFont":
            target.LoadFont(*args, **kwargs)
            obj = target
        elif op == "DrawText":
            obj = graphics.DrawText(*args, **kwargs)
        elif op == "DrawCircle":
            obj = graphics.DrawCircle(*args, **kwargs)
        elif op == "DrawLine":
            obj = graphics.DrawLine(*args, **kwargs)
        else:
            raise CommandError(f"Unsupported op '{op}'")

        if ref:
            registry[ref] = obj

    return registry
