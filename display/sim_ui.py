from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from display.state import last_frame

app = FastAPI(title="Display Simulator UI")


HTML = """
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Display Simulator</title>
    <style>
      :root {
        --bg: #0b0f12;
        --panel: #11161a;
        --grid: #1a2025;
        --text: #e6f0ff;
      }
      body {
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        background: var(--bg);
        color: var(--text);
        display: grid;
        place-items: center;
        min-height: 100vh;
      }
      .frame {
        padding: 24px;
        background: var(--panel);
        border: 1px solid #222b33;
        box-shadow: 0 20px 50px rgba(0,0,0,0.4);
      }
      .matrix {
        width: 512px;
        height: 256px;
        background: linear-gradient(180deg, #0b0f12, #050708);
        border: 1px solid #25303a;
        position: relative;
        overflow: hidden;
      }
      .grid {
        position: absolute;
        inset: 0;
        background-size: 8px 8px;
        background-image:
          linear-gradient(to right, var(--grid) 1px, transparent 1px),
          linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
        opacity: 0.4;
      }
      .text {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        font-size: 32px;
        text-shadow: 0 0 12px rgba(255,255,255,0.25);
        white-space: nowrap;
        will-change: transform;
      }
      .dots {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px);
        background-size: 8px 8px;
        opacity: 0.6;
        mix-blend-mode: screen;
      }
      .meta {
        margin-top: 12px;
        font-size: 12px;
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="matrix">
        <div class="grid"></div>
        <div class="dots"></div>
        <div id="text" class="text">Waiting...</div>
      </div>
      <div id="meta" class="meta">Polling /sim every 1s</div>
    </div>
    <script>
      async function tick() {
        try {
          const res = await fetch('/sim');
          const data = await res.json();
          const text = data.text || 'Waiting...';
          const style = data.style || {};
          const el = document.getElementById('text');
          if (Array.isArray(style.colors) && style.colors.length === text.length) {
            el.innerHTML = '';
            for (let i = 0; i < text.length; i++) {
              const span = document.createElement('span');
              span.textContent = text[i];
              span.style.color = style.colors[i];
              el.appendChild(span);
            }
          } else {
            el.textContent = text;
            if (style.color) {
              el.style.color = style.color;
            }
          }
          // scroll if text is wider than the matrix
          const matrixWidth = document.querySelector('.matrix').clientWidth;
          const textWidth = el.scrollWidth;
          if (textWidth > matrixWidth) {
            const distance = textWidth - matrixWidth + 40;
            const msPerPx = Number(style.scroll_ms_per_px || 15);
            el.animate([
              { transform: 'translateX(20px)' },
              { transform: `translateX(${-distance}px)` }
            ], {
              duration: Math.max(4000, distance * msPerPx),
              iterations: 1,
              easing: 'linear',
              fill: 'forwards'
            });
          } else {
            el.style.transform = 'translateX(0)';
          }
        } catch (err) {
          console.error(err);
        }
      }
      tick();
      setInterval(tick, 1000);
    </script>
  </body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return HTML


@app.get("/sim")
def sim() -> dict:
    if not last_frame:
        return {"text": None, "style": {}}
    return {"text": last_frame.text, "style": last_frame.style}
