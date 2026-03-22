from fastapi import FastAPI

from display.state import last_payload

app = FastAPI(title="Display Server")


@app.get("/display/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/display/last-payload")
def get_last_payload() -> dict:
    return {"data": last_payload}
