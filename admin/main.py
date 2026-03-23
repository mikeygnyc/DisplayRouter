import json
import os
import secrets
from pathlib import Path

import httpx

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from shared.utils.config import load_config_file

app = FastAPI(title="Display Router Admin UI")
from admin.api import router as admin_api_router
app.include_router(admin_api_router)
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
UI_DIST = BASE_DIR / "ui" / "dist"
if UI_DIST.exists():
    assets_dir = UI_DIST / "assets"
    if assets_dir.exists():
        app.mount("/ui/assets", StaticFiles(directory=str(assets_dir)), name="ui-assets")


def _ui_index_response() -> HTMLResponse:
    index_path = UI_DIST / "index.html"
    if index_path.exists():
        return HTMLResponse(index_path.read_text())
    return HTMLResponse("<h1>Admin UI build not found.</h1>", status_code=404)


@app.get("/ui", response_class=HTMLResponse)
def ui_index() -> HTMLResponse:
    return _ui_index_response()


@app.get("/ui/{path:path}")
def ui_spa(path: str) -> HTMLResponse | FileResponse:
    candidate = UI_DIST / path
    if candidate.exists() and candidate.is_file():
        return FileResponse(candidate)
    return _ui_index_response()


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    if UI_DIST.exists():
        return RedirectResponse(url="/ui")
    context = {"request": request}
    try:
        return templates.TemplateResponse(request=request, name="index.html", context=context)
    except TypeError:
        # Backwards-compatible signature for older Starlette/FastAPI versions.
        return templates.TemplateResponse("index.html", context)


def _load_admin_token() -> str:
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    file_cfg = load_config_file(config_path)
    return file_cfg.get("admin_token") or os.getenv("ADMIN_TOKEN") or ""


def _require_admin_token(request: Request) -> str:
    token = _load_admin_token()
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")
    provided = auth.split(" ", 1)[1].strip()
    if not token or token == "dev-admin-token":
        raise HTTPException(status_code=403, detail="Admin token not bootstrapped")
    if provided != token:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    return token


def _write_admin_token(token: str) -> None:
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    if not config_path:
        raise HTTPException(status_code=500, detail="Missing router config path")
    file_path = Path(config_path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if file_path.suffix.lower() != ".json":
        raise HTTPException(status_code=400, detail="Router config must be JSON for rotation")
    payload = {}
    if file_path.exists():
        try:
            payload = json.loads(file_path.read_text())
        except Exception:
            payload = {}
    payload["admin_token"] = token
    file_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


@app.get("/bootstrap/admin-token")
def bootstrap_admin_token() -> dict:
    token = _load_admin_token()
    if not token or token == "dev-admin-token":
        raise HTTPException(status_code=404, detail="Admin token not bootstrapped")
    return {"admin_token": token}


@app.post("/bootstrap/rotate-admin-token")
def rotate_admin_token(request: Request) -> dict:
    _require_admin_token(request)
    token = secrets.token_hex(32)
    _write_admin_token(token)
    return {"admin_token": token}


@app.post("/admin/restart-router")
def restart_router_proxy(request: Request) -> dict:
    token = _require_admin_token(request)
    base_url = os.getenv("ROUTER_HTTP_URL", "http://router:8000")
    try:
        res = httpx.post(
            f"{base_url}/admin/restart",
            headers={"Authorization": f"Bearer {token}"},
            timeout=3.0,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Router not reachable: {exc}") from exc
    if res.status_code >= 400:
        raise HTTPException(status_code=res.status_code, detail=res.text or "Router restart failed")
    return {"status": "restarting"}
