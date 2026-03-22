from fastapi import FastAPI

from display.state import last_frame, last_pixels

app = FastAPI(title="Display Simulator")


@app.get("/sim")
def sim() -> dict:
    if last_pixels:
        return {"pixels": last_pixels}
    if not last_frame:
        return {"text": None, "style": {}}
    return {"text": last_frame.text, "style": last_frame.style}


@app.post("/push")
def push(payload: dict) -> dict:
    # store a faux frame in the simulator state
    from display import state
    from display.render import RenderFrame

    if "pixels" in payload:
        state.last_pixels = payload
        state.last_frame = None
        return {"ok": True}
    state.last_frame = RenderFrame(text=payload.get("text", ""), style=payload.get("style", {}))
    state.last_pixels = None
    return {"ok": True}
