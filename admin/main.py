import json
import os
import secrets
from pathlib import Path

import httpx

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import TemplateSyntaxError, UndefinedError, StrictUndefined
from jinja2.sandbox import SandboxedEnvironment

from shared.utils.config import load_config_file
from router.storage.db import init_db

app = FastAPI(title="Display Router Admin UI")


@app.on_event("startup")
def _init_admin_db() -> None:
    init_db()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from admin.api import router as admin_api_router
app.include_router(admin_api_router)
app.include_router(admin_api_router, prefix="/ui")
BASE_DIR = Path(__file__).resolve().parent
UI_DIR = BASE_DIR / "ui"
WEB_DIR = UI_DIR / "web"
templates = Jinja2Templates(directory=str(WEB_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")
UI_DIST = UI_DIR / "dist"
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


SIM_SERVER_URL = os.getenv("SIM_SERVER_URL", "http://localhost:8082")
ROUTER_HTTP_URL = os.getenv("ROUTER_HTTP_URL", "http://router:8000")


@app.get("/sim")
def sim_proxy(request: Request):
    _require_admin_token(request)
    try:
        res = httpx.get(f"{SIM_SERVER_URL}/sim", timeout=3.0)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Sim server not reachable: {exc}") from exc


@app.post("/sim/push")
def sim_push_proxy(payload: dict, request: Request):
    _require_admin_token(request)
    try:
        res = httpx.post(f"{SIM_SERVER_URL}/push", json=payload, timeout=3.0)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Sim server not reachable: {exc}") from exc


@app.get("/sim/ui", response_class=HTMLResponse)
def sim_ui_proxy() -> FileResponse:
    return FileResponse(WEB_DIR / "static" / "sim_ui.html")


@app.post("/admin/jinja/validate")
def jinja_validate(payload: dict, request: Request):
    _require_admin_token(request)
    template_text = payload.get("template", "")
    context = payload.get("context", {}) or {}
    if not isinstance(context, dict):
        return {"valid": False, "errors": ["Context must be an object."], "rendered": ""}
    if not template_text:
        return {"valid": False, "errors": ["Template is required."], "rendered": ""}
    env = SandboxedEnvironment(undefined=StrictUndefined)
    try:
        template = env.from_string(template_text)
        rendered = template.render(**context)
        return {"valid": True, "errors": [], "rendered": rendered}
    except (TemplateSyntaxError, UndefinedError) as exc:
        return {"valid": False, "errors": [str(exc)], "rendered": ""}


@app.post("/admin/jinja/preview")
def jinja_preview(payload: dict, request: Request):
    _require_admin_token(request)
    template_text = payload.get("template", "")
    context = payload.get("context", {}) or {}
    if not isinstance(context, dict):
        raise HTTPException(status_code=400, detail="Context must be an object")
    if not template_text:
        raise HTTPException(status_code=400, detail="Template is required")
    env = SandboxedEnvironment(undefined=StrictUndefined)
    try:
        template = env.from_string(template_text)
        rendered = template.render(**context)
    except (TemplateSyntaxError, UndefinedError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        res = httpx.post(f"{SIM_SERVER_URL}/push", json={"text": rendered, "style": {}}, timeout=3.0)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Sim server not reachable: {exc}") from exc


# API docs/spec proxy endpoints (served from admin to keep UI same-origin)
@app.get("/docs")
def proxy_swagger_ui():
    try:
        res = httpx.get(f"{ROUTER_HTTP_URL}/docs", timeout=5.0)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Router not reachable: {exc}") from exc
    return Response(content=res.text, status_code=res.status_code, media_type="text/html")


@app.get("/redoc")
def proxy_redoc():
    try:
        res = httpx.get(f"{ROUTER_HTTP_URL}/redoc", timeout=5.0)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Router not reachable: {exc}") from exc
    return Response(content=res.text, status_code=res.status_code, media_type="text/html")


@app.get("/openapi.json")
def proxy_openapi_json():
    try:
        res = httpx.get(f"{ROUTER_HTTP_URL}/openapi.json", timeout=5.0)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Router not reachable: {exc}") from exc
    return JSONResponse(status_code=res.status_code, content=res.json())


@app.get("/api-docs/openapi.yaml")
def proxy_openapi_yaml():
    try:
        res = httpx.get(f"{ROUTER_HTTP_URL}/api-docs/openapi.yaml", timeout=5.0)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Router not reachable: {exc}") from exc
    return Response(content=res.text, status_code=res.status_code, media_type="text/yaml")


@app.get("/api-docs/asyncapi.yaml")
def proxy_asyncapi_yaml():
    try:
        res = httpx.get(f"{ROUTER_HTTP_URL}/api-docs/asyncapi.yaml", timeout=5.0)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Router not reachable: {exc}") from exc
    return Response(content=res.text, status_code=res.status_code, media_type="text/yaml")


# Duplicate routes under /ui for deployments where the base path is /ui
@app.get("/ui/sim")
def sim_proxy_ui(request: Request):
    return sim_proxy(request)


@app.post("/ui/sim/push")
def sim_push_proxy_ui(payload: dict, request: Request):
    return sim_push_proxy(payload, request)


@app.get("/ui/sim/ui", response_class=HTMLResponse)
def sim_ui_proxy_ui() -> HTMLResponse:
    return sim_ui_proxy()


@app.post("/ui/admin/jinja/validate")
def jinja_validate_ui(payload: dict, request: Request):
    return jinja_validate(payload, request)


@app.post("/ui/admin/jinja/preview")
def jinja_preview_ui(payload: dict, request: Request):
    return jinja_preview(payload, request)


@app.get("/ui/docs")
def proxy_swagger_ui_ui():
    return proxy_swagger_ui()


@app.get("/ui/redoc")
def proxy_redoc_ui():
    return proxy_redoc()


@app.get("/ui/openapi.json")
def proxy_openapi_json_ui():
    return proxy_openapi_json()


@app.get("/ui/api-docs/openapi.yaml")
def proxy_openapi_yaml_ui():
    return proxy_openapi_yaml()


@app.get("/ui/api-docs/asyncapi.yaml")
def proxy_asyncapi_yaml_ui():
    return proxy_asyncapi_yaml()


@app.get("/ui/{path:path}", response_class=HTMLResponse)
def ui_spa(path: str):
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


def _admin_token_path() -> Path | None:
    token_path = os.getenv("ADMIN_TOKEN_FILE")
    if token_path:
        return Path(token_path)
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    if config_path:
        return Path(config_path).parent / "admin_token.txt"
    return Path("local_config") / "admin_token.txt"


def _load_admin_token() -> str:
    # Env wins
    if os.getenv("ADMIN_TOKEN"):
        return os.getenv("ADMIN_TOKEN", "")
    # Then token file
    token_path = _admin_token_path()
    if token_path and token_path.exists():
        return token_path.read_text().strip()
    # Fall back to config for backward compatibility (read-only)
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    file_cfg = load_config_file(config_path)
    return file_cfg.get("admin_token") or ""


def _admin_token_source() -> str:
    if os.getenv("ADMIN_TOKEN"):
        return "env"
    token_path = _admin_token_path()
    if token_path and token_path.exists() and token_path.read_text().strip():
        return "file"
    config_path = os.getenv("ROUTER_CONFIG_FILE") or os.getenv("CONFIG_FILE")
    file_cfg = load_config_file(config_path)
    if file_cfg.get("admin_token"):
        return "config"
    return "missing"


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
    token_path = _admin_token_path()
    if not token_path:
        raise HTTPException(status_code=500, detail="Missing admin token storage path")
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(token + "\n")


@app.get("/bootstrap/admin-token")
def bootstrap_admin_token() -> dict:
    token = _load_admin_token()
    if not token or token == "dev-admin-token":
        raise HTTPException(status_code=404, detail="Admin token not bootstrapped")
    return {"admin_token": token}


@app.get("/bootstrap/token-status")
def bootstrap_token_status() -> dict:
    token = _load_admin_token()
    ready = bool(token and token != "dev-admin-token")
    return {"ready": ready, "source": _admin_token_source()}


@app.post("/bootstrap/rotate-admin-token")
def rotate_admin_token(request: Request) -> dict:
    _require_admin_token(request)
    token = secrets.token_hex(32)
    _write_admin_token(token)
    return {"admin_token": token}


@app.post("/bootstrap/generate-admin-token")
def bootstrap_generate_admin_token() -> dict:
    existing = _load_admin_token()
    if existing and existing != "dev-admin-token":
        raise HTTPException(status_code=409, detail="Admin token already configured")
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
