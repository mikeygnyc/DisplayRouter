from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Display Router Admin UI")
from admin.api import router as admin_api_router
app.include_router(admin_api_router)
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    context = {"request": request}
    try:
        return templates.TemplateResponse(request=request, name="index.html", context=context)
    except TypeError:
        # Backwards-compatible signature for older Starlette/FastAPI versions.
        return templates.TemplateResponse("index.html", context)
