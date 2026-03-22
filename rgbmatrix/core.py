from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass
from typing import Optional


class Canvas:
    def _getCanvas(self):
        raise Exception("Not implemented")

    def SetImage(self, image, offset_x: int = 0, offset_y: int = 0, unsafe: bool = True):
        if image.mode != "RGB":
            raise Exception(
                "Currently, only RGB mode is supported for SetImage(). Please create images with mode 'RGB' or convert first with image = image.convert('RGB'). Pull requests to support more modes natively are also welcome :)"
            )
        img_width, img_height = image.size
        pixels = image.load()
        for x in range(max(0, -offset_x), min(img_width, self.width - offset_x)):
            for y in range(max(0, -offset_y), min(img_height, self.height - offset_y)):
                r, g, b = pixels[x, y]
                self.SetPixel(x + offset_x, y + offset_y, r, g, b)

    def SetPixelsPillow(self, xstart, ystart, width, height, image_capsule):
        # Best-effort emulator: accept a PIL image-like object
        if hasattr(image_capsule, "size") and hasattr(image_capsule, "load"):
            img_width, img_height = image_capsule.size
            pixels = image_capsule.load()
            for x in range(max(0, -xstart), min(img_width, self.width - xstart)):
                for y in range(max(0, -ystart), min(img_height, self.height - ystart)):
                    r, g, b = pixels[x, y]
                    self.SetPixel(x + xstart, y + ystart, r, g, b)
            return
        raise Exception("SetPixelsPillow not supported in emulator")


class FrameCanvas(Canvas):
    def __init__(self, width: int, height: int):
        self._width = width
        self._height = height
        self._pwm_bits = 0
        self._brightness = 0
        self._pixels = [[(0, 0, 0) for _ in range(width)] for _ in range(height)]
        self._last_text: Optional[str] = None

    def _getCanvas(self):
        return self

    def Fill(self, red: int, green: int, blue: int):
        for y in range(self._height):
            for x in range(self._width):
                self._pixels[y][x] = (red, green, blue)

    def Clear(self):
        self.Fill(0, 0, 0)

    def SetPixel(self, x: int, y: int, red: int, green: int, blue: int):
        if 0 <= x < self._width and 0 <= y < self._height:
            self._pixels[y][x] = (red, green, blue)

    @property
    def width(self):
        return self._width

    @property
    def height(self):
        return self._height

    @property
    def pwmBits(self):
        return self._pwm_bits

    @pwmBits.setter
    def pwmBits(self, value):
        self._pwm_bits = value

    @property
    def brightness(self):
        return self._brightness

    @brightness.setter
    def brightness(self, val):
        self._brightness = val


class RGBMatrixOptions:
    def __init__(self):
        self.hardware_mapping = "regular"
        self.rows = 32
        self.cols = 64
        self.chain_length = 1
        self.parallel = 1
        self.pwm_bits = 11
        self.pwm_lsb_nanoseconds = 130
        self.brightness = 100
        self.scan_mode = 0
        self.multiplexing = 0
        self.row_address_type = 0
        self.disable_hardware_pulsing = False
        self.show_refresh_rate = False
        self.inverse_colors = False
        self.led_rgb_sequence = "RGB"
        self.pixel_mapper_config = ""
        self.panel_type = ""
        self.pwm_dither_bits = 0
        self.limit_refresh_rate_hz = 0
        self.gpio_slowdown = 1
        self.daemon = False
        self.drop_privileges = True
        self.drop_priv_user = ""
        self.drop_priv_group = ""

    # Expose properties to match Cython property surface
    # (attributes are already present; properties maintain drop-in API)
    @property
    def hardware_mapping(self): return self.__dict__["hardware_mapping"]
    @hardware_mapping.setter
    def hardware_mapping(self, value): self.__dict__["hardware_mapping"] = value
    @property
    def rows(self): return self.__dict__["rows"]
    @rows.setter
    def rows(self, value): self.__dict__["rows"] = value
    @property
    def cols(self): return self.__dict__["cols"]
    @cols.setter
    def cols(self, value): self.__dict__["cols"] = value
    @property
    def chain_length(self): return self.__dict__["chain_length"]
    @chain_length.setter
    def chain_length(self, value): self.__dict__["chain_length"] = value
    @property
    def parallel(self): return self.__dict__["parallel"]
    @parallel.setter
    def parallel(self, value): self.__dict__["parallel"] = value
    @property
    def pwm_bits(self): return self.__dict__["pwm_bits"]
    @pwm_bits.setter
    def pwm_bits(self, value): self.__dict__["pwm_bits"] = value
    @property
    def pwm_lsb_nanoseconds(self): return self.__dict__["pwm_lsb_nanoseconds"]
    @pwm_lsb_nanoseconds.setter
    def pwm_lsb_nanoseconds(self, value): self.__dict__["pwm_lsb_nanoseconds"] = value
    @property
    def brightness(self): return self.__dict__["brightness"]
    @brightness.setter
    def brightness(self, value): self.__dict__["brightness"] = value
    @property
    def scan_mode(self): return self.__dict__["scan_mode"]
    @scan_mode.setter
    def scan_mode(self, value): self.__dict__["scan_mode"] = value
    @property
    def multiplexing(self): return self.__dict__["multiplexing"]
    @multiplexing.setter
    def multiplexing(self, value): self.__dict__["multiplexing"] = value
    @property
    def row_address_type(self): return self.__dict__["row_address_type"]
    @row_address_type.setter
    def row_address_type(self, value): self.__dict__["row_address_type"] = value
    @property
    def disable_hardware_pulsing(self): return self.__dict__["disable_hardware_pulsing"]
    @disable_hardware_pulsing.setter
    def disable_hardware_pulsing(self, value): self.__dict__["disable_hardware_pulsing"] = value
    @property
    def show_refresh_rate(self): return self.__dict__["show_refresh_rate"]
    @show_refresh_rate.setter
    def show_refresh_rate(self, value): self.__dict__["show_refresh_rate"] = value
    @property
    def inverse_colors(self): return self.__dict__["inverse_colors"]
    @inverse_colors.setter
    def inverse_colors(self, value): self.__dict__["inverse_colors"] = value
    @property
    def led_rgb_sequence(self): return self.__dict__["led_rgb_sequence"]
    @led_rgb_sequence.setter
    def led_rgb_sequence(self, value): self.__dict__["led_rgb_sequence"] = value
    @property
    def pixel_mapper_config(self): return self.__dict__["pixel_mapper_config"]
    @pixel_mapper_config.setter
    def pixel_mapper_config(self, value): self.__dict__["pixel_mapper_config"] = value
    @property
    def panel_type(self): return self.__dict__["panel_type"]
    @panel_type.setter
    def panel_type(self, value): self.__dict__["panel_type"] = value
    @property
    def pwm_dither_bits(self): return self.__dict__["pwm_dither_bits"]
    @pwm_dither_bits.setter
    def pwm_dither_bits(self, value): self.__dict__["pwm_dither_bits"] = value
    @property
    def limit_refresh_rate_hz(self): return self.__dict__["limit_refresh_rate_hz"]
    @limit_refresh_rate_hz.setter
    def limit_refresh_rate_hz(self, value): self.__dict__["limit_refresh_rate_hz"] = value
    @property
    def gpio_slowdown(self): return self.__dict__["gpio_slowdown"]
    @gpio_slowdown.setter
    def gpio_slowdown(self, value): self.__dict__["gpio_slowdown"] = value
    @property
    def daemon(self): return self.__dict__["daemon"]
    @daemon.setter
    def daemon(self, value): self.__dict__["daemon"] = value
    @property
    def drop_privileges(self): return self.__dict__["drop_privileges"]
    @drop_privileges.setter
    def drop_privileges(self, value): self.__dict__["drop_privileges"] = value
    @property
    def drop_priv_user(self): return self.__dict__["drop_priv_user"]
    @drop_priv_user.setter
    def drop_priv_user(self, value): self.__dict__["drop_priv_user"] = value
    @property
    def drop_priv_group(self): return self.__dict__["drop_priv_group"]
    @drop_priv_group.setter
    def drop_priv_group(self, value): self.__dict__["drop_priv_group"] = value


class RGBMatrix(Canvas):
    def __init__(self, rows: int = 0, chains: int = 0, parallel: int = 0, options: RGBMatrixOptions | None = None):
        if options is None:
            options = RGBMatrixOptions()
        if rows > 0:
            options.rows = rows
        if chains > 0:
            options.chain_length = chains
        if parallel > 0:
            options.parallel = parallel

        self._options = options
        self._width = options.cols * options.chain_length
        self._height = options.rows * options.parallel
        self._frame = FrameCanvas(self._width, self._height)
        self._front = FrameCanvas(self._width, self._height)
        self._push_url = os.getenv("RGBMATRIX_EMULATOR_PUSH_URL", "").strip()

    def __del__(self):
        self.Clear()

    def _getCanvas(self):
        return self

    def Fill(self, red: int, green: int, blue: int):
        self._front.Fill(red, green, blue)

    def SetPixel(self, x: int, y: int, red: int, green: int, blue: int):
        self._front.SetPixel(x, y, red, green, blue)

    def Clear(self):
        self._front.Clear()

    def CreateFrameCanvas(self):
        return FrameCanvas(self._width, self._height)

    def SwapOnVSync(self, newFrame: FrameCanvas, framerate_fraction: int = 1):
        self._front = newFrame
        self._emit_frame(newFrame)
        return FrameCanvas(self._width, self._height)

    def _emit_frame(self, frame: FrameCanvas):
        if not self._push_url:
            return
        payload = None
        if frame._last_text:
            payload = {"text": frame._last_text, "style": {}}
        else:
            payload = {
                "width": self._width,
                "height": self._height,
                "pixels": frame._pixels,
            }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self._push_url, data=data, headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=1)
        except Exception:
            pass

    @property
    def luminanceCorrect(self):
        return False

    @luminanceCorrect.setter
    def luminanceCorrect(self, luminanceCorrect):
        pass

    @property
    def pwmBits(self):
        return self._front.pwmBits

    @pwmBits.setter
    def pwmBits(self, pwmBits):
        self._front.pwmBits = pwmBits

    @property
    def brightness(self):
        return self._front.brightness

    @brightness.setter
    def brightness(self, brightness):
        self._front.brightness = brightness

    @property
    def height(self):
        return self._height

    @property
    def width(self):
        return self._width
