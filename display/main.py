from fastapi import FastAPI

from display.state import last_frame, last_payload

app = FastAPI(title="Display Server")


@app.get("/display/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/display/last-payload")
def get_last_payload() -> dict:
    return {"data": last_payload}


@app.get("/display/last-frame")
def get_last_frame() -> dict:
    if not last_frame:
        return {"data": None}
    return {"data": {"text": last_frame.text, "style": last_frame.style}}
