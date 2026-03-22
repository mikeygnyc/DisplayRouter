from __future__ import annotations

from typing import Any, Dict, List


ALLOWED_OPS = {
    "RGBMatrixOptions",
    "RGBMatrix",
    "FrameCanvas",
    "CreateFrameCanvas",
    "SwapOnVSync",
    "Fill",
    "Clear",
    "SetPixel",
    "SetImage",
    "SetPixelsPillow",
    "setattr",
    "Color",
    "Font",
    "LoadFont",
    "DrawText",
    "DrawCircle",
    "DrawLine",
}


def validate_commands(commands: List[Dict[str, Any]]) -> List[str]:
    errors: List[str] = []
    if not isinstance(commands, list):
        return ["commands must be a list"]
    for i, cmd in enumerate(commands):
        if not isinstance(cmd, dict):
            errors.append(f"commands[{i}] must be an object")
            continue
        op = cmd.get("op")
        if not op or not isinstance(op, str):
            errors.append(f"commands[{i}].op is required")
            continue
        if op not in ALLOWED_OPS:
            errors.append(f"commands[{i}].op '{op}' is not supported")
        if "target" in cmd and not isinstance(cmd["target"], str):
            errors.append(f"commands[{i}].target must be a string reference")
        if "id" in cmd and not isinstance(cmd["id"], str):
            errors.append(f"commands[{i}].id must be a string")
        if "args" in cmd and not isinstance(cmd["args"], list):
            errors.append(f"commands[{i}].args must be a list")
        if "kwargs" in cmd and not isinstance(cmd["kwargs"], dict):
            errors.append(f"commands[{i}].kwargs must be an object")
    return errors
