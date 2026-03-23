from fastapi import FastAPI

from display import state

app = FastAPI(title="Display Simulator")


@app.get("/sim")
def sim() -> dict:
    if state.last_pixels:
        return {"type": "pixels", "pixels": state.last_pixels}
    if not state.last_frame:
        return {"type": "empty", "text": None, "style": {}}
    frame = state.last_frame
    return {
        "type": frame.payload_type,
        "text": frame.text,
        "style": frame.style,
        "raw_data": frame.raw_data,
    }


@app.post("/push")
def push(payload: dict) -> dict:
    from display.render import RenderFrame

    if "pixels" in payload:
        state.last_pixels = payload
        state.last_frame = None
        return {"ok": True}
    state.last_frame = RenderFrame(
        text=payload.get("text", ""),
        style=payload.get("style", {}),
        payload_type=payload.get("type", "simple_text_scroll"),
        raw_data=payload.get("raw_data", {}),
    )
    state.last_pixels = None
    return {"ok": True}
