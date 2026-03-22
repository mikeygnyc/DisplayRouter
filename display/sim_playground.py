from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Display Simulator Playground")

HTML = """
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Display Playground</title>
    <style>
      body {
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        background: #0b0f12;
        color: #e6f0ff;
        display: grid;
        place-items: center;
        min-height: 100vh;
      }
      .wrap {
        width: 760px;
      }
      textarea, input {
        width: 100%;
        background: #11161a;
        color: #e6f0ff;
        border: 1px solid #222b33;
        padding: 10px;
        font-family: inherit;
      }
      button {
        margin-top: 8px;
        padding: 8px 12px;
        background: #1c2a33;
        color: #e6f0ff;
        border: 1px solid #2a3a46;
        cursor: pointer;
      }
      .row {
        margin-bottom: 12px;
      }
      .inline {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .inline input {
        flex: 1;
      }
      .presets {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
      .frame {
        margin-top: 16px;
        border: 1px solid #2a3a46;
        height: 220px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="row">
        <label>Payload JSON:</label>
        <textarea id="payload" rows="6">{
  "text": "HELLO WORLD",
  "style": {
    "color": "#ffcc00",
    "scroll_ms_per_px": 12
  }
}</textarea>
      </div>
      <div class="row inline">
        <input id="presetName" placeholder="Preset name (e.g., Lobby Welcome)" />
        <button onclick="savePreset()">Save Preset</button>
        <button onclick="exportPreset()">Export JSON</button>
        <input id="importFile" type="file" accept="application/json" />
        <button onclick="importPreset()">Import JSON</button>
      </div>
      <div class="row presets">
        <button onclick="preset(0)">Warm</button>
        <button onclick="preset(1)">Rainbow</button>
        <button onclick="preset(2)">Alert</button>
        <button onclick="preset(3)">Slow Scroll</button>
        <div id="savedPresets"></div>
      </div>
      <div class="row">
        <button onclick="send()">Send to Simulator</button>
        <div class="toggle">
          <input type="checkbox" id="autoRefresh" checked />
          <label for="autoRefresh">Auto-refresh preview</label>
        </div>
      </div>
      <div class="frame">
        <iframe id="sim" src="/ui" width="100%" height="100%" frameborder="0"></iframe>
      </div>
    </div>
    <script>
      const presets = [
        {
          text: "WELCOME",
          style: { color: "#ffcc00", scroll_ms_per_px: 12 }
        },
        {
          text: "RGB MATRIX",
          style: { colors: ["#ff0000","#ff7f00","#ffff00","#00ff00","#0000ff","#4b0082","#8f00ff","#ffffff","#00ffff","#ff00ff"] }
        },
        {
          text: "ALERT!",
          style: { color: "#ff3333", scroll_ms_per_px: 8 }
        },
        {
          text: "SLOW SCROLL DEMO",
          style: { color: "#66ffcc", scroll_ms_per_px: 30 }
        }
      ];

      function loadSaved() {
        const raw = localStorage.getItem('display_presets');
        return raw ? JSON.parse(raw) : [];
      }

      function renderSaved() {
        const container = document.getElementById('savedPresets');
        container.innerHTML = '';
        const saved = loadSaved();
        saved.forEach((p, i) => {
          const btn = document.createElement('button');
          btn.textContent = p.name;
          btn.onclick = () => {
            document.getElementById('payload').value = JSON.stringify(p.payload, null, 2);
            if (document.getElementById('autoRefresh').checked) {
              send();
            }
          };
          container.appendChild(btn);
        });
      }

      function preset(i) {
        const p = presets[i];
        document.getElementById('payload').value = JSON.stringify(p, null, 2);
        if (document.getElementById('autoRefresh').checked) {
          send();
        }
      }

      function refreshFrame() {
        const iframe = document.getElementById('sim');
        iframe.src = '/ui?ts=' + Date.now();
      }

      async function send() {
        const raw = document.getElementById('payload').value;
        let payload;
        try { payload = JSON.parse(raw); } catch (e) { alert('Invalid JSON'); return; }
        await fetch('/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (document.getElementById('autoRefresh').checked) {
          refreshFrame();
        }
      }

      function savePreset() {
        const name = document.getElementById('presetName').value.trim();
        if (!name) { alert('Preset name required'); return; }
        let payload;
        try { payload = JSON.parse(document.getElementById('payload').value); }
        catch { alert('Invalid JSON'); return; }
        const saved = loadSaved();
        saved.push({ name, payload });
        localStorage.setItem('display_presets', JSON.stringify(saved));
        renderSaved();
      }

      function exportPreset() {
        let payload;
        try { payload = JSON.parse(document.getElementById('payload').value); }
        catch { alert('Invalid JSON'); return; }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'display-preset.json';
        a.click();
        URL.revokeObjectURL(url);
      }

      function importPreset() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files && fileInput.files[0];
        if (!file) { alert('Choose a JSON file'); return; }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const payload = JSON.parse(reader.result);
            document.getElementById('payload').value = JSON.stringify(payload, null, 2);
            const name = file.name.replace('.json', '');
            const saved = loadSaved();
            saved.push({ name, payload });
            localStorage.setItem('display_presets', JSON.stringify(saved));
            renderSaved();
            if (document.getElementById('autoRefresh').checked) {
              send();
            }
          } catch (e) {
            alert('Invalid JSON file');
          }
        };
        reader.readAsText(file);
      }

      renderSaved();
      setInterval(() => {
        if (document.getElementById('autoRefresh').checked) {
          refreshFrame();
        }
      }, 2000);
    </script>
  </body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return HTML


@app.get("/ui", response_class=HTMLResponse)
def ui_proxy() -> str:
    return """
    <iframe src="/sim" style="width:100%;height:100%;border:0"></iframe>
    """


@app.post("/push")
def push(payload: dict) -> dict:
    # store a faux frame in the simulator state by calling local sim endpoint
    from display import state
    from display.render import RenderFrame

    if "pixels" in payload:
        state.last_pixels = payload
        state.last_frame = None
        return {"ok": True}
    state.last_frame = RenderFrame(text=payload.get("text", ""), style=payload.get("style", {}))
    state.last_pixels = None
    return {"ok": True}
