from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import threading
import time

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from fastapi.exceptions import RequestValidationError

from router.api import admin, client, display
from router.core.security import require_admin
from router.storage.db import init_db
from router.services.carousel import scheduler as carousel_scheduler
from router.core.metrics import metrics
from shared.schemas import Error, ValidationError

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    carousel_scheduler.start()
    yield
    carousel_scheduler.stop()


app = FastAPI(title="Display Router", lifespan=lifespan)


def _error_code_for_status(status_code: int) -> str:
    mapping = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        422: "validation_error",
    }
    return mapping.get(status_code, "server_error")


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    payload = Error(error=_error_code_for_status(exc.status_code), message=message)
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    payload = ValidationError(
        error="validation_error",
        message="Invalid payload",
        details={"errors": exc.errors()},
    )
    return JSONResponse(status_code=422, content=payload.model_dump())


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics


app.include_router(client.router)
app.include_router(admin.router)
app.include_router(display.router)


DOCS_DIR = Path(__file__).resolve().parents[1] / "docs"


@app.get("/api-docs/openapi.yaml")
def serve_openapi_yaml() -> FileResponse:
    path = DOCS_DIR / "openapi.yaml"
    if not path.exists():
        raise HTTPException(status_code=404, detail="openapi.yaml not found")
    return FileResponse(path)


@app.get("/api-docs/asyncapi.yaml")
def serve_asyncapi_yaml() -> FileResponse:
    path = DOCS_DIR / "asyncapi.yaml"
    if not path.exists():
        raise HTTPException(status_code=404, detail="asyncapi.yaml not found")
    return FileResponse(path)


def _delayed_exit() -> None:
    time.sleep(0.5)
    os._exit(0)


@app.post("/admin/restart", dependencies=[Depends(require_admin)])
def restart_router() -> dict:
    threading.Thread(target=_delayed_exit, daemon=True).start()
    return {"status": "restarting"}
