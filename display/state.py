from typing import Any, Dict, Optional

from display.render import RenderFrame

last_payload: Optional[Dict[str, Any]] = None
last_frame: Optional[RenderFrame] = None
last_pixels: Optional[Dict[str, Any]] = None
