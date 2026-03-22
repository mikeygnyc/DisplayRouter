from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Display Router Admin UI")

HTML = """
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Display Router Admin</title>
    <style>
      :root {
        --bg: #f4f1ea;
        --panel: #fff7e6;
        --ink: #2b2a28;
        --accent: #c45b12;
        --accent-2: #0f6b5b;
      }
      body {
        margin: 0;
        font-family: "IBM Plex Serif", Georgia, "Times New Roman", serif;
        background: var(--bg);
        color: var(--ink);
      }
      header {
        padding: 24px 28px;
        border-bottom: 4px solid var(--accent);
        background: #efe7d8;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        letter-spacing: 0.5px;
      }
      .wrap {
        display: grid;
        grid-template-columns: 260px 1fr;
        min-height: calc(100vh - 72px);
      }
      nav {
        padding: 20px;
        border-right: 1px solid #d8d0c2;
        background: #f6efe1;
      }
      nav a {
        display: block;
        margin-bottom: 10px;
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
      main {
        padding: 24px;
      }
      .card {
        background: var(--panel);
        border: 1px solid #e2d6c6;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      }
      .list {
        display: grid;
        gap: 8px;
      }
      .item {
        padding: 8px 10px;
        background: #fff;
        border: 1px solid #e2d6c6;
        font-size: 14px;
      }
      .toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 10px;
      }
      .toolbar input {
        flex: 1;
        padding: 6px 8px;
        border: 1px solid #d8d0c2;
        background: #fff;
      }
      .drawer {
        margin-top: 8px;
        padding: 10px;
        background: #fff;
        border: 1px dashed #d8d0c2;
        font-size: 13px;
      }
      iframe {
        width: 100%;
        height: 420px;
        border: 1px solid #e2d6c6;
        background: #fff;
      }
      .row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .monitor-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .status-list {
        margin-top: 12px;
        display: grid;
        gap: 6px;
      }
      .token {
        margin-top: 8px;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .token input {
        padding: 6px 8px;
        border: 1px solid #d8d0c2;
        background: #fff;
        flex: 1;
      }
      .token button {
        padding: 6px 10px;
        background: #1c2a33;
        color: #e6f0ff;
        border: 1px solid #2a3a46;
        cursor: pointer;
      }
      .pill {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 12px;
        background: #e7dac7;
      }
      .good { background: #c9e7dc; }
      .bad { background: #f4c1b2; }
      .muted {
        color: #6b6358;
        font-size: 13px;
      }
      code {
        background: #fff;
        padding: 2px 4px;
      }
      @media (max-width: 900px) {
        .wrap {
          grid-template-columns: 1fr;
        }
        nav {
          border-right: none;
          border-bottom: 1px solid #d8d0c2;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Display Router Admin</h1>
      <div class="muted">Status and quick links for management endpoints</div>
      <div class="token">
        <input id="tokenInput" placeholder="Admin token (Bearer)" />
        <button onclick="saveToken()">Save Token</button>
      </div>
    </header>
    <div class="wrap">
      <nav>
        <a href="#monitoring">Monitoring</a>
        <a href="#clients">Clients</a>
        <a href="#templates">Templates</a>
        <a href="#rules">Rules</a>
        <a href="#displays">Displays</a>
        <a href="#logs">Logs</a>
        <a href="#sim">Simulator</a>
      </nav>
      <main>
        <div id="monitoring" class="card">
          <h2>Monitoring</h2>
          <div class="monitor-grid" id="monitoringData">
            <div>Router health: <code>/health</code></div>
            <div>Monitoring summary: <code>/admin/monitoring</code></div>
            <div class="muted">Not connected.</div>
          </div>
          <div id="displayStatus" class="status-list muted">No display data.</div>
        </div>

        <div id="clients" class="card">
          <h2>Clients</h2>
          <div class="row">
            <div>List: <code>/admin/clients</code></div>
            <div>Update: <code>/admin/clients/{client_id}</code></div>
          </div>
        </div>

        <div id="templates" class="card">
          <h2>Templates</h2>
          <div class="row">
            <div>List: <code>/admin/templates</code></div>
            <div>Update: <code>/admin/templates/{template_id}</code></div>
          </div>
        </div>

        <div id="rules" class="card">
          <h2>Rules</h2>
          <div class="row">
            <div>List: <code>/admin/rules</code></div>
            <div>Update: <code>/admin/rules/{rule_id}</code></div>
          </div>
        </div>

        <div id="displays" class="card">
          <h2>Displays</h2>
          <div class="row">
            <div>List: <code>/admin/displays</code></div>
            <div>Update: <code>/admin/displays/{display_id}</code></div>
          </div>
          <div class="toolbar">
            <button onclick="loadDisplays()">Refresh</button>
          </div>
          <div id="displayList" class="list muted">Not loaded.</div>
          <div id="displayDrawer" class="drawer muted">Select a display to view details.</div>
        </div>

        <div id="logs" class="card">
          <h2>Logs</h2>
          <div class="row">
            <div>List: <code>/admin/logs</code></div>
            <div>Replay: <code>/admin/logs/{log_id}/replay</code></div>
          </div>
          <div class="toolbar">
            <input id="logFilter" placeholder="Filter by message (e.g., payload_received)" />
            <button onclick="loadLogs()">Refresh</button>
          </div>
          <div id="logList" class="list muted">Not loaded.</div>
        </div>

        <div id="sim" class="card">
          <h2>Simulator</h2>
          <div class="row">
            <div>UI: <code>uvicorn display.sim_ui:app --reload --port 8083</code></div>
            <div>Playground: <code>uvicorn display.sim_playground:app --reload --port 8084</code></div>
          </div>
          <div class="toolbar">
            <input id="playgroundUrl" placeholder="Playground URL (e.g., http://localhost:8084)" />
            <button onclick="loadPlayground()">Load</button>
          </div>
          <iframe id="playgroundFrame" title="Playground"></iframe>
        </div>
      </main>
    </div>
    <script>
      function saveToken() {
        const value = document.getElementById('tokenInput').value.trim();
        if (!value) return;
        localStorage.admin_token = value;
      }

      async function loadDisplays() {
        const list = document.getElementById('displayList');
        try {
          const token = localStorage.getItem('admin_token') || '';
          const res = await fetch('/admin/displays', {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
          });
          if (!res.ok) {
            list.innerHTML = '<div class="muted">Failed to load displays.</div>';
            return;
          }
          const data = await res.json();
          list.innerHTML = '';
          data.data.forEach(d => {
            const el = document.createElement('div');
            el.className = 'item';
            el.textContent = `${d.name} (${d.id}) @ ${d.host}:${d.port}`;
            el.onclick = () => showDisplayDetails(d);
            list.appendChild(el);
          });
          if (!data.data.length) {
            list.innerHTML = '<div class="muted">No displays found.</div>';
          }
        } catch (e) {
          list.innerHTML = '<div class="muted">Failed to load displays.</div>';
        }
      }

      function showDisplayDetails(d) {
        const drawer = document.getElementById('displayDrawer');
        drawer.classList.remove('muted');
        drawer.innerHTML = `
          <strong>${d.name}</strong><br/>
          ID: ${d.id}<br/>
          Host: ${d.host}:${d.port}<br/>
          Disabled: ${d.disabled}<br/>
          Capabilities: ${JSON.stringify(d.capabilities || {})}
        `;
      }

      async function loadLogs() {
        const list = document.getElementById('logList');
        try {
          const token = localStorage.getItem('admin_token') || '';
          const filter = document.getElementById('logFilter').value.trim();
          const res = await fetch('/admin/logs', {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
          });
          if (!res.ok) {
            list.innerHTML = '<div class="muted">Failed to load logs.</div>';
            return;
          }
          const data = await res.json();
          list.innerHTML = '';
          data.data
            .filter(l => !filter || l.message.includes(filter))
            .slice(0, 25)
            .forEach(l => {
              const el = document.createElement('div');
              el.className = 'item';
              el.textContent = `${l.created_at} — ${l.message}`;
              list.appendChild(el);
            });
          if (!data.data.length) {
            list.innerHTML = '<div class="muted">No logs found.</div>';
          }
        } catch (e) {
          list.innerHTML = '<div class="muted">Failed to load logs.</div>';
        }
      }

      function loadPlayground() {
        const url = document.getElementById('playgroundUrl').value.trim();
        const frame = document.getElementById('playgroundFrame');
        if (!url) return;
        frame.src = url;
        localStorage.playground_url = url;
      }

      function highlightDisplay(displayId) {
        const list = document.getElementById('displayList');
        const items = list.querySelectorAll('.item');
        items.forEach(i => i.style.outline = '');
        items.forEach(i => {
          if (i.textContent.includes(displayId)) {
            i.style.outline = '2px solid #c45b12';
            i.click();
          }
        });
      }

      async function loadMonitoring() {
        const grid = document.getElementById('monitoringData');
        try {
          const token = localStorage.getItem('admin_token') || '';
          const res = await fetch('/admin/monitoring', {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
          });
          if (!res.ok) {
            grid.innerHTML = '<div class="muted">Monitoring fetch failed (check token).</div>';
            return;
          }
          const data = await res.json();
          const pills = [];
          pills.push(`<div>Router: <span class="pill good">${data.router_status}</span></div>`);
          pills.push(`<div>Payloads: <strong>${data.payloads_received}</strong></div>`);
          pills.push(`<div>Displays: <strong>${data.displays.length}</strong></div>`);
          grid.innerHTML = pills.join('');
          const statusList = document.getElementById('displayStatus');
          statusList.innerHTML = '';
          data.displays.forEach(d => {
            const item = document.createElement('div');
            item.className = 'item';
            const last = d.last_payload_at ? ` • last: ${d.last_payload_at}` : '';
            const lastId = d.last_payload_id ? ` • payload: ${d.last_payload_id}` : '';
            item.innerHTML = `<span class="pill ${d.connected ? 'good' : 'bad'}">${d.connected ? 'online' : 'offline'}</span> <a href="#displays" onclick="highlightDisplay('${d.display_id}')">${d.display_id}</a>${lastId}${last}`;
            statusList.appendChild(item);
          });
        } catch (err) {
          grid.innerHTML = '<div class="muted">Monitoring fetch failed.</div>';
        }
      }
      const existing = localStorage.getItem('admin_token');
      if (existing) {
        document.getElementById('tokenInput').value = existing;
      }
      const savedPlayground = localStorage.getItem('playground_url');
      if (savedPlayground) {
        document.getElementById('playgroundUrl').value = savedPlayground;
        document.getElementById('playgroundFrame').src = savedPlayground;
      }
      loadMonitoring();
      loadDisplays();
      loadLogs();
      setInterval(loadMonitoring, 5000);
    </script>
  </body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return HTML
