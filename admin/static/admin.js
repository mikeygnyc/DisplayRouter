function getToken() {
  return localStorage.getItem("admin_token") || "";
}

function updateSaveTokenState() {
  const input = document.getElementById("tokenInput");
  const btn = document.getElementById("saveTokenBtn");
  const notice = document.getElementById("setupNotice");
  if (!input || !btn) return;
  const hasInput = !!input.value.trim();
  const hasSaved = !!getToken();
  btn.disabled = !hasInput;
  if (notice) {
    notice.classList.toggle("hidden", hasSaved);
  }
}

function saveToken() {
  const value = document.getElementById("tokenInput").value.trim();
  if (!value) return;
  localStorage.admin_token = value;
  updateSaveTokenState();
  copyTokenToClipboard(value);
  setTokenStatus("Token saved.");
  reloadAdminData();
}

function generateToken() {
  const existing = getToken();
  if (existing) {
    const ok = confirm(
      "A token already exists. Generating a new token will require updating all servers and clients that use the admin token. Continue?"
    );
    if (!ok) return;
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  document.getElementById("tokenInput").value = token;
  localStorage.admin_token = token;
  updateSaveTokenState();
  copyTokenToClipboard(token);
  setTokenStatus("New token generated and saved. Update ADMIN_TOKEN on the router and any admin clients.");
  reloadAdminData();
  checkTokenMismatch();
}

async function rotateToken() {
  const ok = confirm(
    "Rotate the admin token now? This will update the router config and require restarting the router plus any admin clients."
  );
  if (!ok) return;
  try {
    const token = getToken();
    const res = await fetch("/bootstrap/rotate-admin-token", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Token rotation failed");
    }
    const data = await res.json();
    if (data.admin_token) {
      document.getElementById("tokenInput").value = data.admin_token;
      localStorage.admin_token = data.admin_token;
      updateSaveTokenState();
      copyTokenToClipboard(data.admin_token);
      setTokenStatus("Token rotated. Restart router and update clients.");
      reloadAdminData();
      checkTokenMismatch();
    }
  } catch (e) {
    setTokenStatus(e.message || "Token rotation failed.");
  }
}

function setTokenStatus(message) {
  const el = document.getElementById("tokenStatus");
  if (!el) return;
  el.textContent = message;
  if (message) {
    setTimeout(() => {
      if (el.textContent === message) el.textContent = "";
    }, 6000);
  }
}

async function copyTokenToClipboard(token) {
  try {
    await navigator.clipboard.writeText(token);
    setTokenStatus("Token copied to clipboard.");
  } catch {
    setTokenStatus("Token generated (clipboard copy failed).");
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = Object.assign({}, options.headers || {}, token ? { Authorization: "Bearer " + token } : {});
  const res = await fetch(path, Object.assign({}, options, { headers }));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

async function loadClients() {
  const list = document.getElementById("clientList");
  try {
    if (!getToken()) {
      list.innerHTML = '<div class="muted">Set admin token to load clients.</div>';
      return;
    }
    const data = await apiFetch("/admin/clients");
    list.innerHTML = "";
    data.data.forEach((c) => {
      const el = document.createElement("div");
      el.className = "item";
      const label = document.createElement("span");
      label.textContent = `${c.name} (${c.id})`;
      const nameInput = document.createElement("input");
      nameInput.value = c.name;
      const save = document.createElement("button");
      save.textContent = "Save";
      save.onclick = async () => {
        try {
          await apiFetch(`/admin/clients/${c.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nameInput.value }),
          });
          loadClients();
        } catch (e) {
          document.getElementById("clientError").textContent = e.message;
        }
      };
      const del = document.createElement("button");
      del.textContent = "Disable";
      del.onclick = async () => {
        try {
          await apiFetch(`/admin/clients/${c.id}`, { method: "DELETE" });
          loadClients();
        } catch (e) {
          document.getElementById("clientError").textContent = e.message;
        }
      };
      el.appendChild(label);
      el.appendChild(nameInput);
      el.appendChild(save);
      el.appendChild(del);
      list.appendChild(el);
    });
    if (!data.data.length) list.innerHTML = '<div class="muted">No clients.</div>';
  } catch {
    list.innerHTML = '<div class="muted">Failed to load clients.</div>';
  }
}

async function createClient() {
  const name = document.getElementById("clientName").value.trim();
  const payloadTypes = document
    .getElementById("clientPayloadTypes")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!name) return;
  try {
    await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload_types: payloadTypes }),
    });
    document.getElementById("clientError").textContent = "";
    loadClients();
  } catch (e) {
    document.getElementById("clientError").textContent = e.message;
  }
}

async function loadTemplates() {
  const list = document.getElementById("templateList");
  try {
    if (!getToken()) {
      list.innerHTML = '<div class="muted">Set admin token to load templates.</div>';
      return;
    }
    const data = await apiFetch("/admin/templates");
    list.innerHTML = "";
    data.data.forEach((t) => {
      const el = document.createElement("div");
      el.className = "item";
      const label = document.createElement("span");
      label.textContent = `${t.name} (${t.id})`;
      const nameInput = document.createElement("input");
      nameInput.value = t.name;
      const save = document.createElement("button");
      save.textContent = "Save";
      save.onclick = async () => {
        try {
          await apiFetch(`/admin/templates/${t.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nameInput.value }),
          });
          loadTemplates();
        } catch (e) {
          document.getElementById("templateError").textContent = e.message;
        }
      };
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        try {
          await apiFetch(`/admin/templates/${t.id}`, { method: "DELETE" });
          loadTemplates();
        } catch (e) {
          document.getElementById("templateError").textContent = e.message;
        }
      };
      el.appendChild(label);
      el.appendChild(nameInput);
      el.appendChild(save);
      el.appendChild(del);
      list.appendChild(el);
    });
    if (!data.data.length) list.innerHTML = '<div class="muted">No templates.</div>';
  } catch {
    list.innerHTML = '<div class="muted">Failed to load templates.</div>';
  }
}

async function createTemplate() {
  const name = document.getElementById("tplName").value.trim();
  const payloadType = document.getElementById("tplPayloadType").value.trim();
  const template = document.getElementById("tplTemplate").value.trim();
  if (!name || !payloadType || !template) return;
  try {
    await apiFetch("/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload_type: payloadType, template, default_style: {} }),
    });
    document.getElementById("templateError").textContent = "";
    loadTemplates();
  } catch (e) {
    document.getElementById("templateError").textContent = e.message;
  }
}

async function loadRules() {
  const list = document.getElementById("ruleList");
  try {
    if (!getToken()) {
      list.innerHTML = '<div class="muted">Set admin token to load rules.</div>';
      return;
    }
    const data = await apiFetch("/admin/rules");
    list.innerHTML = "";
    data.data.forEach((r) => {
      const el = document.createElement("div");
      el.className = "item";
      const label = document.createElement("span");
      label.textContent = `${r.name} (${r.id})`;
      const priorityInput = document.createElement("input");
      priorityInput.value = r.priority || 0;
      const save = document.createElement("button");
      save.textContent = "Save";
      save.onclick = async () => {
        try {
          await apiFetch(`/admin/rules/${r.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority: parseInt(priorityInput.value || "0", 10) }),
          });
          loadRules();
        } catch (e) {
          document.getElementById("ruleError").textContent = e.message;
        }
      };
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        try {
          await apiFetch(`/admin/rules/${r.id}`, { method: "DELETE" });
          loadRules();
        } catch (e) {
          document.getElementById("ruleError").textContent = e.message;
        }
      };
      el.appendChild(label);
      el.appendChild(priorityInput);
      el.appendChild(save);
      el.appendChild(del);
      list.appendChild(el);
    });
    if (!data.data.length) list.innerHTML = '<div class="muted">No rules.</div>';
  } catch {
    list.innerHTML = '<div class="muted">Failed to load rules.</div>';
  }
}

async function createRule() {
  const name = document.getElementById("ruleName").value.trim();
  const clientId = document.getElementById("ruleClientId").value.trim();
  const payloadType = document.getElementById("rulePayloadType").value.trim();
  const targets = document
    .getElementById("ruleDisplayTargets")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const priority = parseInt(document.getElementById("rulePriority").value || "0", 10);
  if (!name || !targets.length) return;
  const match = { client_id: clientId || undefined, payload_type: payloadType || undefined };
  try {
    await apiFetch("/admin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, match, priority, display_targets: targets }),
    });
    document.getElementById("ruleError").textContent = "";
    loadRules();
  } catch (e) {
    document.getElementById("ruleError").textContent = e.message;
  }
}

async function loadDisplays() {
  const list = document.getElementById("displayList");
  try {
    const token = getToken();
    if (!token) {
      list.innerHTML = '<div class="muted">Set admin token to load displays.</div>';
      return;
    }
    const res = await fetch("/admin/displays", {
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
    if (!res.ok) {
      list.innerHTML = '<div class="muted">Failed to load displays.</div>';
      return;
    }
    const data = await res.json();
    list.innerHTML = "";
    data.data.forEach((d) => {
      const el = document.createElement("div");
      el.className = "item";
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
  const drawer = document.getElementById("displayDrawer");
  drawer.classList.remove("muted");
  drawer.innerHTML = `
    <strong>${d.name}</strong><br/>
    ID: ${d.id}<br/>
    Host: ${d.host}:${d.port}<br/>
    Disabled: ${d.disabled}<br/>
    Capabilities: ${JSON.stringify(d.capabilities || {})}
  `;
}

async function loadLogs() {
  const list = document.getElementById("logList");
  try {
    const token = getToken();
    if (!token) {
      list.innerHTML = '<div class="muted">Set admin token to load logs.</div>';
      return;
    }
    const filter = document.getElementById("logFilter").value.trim();
    const res = await fetch("/admin/logs", {
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
    if (!res.ok) {
      list.innerHTML = '<div class="muted">Failed to load logs.</div>';
      return;
    }
    const data = await res.json();
    list.innerHTML = "";
    data.data
      .filter((l) => !filter || l.message.includes(filter))
      .slice(0, 25)
      .forEach((l) => {
        const el = document.createElement("div");
        el.className = "item";
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

async function loadBroadcasts() {
  const list = document.getElementById("broadcastList");
  try {
    if (!getToken()) {
      list.innerHTML = '<div class="muted">Set admin token to load broadcasts.</div>';
      return;
    }
    const data = await apiFetch("/admin/logs?level=info");
    list.innerHTML = "";
    data.data
      .filter((l) => l.message === "broadcast_text")
      .slice(0, 25)
      .forEach((l) => {
        const el = document.createElement("div");
        el.className = "item";
        el.textContent = `${l.created_at} — ${l.message} (${(l.context || {}).payload_id || ""})`;
        list.appendChild(el);
      });
    if (!data.data.length) list.innerHTML = '<div class="muted">No broadcasts yet.</div>';
  } catch (e) {
    list.innerHTML = '<div class="muted">Failed to load broadcasts.</div>';
  }
}

function loadPlayground() {
  const url = document.getElementById("playgroundUrl").value.trim();
  const frame = document.getElementById("playgroundFrame");
  if (!url) return;
  frame.src = url;
  localStorage.playground_url = url;
}

async function sendBroadcast() {
  const text = document.getElementById("broadcastText").value.trim();
  const targets = document
    .getElementById("broadcastTargets")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const color = document.getElementById("broadcastColor").value.trim() || "#ffffff";
  const scroll = document.getElementById("broadcastScroll").value.trim();
  const duration = document.getElementById("broadcastDuration").value.trim();
  if (!text) return;
  const params = new URLSearchParams();
  params.set("text", text);
  if (targets.length) {
    targets.forEach((t) => params.append("display_ids", t));
    params.set("all_displays", "false");
  }
  if (color) params.set("color", color);
  if (scroll) params.set("scroll_ms_per_px", scroll);
  if (duration) params.set("duration_seconds", duration);
  try {
    await apiFetch(`/admin/broadcasts/text?${params.toString()}`, { method: "POST" });
    document.getElementById("broadcastError").textContent = "";
  } catch (e) {
    document.getElementById("broadcastError").textContent = e.message;
  }
}

async function sendCommandBroadcast() {
  const raw = document.getElementById("commandStream").value.trim();
  const targets = document
    .getElementById("commandTargets")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!raw) return;
  let commands;
  try {
    commands = JSON.parse(raw);
  } catch (e) {
    document.getElementById("commandError").textContent = "Invalid JSON";
    return;
  }
  const params = new URLSearchParams();
  if (targets.length) {
    targets.forEach((t) => params.append("display_ids", t));
    params.set("all_displays", "false");
  }
  try {
    await apiFetch(`/admin/broadcasts/commands?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    document.getElementById("commandError").textContent = "";
  } catch (e) {
    document.getElementById("commandError").textContent = e.message;
  }
}

function loadCommandSample() {
  const sample = [
    { op: "RGBMatrixOptions", id: "opts" },
    { op: "setattr", target: "@opts", attr: "rows", value: 32 },
    { op: "setattr", target: "@opts", attr: "cols", value: 64 },
    { op: "RGBMatrix", id: "matrix", kwargs: { options: "@opts" } },
    { op: "CreateFrameCanvas", id: "canvas", target: "@matrix" },
    { op: "Fill", target: "@canvas", args: [0, 0, 0] },
    { op: "Color", id: "red", args: [255, 0, 0] },
    { op: "Font", id: "font" },
    { op: "DrawText", args: ["@canvas", "@font", 0, 12, "@red", "HELLO"] },
    { op: "SwapOnVSync", target: "@matrix", args: ["@canvas"] },
  ];
  document.getElementById("commandStream").value = JSON.stringify(sample, null, 2);
}

function highlightDisplay(displayId) {
  const list = document.getElementById("displayList");
  const items = list.querySelectorAll(".item");
  items.forEach((i) => (i.style.outline = ""));
  items.forEach((i) => {
    if (i.textContent.includes(displayId)) {
      i.style.outline = "2px solid #c45b12";
      i.click();
    }
  });
}

async function loadMonitoring() {
  const grid = document.getElementById("monitoringData");
  try {
    const token = getToken();
    if (!token) {
      grid.innerHTML = '<div class="muted">Set admin token to load monitoring.</div>';
      return;
    }
    const res = await fetch("/admin/monitoring", {
      headers: token ? { Authorization: "Bearer " + token } : {},
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
    grid.innerHTML = pills.join("");
    const statusList = document.getElementById("displayStatus");
    statusList.innerHTML = "";
    data.displays.forEach((d) => {
      const item = document.createElement("div");
      item.className = "item";
      const last = d.last_payload_at ? ` • last: ${d.last_payload_at}` : "";
      const lastId = d.last_payload_id ? ` • payload: ${d.last_payload_id}` : "";
      item.innerHTML = `<span class="pill ${d.connected ? "good" : "bad"}">${d.connected ? "online" : "offline"}</span> <a href="#displays" onclick="highlightDisplay('${d.display_id}')">${d.display_id}</a>${lastId}${last}`;
      statusList.appendChild(item);
    });
  } catch (err) {
    grid.innerHTML = '<div class="muted">Monitoring fetch failed.</div>';
  }
}

function reloadAdminData() {
  loadMonitoring();
  loadClients();
  loadTemplates();
  loadRules();
  loadDisplays();
  loadLogs();
  loadBroadcasts();
}

async function waitForRouterHealthy(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch("/admin/restart-router");
      // If proxy responds, router is reachable; check health directly.
    } catch {
      // ignore
    }
    try {
      const res = await fetch("/health");
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function restartRouterAndWait() {
  const ok = confirm(
    "Restart the router now? Active connections will drop and clients/displays may need to reconnect."
  );
  if (!ok) return;
  try {
    const token = getToken();
    const res = await fetch("/admin/restart-router", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Router restart failed");
    }
    setTokenStatus("Restart requested. Waiting for router to come back...");
    const okHealth = await waitForRouterHealthy();
    if (okHealth) {
      setTokenStatus("Router is back online.");
      reloadAdminData();
    } else {
      setTokenStatus("Router restart timed out. Check logs.");
    }
  } catch (e) {
    setTokenStatus(e.message || "Router restart failed.");
  }
}

async function attemptBootstrapToken(retryCount = 0) {
  if (getToken()) return;
  try {
    const res = await fetch("/bootstrap/admin-token");
    if (res.ok) {
      const data = await res.json();
      if (data.admin_token) {
        document.getElementById("tokenInput").value = data.admin_token;
        localStorage.admin_token = data.admin_token;
        updateSaveTokenState();
        setTokenStatus("Admin token bootstrapped from router.");
        reloadAdminData();
        checkTokenMismatch();
        return;
      }
    }
  } catch {
    // ignore and retry
  }
  if (retryCount < 10) {
    setTimeout(() => attemptBootstrapToken(retryCount + 1), 2000);
  }
}

async function checkTokenMismatch() {
  const notice = document.getElementById("tokenMismatchNotice");
  if (!notice) return;
  const localToken = getToken();
  if (!localToken) {
    notice.classList.add("hidden");
    return;
  }
  try {
    const res = await fetch("/bootstrap/admin-token");
    if (!res.ok) {
      notice.classList.add("hidden");
      return;
    }
    const data = await res.json();
    const serverToken = data.admin_token || "";
    notice.classList.toggle("hidden", !serverToken || serverToken === localToken);
  } catch {
    notice.classList.add("hidden");
  }
}

const existing = getToken();
if (existing) {
  document.getElementById("tokenInput").value = existing;
}
document.getElementById("tokenInput").addEventListener("input", updateSaveTokenState);
updateSaveTokenState();
const savedPlayground = localStorage.getItem("playground_url");
if (savedPlayground) {
  document.getElementById("playgroundUrl").value = savedPlayground;
  document.getElementById("playgroundFrame").src = savedPlayground;
} else {
  const fallback = "http://localhost:8084";
  document.getElementById("playgroundUrl").value = fallback;
  document.getElementById("playgroundFrame").src = fallback;
}
reloadAdminData();
attemptBootstrapToken();
checkTokenMismatch();
setInterval(loadMonitoring, 5000);
