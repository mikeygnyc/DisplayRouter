from fastapi import FastAPI

from display.state import last_frame

app = FastAPI(title="Display Simulator")


@app.get("/sim")
def sim() -> dict:
    if not last_frame:
        return {"text": None, "style": {}}
    return {"text": last_frame.text, "style": last_frame.style}
