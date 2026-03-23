import { useEffect, useMemo, useState } from "react";

const navItems = [
  { id: "monitoring", label: "Monitoring" },
  { id: "clients", label: "Clients" },
  { id: "templates", label: "Templates" },
  { id: "rules", label: "Rules" },
  { id: "displays", label: "Displays" },
  { id: "logs", label: "Logs" },
  { id: "sim", label: "Simulator" },
  { id: "broadcast", label: "Broadcast" },
  { id: "broadcast-commands", label: "Commands" },
  { id: "broadcast-history", label: "History" },
  { id: "payload-editor", label: "Payloads" },
];

const payloadTypeOptions = [
  "simple_text_scroll",
  "simple_text_page",
  "rich_text_scroll",
  "rich_text_page",
  "billboard",
  "clock",
  "weather",
  "image",
  "animation",
  "template",
  "clear",
  "raw_commands",
  "raw_pixels",
];

const transitionOptions = ["cut", "slide", "fade", "barn_door", "wipe"];

const colorPresets = ["#ffffff", "#f0b429", "#c57a3f", "#0f6b5b", "#1f1a16", "#ff595e", "#1982c4"];

const payloadSchemas: Record<
  string,
  { label: string; fields: { key: string; label: string; type: "text" | "number" | "color" }[] }
> = {
  simple_text_scroll: {
    label: "Simple Text Scroll",
    fields: [
      { key: "text", label: "Text", type: "text" },
      { key: "scroll_ms_per_px", label: "Scroll ms/px", type: "number" },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  simple_text_page: {
    label: "Simple Text Page",
    fields: [
      { key: "lines", label: "Lines (comma separated)", type: "text" },
      { key: "page_ms", label: "Page ms", type: "number" },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  clock: {
    label: "Clock",
    fields: [
      { key: "timezone", label: "Timezone", type: "text" },
      { key: "format", label: "Format", type: "text" },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  weather: {
    label: "Weather",
    fields: [
      { key: "location", label: "Location", type: "text" },
      { key: "provider", label: "Provider", type: "text" },
      { key: "units", label: "Units", type: "text" },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  image: {
    label: "Image",
    fields: [
      { key: "image_url", label: "Image URL", type: "text" },
      { key: "scale", label: "Scale (fit/fill)", type: "text" },
    ],
  },
  animation: {
    label: "Animation",
    fields: [
      { key: "fps", label: "FPS", type: "number" },
      { key: "loop", label: "Loop (true/false)", type: "text" },
    ],
  },
  template: {
    label: "Template",
    fields: [
      { key: "template", label: "Template", type: "text" },
      { key: "data", label: "Data (JSON)", type: "text" },
    ],
  },
  clear: { label: "Clear", fields: [] },
  raw_commands: { label: "Raw Commands", fields: [{ key: "commands", label: "Commands (JSON)", type: "text" }] },
  raw_pixels: { label: "Raw Pixels", fields: [{ key: "pixels", label: "Pixels (JSON)", type: "text" }] },
};

type ApiMeta = {
  page?: number;
  page_size?: number;
  total?: number;
};

type Client = {
  id: string;
  name: string;
  payload_types?: string[];
  disabled?: boolean;
};

type Template = {
  id: string;
  name: string;
  payload_type: string;
};

type Rule = {
  id: string;
  name: string;
  priority?: number;
  display_targets?: string[];
};

type DisplayTarget = {
  id: string;
  name: string;
  host: string;
  port: number;
  disabled?: boolean;
  capabilities?: Record<string, unknown>;
};

type LogEvent = {
  id: string;
  level: string;
  message: string;
  created_at: string;
  context?: Record<string, unknown>;
};

type MonitoringSummary = {
  router_status: string;
  router_time: string;
  payloads_received: number;
  displays: {
    display_id: string;
    connected: boolean;
    last_payload_id?: string;
    last_payload_at?: string;
  }[];
};

const initialMonitoring: MonitoringSummary = {
  router_status: "unknown",
  router_time: "",
  payloads_received: 0,
  displays: [],
};

function getSavedToken() {
  return localStorage.getItem("admin_token") || "";
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = Object.assign({}, options.headers || {}, token ? { Authorization: `Bearer ${token}` } : {});
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json() as Promise<T>;
}

function App() {
  const [token, setToken] = useState(getSavedToken());
  const [tokenStatus, setTokenStatus] = useState("Token not set");
  const [monitoring, setMonitoring] = useState<MonitoringSummary>(initialMonitoring);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [displays, setDisplays] = useState<DisplayTarget[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [ruleFilter, setRuleFilter] = useState("");
  const [formErrors, setFormErrors] = useState({
    client: "",
    template: "",
    rule: "",
    broadcast: "",
  });
  const [clientName, setClientName] = useState("");
  const [clientPayloads, setClientPayloads] = useState("");
  const [clientStep, setClientStep] = useState(1);
  const [tplName, setTplName] = useState("");
  const [tplPayloadType, setTplPayloadType] = useState("");
  const [tplTemplate, setTplTemplate] = useState("");
  const [tplColor, setTplColor] = useState("#ffffff");
  const [templateStep, setTemplateStep] = useState(1);
  const [ruleName, setRuleName] = useState("");
  const [ruleClientId, setRuleClientId] = useState("");
  const [rulePayloadType, setRulePayloadType] = useState("");
  const [ruleTargets, setRuleTargets] = useState("");
  const [rulePriority, setRulePriority] = useState("");
  const [ruleTransition, setRuleTransition] = useState("fade");
  const [ruleStep, setRuleStep] = useState(1);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTargets, setBroadcastTargets] = useState("");
  const [broadcastColor, setBroadcastColor] = useState("#ffffff");
  const [broadcastScroll, setBroadcastScroll] = useState("15");
  const [broadcastDuration, setBroadcastDuration] = useState("30");
  const [broadcastStatus, setBroadcastStatus] = useState("");
  const [commandStream, setCommandStream] = useState(`[\n  { "op": "RGBMatrixOptions", "id": "opts" }\n]`);
  const [commandTargets, setCommandTargets] = useState("");
  const [commandStatus, setCommandStatus] = useState("");
  const [commandError, setCommandError] = useState("");
  const [broadcastHistory, setBroadcastHistory] = useState<LogEvent[]>([]);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayTarget | null>(null);
  const [page, setPage] = useState({
    clients: 1,
    templates: 1,
    rules: 1,
    displays: 1,
    logs: 1,
    broadcasts: 1,
  });
  const pageSize = 25;
  const [loading, setLoading] = useState({
    monitoring: false,
    clients: false,
    templates: false,
    rules: false,
    displays: false,
    logs: false,
    broadcasts: false,
  });
  const [errors, setErrors] = useState({
    monitoring: "",
    clients: "",
    templates: "",
    rules: "",
    displays: "",
    logs: "",
    broadcasts: "",
  });
  const [simUrl, setSimUrl] = useState(localStorage.getItem("playground_url") || "http://localhost:8084");
  const [displayName, setDisplayName] = useState("");
  const [displayHost, setDisplayHost] = useState("");
  const [displayPort, setDisplayPort] = useState("");
  const [payloadEditorType, setPayloadEditorType] = useState("simple_text_scroll");
  const [payloadEditorFields, setPayloadEditorFields] = useState<Record<string, string>>({
    text: "Hello world",
    scroll_ms_per_px: "15",
    color: "#ffffff",
  });

  const tokenReady = token.trim().length > 0;

  const statusCards = useMemo(
    () => [
      { label: "Router", value: monitoring.router_status || "unknown", tone: "bg-pine/15 text-pine" },
      { label: "Payloads", value: String(monitoring.payloads_received ?? 0), tone: "bg-clay/15 text-clay" },
      { label: "Displays", value: String(monitoring.displays?.length ?? 0), tone: "bg-marigold/20 text-dusk" },
    ],
    [monitoring]
  );

  useEffect(() => {
    if (!tokenReady) {
      setTokenStatus("Token not set");
      return;
    }
    setTokenStatus("Token loaded");
    loadAll();
    const timer = setInterval(loadMonitoring, 5000);
    return () => clearInterval(timer);
  }, [tokenReady, token]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadMonitoring() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, monitoring: true }));
    setErrors((prev) => ({ ...prev, monitoring: "" }));
    try {
      const data = await apiFetch<MonitoringSummary>("/admin/monitoring", token);
      setMonitoring(data);
    } catch {
      setMonitoring(initialMonitoring);
      setErrors((prev) => ({ ...prev, monitoring: "Failed to load monitoring." }));
    } finally {
      setLoading((prev) => ({ ...prev, monitoring: false }));
    }
  }

  async function loadClients() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, clients: true }));
    setErrors((prev) => ({ ...prev, clients: "" }));
    try {
      const res = await apiFetch<{ data: Client[]; meta: ApiMeta }>(
        `/admin/clients?page=${page.clients}&page_size=${pageSize}`,
        token
      );
      setClients(res.data || []);
    } catch (err) {
      setErrors((prev) => ({ ...prev, clients: err instanceof Error ? err.message : "Failed to load clients." }));
      setClients([]);
    } finally {
      setLoading((prev) => ({ ...prev, clients: false }));
    }
  }

  async function loadTemplates() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, templates: true }));
    setErrors((prev) => ({ ...prev, templates: "" }));
    try {
      const res = await apiFetch<{ data: Template[]; meta: ApiMeta }>(
        `/admin/templates?page=${page.templates}&page_size=${pageSize}`,
        token
      );
      setTemplates(res.data || []);
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to load templates." }));
      setTemplates([]);
    } finally {
      setLoading((prev) => ({ ...prev, templates: false }));
    }
  }

  async function loadRules() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, rules: true }));
    setErrors((prev) => ({ ...prev, rules: "" }));
    try {
      const res = await apiFetch<{ data: Rule[]; meta: ApiMeta }>(
        `/admin/rules?page=${page.rules}&page_size=${pageSize}`,
        token
      );
      setRules(res.data || []);
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to load rules." }));
      setRules([]);
    } finally {
      setLoading((prev) => ({ ...prev, rules: false }));
    }
  }

  async function loadDisplays() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, displays: true }));
    setErrors((prev) => ({ ...prev, displays: "" }));
    try {
      const res = await apiFetch<{ data: DisplayTarget[]; meta: ApiMeta }>(
        `/admin/displays?page=${page.displays}&page_size=${pageSize}`,
        token
      );
      setDisplays(res.data || []);
      if (selectedDisplay) {
        const updated = (res.data || []).find((disp) => disp.id === selectedDisplay.id);
        if (updated) setSelectedDisplay(updated);
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, displays: err instanceof Error ? err.message : "Failed to load displays." }));
      setDisplays([]);
    } finally {
      setLoading((prev) => ({ ...prev, displays: false }));
    }
  }

  async function updateDisplay(displayId: string, fields: Partial<DisplayTarget>) {
    if (!tokenReady) return;
    if ("host" in fields && !(fields.host || "").trim()) {
      setErrors((prev) => ({ ...prev, displays: "Display host cannot be empty." }));
      setToast({ message: "Display host cannot be empty.", tone: "error" });
      return;
    }
    if ("port" in fields && (!Number.isFinite(fields.port) || (fields.port ?? 0) <= 0)) {
      setErrors((prev) => ({ ...prev, displays: "Display port must be a positive number." }));
      setToast({ message: "Display port must be a positive number.", tone: "error" });
      return;
    }
    try {
      await apiFetch(`/admin/displays/${displayId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      setToast({ message: "Display updated.", tone: "ok" });
      await loadDisplays();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        displays: err instanceof Error ? err.message : "Failed to update display.",
      }));
      setToast({ message: "Failed to update display.", tone: "error" });
    }
  }

  async function disableDisplay(displayId: string) {
    if (!tokenReady) return;
    if (!confirm("Disable this display?")) return;
    try {
      await apiFetch(`/admin/displays/${displayId}`, token, { method: "DELETE" });
      setToast({ message: "Display disabled.", tone: "ok" });
      await loadDisplays();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        displays: err instanceof Error ? err.message : "Failed to disable display.",
      }));
      setToast({ message: "Failed to disable display.", tone: "error" });
    }
  }

  async function createDisplay() {
    if (!tokenReady) return;
    if (!displayName.trim() || !displayHost.trim()) {
      setErrors((prev) => ({ ...prev, displays: "Display name and host are required." }));
      setToast({ message: "Display name and host are required.", tone: "error" });
      return;
    }
    const port = Number.parseInt(displayPort || "0", 10);
    if (!Number.isFinite(port) || port <= 0) {
      setErrors((prev) => ({ ...prev, displays: "Display port must be a positive number." }));
      setToast({ message: "Display port must be a positive number.", tone: "error" });
      return;
    }
    try {
      await apiFetch("/admin/displays", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName, host: displayHost, port, capabilities: {} }),
      });
      setToast({ message: "Display created.", tone: "ok" });
      setDisplayName("");
      setDisplayHost("");
      setDisplayPort("");
      await loadDisplays();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        displays: err instanceof Error ? err.message : "Failed to create display.",
      }));
      setToast({ message: "Failed to create display.", tone: "error" });
    }
  }

  async function testDisplay(displayId: string) {
    if (!tokenReady) return;
    const params = new URLSearchParams();
    params.set("text", `Test ${displayId}`);
    params.append("display_ids", displayId);
    params.set("all_displays", "false");
    try {
      await apiFetch(`/admin/broadcasts/text?${params.toString()}`, token, { method: "POST" });
      setToast({ message: "Test broadcast sent.", tone: "ok" });
    } catch (err) {
      setToast({ message: "Test broadcast failed.", tone: "error" });
    }
  }

  function fillSampleClient() {
    setClientName("Sample Producer");
    setClientPayloads("simple_text_scroll, clock");
    setClientStep(1);
  }

  function fillSampleTemplate() {
    setTplName("Welcome Banner");
    setTplPayloadType("simple_text_scroll");
    setTplTemplate("{{message}}");
    setTplColor("#f0b429");
    setTemplateStep(1);
  }

  function fillSampleRule() {
    setRuleName("Lobby Defaults");
    setRuleTargets("disp_main");
    setRulePriority("10");
    setRuleTransition("fade");
    setRuleStep(1);
  }

  async function loadLogs() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, logs: true }));
    setErrors((prev) => ({ ...prev, logs: "" }));
    try {
      const res = await apiFetch<{ data: LogEvent[]; meta: ApiMeta }>(
        `/admin/logs?page=${page.logs}&page_size=${pageSize}`,
        token
      );
      setLogs(res.data || []);
    } catch (err) {
      setErrors((prev) => ({ ...prev, logs: err instanceof Error ? err.message : "Failed to load logs." }));
      setLogs([]);
    } finally {
      setLoading((prev) => ({ ...prev, logs: false }));
    }
  }

  async function loadBroadcasts() {
    if (!tokenReady) return;
    setLoading((prev) => ({ ...prev, broadcasts: true }));
    setErrors((prev) => ({ ...prev, broadcasts: "" }));
    try {
      const res = await apiFetch<{ data: LogEvent[]; meta: ApiMeta }>(
        `/admin/logs?level=info&page=${page.broadcasts}&page_size=${pageSize}`,
        token
      );
      const broadcasts = (res.data || []).filter((log) =>
        log.message === "broadcast_text" || log.message === "broadcast_commands"
      );
      setBroadcastHistory(broadcasts);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        broadcasts: err instanceof Error ? err.message : "Failed to load broadcasts.",
      }));
      setBroadcastHistory([]);
    } finally {
      setLoading((prev) => ({ ...prev, broadcasts: false }));
    }
  }

  async function loadAll() {
    await Promise.all([
      loadMonitoring(),
      loadClients(),
      loadTemplates(),
      loadRules(),
      loadDisplays(),
      loadLogs(),
      loadBroadcasts(),
    ]);
  }

  async function saveToken() {
    if (!tokenReady) return;
    localStorage.setItem("admin_token", token);
    setTokenStatus("Token saved");
    setToast({ message: "Token saved.", tone: "ok" });
    await loadAll();
  }

  async function rotateToken() {
    if (!tokenReady) return;
    const res = await apiFetch<{ admin_token: string }>("/bootstrap/rotate-admin-token", token, { method: "POST" });
    setToken(res.admin_token);
    localStorage.setItem("admin_token", res.admin_token);
    setTokenStatus("Token rotated");
    setToast({ message: "Token rotated.", tone: "ok" });
    await loadAll();
  }

  async function restartRouter() {
    if (!tokenReady) return;
    setTokenStatus("Restarting router...");
    await apiFetch("/admin/restart-router", token, { method: "POST" });
    setTokenStatus("Restart requested");
    setToast({ message: "Router restart requested.", tone: "ok" });
  }

  async function createClient() {
    if (!tokenReady) return;
    if (!clientName.trim()) {
      setFormErrors((prev) => ({ ...prev, client: "Client name is required." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, client: "" }));
    const payloadTypes = clientPayloads
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      await apiFetch("/api/clients", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientName, payload_types: payloadTypes }),
      });
      setClientName("");
      setClientPayloads("");
      setToast({ message: "Client created.", tone: "ok" });
      await loadClients();
    } catch (err) {
      setErrors((prev) => ({ ...prev, clients: err instanceof Error ? err.message : "Failed to create client." }));
      setToast({ message: "Failed to create client.", tone: "error" });
    }
  }

  async function updateClient(clientId: string, name: string) {
    if (!tokenReady) return;
    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, clients: "Client name cannot be empty." }));
      setToast({ message: "Client name cannot be empty.", tone: "error" });
      return;
    }
    try {
      await apiFetch(`/admin/clients/${clientId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setToast({ message: "Client updated.", tone: "ok" });
      await loadClients();
    } catch (err) {
      setErrors((prev) => ({ ...prev, clients: err instanceof Error ? err.message : "Failed to update client." }));
      setToast({ message: "Failed to update client.", tone: "error" });
    }
  }

  async function disableClient(clientId: string) {
    if (!tokenReady) return;
    if (!confirm("Disable this client? It will no longer be able to send payloads.")) return;
    try {
      await apiFetch(`/admin/clients/${clientId}`, token, { method: "DELETE" });
      setToast({ message: "Client disabled.", tone: "ok" });
      await loadClients();
    } catch (err) {
      setErrors((prev) => ({ ...prev, clients: err instanceof Error ? err.message : "Failed to disable client." }));
      setToast({ message: "Failed to disable client.", tone: "error" });
    }
  }

  async function createTemplate() {
    if (!tokenReady) return;
    if (!tplName.trim() || !tplPayloadType.trim() || !tplTemplate.trim()) {
      setFormErrors((prev) => ({ ...prev, template: "Name, payload type, and template are required." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, template: "" }));
    try {
      await apiFetch("/admin/templates", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tplName,
          payload_type: tplPayloadType,
          template: tplTemplate,
          default_style: { color: tplColor },
        }),
      });
      setTplName("");
      setTplPayloadType("");
      setTplTemplate("");
      setTplColor("#ffffff");
      setToast({ message: "Template created.", tone: "ok" });
      await loadTemplates();
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to create template." }));
      setToast({ message: "Failed to create template.", tone: "error" });
    }
  }

  async function updateTemplate(templateId: string, name: string) {
    if (!tokenReady) return;
    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, templates: "Template name cannot be empty." }));
      setToast({ message: "Template name cannot be empty.", tone: "error" });
      return;
    }
    try {
      await apiFetch(`/admin/templates/${templateId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setToast({ message: "Template updated.", tone: "ok" });
      await loadTemplates();
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to update template." }));
      setToast({ message: "Failed to update template.", tone: "error" });
    }
  }

  async function updateTemplatePayloadType(templateId: string, payloadType: string) {
    if (!tokenReady) return;
    if (!payloadType.trim()) {
      setErrors((prev) => ({ ...prev, templates: "Payload type cannot be empty." }));
      setToast({ message: "Payload type cannot be empty.", tone: "error" });
      return;
    }
    try {
      await apiFetch(`/admin/templates/${templateId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload_type: payloadType }),
      });
      setToast({ message: "Template payload type updated.", tone: "ok" });
      await loadTemplates();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        templates: err instanceof Error ? err.message : "Failed to update payload type.",
      }));
      setToast({ message: "Failed to update payload type.", tone: "error" });
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!tokenReady) return;
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await apiFetch(`/admin/templates/${templateId}`, token, { method: "DELETE" });
      setToast({ message: "Template deleted.", tone: "ok" });
      await loadTemplates();
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to delete template." }));
      setToast({ message: "Failed to delete template.", tone: "error" });
    }
  }

  async function createRule() {
    if (!tokenReady) return;
    if (!ruleName.trim()) {
      setFormErrors((prev) => ({ ...prev, rule: "Rule name is required." }));
      return;
    }
    if (!ruleTargets.trim()) {
      setFormErrors((prev) => ({ ...prev, rule: "At least one display target is required." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, rule: "" }));
    const targets = ruleTargets
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const priority = Number.parseInt(rulePriority || "0", 10);
    try {
      await apiFetch("/admin/rules", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          match: {
            client_id: ruleClientId || undefined,
            payload_type: rulePayloadType || undefined,
          },
          priority: Number.isFinite(priority) ? priority : 0,
          display_targets: targets,
          transition: { type: ruleTransition },
        }),
      });
      setRuleName("");
      setRuleClientId("");
      setRulePayloadType("");
      setRuleTargets("");
      setRulePriority("");
      setRuleTransition("fade");
      setToast({ message: "Rule created.", tone: "ok" });
      await loadRules();
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to create rule." }));
      setToast({ message: "Failed to create rule.", tone: "error" });
    }
  }

  async function updateRule(ruleId: string, priority: number) {
    if (!tokenReady) return;
    if (!Number.isFinite(priority)) {
      setErrors((prev) => ({ ...prev, rules: "Priority must be a number." }));
      setToast({ message: "Priority must be a number.", tone: "error" });
      return;
    }
    try {
      await apiFetch(`/admin/rules/${ruleId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      setToast({ message: "Rule updated.", tone: "ok" });
      await loadRules();
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to update rule." }));
      setToast({ message: "Failed to update rule.", tone: "error" });
    }
  }

  async function deleteRule(ruleId: string) {
    if (!tokenReady) return;
    if (!confirm("Delete this rule? This cannot be undone.")) return;
    try {
      await apiFetch(`/admin/rules/${ruleId}`, token, { method: "DELETE" });
      setToast({ message: "Rule deleted.", tone: "ok" });
      await loadRules();
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to delete rule." }));
      setToast({ message: "Failed to delete rule.", tone: "error" });
    }
  }

  async function sendBroadcast() {
    if (!tokenReady) return;
    if (!broadcastText.trim()) {
      setFormErrors((prev) => ({ ...prev, broadcast: "Broadcast message is required." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, broadcast: "" }));
    const params = new URLSearchParams();
    params.set("text", broadcastText);
    if (broadcastTargets.trim()) {
      broadcastTargets
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((id) => params.append("display_ids", id));
      params.set("all_displays", "false");
    }
    if (broadcastColor) params.set("color", broadcastColor);
    if (broadcastScroll) params.set("scroll_ms_per_px", broadcastScroll);
    if (broadcastDuration) params.set("duration_seconds", broadcastDuration);
    try {
      await apiFetch(`/admin/broadcasts/text?${params.toString()}`, token, { method: "POST" });
      setBroadcastStatus("Broadcast sent.");
      setToast({ message: "Broadcast sent.", tone: "ok" });
    } catch (err) {
      setBroadcastStatus(err instanceof Error ? err.message : "Broadcast failed.");
      setToast({ message: "Broadcast failed.", tone: "error" });
    }
  }

  async function sendCommandBroadcast() {
    if (!tokenReady || !commandStream.trim()) return;
    let commands: unknown;
    try {
      commands = JSON.parse(commandStream);
    } catch (err) {
      setCommandError("Invalid JSON.");
      setCommandStatus("Invalid JSON.");
      return;
    }
    if (!Array.isArray(commands)) {
      setCommandError("Commands must be a JSON array.");
      return;
    }
    const invalidIndex = (commands as Array<Record<string, unknown>>).findIndex(
      (cmd) => !cmd || typeof cmd !== "object" || typeof cmd.op !== "string"
    );
    if (invalidIndex >= 0) {
      setCommandError(`commands[${invalidIndex}].op is required`);
      return;
    }
    setCommandError("");
    const params = new URLSearchParams();
    if (commandTargets.trim()) {
      commandTargets
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((id) => params.append("display_ids", id));
      params.set("all_displays", "false");
    }
    try {
      await apiFetch(`/admin/broadcasts/commands?${params.toString()}`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commands),
      });
      setCommandStatus("Command broadcast sent.");
      setToast({ message: "Command broadcast sent.", tone: "ok" });
    } catch (err) {
      setCommandStatus(err instanceof Error ? err.message : "Command broadcast failed.");
      setToast({ message: "Command broadcast failed.", tone: "error" });
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
    setCommandStream(JSON.stringify(sample, null, 2));
  }

  async function replayLog(logId: string) {
    if (!tokenReady) return;
    try {
      await apiFetch(`/admin/logs/${logId}/replay`, token, { method: "POST" });
      setTokenStatus("Replay sent.");
      setToast({ message: "Replay sent.", tone: "ok" });
    } catch (err) {
      setTokenStatus(err instanceof Error ? err.message : "Replay failed.");
      setToast({ message: "Replay failed.", tone: "error" });
    }
  }

  async function copyPayloadId(payloadId?: string) {
    if (!payloadId) return;
    try {
      await navigator.clipboard.writeText(payloadId);
      setToast({ message: "Payload ID copied.", tone: "ok" });
    } catch {
      setToast({ message: "Failed to copy payload ID.", tone: "error" });
    }
  }

  function buildPayloadEditor() {
    const schema = payloadSchemas[payloadEditorType];
    if (!schema) return { payload_type: payloadEditorType, data: {} };
    const data: Record<string, unknown> = {};
    schema.fields.forEach((field) => {
      const raw = payloadEditorFields[field.key];
      if (raw === undefined || raw === "") return;
      if (field.type === "number") {
        const num = Number.parseInt(raw, 10);
        data[field.key] = Number.isFinite(num) ? num : raw;
      } else {
        data[field.key] = raw;
      }
    });
    if (payloadEditorType === "simple_text_page" && typeof data.lines === "string") {
      data.lines = (data.lines as string).split(",").map((value) => value.trim()).filter(Boolean);
    }
    return { payload_type: payloadEditorType, data };
  }

  async function copyPayloadJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildPayloadEditor(), null, 2));
      setToast({ message: "Payload JSON copied.", tone: "ok" });
    } catch {
      setToast({ message: "Failed to copy payload JSON.", tone: "error" });
    }
  }

  const filteredLogs = logs.filter((log) =>
    logFilter ? log.message.toLowerCase().includes(logFilter.toLowerCase()) : true
  );
  const filteredClients = clients.filter((client) =>
    clientFilter ? client.name.toLowerCase().includes(clientFilter.toLowerCase()) : true
  );
  const filteredTemplates = templates.filter((template) =>
    templateFilter
      ? `${template.name} ${template.payload_type}`.toLowerCase().includes(templateFilter.toLowerCase())
      : true
  );
  const filteredRules = rules.filter((rule) =>
    ruleFilter ? rule.name.toLowerCase().includes(ruleFilter.toLowerCase()) : true
  );

  const selectedDisplayStatus = monitoring.displays.find(
    (display) => display.display_id === selectedDisplay?.id
  );

  useEffect(() => {
    if (!selectedDisplay?.id) return;
    const node = document.getElementById(`monitor-${selectedDisplay.id}`);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedDisplay?.id]);

  return (
    <div className="min-h-screen">
      {toast && (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={`rounded-2xl px-4 py-3 text-sm shadow-lift ${
              toast.tone === "ok" ? "bg-pine/90 text-white" : "bg-clay/90 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
      <header className="relative overflow-hidden border-b border-ink/10 bg-sand/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate">Display Router</p>
            <h1 className="font-display text-4xl text-ink md:text-5xl">Admin Control Room</h1>
            <p className="max-w-xl text-base text-slate">
              A staging ground for display orchestration, payload lifecycle, and live previews.
            </p>
          </div>
          <div className="relative rounded-2xl border border-ink/10 bg-white/70 p-4 shadow-lift backdrop-blur">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-clay/20 blur-2xl" />
            <div className="grid gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate">Admin Token</p>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm"
                  placeholder="Paste admin token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-xl bg-ink px-4 py-2 text-sm text-sand"
                    onClick={saveToken}
                    disabled={!tokenReady}
                  >
                    Save
                  </button>
                  <button
                    className="rounded-xl border border-ink/20 px-4 py-2 text-sm text-ink"
                    onClick={rotateToken}
                    disabled={!tokenReady}
                  >
                    Rotate
                  </button>
                  <button
                    className="rounded-xl border border-ink/20 px-4 py-2 text-sm text-ink"
                    onClick={restartRouter}
                    disabled={!tokenReady}
                  >
                    Restart
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate">
                <span className="inline-flex h-2 w-2 animate-float rounded-full bg-pine" />
                {tokenStatus}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 shadow-inset">
            <p className="text-xs uppercase tracking-[0.2em] text-slate">Sections</p>
            <nav className="mt-4 grid gap-2 text-sm">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-lg px-3 py-2 text-ink transition hover:bg-fog"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 shadow-inset">
            <p className="text-xs uppercase tracking-[0.2em] text-slate">Quick Actions</p>
            <div className="mt-4 grid gap-2 text-sm">
              <button className="rounded-lg border border-ink/10 bg-sand px-3 py-2 text-left text-ink" onClick={loadAll}>
                Refresh dashboards
              </button>
              <button
                className="rounded-lg border border-ink/10 bg-sand px-3 py-2 text-left text-ink"
                onClick={() => window.open(simUrl, "_blank")}
              >
                Open preview wall
              </button>
              <button className="rounded-lg border border-ink/10 bg-sand px-3 py-2 text-left text-ink" onClick={restartRouter}>
                Restart router
              </button>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <section id="monitoring" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Monitoring</h2>
                <p className="text-sm text-slate">Live health, payload throughput, and display presence.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {statusCards.map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${card.tone}`}
                  >
                    {card.label}: {card.value}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Router</p>
                <p className="mt-2 text-sm text-ink">{monitoring.router_status}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Monitoring Summary</p>
                <p className="mt-2 text-sm text-ink">{monitoring.router_time || "--"}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Display Status</p>
                <p className="mt-2 text-sm text-ink">{monitoring.displays.length} tracked</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate">
              <span className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-pine">
                <span className="h-2 w-2 rounded-full bg-pine" /> Online
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-clay/10 px-3 py-1 text-clay">
                <span className="h-2 w-2 rounded-full bg-clay" /> Offline
              </span>
            </div>
            {errors.monitoring && (
              <p className="mt-4 text-sm text-clay">{errors.monitoring}</p>
            )}
            <div className="mt-6 grid gap-2 text-sm text-slate">
              {loading.monitoring && <p>Loading monitoring data...</p>}
              {!loading.monitoring && monitoring.displays.length === 0 && <p>No display data yet.</p>}
              {monitoring.displays.map((display) => (
                <div
                  key={display.display_id}
                  id={`monitor-${display.display_id}`}
                  className="rounded-2xl border border-ink/10 bg-white/70 p-3"
                >
                  <span className="font-medium text-ink">{display.display_id}</span>
                  <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate">
                    {display.connected ? "online" : "offline"}
                  </span>
                  {display.last_payload_id && (
                    <span className="ml-2 text-xs text-slate">Last: {display.last_payload_id}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section id="clients" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Clients</h2>
                <p className="text-sm text-slate">Register producers and their payload types.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                  placeholder="Search clients"
                  value={clientFilter}
                  onChange={(event) => setClientFilter(event.target.value)}
                />
                <button className="rounded-full bg-ink px-4 py-2 text-sm text-sand" onClick={loadClients}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Create Client</p>
                <div className="mt-3 grid gap-2">
                  {clientStep === 1 && (
                    <>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Client name"
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg bg-ink px-3 py-2 text-sm text-sand" onClick={() => setClientStep(2)}>
                          Next
                        </button>
                      </div>
                    </>
                  )}
                  {clientStep === 2 && (
                    <>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Payload types</label>
                      <select
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={clientPayloads}
                        onChange={(event) => setClientPayloads(event.target.value)}
                      >
                        <option value="">Select default</option>
                        {payloadTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Additional payload types (comma separated)"
                        onChange={(event) => setClientPayloads(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-ink/10 bg-sand px-3 py-2 text-sm text-ink" onClick={() => setClientStep(1)}>
                          Back
                        </button>
                        <button className="rounded-lg bg-clay px-3 py-2 text-sm text-white" onClick={createClient}>
                          Create
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {formErrors.client && <p className="mt-2 text-xs text-clay">{formErrors.client}</p>}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Active Clients</p>
                <div className="mt-3 space-y-2 text-sm text-slate">
                  {loading.clients && <p>Loading clients...</p>}
                  {!loading.clients && clients.length === 0 && (
                    <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                      No clients yet. <button className="ml-2 underline" onClick={fillSampleClient}>Fill sample</button>
                    </div>
                  )}
                  {filteredClients.map((client) => (
                    <div key={client.id} className="flex flex-col gap-2 rounded-lg bg-white/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate">{client.id}</span>
                        <button
                          className="rounded-full border border-ink/20 px-2 py-1 text-xs text-ink"
                          onClick={() => disableClient(client.id)}
                        >
                          Disable
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                          defaultValue={client.name}
                          onBlur={(event) => updateClient(client.id, event.target.value)}
                        />
                        <button
                          className="rounded-lg border border-ink/10 bg-sand px-3 py-1 text-xs text-ink"
                          onClick={(event) => {
                            const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null);
                            if (input) updateClient(client.id, input.value);
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.clients && <p className="mt-3 text-xs text-clay">{errors.clients}</p>}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate">
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, clients: Math.max(1, prev.clients - 1) }))}
              >
                Prev
              </button>
              <span>Page {page.clients}</span>
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, clients: prev.clients + 1 }))}
              >
                Next
              </button>
              <button className="rounded-full border border-ink/20 px-3 py-1" onClick={loadClients}>
                Load
              </button>
            </div>
          </section>

          <section id="templates" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Templates</h2>
                <p className="text-sm text-slate">Curate Jinja templates for rendering payloads.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                  placeholder="Search templates"
                  value={templateFilter}
                  onChange={(event) => setTemplateFilter(event.target.value)}
                />
                <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={loadTemplates}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4 md:col-span-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Create Template</p>
                <div className="mt-3 grid gap-2">
                  {templateStep === 1 && (
                    <>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Template name"
                        value={tplName}
                        onChange={(event) => setTplName(event.target.value)}
                      />
                      <select
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={tplPayloadType}
                        onChange={(event) => setTplPayloadType(event.target.value)}
                      >
                        <option value="">Select payload type</option>
                        {payloadTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg bg-ink px-3 py-2 text-sm text-sand" onClick={() => setTemplateStep(2)}>
                          Next
                        </button>
                      </div>
                    </>
                  )}
                  {templateStep === 2 && (
                    <>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Template string"
                        value={tplTemplate}
                        onChange={(event) => setTplTemplate(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-10 w-12 rounded-lg border border-ink/10 bg-white"
                          value={tplColor}
                          onChange={(event) => setTplColor(event.target.value)}
                        />
                        {colorPresets.map((preset) => (
                          <button
                            key={preset}
                            className="h-8 w-8 rounded-full border border-ink/10"
                            style={{ backgroundColor: preset }}
                            onClick={() => setTplColor(preset)}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-ink/10 bg-sand px-3 py-2 text-sm text-ink" onClick={() => setTemplateStep(1)}>
                          Back
                        </button>
                        <button className="rounded-lg bg-clay px-3 py-2 text-sm text-white" onClick={createTemplate}>
                          Create
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {formErrors.template && <p className="mt-2 text-xs text-clay">{formErrors.template}</p>}
              </div>
              {filteredTemplates.map((tpl) => (
                <div key={tpl.id} className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">{tpl.payload_type}</p>
                    <button
                      className="rounded-full border border-ink/20 px-2 py-1 text-xs text-ink"
                      onClick={() => deleteTemplate(tpl.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="w-full rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                      defaultValue={tpl.name}
                      onBlur={(event) => updateTemplate(tpl.id, event.target.value)}
                    />
                    <button
                      className="rounded-lg border border-ink/10 bg-sand px-3 py-1 text-xs text-ink"
                      onClick={(event) => {
                        const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null);
                        if (input) updateTemplate(tpl.id, input.value);
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="w-full rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                      defaultValue={tpl.payload_type}
                      onBlur={(event) => updateTemplatePayloadType(tpl.id, event.target.value)}
                    />
                    <button
                      className="rounded-lg border border-ink/10 bg-sand px-3 py-1 text-xs text-ink"
                      onClick={(event) => {
                        const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null);
                        if (input) updateTemplatePayloadType(tpl.id, input.value);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
              {loading.templates && <p className="text-sm text-slate">Loading templates...</p>}
              {!loading.templates && templates.length === 0 && (
                <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                  No templates yet. <button className="ml-2 underline" onClick={fillSampleTemplate}>Fill sample</button>
                </div>
              )}
            </div>
            {errors.templates && <p className="mt-3 text-xs text-clay">{errors.templates}</p>}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate">
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, templates: Math.max(1, prev.templates - 1) }))}
              >
                Prev
              </button>
              <span>Page {page.templates}</span>
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, templates: prev.templates + 1 }))}
              >
                Next
              </button>
              <button className="rounded-full border border-ink/20 px-3 py-1" onClick={loadTemplates}>
                Load
              </button>
            </div>
          </section>

          <section id="rules" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Rules</h2>
                <p className="text-sm text-slate">Route payloads to displays with schedules and priorities.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                  placeholder="Search rules"
                  value={ruleFilter}
                  onChange={(event) => setRuleFilter(event.target.value)}
                />
                <button className="rounded-full bg-ink px-4 py-2 text-sm text-sand" onClick={loadRules}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Create Rule</p>
                <div className="mt-3 grid gap-2">
                  {ruleStep === 1 && (
                    <>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Rule name"
                        value={ruleName}
                        onChange={(event) => setRuleName(event.target.value)}
                      />
                      <select
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={rulePayloadType}
                        onChange={(event) => setRulePayloadType(event.target.value)}
                      >
                        <option value="">Match payload type</option>
                        {payloadTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Match client_id (optional)"
                        value={ruleClientId}
                        onChange={(event) => setRuleClientId(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg bg-ink px-3 py-2 text-sm text-sand" onClick={() => setRuleStep(2)}>
                          Next
                        </button>
                      </div>
                    </>
                  )}
                  {ruleStep === 2 && (
                    <>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Display targets (comma separated)"
                        value={ruleTargets}
                        onChange={(event) => setRuleTargets(event.target.value)}
                      />
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Priority"
                        value={rulePriority}
                        onChange={(event) => setRulePriority(event.target.value)}
                      />
                      <select
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={ruleTransition}
                        onChange={(event) => setRuleTransition(event.target.value)}
                      >
                        {transitionOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-ink/10 bg-sand px-3 py-2 text-sm text-ink" onClick={() => setRuleStep(1)}>
                          Back
                        </button>
                        <button className="rounded-lg bg-clay px-3 py-2 text-sm text-white" onClick={createRule}>
                          Create
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {formErrors.rule && <p className="mt-2 text-xs text-clay">{formErrors.rule}</p>}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Active Rules</p>
                <div className="mt-3 space-y-2 text-sm text-slate">
                  {loading.rules && <p>Loading rules...</p>}
                  {!loading.rules && rules.length === 0 && (
                    <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                      No rules yet. <button className="ml-2 underline" onClick={fillSampleRule}>Fill sample</button>
                    </div>
                  )}
                  {filteredRules.map((rule) => (
                    <div key={rule.id} className="rounded-lg bg-white/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-ink">{rule.name}</p>
                        <button
                          className="rounded-full border border-ink/20 px-2 py-1 text-xs text-ink"
                          onClick={() => deleteRule(rule.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          className="w-24 rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs text-ink"
                          defaultValue={rule.priority ?? 0}
                          onBlur={(event) => updateRule(rule.id, Number.parseInt(event.target.value || "0", 10))}
                        />
                        <button
                          className="rounded-lg border border-ink/10 bg-sand px-3 py-1 text-xs text-ink"
                          onClick={(event) => {
                            const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null);
                            if (input) updateRule(rule.id, Number.parseInt(input.value || "0", 10));
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.rules && <p className="mt-3 text-xs text-clay">{errors.rules}</p>}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate">
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, rules: Math.max(1, prev.rules - 1) }))}
              >
                Prev
              </button>
              <span>Page {page.rules}</span>
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, rules: prev.rules + 1 }))}
              >
                Next
              </button>
              <button className="rounded-full border border-ink/20 px-3 py-1" onClick={loadRules}>
                Load
              </button>
            </div>
          </section>

          <section id="displays" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Displays</h2>
                <p className="text-sm text-slate">Manage connected matrices and their capabilities.</p>
              </div>
              <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={loadDisplays}>
                Refresh
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Create Display</p>
                <div className="mt-3 grid gap-2">
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Display name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Host"
                    value={displayHost}
                    onChange={(event) => setDisplayHost(event.target.value)}
                  />
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Port"
                    value={displayPort}
                    onChange={(event) => setDisplayPort(event.target.value)}
                  />
                  <button className="rounded-lg bg-clay px-3 py-2 text-sm text-white" onClick={createDisplay}>
                    Create
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {loading.displays && <p className="text-sm text-slate">Loading displays...</p>}
              {!loading.displays && displays.length === 0 && (
                <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                  No displays yet. Create one from the router admin API.
                </div>
              )}
              {displays.map((disp) => (
                <div
                  key={disp.id}
                  className="rounded-2xl border border-ink/10 bg-sand/60 p-4 text-left transition hover:bg-white/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button className="text-sm font-medium text-ink" onClick={() => setSelectedDisplay(disp)}>
                      {disp.name}
                    </button>
                    <button
                      className="rounded-full border border-ink/20 px-2 py-1 text-xs text-ink"
                      onClick={() => disableDisplay(disp.id)}
                    >
                      Disable
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-slate">
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs text-ink"
                      defaultValue={disp.name}
                      onBlur={(event) => updateDisplay(disp.id, { name: event.target.value })}
                    />
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs text-ink"
                      defaultValue={disp.host}
                      onBlur={(event) => updateDisplay(disp.id, { host: event.target.value })}
                    />
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs text-ink"
                      defaultValue={disp.port}
                      onBlur={(event) => updateDisplay(disp.id, { port: Number.parseInt(event.target.value || "0", 10) })}
                    />
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-ink/10 bg-sand px-2 py-1 text-xs text-ink"
                        onClick={() => setSelectedDisplay(disp)}
                      >
                        View details
                      </button>
                      <button
                        className="rounded-lg border border-ink/10 bg-ink px-2 py-1 text-xs text-sand"
                        onClick={() => testDisplay(disp.id)}
                      >
                        Test display
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selectedDisplay && (
              <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{selectedDisplay.name}</p>
                    <p className="text-xs text-slate">{selectedDisplay.id}</p>
                  </div>
                  <button
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                    onClick={() => setSelectedDisplay(null)}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate">
                  <p>Host: {selectedDisplay.host}:{selectedDisplay.port}</p>
                  <p>Status: {selectedDisplayStatus?.connected ? "online" : "offline"}</p>
                  {selectedDisplayStatus?.last_payload_id && (
                    <p>Last payload: {selectedDisplayStatus.last_payload_id}</p>
                  )}
                  {selectedDisplay.capabilities && (
                    <div className="rounded-lg bg-sand/80 p-2 text-xs text-slate">
                      <p className="uppercase tracking-[0.2em] text-[10px] text-slate">Capabilities</p>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-ink">
                        {JSON.stringify(selectedDisplay.capabilities, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-ink px-3 py-1 text-xs text-sand"
                    onClick={() => window.open(simUrl, "_blank")}
                  >
                    Open preview
                  </button>
                  <button
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                    onClick={loadMonitoring}
                  >
                    Refresh status
                  </button>
                </div>
                <div className="mt-4 rounded-xl border border-ink/10 bg-white/60 p-2">
                  <iframe title="Display preview" className="h-40 w-full rounded-lg" src={simUrl} />
                </div>
              </div>
            )}
            {errors.displays && <p className="mt-3 text-xs text-clay">{errors.displays}</p>}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate">
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, displays: Math.max(1, prev.displays - 1) }))}
              >
                Prev
              </button>
              <span>Page {page.displays}</span>
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, displays: prev.displays + 1 }))}
              >
                Next
              </button>
              <button className="rounded-full border border-ink/20 px-3 py-1" onClick={loadDisplays}>
                Load
              </button>
            </div>
          </section>

          <section id="logs" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Logs</h2>
                <p className="text-sm text-slate">Filter events, replay payloads, and audit history.</p>
              </div>
              <input
                className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                placeholder="Filter by message"
                value={logFilter}
                onChange={(event) => setLogFilter(event.target.value)}
              />
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate">
              {loading.logs && <div className="rounded-2xl border border-ink/10 bg-sand/60 p-3">Loading logs...</div>}
              {!loading.logs && filteredLogs.length === 0 && (
                <div className="rounded-2xl border border-ink/10 bg-sand/60 p-3">No logs loaded yet.</div>
              )}
              {filteredLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-ink/10 bg-sand/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-ink">{log.message}</p>
                      <p className="text-xs text-slate">{log.created_at}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof log.context?.payload_id === "string" && (
                        <button
                          className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                          onClick={() => copyPayloadId(log.context?.payload_id as string)}
                        >
                          Copy payload
                        </button>
                      )}
                      {log.message === "payload_received" && (
                        <button
                          className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                          onClick={() => replayLog(log.id)}
                        >
                          Replay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.logs && <p className="mt-3 text-xs text-clay">{errors.logs}</p>}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate">
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, logs: Math.max(1, prev.logs - 1) }))}
              >
                Prev
              </button>
              <span>Page {page.logs}</span>
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, logs: prev.logs + 1 }))}
              >
                Next
              </button>
              <button className="rounded-full border border-ink/20 px-3 py-1" onClick={loadLogs}>
                Load
              </button>
            </div>
          </section>

          <section id="broadcast-history" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Broadcast History</h2>
                <p className="text-sm text-slate">Recent broadcast_text and broadcast_commands entries.</p>
              </div>
              <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={loadBroadcasts}>
                Refresh
              </button>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate">
              {loading.broadcasts && <div className="rounded-2xl border border-ink/10 bg-sand/60 p-3">Loading broadcasts...</div>}
              {!loading.broadcasts && broadcastHistory.length === 0 && (
                <div className="rounded-2xl border border-ink/10 bg-sand/60 p-3">No broadcasts yet.</div>
              )}
              {broadcastHistory.map((log) => (
                <div key={log.id} className="rounded-2xl border border-ink/10 bg-sand/60 p-3">
                  <p className="text-ink">{log.message}</p>
                  <p className="text-xs text-slate">{log.created_at}</p>
                </div>
              ))}
            </div>
            {errors.broadcasts && <p className="mt-3 text-xs text-clay">{errors.broadcasts}</p>}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate">
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, broadcasts: Math.max(1, prev.broadcasts - 1) }))}
              >
                Prev
              </button>
              <span>Page {page.broadcasts}</span>
              <button
                className="rounded-full border border-ink/20 px-3 py-1"
                onClick={() => setPage((prev) => ({ ...prev, broadcasts: prev.broadcasts + 1 }))}
              >
                Next
              </button>
              <button className="rounded-full border border-ink/20 px-3 py-1" onClick={loadBroadcasts}>
                Load
              </button>
            </div>
          </section>

          <section id="payload-editor" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Payload Editor</h2>
                <p className="text-sm text-slate">Schema-guided payload builder with JSON output.</p>
              </div>
              <button
                className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink"
                onClick={copyPayloadJson}
              >
                Copy JSON
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Payload type</label>
                <select
                  className="mt-2 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                  value={payloadEditorType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPayloadEditorType(next);
                    setPayloadEditorFields({});
                  }}
                >
                  {payloadTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="mt-4 grid gap-2">
                  {(payloadSchemas[payloadEditorType]?.fields || []).map((field) => (
                    <div key={field.key} className="grid gap-1">
                      <label className="text-xs text-slate">{field.label}</label>
                      {field.type === "color" ? (
                        <input
                          type="color"
                          className="h-10 w-16 rounded-lg border border-ink/10 bg-white"
                          value={payloadEditorFields[field.key] || "#ffffff"}
                          onChange={(event) =>
                            setPayloadEditorFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                        />
                      ) : (
                        <input
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          value={payloadEditorFields[field.key] || ""}
                          onChange={(event) =>
                            setPayloadEditorFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Payload JSON</p>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs text-ink">
                  {JSON.stringify(buildPayloadEditor(), null, 2)}
                </pre>
              </div>
            </div>
          </section>

          <section id="sim" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Simulator</h2>
                <p className="text-sm text-slate">Preview payloads and templates against a live sim display.</p>
              </div>
              <button className="rounded-full bg-pine px-4 py-2 text-sm text-white" onClick={() => window.open(simUrl, "_blank")}>
                Open playground
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-ink/10 bg-sand/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate">Embed</p>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                  value={simUrl}
                  onChange={(event) => setSimUrl(event.target.value)}
                />
                <button
                  className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm text-ink"
                  onClick={() => localStorage.setItem("playground_url", simUrl)}
                >
                  Save URL
                </button>
              </div>
              <div className="mt-4 h-48 rounded-xl border border-ink/10 bg-white/60" />
            </div>
          </section>

          <section id="broadcast" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Broadcast</h2>
                <p className="text-sm text-slate">Push text, images, or animations to displays immediately.</p>
              </div>
              <button className="rounded-full bg-clay px-4 py-2 text-sm text-white" onClick={sendBroadcast}>
                Send
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Message</p>
                <textarea
                  className="mt-3 h-24 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                  placeholder="Type a broadcast message"
                  value={broadcastText}
                  onChange={(event) => setBroadcastText(event.target.value)}
                />
                {formErrors.broadcast && <p className="mt-2 text-xs text-clay">{formErrors.broadcast}</p>}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Targets</p>
                <div className="mt-3 grid gap-2">
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Display IDs"
                    value={broadcastTargets}
                    onChange={(event) => setBroadcastTargets(event.target.value)}
                  />
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Color (hex)"
                    value={broadcastColor}
                    onChange={(event) => setBroadcastColor(event.target.value)}
                  />
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Scroll ms/px"
                    value={broadcastScroll}
                    onChange={(event) => setBroadcastScroll(event.target.value)}
                  />
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Duration seconds"
                    value={broadcastDuration}
                    onChange={(event) => setBroadcastDuration(event.target.value)}
                  />
                  {broadcastStatus && <p className="text-xs text-slate">{broadcastStatus}</p>}
                </div>
              </div>
            </div>
          </section>

          <section id="broadcast-commands" className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Broadcast Commands</h2>
                <p className="text-sm text-slate">Send raw rgbmatrix command streams to displays.</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink"
                  onClick={loadCommandSample}
                >
                  Load Sample
                </button>
                <button className="rounded-full bg-ink px-4 py-2 text-sm text-sand" onClick={sendCommandBroadcast}>
                  Send Commands
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Command Stream (JSON)</p>
                <textarea
                  className="mt-3 h-48 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-mono"
                  value={commandStream}
                  onChange={(event) => setCommandStream(event.target.value)}
                />
                {commandError && <p className="mt-2 text-xs text-clay">{commandError}</p>}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Targets</p>
                <div className="mt-3 grid gap-2">
                  <input
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Display IDs (comma separated)"
                    value={commandTargets}
                    onChange={(event) => setCommandTargets(event.target.value)}
                  />
                  {commandStatus && <p className="text-xs text-slate">{commandStatus}</p>}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
