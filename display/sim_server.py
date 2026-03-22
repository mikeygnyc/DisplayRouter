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
