from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


def load_config_file(path: str | None) -> Dict[str, Any]:
    if not path:
        return {}
    file_path = Path(path)
    if not file_path.exists():
        return {}
    if file_path.suffix.lower() in {".json"}:
        return json.loads(file_path.read_text())
    if file_path.suffix.lower() in {".toml"}:
        import tomllib  # Python 3.11+

        return tomllib.loads(file_path.read_text())
    # Unknown format
    return {}
