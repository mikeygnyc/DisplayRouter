from __future__ import annotations

from typing import Optional

from . import core


class Color:
    def __init__(self, red: int = 0, green: int = 0, blue: int = 0):
        self._red = red
        self._green = green
        self._blue = blue

    @property
    def red(self):
        return self._red

    @red.setter
    def red(self, value):
        self._red = value

    @property
    def green(self):
        return self._green

    @green.setter
    def green(self, value):
        self._green = value

    @property
    def blue(self):
        return self._blue

    @blue.setter
    def blue(self, value):
        self._blue = value


class Font:
    def __init__(self):
        self._height = 0
        self._baseline = 0

    def CharacterWidth(self, char):
        return 6

    def LoadFont(self, file):
        try:
            with open(file, "rb"):
                pass
        except Exception:
            raise Exception("Couldn't load font " + file)
        return True

    def DrawGlyph(self, c: core.Canvas, x: int, y: int, color: Color, char):
        # No-op for emulator
        return 0

    @property
    def height(self):
        return self._height

    @property
    def baseline(self):
        return self._baseline


def DrawText(c: core.Canvas, f: Font, x: int, y: int, color: Color, text):
    if isinstance(c, core.FrameCanvas):
        c._last_text = text
    # Return length in pixels (approx)
    return len(text) * 6


def DrawCircle(c: core.Canvas, x: int, y: int, r: int, color: Color):
    # Simple midpoint circle approximation
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                c.SetPixel(x + dx, y + dy, color.red, color.green, color.blue)


def DrawLine(c: core.Canvas, x1: int, y1: int, x2: int, y2: int, color: Color):
    # Simple Bresenham line
    dx = abs(x2 - x1)
    dy = -abs(y2 - y1)
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx + dy
    while True:
        c.SetPixel(x1, y1, color.red, color.green, color.blue)
        if x1 == x2 and y1 == y2:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x1 += sx
        if e2 <= dx:
            err += dx
            y1 += sy
