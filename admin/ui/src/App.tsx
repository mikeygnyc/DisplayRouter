import { useEffect, useMemo, useRef, useState } from "react";

const navItems = [
  { id: "monitoring", label: "Monitoring" },
  { id: "clients", label: "Clients" },
  { id: "templates", label: "Templates" },
  { id: "carousels", label: "Carousel" },
  { id: "rules", label: "Rules" },
  { id: "displays", label: "Displays" },
  { id: "logs", label: "Logs" },
  { id: "api-docs", label: "API Docs" },
  { id: "broadcast", label: "Broadcast" },
  { id: "broadcast-commands", label: "Commands" },
  { id: "broadcast-history", label: "History" },
  { id: "payload-editor", label: "Payloads" },
  { id: "jinja-scratchpad", label: "Jinja" },
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
const templatePayloadTypeOptions = [
  "simple_text_scroll",
  "simple_text_page",
  "rich_text_scroll",
  "rich_text_page",
  "billboard",
];

const transitionOptions = ["cut", "slide", "fade", "barn_door", "wipe"];

const formatLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const isRichTextType = (value: string) => richTextPayloadTypes.has(value);
const getTemplateStyleFields = (value: string) => templateStyleFieldsByType[value] || [];
const PAGE_BREAK = "\n---\n";
const isLineEntryPayloadType = (value: string) =>
  value === "simple_text_scroll" ||
  value === "simple_text_page" ||
  value === "rich_text_scroll" ||
  value === "rich_text_page" ||
  value === "billboard";
const isPagePayloadType = (value: string) => value === "simple_text_page" || value === "rich_text_page";
type LogCategory = "user" | "system" | "payload";
type LogSortField = "date" | "message";
type LogSortOrder = "asc" | "desc";

const colorPresets = ["#ffffff", "#f0b429", "#c57a3f", "#0f6b5b", "#1f1a16", "#ff595e", "#1982c4"];
const richTextPayloadTypes = new Set(["rich_text_scroll", "rich_text_page", "billboard"]);
const userActionLogMessages = new Set([
  "client_created",
  "client_updated",
  "client_disabled",
  "template_created",
  "template_updated",
  "template_deleted",
  "rule_created",
  "rule_updated",
  "rule_deleted",
  "display_created",
  "display_updated",
  "display_disabled",
  "broadcast_text",
  "broadcast_commands",
  "carousel_created",
  "carousel_updated",
  "carousel_deleted",
]);
const payloadRoutingLogMessages = new Set([
  "payload_received",
  "payload_routed",
  "payload_replayed",
  "payload_replay_dry_run",
]);
const systemLogMessages = new Set(["display_registered", "display_connected", "display_disconnected"]);
const logCategoryLabels: Record<LogCategory, string> = {
  user: "User Action Log",
  system: "System Log",
  payload: "Payload/Routing Log",
};
const formatLogCategoryTag = (category: LogCategory) => {
  if (category === "user") return "USER";
  if (category === "payload") return "PAY";
  return "SYS";
};
const getLogCategoryTone = (category: LogCategory) => {
  if (category === "user") return "text-sky-400";
  if (category === "payload") return "text-violet-400";
  return "text-emerald-400";
};
const formatLogLevel = (level?: string) => {
  const normalized = (level || "info").toUpperCase();
  if (normalized.startsWith("ERR")) return "ERR";
  if (normalized.startsWith("WARN")) return "WARN";
  if (normalized.startsWith("INFO")) return "INFO";
  return normalized.slice(0, 4);
};
const getLogLevelTone = (level?: string) => {
  const normalized = (level || "info").toLowerCase();
  if (normalized.startsWith("err")) return "text-red-400";
  if (normalized.startsWith("warn")) return "text-yellow-400";
  if (normalized.startsWith("info")) return "text-blue-400";
  return "text-gray-400";
};
const getLogCategory = (log: LogEvent): LogCategory => {
  const message = log.message;
  if (payloadRoutingLogMessages.has(message)) return "payload";
  if (userActionLogMessages.has(message)) return "user";
  if (systemLogMessages.has(message)) return "system";
  return "system";
};

const SIM_FRAME_WIDTH = 484;
const SIM_FRAME_HEIGHT = 274;
const SIM_HEADER_HEIGHT = 36;
const SIM_ASPECT = SIM_FRAME_WIDTH / SIM_FRAME_HEIGHT;
const parseLogTime = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const templateStyleFieldsByType: Record<
  string,
  { key: string; label: string; type: "text" | "number" | "color" }[]
> = {
  simple_text_scroll: [
    { key: "scroll_ms_per_px", label: "Scroll ms/px", type: "number" },
    { key: "colors", label: "Colors (JSON per line)", type: "text" },
  ],
  simple_text_page: [
    { key: "page_ms", label: "Page ms", type: "number" },
    { key: "colors", label: "Colors (JSON per page/line)", type: "text" },
  ],
  rich_text_scroll: [
    { key: "scroll_ms_per_px", label: "Scroll ms/px", type: "number" },
    { key: "colors", label: "Colors (JSON per line)", type: "text" },
  ],
  rich_text_page: [
    { key: "page_ms", label: "Page ms", type: "number" },
    { key: "colors", label: "Colors (JSON per page/line)", type: "text" },
  ],
  billboard: [{ key: "colors", label: "Colors (JSON per line)", type: "text" }],
  clock: [
    { key: "timezone", label: "Timezone", type: "text" },
    { key: "format", label: "Format", type: "text" },
    { key: "color", label: "Color", type: "color" },
  ],
  weather: [
    { key: "location", label: "Location", type: "text" },
    { key: "provider", label: "Provider", type: "text" },
    { key: "units", label: "Units", type: "text" },
    { key: "color", label: "Color", type: "color" },
  ],
  image: [
    { key: "scale", label: "Scale (fit/fill)", type: "text" },
    { key: "color", label: "Tint Color", type: "color" },
  ],
  animation: [
    { key: "fps", label: "FPS", type: "number" },
    { key: "loop", label: "Loop (true/false)", type: "text" },
  ],
  template: [
    { key: "scroll_ms_per_px", label: "Scroll ms/px", type: "number" },
    { key: "page_ms", label: "Page ms", type: "number" },
    { key: "colors", label: "Colors (comma separated)", type: "text" },
  ],
};

const payloadSchemas: Record<
  string,
  { label: string; fields: { key: string; label: string; type: "text" | "number" | "color" }[] }
> = {
  simple_text_scroll: {
    label: "Simple Text Scroll",
    fields: [
      { key: "text", label: "Text", type: "text" },
      { key: "scroll_ms_per_px", label: "Scroll ms/px", type: "number" },
    ],
  },
  simple_text_page: {
    label: "Simple Text Page",
    fields: [
      { key: "lines", label: "Lines (comma separated)", type: "text" },
      { key: "page_ms", label: "Page ms", type: "number" },
    ],
  },
  rich_text_scroll: {
    label: "Rich Text Scroll",
    fields: [
      { key: "text", label: "Rich Text", type: "text" },
      { key: "scroll_ms_per_px", label: "Scroll ms/px", type: "number" },
      { key: "colors", label: "Colors (JSON per line)", type: "text" },
    ],
  },
  rich_text_page: {
    label: "Rich Text Page",
    fields: [
      { key: "text", label: "Rich Text", type: "text" },
      { key: "page_ms", label: "Page ms", type: "number" },
      { key: "colors", label: "Colors (JSON per page/line)", type: "text" },
    ],
  },
  billboard: {
    label: "Billboard",
    fields: [
      { key: "text", label: "Rich Text", type: "text" },
      { key: "colors", label: "Colors (JSON per line)", type: "text" },
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

type TokenStatusResponse = {
  ready: boolean;
  source?: "config" | "env" | "missing" | "unknown";
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
  template: string;
  default_style?: { color?: string } & Record<string, unknown>;
};

type CarouselWindowRef = {
  payload_id?: string;
  client_id?: string;
  payload_type?: string;
  tags?: string[];
};

type CarouselWindow = {
  id: string;
  payload_ref: CarouselWindowRef;
  every_n_cycles?: number;
  enabled?: boolean;
};

type Carousel = {
  id: string;
  name: string;
  windows: CarouselWindow[];
  cadence_seconds: number;
  created_at: string;
};

type Rule = {
  id: string;
  name: string;
  priority?: number;
  display_targets?: string[];
  template_id?: string;
  match?: {
    client_id?: string;
    payload_type?: string;
    tags?: string[];
  };
  transition?: {
    type?: string;
    delay_ms?: number;
    duration_ms?: number;
    direction?: string;
    fade_in_ms?: number;
    fade_out_ms?: number;
    barn_direction?: string;
  };
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
  carousels: {
    carousel_id: string;
    current_window_id?: string;
    cycle: number;
    index: number;
    next_run_at?: string;
  }[];
};

const initialMonitoring: MonitoringSummary = {
  router_status: "unknown",
  router_time: "",
  payloads_received: 0,
  displays: [],
  carousels: [],
};

function getSavedToken() {
  return localStorage.getItem("admin_token") || "";
}

function buildApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (apiBase) return `${apiBase}${normalized}`;
  if (import.meta.env.DEV) return `http://localhost:8081${normalized}`;
  return `${window.location.origin}${normalized}`;
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = Object.assign({}, options.headers || {}, token ? { Authorization: `Bearer ${token}` } : {});
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const primaryUrl = buildApiUrl(path);
  const fallbackUrl =
    base && base !== "/" ? `${window.location.origin}${base}${normalized}` : `${window.location.origin}${normalized}`;

  const runFetch = async (url: string) => {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get("content-type") || "";
    return { res, contentType };
  };

  let res: Response;
  let contentType: string;
  try {
    ({ res, contentType } = await runFetch(primaryUrl));
  } catch {
    throw new Error("Load failed");
  }

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403 && text.includes("Invalid admin token")) {
      localStorage.removeItem("admin_token");
    }
    if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
      if (fallbackUrl !== primaryUrl) {
        ({ res, contentType } = await runFetch(fallbackUrl));
      } else {
        throw new Error("Server returned HTML instead of JSON. Check API base URL.");
      }
    } else {
      throw new Error(text || "Request failed");
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  const text = await res.text();
  if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
    throw new Error("Server returned HTML instead of JSON. Check API base URL.");
  }
  throw new Error(text || "Unexpected response");
}

function App() {
  const [token, setToken] = useState(getSavedToken());
  const [tokenStatus, setTokenStatus] = useState("Token not set");
  const [serverTokenReady, setServerTokenReady] = useState<boolean | null>(null);
  const [serverTokenSource, setServerTokenSource] = useState<TokenStatusResponse["source"]>("unknown");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [showTokenPanel, setShowTokenPanel] = useState(true);
  const [didAutoLoadToken, setDidAutoLoadToken] = useState(false);
  const [activeTab, setActiveTab] = useState("monitoring");
  const [monitoring, setMonitoring] = useState<MonitoringSummary>(initialMonitoring);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [displays, setDisplays] = useState<DisplayTarget[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [meta, setMeta] = useState({
    clients: { page: 1, page_size: 25, total: 0 },
    templates: { page: 1, page_size: 25, total: 0 },
    carousels: { page: 1, page_size: 25, total: 0 },
    rules: { page: 1, page_size: 25, total: 0 },
    displays: { page: 1, page_size: 25, total: 0 },
    logs: { page: 1, page_size: 25, total: 0 },
    broadcasts: { page: 1, page_size: 25, total: 0 },
  });
  const [logFilter, setLogFilter] = useState("");
  const [logSortField, setLogSortField] = useState<LogSortField>("date");
  const [logSortOrder, setLogSortOrder] = useState<LogSortOrder>("desc");
  const [logAutoRefresh, setLogAutoRefresh] = useState(false);
  const [logLiveTail, setLogLiveTail] = useState(false);
  const [logCategoryFilter, setLogCategoryFilter] = useState<Record<LogCategory, boolean>>({
    user: true,
    system: true,
    payload: true,
  });
  const [clientFilter, setClientFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [carouselFilter, setCarouselFilter] = useState("");
  const [ruleFilter, setRuleFilter] = useState("");
  const [formErrors, setFormErrors] = useState({
    client: "",
    template: "",
    carousel: "",
    rule: "",
    broadcast: "",
  });
  const [tplName, setTplName] = useState("");
  const [tplPayloadType, setTplPayloadType] = useState("");
  const [tplTemplate, setTplTemplate] = useState("");
  const [tplPreviewData, setTplPreviewData] = useState('{"message":"Hello"}');
  const [tplColor, setTplColor] = useState("#ffffff");
  const [tplStyleOverrides, setTplStyleOverrides] = useState<Record<string, string>>({});
  const [tplLineColors, setTplLineColors] = useState<string[]>(["#ffffff"]);
  const [tplPageLineColors, setTplPageLineColors] = useState<string[][]>([["#ffffff"]]);
  const [templateStep, setTemplateStep] = useState(1);
  const [activeTemplateLine, setActiveTemplateLine] = useState<{ page: number; line: number } | null>(null);
  const [carouselName, setCarouselName] = useState("");
  const [carouselCadence, setCarouselCadence] = useState("10");
  const [carouselWindows, setCarouselWindows] = useState(
    '[\n  {\n    "id": "window-1",\n    "payload_ref": { "payload_type": "simple_text_scroll" },\n    "every_n_cycles": 1,\n    "enabled": true\n  }\n]'
  );
  const [ruleName, setRuleName] = useState("");
  const [ruleClientId, setRuleClientId] = useState("");
  const [rulePayloadType, setRulePayloadType] = useState("");
  const [ruleTargets, setRuleTargets] = useState<string[]>([]);
  const [ruleTemplateId, setRuleTemplateId] = useState("");
  const [rulePriority, setRulePriority] = useState("");
  const [ruleTransition, setRuleTransition] = useState("fade");
  const [ruleTransitionDurationMs, setRuleTransitionDurationMs] = useState("");
  const [ruleTransitionDirection, setRuleTransitionDirection] = useState("");
  const [ruleTransitionFadeInMs, setRuleTransitionFadeInMs] = useState("");
  const [ruleTransitionFadeOutMs, setRuleTransitionFadeOutMs] = useState("");
  const [ruleTransitionBarnDirection, setRuleTransitionBarnDirection] = useState("");
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedDisplayEdit, setSelectedDisplayEdit] = useState<DisplayTarget | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEvent | null>(null);
  const [selectedBroadcast, setSelectedBroadcast] = useState<LogEvent | null>(null);
  const [showCreate, setShowCreate] = useState({
    clients: false,
    templates: false,
    rules: false,
  });
  const [editClientName, setEditClientName] = useState("");
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplatePayloadType, setEditTemplatePayloadType] = useState("");
  const [editTemplateTemplate, setEditTemplateTemplate] = useState("");
  const [editTemplateColor, setEditTemplateColor] = useState("#ffffff");
  const [editTemplateStyleOverrides, setEditTemplateStyleOverrides] = useState<Record<string, string>>({});
  const [editTemplateLineColors, setEditTemplateLineColors] = useState<string[]>(["#ffffff"]);
  const [editTemplatePageLineColors, setEditTemplatePageLineColors] = useState<string[][]>([["#ffffff"]]);
  const [editTemplatePreviewData, setEditTemplatePreviewData] = useState('{"message":"Hello"}');
  const [activeEditTemplateLine, setActiveEditTemplateLine] = useState<{ page: number; line: number } | null>(null);
  const [editCarouselName, setEditCarouselName] = useState("");
  const [editCarouselCadence, setEditCarouselCadence] = useState("");
  const [editCarouselWindows, setEditCarouselWindows] = useState("");
  const [editRulePriority, setEditRulePriority] = useState("");
  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleClientId, setEditRuleClientId] = useState("");
  const [editRulePayloadType, setEditRulePayloadType] = useState("");
  const [editRuleTargets, setEditRuleTargets] = useState<string[]>([]);
  const [editRuleTemplateId, setEditRuleTemplateId] = useState("");
  const [editRuleTransition, setEditRuleTransition] = useState("fade");
  const [editRuleTransitionDurationMs, setEditRuleTransitionDurationMs] = useState("");
  const [editRuleTransitionDirection, setEditRuleTransitionDirection] = useState("");
  const [editRuleTransitionFadeInMs, setEditRuleTransitionFadeInMs] = useState("");
  const [editRuleTransitionFadeOutMs, setEditRuleTransitionFadeOutMs] = useState("");
  const [editRuleTransitionBarnDirection, setEditRuleTransitionBarnDirection] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDisplayHost, setEditDisplayHost] = useState("");
  const [editDisplayPort, setEditDisplayPort] = useState("");
  const [page, setPage] = useState({
    clients: 1,
    templates: 1,
    carousels: 1,
    rules: 1,
    displays: 1,
    logs: 1,
    broadcasts: 1,
  });
  const pageSize = 25;
  const createTemplateEditorRef = useRef<HTMLTextAreaElement>(null);
  const editTemplateEditorRef = useRef<HTMLTextAreaElement>(null);
  const createTemplateLineRef = useRef<HTMLTextAreaElement | null>(null);
  const editTemplateLineRef = useRef<HTMLTextAreaElement | null>(null);
  const createTemplateImageInputRef = useRef<HTMLInputElement>(null);
  const editTemplateImageInputRef = useRef<HTMLInputElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState({
    monitoring: false,
    clients: false,
    templates: false,
    carousels: false,
    rules: false,
    displays: false,
    logs: false,
    broadcasts: false,
  });
  const [errors, setErrors] = useState({
    monitoring: "",
    clients: "",
    templates: "",
    carousels: "",
    rules: "",
    displays: "",
    logs: "",
    broadcasts: "",
  });
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const openApiUiUrl = `${basePath}/docs`;
  const redocUrl = `${basePath}/redoc`;
  const openApiSpecUrl = `${basePath}/openapi.json`;
  const asyncApiSpecUrl = `${basePath}/api-docs/asyncapi.yaml`;
  const simUrl = `${buildApiUrl("/sim/ui")}?token=${encodeURIComponent(token)}`;
  const [showSimDock, setShowSimDock] = useState(localStorage.getItem("sim_dock_open") !== "0");
  const [dockPosition, setDockPosition] = useState<"left" | "right" | "bottom" | "float">(
    (localStorage.getItem("sim_dock_position") as "left" | "right" | "bottom" | "float") || "float"
  );
  const [dockSize, setDockSize] = useState(() => {
    const stored = Number(localStorage.getItem("sim_dock_size"));
    return Number.isFinite(stored) && stored > 0 ? stored : SIM_FRAME_WIDTH;
  });
  const [simFrameSize, setSimFrameSize] = useState({ width: SIM_FRAME_WIDTH, height: SIM_FRAME_HEIGHT });
  const [isResizingDock, setIsResizingDock] = useState(false);
  const [simSizeLocked, setSimSizeLocked] = useState(false);
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const [dockOffset, setDockOffset] = useState({ x: 0, y: 0 });
  const [dockPos, setDockPos] = useState(() => {
    const storedX = Number(localStorage.getItem("sim_dock_x"));
    const storedY = Number(localStorage.getItem("sim_dock_y"));
    return {
      x: Number.isFinite(storedX) ? storedX : 24,
      y: Number.isFinite(storedY) ? storedY : 96,
    };
  });
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [payloadEditorType, setPayloadEditorType] = useState("simple_text_scroll");
  const [payloadEditorFields, setPayloadEditorFields] = useState<Record<string, string>>({
    text: "Hello world",
    scroll_ms_per_px: "15",
    color: "#ffffff",
  });
  const [payloadLineCount, setPayloadLineCount] = useState(1);
  const [payloadLineColors, setPayloadLineColors] = useState<string[]>(["#ffffff"]);
  const [jinjaTemplate, setJinjaTemplate] = useState("{{ message }}");
  const [jinjaContext, setJinjaContext] = useState('{"message": "Hello"}');
  const [jinjaStatus, setJinjaStatus] = useState("");
  const [jinjaRendered, setJinjaRendered] = useState("");

  const tokenReady = token.trim().length > 0;
  const serverReady = serverTokenReady === true;
  const authReady = tokenReady && serverReady;
  const tokenIssue = !tokenReady || !serverReady || serverTokenReady === null;
  const lockMessage = !tokenReady
    ? "Admin token required. Save a token to unlock controls."
    : serverTokenReady === null
    ? "Checking server token status..."
    : !serverReady
    ? "Server admin token not configured. Set ADMIN_TOKEN or admin_token in the router config and restart."
    : "";

  const statusCards = useMemo(
    () => [
      { label: "Router", value: monitoring.router_status || "unknown", tone: "bg-pine/15 text-pine" },
      { label: "Payloads", value: String(monitoring.payloads_received ?? 0), tone: "bg-clay/15 text-clay" },
      { label: "Displays", value: String(monitoring.displays?.length ?? 0), tone: "bg-marigold/20 text-dusk" },
    ],
    [monitoring]
  );

  async function refreshServerTokenStatus() {
    try {
      const res = await apiFetch<TokenStatusResponse>("/bootstrap/token-status", "");
      setServerTokenReady(res.ready);
      setServerTokenSource(res.source || "unknown");
    } catch (err) {
      setServerTokenReady(null);
      setServerTokenSource("unknown");
    }
  }

  useEffect(() => {
    refreshServerTokenStatus();
  }, []);

  useEffect(() => {
    if (token.trim()) return;
    localStorage.removeItem("admin_token");
    if (tokenStatus !== "Token not set") {
      setTokenStatus("Token not set");
    }
  }, [token, tokenStatus]);

  useEffect(() => {
    if (serverTokenReady !== false) return;
    if (isBootstrapping) return;
    if (!token.trim()) return;
    setToken("");
    localStorage.removeItem("admin_token");
    setTokenStatus("Server token missing.");
  }, [serverTokenReady, token, isBootstrapping]);

  useEffect(() => {
    if (tokenStatus.includes("Invalid admin token")) {
      setShowTokenPanel(true);
    }
  }, [tokenStatus]);

  useEffect(() => {
    if (tokenIssue) {
      setShowTokenPanel(true);
      return;
    }
    if (authReady) {
      setShowTokenPanel(false);
    }
  }, [tokenIssue, authReady]);

  useEffect(() => {
    if (!authReady) return;
    loadClients();
  }, [authReady, page.clients]);

  useEffect(() => {
    if (!authReady) return;
    loadTemplates();
  }, [authReady, page.templates]);

  useEffect(() => {
    if (!authReady) return;
    loadCarousels();
  }, [authReady, page.carousels]);

  useEffect(() => {
    if (!authReady) return;
    loadRules();
  }, [authReady, page.rules]);

  useEffect(() => {
    if (!authReady) return;
    loadDisplays();
  }, [authReady, page.displays]);

  useEffect(() => {
    if (!authReady) return;
    loadLogs();
  }, [authReady, page.logs]);

  useEffect(() => {
    if (!authReady) return;
    if (activeTab !== "logs") return;
    if (!logAutoRefresh && !logLiveTail) return;
    const intervalMs = logLiveTail ? 2000 : 8000;
    const timer = setInterval(() => {
      loadLogs();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [authReady, activeTab, logAutoRefresh, logLiveTail, page.logs]);

  useEffect(() => {
    if (!logLiveTail) return;
    setLogSortField("date");
    setLogSortOrder("desc");
    setLogAutoRefresh(false);
  }, [logLiveTail]);

  useEffect(() => {
    if (!logLiveTail) return;
    if (!logScrollRef.current) return;
    logScrollRef.current.scrollTop = 0;
  }, [logLiveTail, logs, logFilter, logSortField, logSortOrder]);

  useEffect(() => {
    if (!authReady) return;
    loadBroadcasts();
  }, [authReady, page.broadcasts]);

  useEffect(() => {
    if (!serverReady) return;
    if (tokenReady) return;
    if (didAutoLoadToken) return;
    setDidAutoLoadToken(true);
    loadServerToken();
  }, [serverReady, tokenReady, didAutoLoadToken]);

  useEffect(() => {
    if (!tokenReady) {
      setTokenStatus(serverReady ? "Server token available. Click Load." : "Token not set");
      return;
    }
    if (serverTokenReady === false) {
      setTokenStatus("Server token missing.");
      return;
    }
    if (serverTokenReady === null) {
      setTokenStatus("Checking server token...");
      return;
    }
    setTokenStatus("Token loaded");
    loadAll();
    const timer = setInterval(loadMonitoring, 5000);
    return () => clearInterval(timer);
  }, [tokenReady, token, serverTokenReady]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    localStorage.setItem("sim_dock_open", showSimDock ? "1" : "0");
  }, [showSimDock]);

  useEffect(() => {
    localStorage.setItem("sim_dock_position", dockPosition);
  }, [dockPosition]);

  useEffect(() => {
    localStorage.setItem("sim_dock_size", String(dockSize));
  }, [dockSize]);

  useEffect(() => {
    localStorage.setItem("sim_dock_x", String(dockPos.x));
    localStorage.setItem("sim_dock_y", String(dockPos.y));
  }, [dockPos]);

  useEffect(() => {
    const apiOrigin = new URL(buildApiUrl("/")).origin;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; width?: number; height?: number };
      if (!data || data.type !== "sim:size") return;
      if (event.origin && event.origin !== apiOrigin && event.origin !== window.location.origin) return;
      const width = Number(data.width);
      const height = Number(data.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;
      if (width < SIM_FRAME_WIDTH || height < SIM_FRAME_HEIGHT) return;
      setSimFrameSize({ width, height });
      if (!simSizeLocked) {
        setDockSize(dockPosition === "right" || dockPosition === "float" ? width : height);
        setSimSizeLocked(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dockPosition, simSizeLocked]);

  useEffect(() => {
    if (!isResizingDock) return;
    const handleMove = (event: MouseEvent) => {
      setSimSizeLocked(true);
      if (dockPosition === "right") {
        const minWidth = simFrameSize.width || SIM_FRAME_WIDTH;
        const next = Math.max(minWidth, Math.min(900, window.innerWidth - event.clientX - 24));
        setDockSize(next);
      } else {
        const minHeight = simFrameSize.height || SIM_FRAME_HEIGHT;
        const next = Math.max(minHeight, Math.min(600, window.innerHeight - event.clientY - 24));
        setDockSize(next);
      }
    };
    const handleUp = () => setIsResizingDock(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizingDock, dockPosition]);

  useEffect(() => {
    if (!isDraggingDock) return;
    const handleMove = (event: PointerEvent) => {
      setDockPos({
        x: Math.max(12, event.clientX - dockOffset.x),
        y: Math.max(12, event.clientY - dockOffset.y),
      });
    };
    const handleUp = (event: PointerEvent) => {
      setIsDraggingDock(false);
      const edgePadX = 120;
      const edgePadY = 180;
      if (event.clientX < edgePadX) {
        setDockPosition("left");
        return;
      }
      if (event.clientX > window.innerWidth - edgePadX) {
        setDockPosition("right");
        return;
      }
      if (event.clientY > window.innerHeight - edgePadY) {
        setDockPosition("bottom");
        return;
      }
      setDockPosition("float");
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDraggingDock, dockOffset]);

  useEffect(() => {
    const handler = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const timer = setTimeout(() => {
      if (jinjaTemplate.trim()) {
        validateJinja();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [jinjaTemplate, jinjaContext, authReady]);

  useEffect(() => {
    if (!isRichTextType(tplPayloadType)) return;
    if (!createTemplateEditorRef.current) return;
    if (createTemplateEditorRef.current.value !== tplTemplate) {
      createTemplateEditorRef.current.value = tplTemplate;
    }
  }, [tplTemplate, tplPayloadType]);

  useEffect(() => {
    if (!isLineEntryPayloadType(tplPayloadType)) return;
    const pages = parseTemplatePages(tplTemplate);
    if (isPagePayloadType(tplPayloadType)) {
      setTplPageLineColors((prev) => normalizePageColors(pages, prev));
    } else {
      setTplLineColors((prev) => normalizeColorArray(pages[0].length, prev));
    }
  }, [tplPayloadType, tplTemplate]);

  useEffect(() => {
    if (!isRichTextType(editTemplatePayloadType)) return;
    if (!editTemplateEditorRef.current) return;
    if (editTemplateEditorRef.current.value !== editTemplateTemplate) {
      editTemplateEditorRef.current.value = editTemplateTemplate;
    }
  }, [editTemplateTemplate, editTemplatePayloadType, selectedTemplate?.id]);

  useEffect(() => {
    if (!isLineEntryPayloadType(editTemplatePayloadType)) return;
    const pages = parseTemplatePages(editTemplateTemplate);
    if (isPagePayloadType(editTemplatePayloadType)) {
      setEditTemplatePageLineColors((prev) => normalizePageColors(pages, prev));
    } else {
      setEditTemplateLineColors((prev) => normalizeColorArray(pages[0].length, prev));
    }
  }, [editTemplatePayloadType, editTemplateTemplate]);

  useEffect(() => {
    setPayloadLineColors((prev) => normalizeColorArray(payloadLineCount, prev));
  }, [payloadLineCount]);

  async function loadMonitoring() {
    if (!authReady) return;
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
    if (!authReady) return;
    setLoading((prev) => ({ ...prev, clients: true }));
    setErrors((prev) => ({ ...prev, clients: "" }));
    try {
      const res = await apiFetch<{ data: Client[]; meta: ApiMeta }>(
        `/admin/clients?page=${page.clients}&page_size=${pageSize}`,
        token
      );
      setClients(res.data || []);
      if (res.meta) {
        setMeta((prev) => ({ ...prev, clients: { ...prev.clients, ...res.meta } }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, clients: err instanceof Error ? err.message : "Failed to load clients." }));
      setClients([]);
    } finally {
      setLoading((prev) => ({ ...prev, clients: false }));
    }
  }

  async function loadTemplates() {
    if (!authReady) return;
    setLoading((prev) => ({ ...prev, templates: true }));
    setErrors((prev) => ({ ...prev, templates: "" }));
    try {
      const res = await apiFetch<{ data: Template[]; meta: ApiMeta }>(
        `/admin/templates?page=${page.templates}&page_size=${pageSize}`,
        token
      );
      setTemplates(res.data || []);
      if (res.meta) {
        setMeta((prev) => ({ ...prev, templates: { ...prev.templates, ...res.meta } }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to load templates." }));
      setTemplates([]);
    } finally {
      setLoading((prev) => ({ ...prev, templates: false }));
    }
  }

  async function loadCarousels() {
    if (!authReady) return;
    setLoading((prev) => ({ ...prev, carousels: true }));
    setErrors((prev) => ({ ...prev, carousels: "" }));
    try {
      const res = await apiFetch<{ data: Carousel[]; meta: ApiMeta }>(
        `/admin/carousels?page=${page.carousels}&page_size=${pageSize}`,
        token
      );
      setCarousels(res.data || []);
      if (res.meta) {
        setMeta((prev) => ({ ...prev, carousels: { ...prev.carousels, ...res.meta } }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, carousels: err instanceof Error ? err.message : "Failed to load carousels." }));
      setCarousels([]);
    } finally {
      setLoading((prev) => ({ ...prev, carousels: false }));
    }
  }

  async function loadRules() {
    if (!authReady) return;
    setLoading((prev) => ({ ...prev, rules: true }));
    setErrors((prev) => ({ ...prev, rules: "" }));
    try {
      const res = await apiFetch<{ data: Rule[]; meta: ApiMeta }>(
        `/admin/rules?page=${page.rules}&page_size=${pageSize}`,
        token
      );
      setRules(res.data || []);
      if (res.meta) {
        setMeta((prev) => ({ ...prev, rules: { ...prev.rules, ...res.meta } }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to load rules." }));
      setRules([]);
    } finally {
      setLoading((prev) => ({ ...prev, rules: false }));
    }
  }

  async function loadDisplays() {
    if (!authReady) return;
    setLoading((prev) => ({ ...prev, displays: true }));
    setErrors((prev) => ({ ...prev, displays: "" }));
    try {
      const res = await apiFetch<{ data: DisplayTarget[]; meta: ApiMeta }>(
        `/admin/displays?page=${page.displays}&page_size=${pageSize}`,
        token
      );
      setDisplays(res.data || []);
      if (res.meta) {
        setMeta((prev) => ({ ...prev, displays: { ...prev.displays, ...res.meta } }));
      }
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
    if (!authReady) return;
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
    if (!authReady) return;
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

  async function testDisplay(displayId: string) {
    if (!authReady) return;
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

  function fillSampleTemplate() {
    setTplName("Welcome Banner");
    setTplPayloadType("simple_text_scroll");
    setTplTemplate("{{message}}");
    setTplColor("#ffffff");
    setTplStyleOverrides({});
    setTplLineColors(["#ffffff"]);
    setTplPageLineColors([["#ffffff"]]);
    setTemplateStep(1);
  }

  function fillSampleRule() {
    setRuleName("Lobby Defaults");
      setRuleTargets(displays.length ? [displays[0].id] : []);
      setRuleTemplateId("");
    setRulePriority("10");
    setRuleTransition("fade");
    setRuleTransitionDurationMs("");
    setRuleTransitionDirection("");
    setRuleTransitionFadeInMs("200");
    setRuleTransitionFadeOutMs("200");
    setRuleTransitionBarnDirection("");
    setRuleStep(1);
  }

  async function loadLogs() {
    if (!authReady) return;
    setLoading((prev) => ({ ...prev, logs: true }));
    setErrors((prev) => ({ ...prev, logs: "" }));
    try {
      const res = await apiFetch<{ data: LogEvent[]; meta: ApiMeta }>(
        `/admin/logs?page=${page.logs}&page_size=${pageSize}`,
        token
      );
      setLogs(res.data || []);
      if (res.meta) {
        setMeta((prev) => ({ ...prev, logs: { ...prev.logs, ...res.meta } }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, logs: err instanceof Error ? err.message : "Failed to load logs." }));
      setLogs([]);
    } finally {
      setLoading((prev) => ({ ...prev, logs: false }));
    }
  }

  async function loadBroadcasts() {
    if (!authReady) return;
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
      if (res.meta) {
        setMeta((prev) => ({ ...prev, broadcasts: { ...prev.broadcasts, ...res.meta } }));
      }
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
    if (!authReady) return;
    await Promise.all([
      loadMonitoring(),
      loadClients(),
      loadTemplates(),
      loadCarousels(),
      loadRules(),
      loadDisplays(),
      loadLogs(),
      loadBroadcasts(),
    ]);
  }

  async function loadServerToken() {
    try {
      const res = await apiFetch<{ admin_token: string }>("/bootstrap/admin-token", "");
      setToken(res.admin_token);
      localStorage.setItem("admin_token", res.admin_token);
      setTokenStatus("Token loaded from server.");
      setToast({ message: "Token loaded from server.", tone: "ok" });
      await refreshServerTokenStatus();
      await loadAll();
    } catch (err) {
      setTokenStatus(err instanceof Error ? err.message : "Failed to load token from server.");
      setToast({ message: "Failed to load token from server.", tone: "error" });
    }
  }

  async function bootstrapServerToken() {
    setIsBootstrapping(true);
    try {
      const res = await apiFetch<{ admin_token: string }>("/bootstrap/generate-admin-token", "", { method: "POST" });
      setToken(res.admin_token);
      localStorage.setItem("admin_token", res.admin_token);
      setTokenStatus("Server token bootstrapped and saved locally.");
      setToast({ message: "Server token bootstrapped.", tone: "ok" });
      await refreshServerTokenStatus();
      await loadAll();
    } catch (err) {
      setTokenStatus(err instanceof Error ? err.message : "Failed to bootstrap server token.");
      setToast({ message: "Failed to bootstrap server token.", tone: "error" });
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function saveToken() {
    if (!token.trim()) return;
    localStorage.setItem("admin_token", token);
    setTokenStatus(serverReady ? "Token saved locally." : "Token saved locally. Server token missing.");
    setToast({ message: "Token saved locally.", tone: "ok" });
    await refreshServerTokenStatus();
    await loadAll();
  }

  function clearToken() {
    setToken("");
    localStorage.removeItem("admin_token");
    setTokenStatus("Token not set");
    setToast({ message: "Token cleared.", tone: "ok" });
  }

  async function rotateToken() {
    if (!authReady) return;
    try {
      const res = await apiFetch<{ admin_token: string }>("/bootstrap/rotate-admin-token", token, { method: "POST" });
      setToken(res.admin_token);
      localStorage.setItem("admin_token", res.admin_token);
      setTokenStatus("Token rotated on server.");
      setToast({ message: "Token rotated.", tone: "ok" });
      await refreshServerTokenStatus();
      await loadAll();
    } catch (err) {
      setTokenStatus(err instanceof Error ? err.message : "Token rotation failed.");
      setToast({ message: "Token rotation failed.", tone: "error" });
    }
  }

  async function restartRouter() {
    if (!authReady) return;
    setTokenStatus("Restarting router...");
    await apiFetch("/admin/restart-router", token, { method: "POST" });
    setTokenStatus("Restart requested");
    setToast({ message: "Router restart requested.", tone: "ok" });
  }

  async function updateClient(clientId: string, name: string) {
    if (!authReady) return;
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
    if (!authReady) return;
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

  function buildTemplateStyle(
    payloadType: string,
    color: string,
    overrides: Record<string, string>
  ): Record<string, unknown> {
    const style: Record<string, unknown> = {};
    if (color) style.color = color;
    const fieldMap = new Map(getTemplateStyleFields(payloadType).map((field) => [field.key, field.type]));
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === "" || value == null) return;
      const fieldType = fieldMap.get(key);
      if (key === "colors") {
        const trimmed = value.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          try {
            style[key] = JSON.parse(trimmed);
            return;
          } catch {
            // fall through to store raw string
          }
        }
      }
      if (fieldType === "number") {
        const parsed = Number.parseInt(value, 10);
        style[key] = Number.isFinite(parsed) ? parsed : value;
      } else {
        style[key] = value;
      }
    });
    return style;
  }

  function normalizeColorArray(count: number, existing: string[]) {
    const safeCount = Math.max(1, count || 1);
    const next = existing.slice(0, safeCount);
    while (next.length < safeCount) next.push("#ffffff");
    return next;
  }

  function parseTemplatePages(value: string) {
    const rawPages = value.split(PAGE_BREAK);
    const pages = rawPages.map((page) => page.split("\n"));
    if (pages.length === 0) return [[""]];
    return pages.map((lines) => (lines.length ? lines : [""]));
  }

  function joinTemplatePages(pages: string[][]) {
    return pages.map((lines) => lines.join("\n")).join(PAGE_BREAK);
  }

  function updateTemplateLine(
    pages: string[][],
    pageIndex: number,
    lineIndex: number,
    value: string
  ) {
    const next = pages.map((lines) => lines.slice());
    while (next.length <= pageIndex) next.push([""]);
    while (next[pageIndex].length <= lineIndex) next[pageIndex].push("");
    next[pageIndex][lineIndex] = value;
    return next;
  }

  function normalizePageColors(pages: string[][], existing: string[][]) {
    const next: string[][] = [];
    pages.forEach((lines, pageIndex) => {
      next.push(normalizeColorArray(lines.length, existing[pageIndex] || []));
    });
    return next.length ? next : [["#ffffff"]];
  }

  function applyRichCommand(ref: { current: HTMLTextAreaElement | null }, command: string) {
    if (!ref.current) return;
    const input = ref.current;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const value = input.value;
    const selected = value.slice(start, end);
    let before = "";
    let after = "";
    if (command === "bold") {
      before = "**";
      after = "**";
    } else if (command === "italic") {
      before = "*";
      after = "*";
    } else if (command === "underline") {
      before = "__";
      after = "__";
    } else if (command === "insertUnorderedList") {
      const lines = (selected || "List item").split("\n");
      const replaced = lines.map((line) => `- ${line || "Item"}`).join("\n");
      const next = value.slice(0, start) + replaced + value.slice(end);
      input.value = next;
      input.setSelectionRange(start, start + replaced.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const replacement = `${before}${selected || "Text"}${after}`;
    const nextValue = value.slice(0, start) + replacement + value.slice(end);
    input.value = nextValue;
    const cursor = start + replacement.length;
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertRichImage(ref: { current: HTMLTextAreaElement | null }, src: string) {
    if (!ref.current) return;
    const input = ref.current;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const value = input.value;
    const replacement = `![image](${src})`;
    const nextValue = value.slice(0, start) + replacement + value.slice(end);
    input.value = nextValue;
    const cursor = start + replacement.length;
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyRichColor(ref: { current: HTMLTextAreaElement | null }, color: string) {
    if (!ref.current) return;
    const input = ref.current;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const value = input.value;
    const selected = value.slice(start, end) || "Text";
    const replacement = `[color=${color}]${selected}[/color]`;
    const nextValue = value.slice(0, start) + replacement + value.slice(end);
    input.value = nextValue;
    const cursor = start + replacement.length;
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function createTemplate() {
    if (!authReady) return;
    if (!tplName.trim() || !tplPayloadType.trim() || !tplTemplate.trim()) {
      setFormErrors((prev) => ({ ...prev, template: "Name, payload type, and template are required." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, template: "" }));
    try {
      const styleOverrides = { ...tplStyleOverrides };
      if (isLineEntryPayloadType(tplPayloadType)) {
        styleOverrides.colors = JSON.stringify(
          isPagePayloadType(tplPayloadType) ? tplPageLineColors : tplLineColors
        );
      }
      await apiFetch("/admin/templates", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tplName,
          payload_type: tplPayloadType,
          template: tplTemplate,
          default_style: buildTemplateStyle(tplPayloadType, tplColor, styleOverrides),
        }),
      });
      setTplName("");
      setTplPayloadType("");
      setTplTemplate("");
      setTplColor("#ffffff");
      setTplStyleOverrides({});
      setTplLineColors(["#ffffff"]);
      setTplPageLineColors([["#ffffff"]]);
      setToast({ message: "Template created.", tone: "ok" });
      await loadTemplates();
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to create template." }));
      setToast({ message: "Failed to create template.", tone: "error" });
    }
  }

  async function previewNewTemplate() {
    if (!authReady) return;
    if (!tplPayloadType.trim() || !tplTemplate.trim()) {
      setToast({ message: "Payload type and template are required for preview.", tone: "error" });
      return;
    }
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(tplPreviewData || "{}");
    } catch {
      setToast({ message: "Preview data must be valid JSON.", tone: "error" });
      return;
    }
    try {
      const styleOverrides = { ...tplStyleOverrides };
      if (isLineEntryPayloadType(tplPayloadType)) {
        styleOverrides.colors = JSON.stringify(
          isPagePayloadType(tplPayloadType) ? tplPageLineColors : tplLineColors
        );
      }
      await apiFetch("/admin/preview", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload_type: tplPayloadType,
          template: tplTemplate,
          style: buildTemplateStyle(tplPayloadType, tplColor, styleOverrides),
          data,
        }),
      });
      setToast({ message: "Preview sent via router.", tone: "ok" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Preview failed.", tone: "error" });
    }
  }

  async function updateTemplate(templateId: string, name: string) {
    if (!authReady) return;
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
    if (!authReady) return;
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

  async function saveTemplate(templateId: string) {
    if (!authReady) return;
    if (!editTemplateName.trim() || !editTemplatePayloadType.trim() || !editTemplateTemplate.trim()) {
      setErrors((prev) => ({ ...prev, templates: "Name, payload type, and template are required." }));
      setToast({ message: "Name, payload type, and template are required.", tone: "error" });
      return;
    }
    try {
      const styleOverrides = { ...editTemplateStyleOverrides };
      if (isLineEntryPayloadType(editTemplatePayloadType)) {
        styleOverrides.colors = JSON.stringify(
          isPagePayloadType(editTemplatePayloadType) ? editTemplatePageLineColors : editTemplateLineColors
        );
      }
      await apiFetch(`/admin/templates/${templateId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTemplateName,
          payload_type: editTemplatePayloadType,
          template: editTemplateTemplate,
          default_style: buildTemplateStyle(
            editTemplatePayloadType,
            editTemplateColor,
            styleOverrides
          ),
        }),
      });
      setToast({ message: "Template updated.", tone: "ok" });
      await loadTemplates();
    } catch (err) {
      setErrors((prev) => ({ ...prev, templates: err instanceof Error ? err.message : "Failed to update template." }));
      setToast({ message: "Failed to update template.", tone: "error" });
    }
  }

  async function previewTemplate(_templateId: string) {
    if (!authReady) return;
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(editTemplatePreviewData || "{}");
    } catch {
      setToast({ message: "Preview data must be valid JSON.", tone: "error" });
      return;
    }
    try {
      const styleOverrides = { ...editTemplateStyleOverrides };
      if (isLineEntryPayloadType(editTemplatePayloadType)) {
        styleOverrides.colors = JSON.stringify(
          isPagePayloadType(editTemplatePayloadType) ? editTemplatePageLineColors : editTemplateLineColors
        );
      }
      await apiFetch("/admin/preview", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload_type: editTemplatePayloadType,
          template: editTemplateTemplate,
          style: buildTemplateStyle(editTemplatePayloadType, editTemplateColor, styleOverrides),
          data,
        }),
      });
      setToast({ message: "Preview sent via router.", tone: "ok" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Preview failed.", tone: "error" });
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!authReady) return;
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

  function parseCarouselWindows(input: string): CarouselWindow[] | null {
    if (!input.trim()) return [];
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function createCarousel() {
    if (!authReady) return;
    if (!carouselName.trim()) {
      setFormErrors((prev) => ({ ...prev, carousel: "Carousel name is required." }));
      return;
    }
    const windows = parseCarouselWindows(carouselWindows);
    if (windows === null) {
      setFormErrors((prev) => ({ ...prev, carousel: "Windows must be valid JSON array." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, carousel: "" }));
    const cadenceSeconds = Number.parseInt(carouselCadence || "10", 10);
    try {
      await apiFetch("/admin/carousels", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: carouselName,
          cadence_seconds: Number.isFinite(cadenceSeconds) ? cadenceSeconds : 10,
          windows,
        }),
      });
      setCarouselName("");
      setCarouselCadence("10");
      setCarouselWindows(
        '[\n  {\n    "id": "window-1",\n    "payload_ref": { "payload_type": "simple_text_scroll" },\n    "every_n_cycles": 1,\n    "enabled": true\n  }\n]'
      );
      setToast({ message: "Carousel created.", tone: "ok" });
      await loadCarousels();
    } catch (err) {
      setErrors((prev) => ({ ...prev, carousels: err instanceof Error ? err.message : "Failed to create carousel." }));
      setToast({ message: "Failed to create carousel.", tone: "error" });
    }
  }

  async function updateCarousel(carouselId: string) {
    if (!authReady) return;
    if (!editCarouselName.trim()) {
      setErrors((prev) => ({ ...prev, carousels: "Carousel name is required." }));
      setToast({ message: "Carousel name is required.", tone: "error" });
      return;
    }
    const windows = parseCarouselWindows(editCarouselWindows);
    if (windows === null) {
      setErrors((prev) => ({ ...prev, carousels: "Windows must be valid JSON array." }));
      setToast({ message: "Invalid windows JSON.", tone: "error" });
      return;
    }
    const cadenceSeconds = Number.parseInt(editCarouselCadence || "10", 10);
    try {
      await apiFetch(`/admin/carousels/${carouselId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCarouselName,
          cadence_seconds: Number.isFinite(cadenceSeconds) ? cadenceSeconds : 10,
          windows,
        }),
      });
      setToast({ message: "Carousel updated.", tone: "ok" });
      await loadCarousels();
    } catch (err) {
      setErrors((prev) => ({ ...prev, carousels: err instanceof Error ? err.message : "Failed to update carousel." }));
      setToast({ message: "Failed to update carousel.", tone: "error" });
    }
  }

  async function deleteCarousel(carouselId: string) {
    if (!authReady) return;
    if (!confirm("Delete this carousel? This cannot be undone.")) return;
    try {
      await apiFetch(`/admin/carousels/${carouselId}`, token, { method: "DELETE" });
      setToast({ message: "Carousel deleted.", tone: "ok" });
      await loadCarousels();
    } catch (err) {
      setErrors((prev) => ({ ...prev, carousels: err instanceof Error ? err.message : "Failed to delete carousel." }));
      setToast({ message: "Failed to delete carousel.", tone: "error" });
    }
  }

  async function previewCarousel(carouselId: string, advance: boolean) {
    if (!authReady) return;
    try {
      const res = await apiFetch<{
        carousel_id: string;
        window_id?: string;
        routed_displays: string[];
        status: string;
      }>(`/admin/carousels/${carouselId}/preview`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advance, all_displays: true }),
      });
      const windowLabel = res.window_id ? `window ${res.window_id}` : "window";
      const displayCount = res.routed_displays?.length || 0;
      setToast({ message: `Carousel ${res.status}: ${windowLabel} to ${displayCount} displays.`, tone: "ok" });
    } catch (err) {
      setToast({ message: "Carousel preview failed.", tone: "error" });
    }
  }

  async function createRule() {
    if (!authReady) return;
    if (!ruleName.trim()) {
      setFormErrors((prev) => ({ ...prev, rule: "Rule name is required." }));
      return;
    }
    if (!ruleTargets.length) {
      setFormErrors((prev) => ({ ...prev, rule: "At least one display target is required." }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, rule: "" }));
    const targets = ruleTargets;
    const priority = Number.parseInt(rulePriority || "0", 10);
    const durationMs = Number.parseInt(ruleTransitionDurationMs || "0", 10);
    const fadeInMs = Number.parseInt(ruleTransitionFadeInMs || "0", 10);
    const fadeOutMs = Number.parseInt(ruleTransitionFadeOutMs || "0", 10);
    const transition: {
      type: string;
      duration_ms?: number;
      direction?: string;
      fade_in_ms?: number;
      fade_out_ms?: number;
      barn_direction?: string;
    } = { type: ruleTransition };

    if (ruleTransition === "slide" || ruleTransition === "wipe") {
      transition.duration_ms = Number.isFinite(durationMs) ? durationMs : 0;
      transition.direction = ruleTransitionDirection || undefined;
    }
    if (ruleTransition === "barn_door") {
      transition.duration_ms = Number.isFinite(durationMs) ? durationMs : 0;
      transition.barn_direction = ruleTransitionBarnDirection || undefined;
    }
    if (ruleTransition === "fade") {
      transition.fade_in_ms = Number.isFinite(fadeInMs) ? fadeInMs : 0;
      transition.fade_out_ms = Number.isFinite(fadeOutMs) ? fadeOutMs : 0;
    }
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
          template_id: ruleTemplateId || undefined,
          priority: Number.isFinite(priority) ? priority : 0,
          display_targets: targets,
          transition,
        }),
      });
      setRuleName("");
      setRuleClientId("");
      setRulePayloadType("");
      setRuleTargets([]);
      setRuleTemplateId("");
      setRulePriority("");
      setRuleTransition("fade");
      setRuleTransitionDurationMs("");
      setRuleTransitionDirection("");
      setRuleTransitionFadeInMs("");
      setRuleTransitionFadeOutMs("");
      setRuleTransitionBarnDirection("");
      setToast({ message: "Rule created.", tone: "ok" });
      await loadRules();
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to create rule." }));
      setToast({ message: "Failed to create rule.", tone: "error" });
    }
  }

  async function updateRule(ruleId: string) {
    if (!authReady) return;
    if (!editRuleName.trim()) {
      setErrors((prev) => ({ ...prev, rules: "Rule name is required." }));
      setToast({ message: "Rule name is required.", tone: "error" });
      return;
    }
    if (!editRuleTargets.length) {
      setErrors((prev) => ({ ...prev, rules: "At least one display target is required." }));
      setToast({ message: "At least one display target is required.", tone: "error" });
      return;
    }
    const priority = Number.parseInt(editRulePriority || "0", 10);
    if (!Number.isFinite(priority)) {
      setErrors((prev) => ({ ...prev, rules: "Priority must be a number." }));
      setToast({ message: "Priority must be a number.", tone: "error" });
      return;
    }
    const durationMs = Number.parseInt(editRuleTransitionDurationMs || "0", 10);
    const fadeInMs = Number.parseInt(editRuleTransitionFadeInMs || "0", 10);
    const fadeOutMs = Number.parseInt(editRuleTransitionFadeOutMs || "0", 10);
    const transition: {
      type: string;
      duration_ms?: number;
      direction?: string;
      fade_in_ms?: number;
      fade_out_ms?: number;
      barn_direction?: string;
    } = { type: editRuleTransition };

    if (editRuleTransition === "slide" || editRuleTransition === "wipe") {
      transition.duration_ms = Number.isFinite(durationMs) ? durationMs : 0;
      transition.direction = editRuleTransitionDirection || undefined;
    }
    if (editRuleTransition === "barn_door") {
      transition.duration_ms = Number.isFinite(durationMs) ? durationMs : 0;
      transition.barn_direction = editRuleTransitionBarnDirection || undefined;
    }
    if (editRuleTransition === "fade") {
      transition.fade_in_ms = Number.isFinite(fadeInMs) ? fadeInMs : 0;
      transition.fade_out_ms = Number.isFinite(fadeOutMs) ? fadeOutMs : 0;
    }

    try {
      await apiFetch(`/admin/rules/${ruleId}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editRuleName,
          match: {
            client_id: editRuleClientId || undefined,
            payload_type: editRulePayloadType || undefined,
          },
          template_id: editRuleTemplateId || undefined,
          priority,
          display_targets: editRuleTargets,
          transition,
        }),
      });
      setToast({ message: "Rule updated.", tone: "ok" });
      await loadRules();
    } catch (err) {
      setErrors((prev) => ({ ...prev, rules: err instanceof Error ? err.message : "Failed to update rule." }));
      setToast({ message: "Failed to update rule.", tone: "error" });
    }
  }

  async function deleteRule(ruleId: string) {
    if (!authReady) return;
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
    if (!authReady) return;
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
    if (!authReady || !commandStream.trim()) return;
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
    if (!authReady) return;
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
      } else if (field.key === "colors") {
        const trimmed = raw.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          try {
            data[field.key] = JSON.parse(trimmed);
          } catch {
            data[field.key] = raw;
          }
        } else {
          data[field.key] = raw;
        }
      } else {
        data[field.key] = raw;
      }
    });
    if (payloadEditorType === "simple_text_page" && typeof data.lines === "string") {
      data.lines = (data.lines as string).split(",").map((value) => value.trim()).filter(Boolean);
    }
    if (payloadEditorType === "simple_text_scroll" || payloadEditorType === "simple_text_page") {
      data.colors = payloadLineColors;
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

  async function sendPayloadPreview() {
    if (!authReady) return;
    const payload = buildPayloadEditor();
    try {
      await apiFetch("/admin/preview", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload_type: payload.payload_type,
          data: payload.data,
        }),
      });
      setToast({ message: "Preview sent via router.", tone: "ok" });
    } catch (err) {
      setToast({ message: "Preview failed.", tone: "error" });
    }
  }

  async function validateJinja() {
    if (!authReady) return;
    let context: Record<string, unknown> = {};
    try {
      context = JSON.parse(jinjaContext || "{}");
    } catch {
      setJinjaStatus("Context JSON is invalid.");
      return;
    }
    try {
      const res = await apiFetch<{ valid: boolean; errors: string[]; rendered: string }>(
        "/admin/jinja/validate",
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: jinjaTemplate, context }),
        }
      );
      setJinjaStatus(res.valid ? "Template valid." : res.errors.join("; "));
      setJinjaRendered(res.rendered || "");
    } catch (err) {
      setJinjaStatus(err instanceof Error ? err.message : "Validation failed.");
    }
  }

  async function previewJinja() {
    if (!authReady) return;
    let context: Record<string, unknown> = {};
    try {
      context = JSON.parse(jinjaContext || "{}");
    } catch {
      setJinjaStatus("Context JSON is invalid.");
      return;
    }
    try {
      await apiFetch("/admin/jinja/preview", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: jinjaTemplate, context }),
      });
      setToast({ message: "Jinja preview sent to sim.", tone: "ok" });
    } catch (err) {
      setToast({ message: "Jinja preview failed.", tone: "error" });
    }
  }

  const filteredLogs = useMemo(() => {
    const search = logFilter.trim().toLowerCase();
    const filtered = logs.filter((log) => {
      if (search && !log.message.toLowerCase().includes(search)) return false;
      const category = getLogCategory(log);
      return logCategoryFilter[category];
    });
    const sorted = [...filtered].sort((a, b) => {
      if (logSortField === "message") {
        const left = a.message.toLowerCase();
        const right = b.message.toLowerCase();
        const comparison = left.localeCompare(right);
        return logSortOrder === "asc" ? comparison : -comparison;
      }
      const left = parseLogTime(a.created_at);
      const right = parseLogTime(b.created_at);
      const comparison = left - right;
      return logSortOrder === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [logs, logFilter, logSortField, logSortOrder, logCategoryFilter]);
  const filteredClients = clients.filter((client) =>
    clientFilter ? client.name.toLowerCase().includes(clientFilter.toLowerCase()) : true
  );
  const filteredTemplates = templates.filter((template) =>
    templateFilter
      ? `${template.name} ${template.payload_type} ${formatLabel(template.payload_type)}`
          .toLowerCase()
          .includes(templateFilter.toLowerCase())
      : true
  );
  const filteredCarousels = carousels.filter((carousel) =>
    carouselFilter ? carousel.name.toLowerCase().includes(carouselFilter.toLowerCase()) : true
  );
  const filteredRules = rules.filter((rule) =>
    ruleFilter ? rule.name.toLowerCase().includes(ruleFilter.toLowerCase()) : true
  );
  const tplParsedPages = useMemo(() => parseTemplatePages(tplTemplate), [tplTemplate]);
  const editParsedPages = useMemo(() => parseTemplatePages(editTemplateTemplate), [editTemplateTemplate]);

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
          {!showTokenPanel && (
            <button
              className="self-start rounded-full border border-ink/15 bg-white/80 px-3 py-1 text-xs text-ink shadow-inset"
              onClick={() => setShowTokenPanel(true)}
            >
              Token OK
            </button>
          )}
          {showTokenPanel && (
            <div className="relative rounded-2xl border border-ink/10 bg-white/70 p-4 shadow-lift backdrop-blur">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-clay/20 blur-2xl" />
              <div className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Admin Token</p>
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="grid w-full gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Admin Token</label>
                    <input
                      className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Paste admin token"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl bg-ink px-4 py-2 text-sm text-sand"
                      onClick={saveToken}
                      disabled={!token.trim()}
                    >
                      Save
                    </button>
                    <button
                      className="rounded-xl border border-ink/20 px-4 py-2 text-sm text-ink"
                      onClick={clearToken}
                      disabled={!token.trim()}
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-xl border border-ink/20 px-4 py-2 text-sm text-ink"
                      onClick={serverReady ? (tokenReady ? rotateToken : loadServerToken) : bootstrapServerToken}
                    >
                      {serverReady ? (tokenReady ? "Rotate" : "Load") : "Bootstrap"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate">
                  <span className="inline-flex h-2 w-2 animate-float rounded-full bg-pine" />
                  {tokenStatus}
                </div>
                <div className="grid gap-1 text-xs text-slate">
                  <p>Local: {tokenReady ? "saved in browser" : "missing"}</p>
                  <p>
                    Server:{" "}
                    {serverTokenReady === null
                      ? "checking..."
                      : serverReady
                      ? `ready (${serverTokenSource})`
                      : `missing (${serverTokenSource})`}
                  </p>
                </div>
                {!tokenReady && (
                  <div className="rounded-xl border border-clay/30 bg-clay/10 px-3 py-2 text-xs text-clay">
                    Admin token required to unlock controls. Load one from the server or bootstrap a new one.
                  </div>
                )}
                {tokenReady && !serverReady && serverTokenReady !== null && (
                  <div className="rounded-xl border border-clay/30 bg-clay/10 px-3 py-2 text-xs text-clay">
                    Server has no admin token configured. Set `ADMIN_TOKEN` or use Bootstrap to generate a token file.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div
        className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8"
        style={{
          marginRight:
            showSimDock && dockPosition === "right"
              ? Math.round(dockSize + 24)
              : undefined,
          marginLeft:
            showSimDock && dockPosition === "left"
              ? Math.round(dockSize + 24)
              : undefined,
          marginBottom:
            showSimDock && dockPosition === "bottom"
              ? Math.round(
                  Math.min(simFrameSize.height, Math.max(120, Math.round(windowSize.h * 0.6) - SIM_HEADER_HEIGHT)) +
                    SIM_HEADER_HEIGHT +
                    48
                )
              : undefined,
        }}
      >
        {!authReady && (
          <div className="rounded-2xl border border-clay/30 bg-clay/10 px-6 py-4 text-sm text-clay">
            {lockMessage}
          </div>
        )}
        <div className={`space-y-6 ${!authReady ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="sticky top-0 z-20 rounded-2xl border border-ink/10 bg-white/90 px-4 py-3 shadow-inset backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    activeTab === item.id ? "bg-ink text-sand" : "border border-ink/10 bg-sand text-ink"
                  }`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    showSimDock ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-700" : "border-ink/20 text-ink"
                  }`}
                  onClick={() => setShowSimDock((prev) => !prev)}
                >
                  {showSimDock ? "Hide Preview" : "Show Preview"}
                </button>
                <div></div>
              </div>
            </div>
          </div>
          <section
            id="monitoring"
            hidden={activeTab !== "monitoring"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
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
            <div className="mt-6 rounded-2xl border border-ink/10 bg-sand/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate">Carousel Activity</p>
                  <p className="mt-1 text-sm text-ink">{monitoring.carousels.length} tracked</p>
                </div>
                <button
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                  onClick={loadMonitoring}
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate">
                {monitoring.carousels.length === 0 && <p>No carousel activity yet.</p>}
                {monitoring.carousels.map((carousel) => (
                  <div key={carousel.carousel_id} className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2">
                    <p className="text-sm font-medium text-ink">{carousel.carousel_id}</p>
                    <p className="text-[11px] text-slate">
                      Window: {carousel.current_window_id || "—"} · Cycle {carousel.cycle} · Index {carousel.index}
                    </p>
                    {carousel.next_run_at && <p className="text-[11px] text-slate">Next: {carousel.next_run_at}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="clients"
            hidden={activeTab !== "clients"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Clients</h2>
                <p className="text-sm text-slate">Register producers and their payload types.</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Search Clients</label>
                  <input
                    className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                    placeholder="Search clients"
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.target.value)}
                  />
                </div>
                <button className="rounded-full bg-ink px-4 py-2 text-sm text-sand" onClick={loadClients}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Active Clients</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate">
                  {loading.clients && <p>Loading clients...</p>}
                  {!loading.clients && clients.length === 0 && (
                    <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                      No clients yet.
                    </div>
                  )}
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      className="flex flex-col gap-2 rounded-lg bg-white/70 px-3 py-2 text-left transition hover:bg-white"
                      onClick={() => {
                        setSelectedClient(client);
                        setEditClientName(client.name);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{client.name || "Unnamed client"}</p>
                        <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate">
                          Client
                        </span>
                      </div>
                      <p className="text-xs text-slate">{client.id}</p>
                      <p className="text-xs text-slate">
                        Payloads: {client.payload_types?.length ? client.payload_types.join(", ") : "None"}
                      </p>
                    </button>
                  ))}
                </div>
                {errors.clients && <p className="mt-3 text-xs text-clay">{errors.clients}</p>}
              </div>
            </div>
            {meta.clients.total > pageSize && (
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
              </div>
            )}
            {selectedClient && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Edit Client</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedClient(null)}>
                      Close
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate">{selectedClient.id}</p>
                  <div className="mt-4 grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Name</label>
                    <input
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      placeholder="Name"
                      value={editClientName}
                      onChange={(event) => setEditClientName(event.target.value)}
                    />
                  </div>
                  <div className="mt-4 grid gap-2">
                    <label className="text-[11px] font-semibold text-ink/70">Preview Data (JSON)</label>
                    <textarea
                      className="min-h-[90px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-mono"
                      value={editTemplatePreviewData}
                      onChange={(event) => setEditTemplatePreviewData(event.target.value)}
                    />
                    <button
                      className="rounded-lg border border-ink/20 px-3 py-2 text-xs text-ink"
                      onClick={() => previewTemplate(selectedTemplate.id)}
                    >
                      Preview via Router
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink"
                      onClick={() => disableClient(selectedClient.id)}
                    >
                      Disable
                    </button>
                    <button
                      className="rounded-lg bg-ink px-3 py-2 text-sm text-sand"
                      onClick={() => updateClient(selectedClient.id, editClientName)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section
            id="templates"
            hidden={activeTab !== "templates"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Templates</h2>
                <p className="text-sm text-slate">Curate Jinja templates for rendering payloads.</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Search Templates</label>
                  <input
                    className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                    placeholder="Search templates"
                    value={templateFilter}
                    onChange={(event) => setTemplateFilter(event.target.value)}
                  />
                </div>
                <button
                  className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink"
                  onClick={() => {
                    setShowCreate((prev) => ({ ...prev, templates: true }));
                    fillSampleTemplate();
                    setTemplateStep(1);
                  }}
                >
                  Create New
                </button>
                <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={loadTemplates}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {showCreate.templates && (
                <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-ink/10 bg-sand/60 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Create Template</p>
                <div className="mt-3 grid gap-2">
                  {templateStep === 1 && (
                    <>
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Template Name</label>
                        <input
                          className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          placeholder="Template name"
                          value={tplName}
                          onChange={(event) => setTplName(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Payload Type</label>
                        <select
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          value={tplPayloadType}
                          onChange={(event) => setTplPayloadType(event.target.value)}
                        >
                        <option value="">Select payload type</option>
                        {templatePayloadTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {formatLabel(opt)}
                          </option>
                        ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`rounded-lg px-3 py-2 text-sm ${
                            tplPayloadType
                              ? "bg-ink text-sand"
                              : "cursor-not-allowed bg-ink/40 text-sand/70"
                          }`}
                          disabled={!tplPayloadType}
                          onClick={() => setTemplateStep(2)}
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                  {templateStep === 2 && (
                    <>
                      {!isLineEntryPayloadType(tplPayloadType) && (
                        <div className="grid gap-1">
                          <label className="text-[11px] font-semibold text-ink/70">Template String</label>
                          {isRichTextType(tplPayloadType) ? (
                            <div className="grid gap-2">
                              <div className="flex flex-wrap gap-2 text-xs text-ink">
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyRichCommand(createTemplateEditorRef, "bold");
                                }}
                              >
                                Bold
                              </button>
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyRichCommand(createTemplateEditorRef, "italic");
                                }}
                              >
                                Italic
                              </button>
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyRichCommand(createTemplateEditorRef, "underline");
                                }}
                              >
                                Underline
                              </button>
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyRichCommand(createTemplateEditorRef, "insertUnorderedList");
                                }}
                              >
                                Bullet List
                              </button>
                              <div className="flex items-center gap-2 rounded-full border border-ink/15 px-2 py-1">
                                <input
                                  type="color"
                                  className="h-5 w-5 rounded border border-ink/10 bg-white"
                                  value={tplColor}
                                  onChange={(event) => setTplColor(event.target.value)}
                                />
                                <button
                                  className="text-xs text-ink"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    applyRichColor(createTemplateEditorRef, tplColor);
                                  }}
                                >
                                  Apply Color
                                </button>
                              </div>
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  const url = window.prompt("Image URL");
                                  if (!url) return;
                                  insertRichImage(createTemplateEditorRef, url);
                                }}
                              >
                                Insert Image
                              </button>
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  createTemplateImageInputRef.current?.click();
                                }}
                              >
                                Upload Image
                              </button>
                            </div>
                            <input
                              ref={createTemplateImageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const url = typeof reader.result === "string" ? reader.result : "";
                                  if (!url) return;
                                  insertRichImage(createTemplateEditorRef, url);
                                };
                                reader.readAsDataURL(file);
                                event.currentTarget.value = "";
                              }}
                            />
                            <textarea
                              ref={createTemplateEditorRef}
                              className="min-h-[140px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              value={tplTemplate}
                              onChange={(event) => setTplTemplate(event.target.value)}
                            />
                          </div>
                          ) : (
                            <textarea
                              className="min-h-[120px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              placeholder="Template string"
                              value={tplTemplate}
                              onChange={(event) => setTplTemplate(event.target.value)}
                            />
                          )}
                        </div>
                      )}
                      {!isLineEntryPayloadType(tplPayloadType) && (
                        <div className="grid gap-1">
                          <label className="text-[11px] font-semibold text-ink/70">Color</label>
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
                        </div>
                      )}
                      {isLineEntryPayloadType(tplPayloadType) && isRichTextType(tplPayloadType) && (
                        <div className="grid gap-2">
                          <label className="text-[11px] font-semibold text-ink/70">Rich Text Tools</label>
                          <div className="flex flex-wrap gap-2 text-xs text-ink">
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(createTemplateLineRef, "bold");
                              }}
                            >
                              Bold
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(createTemplateLineRef, "italic");
                              }}
                            >
                              Italic
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(createTemplateLineRef, "underline");
                              }}
                            >
                              Underline
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(createTemplateLineRef, "insertUnorderedList");
                              }}
                            >
                              Bullet List
                            </button>
                            <div className="flex items-center gap-2 rounded-full border border-ink/15 px-2 py-1">
                              <input
                                type="color"
                                className="h-5 w-5 rounded border border-ink/10 bg-white"
                                value={tplColor}
                                onChange={(event) => setTplColor(event.target.value)}
                              />
                              <button
                                className="text-xs text-ink"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyRichColor(createTemplateLineRef, tplColor);
                                }}
                              >
                                Apply Color
                              </button>
                            </div>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                const url = window.prompt("Image URL");
                                if (!url) return;
                                insertRichImage(createTemplateLineRef, url);
                              }}
                            >
                              Insert Image
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                createTemplateImageInputRef.current?.click();
                              }}
                            >
                              Upload Image
                            </button>
                          </div>
                          <input
                            ref={createTemplateImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                const url = typeof reader.result === "string" ? reader.result : "";
                                if (!url) return;
                                insertRichImage(createTemplateLineRef, url);
                              };
                              reader.readAsDataURL(file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </div>
                      )}
                      {isLineEntryPayloadType(tplPayloadType) && (
                        <div className="grid gap-2">
                          <div className="flex flex-wrap gap-2 text-xs text-ink">
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onClick={() => {
                                const pageIndex = isPagePayloadType(tplPayloadType) ? tplParsedPages.length - 1 : 0;
                                const lineIndex =
                                  isPagePayloadType(tplPayloadType) ? tplParsedPages[pageIndex].length : tplParsedPages[0].length;
                                const nextPages = updateTemplateLine(tplParsedPages, pageIndex, lineIndex, "");
                                setTplTemplate(joinTemplatePages(nextPages));
                              }}
                            >
                              Add line
                            </button>
                            {isPagePayloadType(tplPayloadType) && (
                              <button
                                className="rounded-full border border-ink/15 px-2 py-1"
                                onClick={() => {
                                  const nextPages = tplParsedPages.map((lines) => lines.slice());
                                  nextPages.push([""]);
                                  setTplTemplate(joinTemplatePages(nextPages));
                                }}
                              >
                                Add page
                              </button>
                            )}
                          </div>
                          {!isPagePayloadType(tplPayloadType) && (
                            <div className="grid gap-2">
                              {tplParsedPages[0].map((_, index) => (
                                <div
                                  key={`line-${index}`}
                                  className={`flex flex-wrap items-center gap-2 overflow-visible rounded-lg px-2 py-1 pr-3 ${
                                    activeTemplateLine?.page === 0 && activeTemplateLine?.line === index
                                      ? "bg-sand/70 ring-1 ring-ink/15"
                                      : ""
                                  }`}
                                >
                                  <label className="text-[11px] font-semibold text-ink/70">Line {index + 1}</label>
                                  {isRichTextType(tplPayloadType) ? (
                                    <textarea
                                      ref={index === 0 ? createTemplateLineRef : undefined}
                                      className="min-h-[80px] min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                      value={tplParsedPages[0][index]}
                                      onFocus={(event) => {
                                        createTemplateLineRef.current = event.currentTarget;
                                        setActiveTemplateLine({ page: 0, line: index });
                                      }}
                                      onChange={(event) => {
                                        const nextPages = updateTemplateLine(
                                          tplParsedPages,
                                          0,
                                          index,
                                          event.target.value
                                        );
                                        setTplTemplate(joinTemplatePages(nextPages));
                                      }}
                                    />
                                  ) : (
                                    <input
                                      className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                      value={tplParsedPages[0][index]}
                                      onFocus={() => setActiveTemplateLine({ page: 0, line: index })}
                                      onChange={(event) => {
                                        const nextPages = updateTemplateLine(
                                          tplParsedPages,
                                          0,
                                          index,
                                          event.target.value
                                        );
                                        setTplTemplate(joinTemplatePages(nextPages));
                                      }}
                                    />
                                  )}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="color"
                                      aria-label={`Line ${index + 1} color`}
                                      title={`Line ${index + 1} color`}
                                      className="h-8 w-10 shrink-0 rounded-lg border border-ink/10 bg-white"
                                      value={tplLineColors[index] || "#ffffff"}
                                      onChange={(event) =>
                                        setTplLineColors((prev) =>
                                          prev.map((value, i) => (i === index ? event.target.value : value))
                                        )
                                      }
                                    />
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60">
                                      Color
                                    </span>
                                  </div>
                                  {tplParsedPages[0].length > 1 && (
                                    <button
                                      className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                      onClick={() => {
                                        const nextPages = tplParsedPages.map((lines) => lines.slice());
                                        nextPages[0].splice(index, 1);
                                        if (nextPages[0].length === 0) nextPages[0].push("");
                                        setTplTemplate(joinTemplatePages(nextPages));
                                      }}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {isPagePayloadType(tplPayloadType) && (
                            <div className="grid gap-3">
                              {tplParsedPages.map((page, pageIndex) => (
                                <div key={`page-${pageIndex}`} className="grid gap-2 rounded-lg border border-ink/10 bg-white/60 p-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-ink/70">Page {pageIndex + 1}</p>
                                    {tplParsedPages.length > 1 && (
                                      <button
                                        className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                        onClick={() => {
                                          const nextPages = tplParsedPages.map((lines) => lines.slice());
                                          nextPages.splice(pageIndex, 1);
                                          if (nextPages.length === 0) nextPages.push([""]);
                                          setTplTemplate(joinTemplatePages(nextPages));
                                        }}
                                      >
                                        Delete page
                                      </button>
                                    )}
                                  </div>
                                  {page.map((_, lineIndex) => (
                                    <div
                                      key={`page-${pageIndex}-line-${lineIndex}`}
                                      className={`flex flex-wrap items-center gap-2 overflow-visible rounded-lg px-2 py-1 pr-3 ${
                                        activeTemplateLine?.page === pageIndex &&
                                        activeTemplateLine?.line === lineIndex
                                          ? "bg-sand/70 ring-1 ring-ink/15"
                                          : ""
                                      }`}
                                    >
                                      <label className="text-[11px] font-semibold text-ink/70">
                                        Line {lineIndex + 1}
                                      </label>
                                      {isRichTextType(tplPayloadType) ? (
                                        <textarea
                                          ref={pageIndex === 0 && lineIndex === 0 ? createTemplateLineRef : undefined}
                                          className="min-h-[80px] min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                          value={tplParsedPages[pageIndex][lineIndex]}
                                          onFocus={(event) => {
                                            createTemplateLineRef.current = event.currentTarget;
                                            setActiveTemplateLine({ page: pageIndex, line: lineIndex });
                                          }}
                                          onChange={(event) => {
                                            const nextPages = updateTemplateLine(
                                              tplParsedPages,
                                              pageIndex,
                                              lineIndex,
                                              event.target.value
                                            );
                                            setTplTemplate(joinTemplatePages(nextPages));
                                          }}
                                        />
                                      ) : (
                                        <input
                                          className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                          value={tplParsedPages[pageIndex][lineIndex]}
                                          onFocus={() => setActiveTemplateLine({ page: pageIndex, line: lineIndex })}
                                          onChange={(event) => {
                                            const nextPages = updateTemplateLine(
                                              tplParsedPages,
                                              pageIndex,
                                              lineIndex,
                                              event.target.value
                                            );
                                            setTplTemplate(joinTemplatePages(nextPages));
                                          }}
                                        />
                                      )}
                                      <div className="flex items-center gap-1 shrink-0">
                                        <input
                                          type="color"
                                          aria-label={`Page ${pageIndex + 1} line ${lineIndex + 1} color`}
                                          title={`Page ${pageIndex + 1} line ${lineIndex + 1} color`}
                                          className="h-8 w-10 shrink-0 rounded-lg border border-ink/10 bg-white"
                                          value={tplPageLineColors[pageIndex]?.[lineIndex] || "#ffffff"}
                                          onChange={(event) =>
                                            setTplPageLineColors((prev) => {
                                              const next = prev.map((colors) => colors.slice());
                                              while (next.length <= pageIndex) next.push([]);
                                              next[pageIndex] = normalizeColorArray(page.length, next[pageIndex] || []);
                                              next[pageIndex][lineIndex] = event.target.value;
                                              return next;
                                            })
                                          }
                                        />
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60">
                                          Color
                                        </span>
                                      </div>
                                      {page.length > 1 && (
                                        <button
                                          className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                          onClick={() => {
                                            const nextPages = tplParsedPages.map((lines) => lines.slice());
                                            nextPages[pageIndex].splice(lineIndex, 1);
                                            if (nextPages[pageIndex].length === 0) nextPages[pageIndex].push("");
                                            setTplTemplate(joinTemplatePages(nextPages));
                                          }}
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                    onClick={() => {
                                      const nextPages = tplParsedPages.map((lines) => lines.slice());
                                      nextPages[pageIndex].push("");
                                      setTplTemplate(joinTemplatePages(nextPages));
                                    }}
                                  >
                                    Add line
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {getTemplateStyleFields(tplPayloadType)
                        .filter(
                          (field) =>
                            field.key !== "color" &&
                            !(
                              isLineEntryPayloadType(tplPayloadType) &&
                              field.key === "colors"
                            )
                        )
                        .map((field) => (
                          <div key={field.key} className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">{field.label}</label>
                            {field.key === "colors" ? (
                              <textarea
                                className="min-h-[90px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                placeholder='Example: [["#fff","#f0b"],["#0ff","#333"]]'
                                value={tplStyleOverrides[field.key] || ""}
                                onChange={(event) =>
                                  setTplStyleOverrides((prev) => ({ ...prev, [field.key]: event.target.value }))
                                }
                              />
                            ) : field.type === "color" ? (
                              <input
                                type="color"
                                className="h-10 w-12 rounded-lg border border-ink/10 bg-white"
                                value={tplStyleOverrides[field.key] || "#ffffff"}
                                onChange={(event) =>
                                  setTplStyleOverrides((prev) => ({ ...prev, [field.key]: event.target.value }))
                                }
                              />
                            ) : (
                              <input
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                type={field.type === "number" ? "number" : "text"}
                                value={tplStyleOverrides[field.key] || ""}
                                onChange={(event) =>
                                  setTplStyleOverrides((prev) => ({ ...prev, [field.key]: event.target.value }))
                                }
                              />
                            )}
                          </div>
                        ))}
                      <div className="grid gap-2">
                        <label className="text-[11px] font-semibold text-ink/70">Preview Data (JSON)</label>
                        <textarea
                          className="min-h-[90px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-mono"
                          value={tplPreviewData}
                          onChange={(event) => setTplPreviewData(event.target.value)}
                        />
                        <button
                          className="rounded-lg border border-ink/20 px-3 py-2 text-xs text-ink"
                          onClick={previewNewTemplate}
                        >
                          Preview via Router
                        </button>
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
              )}
              {filteredTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-sand/60 p-4 text-left transition hover:bg-white/80"
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setEditTemplateName(tpl.name);
                    setEditTemplatePayloadType(tpl.payload_type);
                    setEditTemplateTemplate(tpl.template);
                    setEditTemplatePreviewData('{"message":"Hello"}');
                    setEditTemplateColor(
                      typeof tpl.default_style?.color === "string" ? tpl.default_style.color : "#ffffff"
                    );
                    if (tpl.default_style) {
                      const { color, colors, ...rest } = tpl.default_style;
                      const next: Record<string, string> = {};
                      Object.entries(rest).forEach(([key, value]) => {
                        if (value == null) return;
                        next[key] = String(value);
                      });
                      setEditTemplateStyleOverrides(next);
                      if (Array.isArray(colors) && colors.length && Array.isArray(colors[0])) {
                        const pageColors = (colors as unknown[]).map((page) =>
                          Array.isArray(page)
                            ? (page as unknown[]).map((value) =>
                                typeof value === "string" ? value : "#ffffff"
                              )
                            : ["#ffffff"]
                        );
                        setEditTemplatePageLineColors(normalizePageColors(pageColors, pageColors));
                      } else if (Array.isArray(colors)) {
                        const colorStrings = (colors as unknown[]).map((value) =>
                          typeof value === "string" ? value : "#ffffff"
                        );
                        setEditTemplateLineColors(normalizeColorArray(colorStrings.length || 1, colorStrings));
                        setEditTemplatePageLineColors([normalizeColorArray(colorStrings.length || 1, colorStrings)]);
                      } else {
                        setEditTemplateLineColors(["#ffffff"]);
                        setEditTemplatePageLineColors([["#ffffff"]]);
                      }
                    } else {
                      setEditTemplateStyleOverrides({});
                      setEditTemplateLineColors(["#ffffff"]);
                      setEditTemplatePageLineColors([["#ffffff"]]);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{tpl.name || "Untitled template"}</p>
                    <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate">
                      {formatLabel(tpl.payload_type)}
                    </span>
                  </div>
                  <p className="text-xs text-slate">&nbsp;</p>
                </button>
              ))}
              {loading.templates && <p className="text-sm text-slate">Loading templates...</p>}
              {!loading.templates && templates.length === 0 && (
                <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                  No templates yet.
                </div>
              )}
            </div>
            {errors.templates && <p className="mt-3 text-xs text-clay">{errors.templates}</p>}
            {meta.templates.total > pageSize && (
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
              </div>
            )}
            {selectedTemplate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Edit Template</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedTemplate(null)}>
                      Close
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate">{selectedTemplate.id}</p>
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Name</label>
                      <input
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        placeholder="Name"
                        value={editTemplateName}
                        onChange={(event) => setEditTemplateName(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Payload Type</label>
                      <select
                        className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={editTemplatePayloadType}
                        onChange={(event) => setEditTemplatePayloadType(event.target.value)}
                      >
                        {templatePayloadTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {formatLabel(opt)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!isLineEntryPayloadType(editTemplatePayloadType) && (
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Template String</label>
                        {isRichTextType(editTemplatePayloadType) ? (
                          <div className="grid gap-2">
                            <div className="flex flex-wrap gap-2 text-xs text-ink">
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(editTemplateEditorRef, "bold");
                              }}
                            >
                              Bold
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(editTemplateEditorRef, "italic");
                              }}
                            >
                              Italic
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(editTemplateEditorRef, "underline");
                              }}
                            >
                              Underline
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichCommand(editTemplateEditorRef, "insertUnorderedList");
                              }}
                            >
                              Bullet List
                            </button>
                            <div className="flex items-center gap-2 rounded-full border border-ink/15 px-2 py-1">
                              <input
                                type="color"
                                className="h-5 w-5 rounded border border-ink/10 bg-white"
                                value={editTemplateColor}
                                onChange={(event) => setEditTemplateColor(event.target.value)}
                              />
                              <button
                                className="text-xs text-ink"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyRichColor(editTemplateEditorRef, editTemplateColor);
                                }}
                              >
                                Apply Color
                              </button>
                            </div>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                const url = window.prompt("Image URL");
                                if (!url) return;
                                insertRichImage(editTemplateEditorRef, url);
                              }}
                            >
                              Insert Image
                            </button>
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                editTemplateImageInputRef.current?.click();
                              }}
                            >
                              Upload Image
                            </button>
                          </div>
                          <input
                            ref={editTemplateImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                const url = typeof reader.result === "string" ? reader.result : "";
                                if (!url) return;
                                insertRichImage(editTemplateEditorRef, url);
                              };
                              reader.readAsDataURL(file);
                              event.currentTarget.value = "";
                            }}
                          />
                          <textarea
                            ref={editTemplateEditorRef}
                            className="min-h-[140px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                            value={editTemplateTemplate}
                            onChange={(event) => setEditTemplateTemplate(event.target.value)}
                          />
                          </div>
                        ) : (
                          <textarea
                            className="min-h-[120px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                            value={editTemplateTemplate}
                            onChange={(event) => setEditTemplateTemplate(event.target.value)}
                          />
                        )}
                      </div>
                    )}
                    {!isLineEntryPayloadType(editTemplatePayloadType) && (
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 rounded-lg border border-ink/10 bg-white"
                            value={editTemplateColor}
                            onChange={(event) => setEditTemplateColor(event.target.value)}
                          />
                          {colorPresets.map((preset) => (
                            <button
                              key={preset}
                              className="h-8 w-8 rounded-full border border-ink/10"
                              style={{ backgroundColor: preset }}
                              onClick={() => setEditTemplateColor(preset)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {isLineEntryPayloadType(editTemplatePayloadType) && isRichTextType(editTemplatePayloadType) && (
                      <div className="grid gap-2">
                        <label className="text-[11px] font-semibold text-ink/70">Rich Text Tools</label>
                        <div className="flex flex-wrap gap-2 text-xs text-ink">
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applyRichCommand(editTemplateLineRef, "bold");
                            }}
                          >
                            Bold
                          </button>
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applyRichCommand(editTemplateLineRef, "italic");
                            }}
                          >
                            Italic
                          </button>
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applyRichCommand(editTemplateLineRef, "underline");
                            }}
                          >
                            Underline
                          </button>
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applyRichCommand(editTemplateLineRef, "insertUnorderedList");
                            }}
                          >
                            Bullet List
                          </button>
                          <div className="flex items-center gap-2 rounded-full border border-ink/15 px-2 py-1">
                            <input
                              type="color"
                              className="h-5 w-5 rounded border border-ink/10 bg-white"
                              value={editTemplateColor}
                              onChange={(event) => setEditTemplateColor(event.target.value)}
                            />
                            <button
                              className="text-xs text-ink"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyRichColor(editTemplateLineRef, editTemplateColor);
                              }}
                            >
                              Apply Color
                            </button>
                          </div>
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              const url = window.prompt("Image URL");
                              if (!url) return;
                              insertRichImage(editTemplateLineRef, url);
                            }}
                          >
                            Insert Image
                          </button>
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              editTemplateImageInputRef.current?.click();
                            }}
                          >
                            Upload Image
                          </button>
                        </div>
                        <input
                          ref={editTemplateImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const url = typeof reader.result === "string" ? reader.result : "";
                              if (!url) return;
                              insertRichImage(editTemplateLineRef, url);
                            };
                            reader.readAsDataURL(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </div>
                    )}
                    {isLineEntryPayloadType(editTemplatePayloadType) && (
                      <div className="grid gap-2">
                        <div className="flex flex-wrap gap-2 text-xs text-ink">
                          <button
                            className="rounded-full border border-ink/15 px-2 py-1"
                            onClick={() => {
                              const pageIndex =
                                isPagePayloadType(editTemplatePayloadType) ? editParsedPages.length - 1 : 0;
                              const lineIndex =
                                isPagePayloadType(editTemplatePayloadType)
                                  ? editParsedPages[pageIndex].length
                                  : editParsedPages[0].length;
                              const nextPages = updateTemplateLine(editParsedPages, pageIndex, lineIndex, "");
                              setEditTemplateTemplate(joinTemplatePages(nextPages));
                            }}
                          >
                            Add line
                          </button>
                          {isPagePayloadType(editTemplatePayloadType) && (
                            <button
                              className="rounded-full border border-ink/15 px-2 py-1"
                              onClick={() => {
                                const nextPages = editParsedPages.map((lines) => lines.slice());
                                nextPages.push([""]);
                                setEditTemplateTemplate(joinTemplatePages(nextPages));
                              }}
                            >
                              Add page
                            </button>
                          )}
                        </div>
                        {!isPagePayloadType(editTemplatePayloadType) && (
                          <div className="grid gap-2">
                            {editParsedPages[0].map((_, index) => (
                              <div
                                key={`line-${index}`}
                                className={`flex flex-wrap items-center gap-2 overflow-visible rounded-lg px-2 py-1 pr-3 ${
                                  activeEditTemplateLine?.page === 0 && activeEditTemplateLine?.line === index
                                    ? "bg-sand/70 ring-1 ring-ink/15"
                                    : ""
                                }`}
                              >
                                <label className="text-[11px] font-semibold text-ink/70">Line {index + 1}</label>
                                {isRichTextType(editTemplatePayloadType) ? (
                                  <textarea
                                    ref={index === 0 ? editTemplateLineRef : undefined}
                                    className="min-h-[80px] min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                    value={editParsedPages[0][index]}
                                    onFocus={(event) => {
                                      editTemplateLineRef.current = event.currentTarget;
                                      setActiveEditTemplateLine({ page: 0, line: index });
                                    }}
                                    onChange={(event) => {
                                      const nextPages = updateTemplateLine(
                                        editParsedPages,
                                        0,
                                        index,
                                        event.target.value
                                      );
                                      setEditTemplateTemplate(joinTemplatePages(nextPages));
                                    }}
                                  />
                                ) : (
                                  <input
                                    className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                    value={editParsedPages[0][index]}
                                    onFocus={() => setActiveEditTemplateLine({ page: 0, line: index })}
                                    onChange={(event) => {
                                      const nextPages = updateTemplateLine(
                                        editParsedPages,
                                        0,
                                        index,
                                        event.target.value
                                      );
                                      setEditTemplateTemplate(joinTemplatePages(nextPages));
                                    }}
                                  />
                                )}
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="color"
                                    aria-label={`Line ${index + 1} color`}
                                    title={`Line ${index + 1} color`}
                                    className="h-8 w-10 shrink-0 rounded-lg border border-ink/10 bg-white"
                                    value={editTemplateLineColors[index] || "#ffffff"}
                                    onChange={(event) =>
                                      setEditTemplateLineColors((prev) =>
                                        prev.map((value, i) => (i === index ? event.target.value : value))
                                      )
                                    }
                                  />
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60">
                                    Color
                                  </span>
                                </div>
                                {editParsedPages[0].length > 1 && (
                                  <button
                                    className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                    onClick={() => {
                                      const nextPages = editParsedPages.map((lines) => lines.slice());
                                      nextPages[0].splice(index, 1);
                                      if (nextPages[0].length === 0) nextPages[0].push("");
                                      setEditTemplateTemplate(joinTemplatePages(nextPages));
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {isPagePayloadType(editTemplatePayloadType) && (
                          <div className="grid gap-3">
                            {editParsedPages.map((page, pageIndex) => (
                              <div key={`page-${pageIndex}`} className="grid gap-2 rounded-lg border border-ink/10 bg-white/60 p-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-semibold text-ink/70">Page {pageIndex + 1}</p>
                                  {editParsedPages.length > 1 && (
                                    <button
                                      className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                      onClick={() => {
                                        const nextPages = editParsedPages.map((lines) => lines.slice());
                                        nextPages.splice(pageIndex, 1);
                                        if (nextPages.length === 0) nextPages.push([""]);
                                        setEditTemplateTemplate(joinTemplatePages(nextPages));
                                      }}
                                    >
                                      Delete page
                                    </button>
                                  )}
                                </div>
                              {page.map((_, lineIndex) => (
                                <div
                                  key={`page-${pageIndex}-line-${lineIndex}`}
                                  className={`flex flex-wrap items-center gap-2 overflow-visible rounded-lg px-2 py-1 pr-3 ${
                                    activeEditTemplateLine?.page === pageIndex &&
                                    activeEditTemplateLine?.line === lineIndex
                                      ? "bg-sand/70 ring-1 ring-ink/15"
                                      : ""
                                  }`}
                                >
                                  <label className="text-[11px] font-semibold text-ink/70">
                                    Line {lineIndex + 1}
                                  </label>
                                  {isRichTextType(editTemplatePayloadType) ? (
                                    <textarea
                                      ref={pageIndex === 0 && lineIndex === 0 ? editTemplateLineRef : undefined}
                                      className="min-h-[80px] min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                      value={editParsedPages[pageIndex][lineIndex]}
                                      onFocus={(event) => {
                                        editTemplateLineRef.current = event.currentTarget;
                                        setActiveEditTemplateLine({ page: pageIndex, line: lineIndex });
                                      }}
                                      onChange={(event) => {
                                        const nextPages = updateTemplateLine(
                                          editParsedPages,
                                          pageIndex,
                                            lineIndex,
                                            event.target.value
                                          );
                                          setEditTemplateTemplate(joinTemplatePages(nextPages));
                                        }}
                                      />
                                  ) : (
                                    <input
                                      className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                      value={editParsedPages[pageIndex][lineIndex]}
                                      onFocus={() => setActiveEditTemplateLine({ page: pageIndex, line: lineIndex })}
                                      onChange={(event) => {
                                        const nextPages = updateTemplateLine(
                                          editParsedPages,
                                          pageIndex,
                                          lineIndex,
                                            event.target.value
                                          );
                                          setEditTemplateTemplate(joinTemplatePages(nextPages));
                                        }}
                                      />
                                    )}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <input
                                        type="color"
                                        aria-label={`Page ${pageIndex + 1} line ${lineIndex + 1} color`}
                                        title={`Page ${pageIndex + 1} line ${lineIndex + 1} color`}
                                        className="h-8 w-10 shrink-0 rounded-lg border border-ink/10 bg-white"
                                        value={editTemplatePageLineColors[pageIndex]?.[lineIndex] || "#ffffff"}
                                        onChange={(event) =>
                                          setEditTemplatePageLineColors((prev) => {
                                            const next = prev.map((colors) => colors.slice());
                                            while (next.length <= pageIndex) next.push([]);
                                            next[pageIndex] = normalizeColorArray(page.length, next[pageIndex] || []);
                                            next[pageIndex][lineIndex] = event.target.value;
                                            return next;
                                          })
                                        }
                                      />
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60">
                                        Color
                                      </span>
                                    </div>
                                    {page.length > 1 && (
                                      <button
                                        className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                        onClick={() => {
                                          const nextPages = editParsedPages.map((lines) => lines.slice());
                                          nextPages[pageIndex].splice(lineIndex, 1);
                                          if (nextPages[pageIndex].length === 0) nextPages[pageIndex].push("");
                                          setEditTemplateTemplate(joinTemplatePages(nextPages));
                                        }}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  className="rounded-full border border-ink/15 px-2 py-1 text-[11px]"
                                  onClick={() => {
                                    const nextPages = editParsedPages.map((lines) => lines.slice());
                                    nextPages[pageIndex].push("");
                                    setEditTemplateTemplate(joinTemplatePages(nextPages));
                                  }}
                                >
                                  Add line
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {getTemplateStyleFields(editTemplatePayloadType)
                      .filter(
                        (field) =>
                          field.key !== "color" &&
                          !(
                            isLineEntryPayloadType(editTemplatePayloadType) &&
                            field.key === "colors"
                          )
                      )
                      .map((field) => (
                        <div key={field.key} className="grid gap-1">
                          <label className="text-[11px] font-semibold text-ink/70">{field.label}</label>
                          {field.key === "colors" ? (
                            <textarea
                              className="min-h-[90px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              placeholder='Example: [["#fff","#f0b"],["#0ff","#333"]]'
                              value={editTemplateStyleOverrides[field.key] || ""}
                              onChange={(event) =>
                                setEditTemplateStyleOverrides((prev) => ({ ...prev, [field.key]: event.target.value }))
                              }
                            />
                          ) : field.type === "color" ? (
                            <input
                              type="color"
                              className="h-10 w-12 rounded-lg border border-ink/10 bg-white"
                              value={editTemplateStyleOverrides[field.key] || "#ffffff"}
                              onChange={(event) =>
                                setEditTemplateStyleOverrides((prev) => ({ ...prev, [field.key]: event.target.value }))
                              }
                            />
                          ) : (
                            <input
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              type={field.type === "number" ? "number" : "text"}
                              value={editTemplateStyleOverrides[field.key] || ""}
                              onChange={(event) =>
                                setEditTemplateStyleOverrides((prev) => ({ ...prev, [field.key]: event.target.value }))
                              }
                            />
                          )}
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink"
                      onClick={() => deleteTemplate(selectedTemplate.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="rounded-lg bg-ink px-3 py-2 text-sm text-sand"
                      onClick={() => saveTemplate(selectedTemplate.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section
            id="carousels"
            hidden={activeTab !== "carousels"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Carousel</h2>
                <p className="text-sm text-slate">Sequence payload windows into repeating display loops.</p>
              </div>
              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-ink/70">Search Carousels</label>
                <input
                  className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                  placeholder="Search carousels"
                  value={carouselFilter}
                  onChange={(event) => setCarouselFilter(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-5">
                <h3 className="text-sm font-semibold text-ink">Create Carousel</h3>
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Name</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      value={carouselName}
                      onChange={(event) => setCarouselName(event.target.value)}
                      placeholder="Morning rotation"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Cadence Seconds</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      value={carouselCadence}
                      onChange={(event) => setCarouselCadence(event.target.value)}
                      type="number"
                      min={1}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Windows JSON</label>
                    <textarea
                      className="min-h-[180px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-mono"
                      value={carouselWindows}
                      onChange={(event) => setCarouselWindows(event.target.value)}
                    />
                  </div>
                  {formErrors.carousel && <p className="text-xs text-clay">{formErrors.carousel}</p>}
                  <button
                    className="rounded-lg bg-ink px-3 py-2 text-sm text-sand"
                    onClick={createCarousel}
                  >
                    Create Carousel
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Existing Carousels</h3>
                  <button
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs"
                    onClick={loadCarousels}
                  >
                    Refresh
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {loading.carousels && (
                    <div className="rounded-xl border border-ink/10 bg-sand/60 p-3 text-sm text-slate">
                      Loading carousels...
                    </div>
                  )}
                  {!loading.carousels && filteredCarousels.length === 0 && (
                    <div className="rounded-xl border border-ink/10 bg-sand/60 p-3 text-sm text-slate">
                      No carousels yet.
                    </div>
                  )}
                  {!loading.carousels &&
                    filteredCarousels.map((carousel) => (
                      <div key={carousel.id} className="rounded-xl border border-ink/10 bg-sand/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">{carousel.name}</p>
                            <p className="text-xs text-slate">
                              {carousel.windows?.length || 0} windows · {carousel.cadence_seconds}s cadence
                            </p>
                            <p className="text-[11px] text-slate">{carousel.created_at}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="rounded-full border border-ink/20 px-3 py-1 text-xs"
                              onClick={() => previewCarousel(carousel.id, false)}
                            >
                              Preview
                            </button>
                            <button
                              className="rounded-full border border-ink/20 px-3 py-1 text-xs"
                              onClick={() => previewCarousel(carousel.id, true)}
                            >
                              Advance
                            </button>
                            <button
                              className="rounded-full border border-ink/20 px-3 py-1 text-xs"
                              onClick={() => {
                                setSelectedCarousel(carousel);
                                setEditCarouselName(carousel.name);
                                setEditCarouselCadence(String(carousel.cadence_seconds));
                                setEditCarouselWindows(JSON.stringify(carousel.windows || [], null, 2));
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-full border border-ink/20 px-3 py-1 text-xs text-clay"
                              onClick={() => deleteCarousel(carousel.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                {errors.carousels && <p className="mt-3 text-xs text-clay">{errors.carousels}</p>}
                {meta.carousels.total > pageSize && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate">
                    <button
                      className="rounded-full border border-ink/20 px-3 py-1"
                      onClick={() => setPage((prev) => ({ ...prev, carousels: Math.max(1, prev.carousels - 1) }))}
                    >
                      Prev
                    </button>
                    <span>Page {page.carousels}</span>
                    <button
                      className="rounded-full border border-ink/20 px-3 py-1"
                      onClick={() => setPage((prev) => ({ ...prev, carousels: prev.carousels + 1 }))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
            {selectedCarousel && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Edit Carousel</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedCarousel(null)}>
                      Close
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Name</label>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={editCarouselName}
                        onChange={(event) => setEditCarouselName(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Cadence Seconds</label>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={editCarouselCadence}
                        onChange={(event) => setEditCarouselCadence(event.target.value)}
                        type="number"
                        min={1}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Windows JSON</label>
                      <textarea
                        className="min-h-[200px] w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-mono"
                        value={editCarouselWindows}
                        onChange={(event) => setEditCarouselWindows(event.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink"
                        onClick={() => deleteCarousel(selectedCarousel.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="rounded-lg bg-ink px-3 py-2 text-sm text-sand"
                        onClick={() => updateCarousel(selectedCarousel.id)}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section
            id="rules"
            hidden={activeTab !== "rules"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Rules</h2>
                <p className="text-sm text-slate">Route payloads to displays with schedules and priorities.</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Search Rules</label>
                  <input
                    className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                    placeholder="Search rules"
                    value={ruleFilter}
                    onChange={(event) => setRuleFilter(event.target.value)}
                  />
                </div>
                <button
                  className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink"
                  onClick={() => {
                    setShowCreate((prev) => ({ ...prev, rules: true }));
                    fillSampleRule();
                    setRuleStep(1);
                  }}
                >
                  Create New
                </button>
                <button className="rounded-full bg-ink px-4 py-2 text-sm text-sand" onClick={loadRules}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {showCreate.rules && (
                <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Create Rule</p>
                <div className="mt-3 grid gap-2">
                  {ruleStep === 1 && (
                    <>
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Rule Name</label>
                        <input
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          placeholder="Rule name"
                          value={ruleName}
                          onChange={(event) => setRuleName(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Match Payload Type</label>
                        <select
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          value={rulePayloadType}
                          onChange={(event) => {
                            setRulePayloadType(event.target.value);
                            setRuleTemplateId("");
                          }}
                        >
                          <option value=""></option>
                          {payloadTypeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {formatLabel(opt)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {rulePayloadType && (
                        <div className="grid gap-1">
                          <label className="text-[11px] font-semibold text-ink/70">Apply Template (optional)</label>
                          <select
                            className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                            value={ruleTemplateId}
                            onChange={(event) => setRuleTemplateId(event.target.value)}
                          >
                            <option value="">No template override</option>
                            {templates
                              .filter((tpl) => tpl.payload_type === rulePayloadType)
                              .map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>
                                  {tpl.name || tpl.id}
                                </option>
                              ))}
                          </select>
                          {templates.filter((tpl) => tpl.payload_type === rulePayloadType).length === 0 && (
                            <p className="text-[11px] text-slate">No templates available for this payload type.</p>
                          )}
                        </div>
                      )}
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Match Client ID (optional)</label>
                        <input
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          placeholder="Match client_id (optional)"
                          value={ruleClientId}
                          onChange={(event) => setRuleClientId(event.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg bg-ink px-3 py-2 text-sm text-sand" onClick={() => setRuleStep(2)}>
                          Next
                        </button>
                      </div>
                    </>
                  )}
                  {ruleStep === 2 && (
                    <>
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Display Targets</label>
                        {displays.length === 0 ? (
                          <div className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2 text-xs text-slate">
                            No displays available yet.
                          </div>
                        ) : (
                          <div className="grid gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm">
                            {displays.map((display) => {
                              const checked = ruleTargets.includes(display.id);
                              return (
                                <label key={display.id} className="flex items-center gap-2 text-xs text-ink">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setRuleTargets((prev) =>
                                        checked ? prev.filter((id) => id !== display.id) : [...prev, display.id]
                                      )
                                    }
                                  />
                                  <span className="text-sm">{display.name || display.id}</span>
                                  {display.name && <span className="text-[11px] text-slate">{display.id}</span>}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Priority</label>
                        <input
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          placeholder="Priority"
                          value={rulePriority}
                          onChange={(event) => setRulePriority(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="grid gap-1">
                          <label className="text-[11px] font-semibold text-ink/70">
                            Transition type into new payload
                          </label>
                          <select
                            className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                            value={ruleTransition}
                            onChange={(event) => setRuleTransition(event.target.value)}
                          >
                            {transitionOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {formatLabel(opt)}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(ruleTransition === "cut" || ruleTransition === "instant") && (
                          <></>
                        )}
                        {(ruleTransition === "slide" || ruleTransition === "wipe") && (
                          <div className="grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-3">
                            <div className="grid gap-1">
                              <label className="text-[11px] font-semibold text-ink/70">Duration (ms)</label>
                              <input
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                placeholder="Duration ms"
                                value={ruleTransitionDurationMs}
                                onChange={(event) => setRuleTransitionDurationMs(event.target.value)}
                              />
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[11px] font-semibold text-ink/70">Direction</label>
                              <select
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                value={ruleTransitionDirection}
                                onChange={(event) => setRuleTransitionDirection(event.target.value)}
                              >
                                <option value=""></option>
                                {["left", "right", "up", "down"].map((opt) => (
                                  <option key={opt} value={opt}>
                                    {formatLabel(opt)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                        {ruleTransition === "fade" && (
                          <div className="grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-3">
                            <div className="grid gap-1">
                              <label className="text-[11px] font-semibold text-ink/70">Fade In (ms)</label>
                              <input
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                placeholder="Fade in ms"
                                value={ruleTransitionFadeInMs}
                                onChange={(event) => setRuleTransitionFadeInMs(event.target.value)}
                              />
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[11px] font-semibold text-ink/70">Fade Out (ms)</label>
                              <input
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                placeholder="Fade out ms"
                                value={ruleTransitionFadeOutMs}
                                onChange={(event) => setRuleTransitionFadeOutMs(event.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        {ruleTransition === "barn_door" && (
                          <div className="grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-3">
                            <div className="grid gap-1">
                              <label className="text-[11px] font-semibold text-ink/70">Duration (ms)</label>
                              <input
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                placeholder="Duration ms"
                                value={ruleTransitionDurationMs}
                                onChange={(event) => setRuleTransitionDurationMs(event.target.value)}
                              />
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[11px] font-semibold text-ink/70">Barn Door Direction</label>
                              <select
                                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                                value={ruleTransitionBarnDirection}
                                onChange={(event) => setRuleTransitionBarnDirection(event.target.value)}
                              >
                                <option value=""></option>
                                {["horizontal", "vertical"].map((opt) => (
                                  <option key={opt} value={opt}>
                                    {formatLabel(opt)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
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
              )}
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Active Rules</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate">
                  {loading.rules && <p>Loading rules...</p>}
                  {!loading.rules && rules.length === 0 && (
                    <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                      No rules yet.
                    </div>
                  )}
                  {filteredRules.map((rule) => (
                    <button
                      key={rule.id}
                      className="flex flex-col gap-2 rounded-lg bg-white/70 px-3 py-2 text-left transition hover:bg-white"
                      onClick={() => {
                        setSelectedRule(rule);
                        setEditRuleName(rule.name);
                        setEditRulePriority(String(rule.priority ?? ""));
                        setEditRuleClientId(rule.match?.client_id ?? "");
                        setEditRulePayloadType(rule.match?.payload_type ?? "");
                        setEditRuleTemplateId(rule.template_id ?? "");
                        setEditRuleTargets(rule.display_targets ?? []);
                        setEditRuleTransition(rule.transition?.type ?? "fade");
                        setEditRuleTransitionDurationMs(
                          rule.transition?.duration_ms !== undefined ? String(rule.transition.duration_ms) : ""
                        );
                        setEditRuleTransitionDirection(rule.transition?.direction ?? "");
                        setEditRuleTransitionFadeInMs(
                          rule.transition?.fade_in_ms !== undefined ? String(rule.transition.fade_in_ms) : ""
                        );
                        setEditRuleTransitionFadeOutMs(
                          rule.transition?.fade_out_ms !== undefined ? String(rule.transition.fade_out_ms) : ""
                        );
                        setEditRuleTransitionBarnDirection(rule.transition?.barn_direction ?? "");
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{rule.name}</p>
                        <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate">
                          Rule
                        </span>
                      </div>
                      <p className="text-xs text-slate">{rule.id}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-slate">
                        <span>Priority: {rule.priority ?? 0}</span>
                        <span>Targets: {rule.display_targets?.length ?? 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {errors.rules && <p className="mt-3 text-xs text-clay">{errors.rules}</p>}
              </div>
            </div>
            {meta.rules.total > pageSize && (
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
              </div>
            )}
            {selectedRule && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Edit Rule</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedRule(null)}>
                      Close
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate">{selectedRule.id}</p>
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Rule Name</label>
                      <input
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        placeholder="Rule name"
                        value={editRuleName}
                        onChange={(event) => setEditRuleName(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Match Payload Type</label>
                      <select
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        value={editRulePayloadType}
                        onChange={(event) => {
                          setEditRulePayloadType(event.target.value);
                          setEditRuleTemplateId("");
                        }}
                      >
                        <option value=""></option>
                        {payloadTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {formatLabel(opt)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {editRulePayloadType && (
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">Apply Template (optional)</label>
                        <select
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          value={editRuleTemplateId}
                          onChange={(event) => setEditRuleTemplateId(event.target.value)}
                        >
                          <option value="">No template override</option>
                          {templates
                            .filter((tpl) => tpl.payload_type === editRulePayloadType)
                            .map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>
                                {tpl.name || tpl.id}
                              </option>
                            ))}
                        </select>
                        {templates.filter((tpl) => tpl.payload_type === editRulePayloadType).length === 0 && (
                          <p className="text-[11px] text-slate">No templates available for this payload type.</p>
                        )}
                      </div>
                    )}
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Match Client ID (optional)</label>
                      <input
                        className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                        placeholder="Match client_id (optional)"
                        value={editRuleClientId}
                        onChange={(event) => setEditRuleClientId(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Display Targets</label>
                      {displays.length === 0 ? (
                        <div className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2 text-xs text-slate">
                          No displays available yet.
                        </div>
                      ) : (
                        <div className="grid gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm">
                          {displays.map((display) => {
                            const checked = editRuleTargets.includes(display.id);
                            return (
                              <label key={display.id} className="flex items-center gap-2 text-xs text-ink">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setEditRuleTargets((prev) =>
                                      checked ? prev.filter((id) => id !== display.id) : [...prev, display.id]
                                    )
                                  }
                                />
                                <span className="text-sm">{display.name || display.id}</span>
                                {display.name && <span className="text-[11px] text-slate">{display.id}</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] font-semibold text-ink/70">Priority</label>
                      <input
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        placeholder="Priority"
                        value={editRulePriority}
                        onChange={(event) => setEditRulePriority(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="grid gap-1">
                        <label className="text-[11px] font-semibold text-ink/70">
                          Transition type into new payload
                        </label>
                        <select
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          value={editRuleTransition}
                          onChange={(event) => setEditRuleTransition(event.target.value)}
                        >
                          {transitionOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {formatLabel(opt)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(editRuleTransition === "cut" || editRuleTransition === "instant") && (
                        <p className="text-xs text-slate">No additional transition parameters are required.</p>
                      )}
                      {(editRuleTransition === "slide" || editRuleTransition === "wipe") && (
                        <div className="grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-3">
                          <div className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">Duration (ms)</label>
                            <input
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              placeholder="Duration ms"
                              value={editRuleTransitionDurationMs}
                              onChange={(event) => setEditRuleTransitionDurationMs(event.target.value)}
                            />
                          </div>
                          <div className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">Direction</label>
                            <select
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              value={editRuleTransitionDirection}
                              onChange={(event) => setEditRuleTransitionDirection(event.target.value)}
                            >
                              <option value=""></option>
                              {["left", "right", "up", "down"].map((opt) => (
                                <option key={opt} value={opt}>
                                  {formatLabel(opt)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      {editRuleTransition === "fade" && (
                        <div className="grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-3">
                          <div className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">Fade In (ms)</label>
                            <input
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              placeholder="Fade in ms"
                              value={editRuleTransitionFadeInMs}
                              onChange={(event) => setEditRuleTransitionFadeInMs(event.target.value)}
                            />
                          </div>
                          <div className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">Fade Out (ms)</label>
                            <input
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              placeholder="Fade out ms"
                              value={editRuleTransitionFadeOutMs}
                              onChange={(event) => setEditRuleTransitionFadeOutMs(event.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      {editRuleTransition === "barn_door" && (
                        <div className="grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-3">
                          <div className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">Duration (ms)</label>
                            <input
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              placeholder="Duration ms"
                              value={editRuleTransitionDurationMs}
                              onChange={(event) => setEditRuleTransitionDurationMs(event.target.value)}
                            />
                          </div>
                          <div className="grid gap-1">
                            <label className="text-[11px] font-semibold text-ink/70">Barn Door Direction</label>
                            <select
                              className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                              value={editRuleTransitionBarnDirection}
                              onChange={(event) => setEditRuleTransitionBarnDirection(event.target.value)}
                            >
                              <option value=""></option>
                              {["horizontal", "vertical"].map((opt) => (
                                <option key={opt} value={opt}>
                                  {formatLabel(opt)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink"
                      onClick={() => deleteRule(selectedRule.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="rounded-lg bg-ink px-3 py-2 text-sm text-sand"
                      onClick={() => updateRule(selectedRule.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section
            id="displays"
            hidden={activeTab !== "displays"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Displays</h2>
                <p className="text-sm text-slate">Manage connected matrices and their capabilities.</p>
              </div>
              <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={loadDisplays}>
                Refresh
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {loading.displays && <p className="text-sm text-slate">Loading displays...</p>}
              {!loading.displays && displays.length === 0 && (
                <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate">
                  No displays yet. Waiting for self-registration.
                </div>
              )}
              {displays.map((disp) => {
                const status = monitoring.displays.find((display) => display.display_id === disp.id);
                return (
                  <button
                    key={disp.id}
                    className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-sand/60 p-4 text-left transition hover:bg-white/80"
                    onClick={() => {
                      setSelectedDisplayEdit(disp);
                      setEditDisplayName(disp.name);
                      setEditDisplayHost(disp.host);
                      setEditDisplayPort(String(disp.port));
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{disp.name || "Unnamed display"}</p>
                      <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate">
                        Display
                      </span>
                    </div>
                    <p className="text-xs text-slate">{disp.id}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate">
                      <span>
                        Host: {disp.host}:{disp.port}
                      </span>
                      <span>Status: {status?.connected ? "online" : "offline"}</span>
                    </div>
                  </button>
                );
              })}
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
            {meta.displays.total > pageSize && (
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
              </div>
            )}
            {selectedDisplayEdit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Edit Display</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedDisplayEdit(null)}>
                      Close
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate">{selectedDisplayEdit.id}</p>
                  <div className="mt-4 grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Name</label>
                    <input
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      placeholder="Name"
                      value={editDisplayName}
                      onChange={(event) => setEditDisplayName(event.target.value)}
                    />
                  </div>
                  <div className="mt-4 grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Host</label>
                    <input
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      placeholder="Host"
                      value={editDisplayHost}
                      onChange={(event) => setEditDisplayHost(event.target.value)}
                    />
                  </div>
                  <div className="mt-4 grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Port</label>
                    <input
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      placeholder="Port"
                      value={editDisplayPort}
                      onChange={(event) => setEditDisplayPort(event.target.value)}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink"
                      onClick={() => disableDisplay(selectedDisplayEdit.id)}
                    >
                      Disable
                    </button>
                    <button
                      className="rounded-lg bg-ink px-3 py-2 text-sm text-sand"
                      onClick={() =>
                        updateDisplay(selectedDisplayEdit.id, {
                          name: editDisplayName,
                          host: editDisplayHost,
                          port: Number.parseInt(editDisplayPort || "0", 10),
                        })
                      }
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section
            id="logs"
            hidden={activeTab !== "logs"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Logs</h2>
                <p className="text-sm text-slate">Filter events, replay payloads, and audit history.</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Filter Logs</label>
                  <input
                    className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm"
                    placeholder="Filter by message"
                    value={logFilter}
                    onChange={(event) => setLogFilter(event.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Sort Field</label>
                  <select
                    className="rounded-full border border-ink/10 bg-white px-3 py-2 text-sm"
                    value={logSortField}
                    onChange={(event) => setLogSortField(event.target.value as LogSortField)}
                  >
                    <option value="date">Date</option>
                    <option value="message">Message</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Sort Order</label>
                  <select
                    className="rounded-full border border-ink/10 bg-white px-3 py-2 text-sm"
                    value={logSortOrder}
                    onChange={(event) => setLogSortOrder(event.target.value as LogSortOrder)}
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pb-[2px]">
                  <button
                    className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40"
                    onClick={() => loadLogs()}
                  >
                    Refresh
                  </button>
                  <button
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      logLiveTail
                        ? "cursor-not-allowed border-ink/10 bg-ink/5 text-ink/40"
                        : logAutoRefresh
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-700"
                        : "border-ink/20 text-ink hover:border-ink/40"
                    }`}
                    onClick={() => {
                      if (logLiveTail) return;
                      setLogAutoRefresh((prev) => !prev);
                    }}
                    disabled={logLiveTail}
                  >
                    Auto Refresh
                  </button>
                  <button
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      logLiveTail
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-700"
                        : "border-ink/20 text-ink hover:border-ink/40"
                    }`}
                    onClick={() => setLogLiveTail((prev) => !prev)}
                  >
                    Live Tail
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pb-[2px] text-xs">
                  {(Object.keys(logCategoryLabels) as LogCategory[]).map((category) => (
                    <button
                      key={category}
                      className={`rounded-full border px-3 py-2 font-semibold transition ${
                        logCategoryFilter[category]
                          ? "border-ink/30 bg-ink/5 text-ink"
                          : "border-ink/10 text-ink/60 hover:border-ink/30"
                      }`}
                      onClick={() =>
                        setLogCategoryFilter((prev) => ({ ...prev, [category]: !prev[category] }))
                      }
                    >
                      {logCategoryLabels[category]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-gray-900/80 bg-gray-950 text-gray-200 shadow-lift">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-950 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300">Log Stream</h3>
                  <p className="text-[11px] text-gray-500">User actions, system events, and payload routing.</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {logLiveTail && (
                    <span className="flex items-center text-green-400">
                      <span className="relative mr-2 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      </span>
                      Live
                    </span>
                  )}
                  {!logLiveTail && logAutoRefresh && <span className="text-emerald-400">Auto refresh</span>}
                </div>
              </div>
              <div ref={logScrollRef} className="max-h-[28rem] overflow-y-auto px-3 py-3 font-mono text-xs">
                {loading.logs && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-gray-400">
                    Loading logs...
                  </div>
                )}
                {!loading.logs && filteredLogs.length === 0 && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-gray-400">
                    No logs loaded yet.
                  </div>
                )}
                {!loading.logs && filteredLogs.length > 0 && (
                  <div className="space-y-1">
                    {filteredLogs.map((log) => (
                      <button
                        key={log.id}
                        className="group flex w-full gap-3 rounded px-2 py-1 text-left transition hover:bg-gray-900/70"
                        onClick={() => setSelectedLog(log)}
                      >
                        <span
                          className={`w-10 font-semibold ${getLogCategoryTone(getLogCategory(log))}`}
                          title={logCategoryLabels[getLogCategory(log)]}
                        >
                          {formatLogCategoryTag(getLogCategory(log))}
                        </span>
                        <span className={`w-10 font-semibold ${getLogLevelTone(log.level)}`}>
                          {formatLogLevel(log.level)}
                        </span>
                        <span className="text-gray-500">[{log.created_at}]</span>
                        <span className="text-gray-200">{log.message}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {errors.logs && <p className="mt-3 text-xs text-clay">{errors.logs}</p>}
            {meta.logs.total > pageSize && (
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
              </div>
            )}
            {selectedLog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Log Detail</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedLog(null)}>
                      Close
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate">{selectedLog.id}</p>
                  <p className="mt-3 text-sm text-ink">{selectedLog.message}</p>
                  <p className="mt-1 text-xs text-slate">{selectedLog.created_at}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {typeof selectedLog.context?.payload_id === "string" && (
                      <button
                        className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                        onClick={() => copyPayloadId(selectedLog.context?.payload_id as string)}
                      >
                        Copy payload
                      </button>
                    )}
                    {selectedLog.message === "payload_received" && (
                      <button
                        className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                        onClick={() => replayLog(selectedLog.id)}
                      >
                        Replay
                      </button>
                    )}
                  </div>
                  {selectedLog.context && (
                    <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-sand/60 p-3 text-xs text-ink">
                      {JSON.stringify(selectedLog.context, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </section>

          <section
            id="api-docs"
            hidden={activeTab !== "api-docs"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">API Docs</h2>
                <p className="text-sm text-slate">Interactive OpenAPI docs plus raw specs for tooling.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40"
                  href={openApiUiUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Swagger UI
                </a>
                <a
                  className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40"
                  href={redocUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Redoc
                </a>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate">
              <a className="underline" href={openApiSpecUrl} target="_blank" rel="noreferrer">
                OpenAPI JSON
              </a>
              <a className="underline" href={asyncApiSpecUrl} target="_blank" rel="noreferrer">
                AsyncAPI YAML
              </a>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-sand/60">
              <iframe title="OpenAPI Docs" src={openApiUiUrl} className="h-[70vh] w-full" />
            </div>
          </section>

          <section
            id="broadcast-history"
            hidden={activeTab !== "broadcast-history"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Broadcast History</h2>
                <p className="text-sm text-slate">Recent broadcast_text and broadcast_commands entries.</p>
              </div>
              <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={loadBroadcasts}>
                Refresh
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate">
              {loading.broadcasts && <div className="rounded-2xl border border-ink/10 bg-sand/60 p-3">Loading broadcasts...</div>}
              {!loading.broadcasts && broadcastHistory.length === 0 && (
                <div className="rounded-2xl border border-ink/10 bg-sand/60 p-3">No broadcasts yet.</div>
              )}
              {broadcastHistory.map((log) => (
                <button
                  key={log.id}
                  className="rounded-2xl border border-ink/10 bg-sand/60 p-3 text-left transition hover:bg-white/80"
                  onClick={() => setSelectedBroadcast(log)}
                >
                  <p className="text-ink">{log.message}</p>
                  <p className="text-xs text-slate">{log.created_at}</p>
                </button>
              ))}
            </div>
            {errors.broadcasts && <p className="mt-3 text-xs text-clay">{errors.broadcasts}</p>}
            {meta.broadcasts.total > pageSize && (
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
              </div>
            )}
            {selectedBroadcast && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-ink">Broadcast Detail</h3>
                    <button className="text-sm text-slate" onClick={() => setSelectedBroadcast(null)}>
                      Close
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate">{selectedBroadcast.id}</p>
                  <p className="mt-3 text-sm text-ink">{selectedBroadcast.message}</p>
                  <p className="mt-1 text-xs text-slate">{selectedBroadcast.created_at}</p>
                  {selectedBroadcast.context && (
                    <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-sand/60 p-3 text-xs text-ink">
                      {JSON.stringify(selectedBroadcast.context, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </section>

          <section
            id="payload-editor"
            hidden={activeTab !== "payload-editor"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Payload Editor</h2>
                <p className="text-sm text-slate">Schema-guided payload builder with JSON output.</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink"
                  onClick={copyPayloadJson}
                >
                  Copy JSON
                </button>
                <button
                  className="rounded-full bg-ink px-4 py-2 text-sm text-sand"
                  onClick={sendPayloadPreview}
                >
                  Send to Sim
                </button>
              </div>
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
                    if (next === "simple_text_scroll" || next === "simple_text_page") {
                      setPayloadLineCount(1);
                      setPayloadLineColors(["#ffffff"]);
                    }
                  }}
                >
                  {payloadTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {formatLabel(opt)}
                    </option>
                  ))}
                </select>
                <div className="mt-4 grid gap-2">
                  {(payloadEditorType === "simple_text_scroll" || payloadEditorType === "simple_text_page") && (
                    <div className="grid gap-2">
                      <div className="grid gap-1">
                        <label className="text-xs text-slate">Line count</label>
                        <input
                          className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          type="number"
                          min={1}
                          value={payloadLineCount}
                          onChange={(event) =>
                            setPayloadLineCount(Math.max(1, Number.parseInt(event.target.value || "1", 10)))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        {payloadLineColors.map((color, index) => (
                          <div key={`${index}-${color}`} className="flex items-center gap-2">
                            <label className="text-xs text-slate">Line {index + 1}</label>
                            <input
                              type="color"
                              className="h-8 w-10 rounded-lg border border-ink/10 bg-white"
                              value={color}
                              onChange={(event) =>
                                setPayloadLineColors((prev) =>
                                  prev.map((value, i) => (i === index ? event.target.value : value))
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(payloadSchemas[payloadEditorType]?.fields || []).map((field) => (
                    <div key={field.key} className="grid gap-1">
                      <label className="text-xs text-slate">{field.label}</label>
                      {field.key === "colors" ? (
                        <textarea
                          className="min-h-[90px] rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                          placeholder='Example: [["#fff","#f0b"],["#0ff","#333"]]'
                          value={payloadEditorFields[field.key] || ""}
                          onChange={(event) =>
                            setPayloadEditorFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                        />
                      ) : field.type === "color" ? (
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

          <section
            id="jinja-scratchpad"
            hidden={activeTab !== "jinja-scratchpad"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Jinja Scratchpad</h2>
                <p className="text-sm text-slate">Validate Jinja templates with live context.</p>
                <a
                  className="text-xs uppercase tracking-[0.2em] text-slate underline"
                  href="https://jinja.palletsprojects.com/en/latest/templates/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Jinja Language Reference
                </a>
              </div>
              <div className="flex gap-2">
                <button className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink" onClick={validateJinja}>
                  Validate
                </button>
                <button className="rounded-full bg-ink px-4 py-2 text-sm text-sand" onClick={previewJinja}>
                  Preview in Sim
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Template</label>
                <textarea
                  className="mt-2 h-40 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-mono"
                  value={jinjaTemplate}
                  onChange={(event) => setJinjaTemplate(event.target.value)}
                />
                <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate">Context JSON</label>
                <textarea
                  className="mt-2 h-32 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-mono"
                  value={jinjaContext}
                  onChange={(event) => setJinjaContext(event.target.value)}
                />
                {jinjaStatus && <p className="mt-2 text-xs text-clay">{jinjaStatus}</p>}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Rendered Output</p>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs text-ink">
                  {jinjaRendered || "Rendered output will appear here."}
                </pre>
              </div>
            </div>
          </section>

          <section
            id="broadcast"
            hidden={activeTab !== "broadcast"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
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
                <div className="mt-3 grid gap-1">
                  <label className="text-[11px] font-semibold text-ink/70">Broadcast Message</label>
                  <textarea
                    className="h-24 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    placeholder="Type a broadcast message"
                    value={broadcastText}
                    onChange={(event) => setBroadcastText(event.target.value)}
                  />
                </div>
                {formErrors.broadcast && <p className="mt-2 text-xs text-clay">{formErrors.broadcast}</p>}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Targets</p>
                <div className="mt-3 grid gap-2">
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Display IDs</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Display IDs"
                      value={broadcastTargets}
                      onChange={(event) => setBroadcastTargets(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Color (hex)</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Color (hex)"
                      value={broadcastColor}
                      onChange={(event) => setBroadcastColor(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Scroll ms/px</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Scroll ms/px"
                      value={broadcastScroll}
                      onChange={(event) => setBroadcastScroll(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Duration seconds</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Duration seconds"
                      value={broadcastDuration}
                      onChange={(event) => setBroadcastDuration(event.target.value)}
                    />
                  </div>
                  {broadcastStatus && <p className="text-xs text-slate">{broadcastStatus}</p>}
                </div>
              </div>
            </div>
          </section>

          <section
            id="broadcast-commands"
            hidden={activeTab !== "broadcast-commands"}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-lift"
          >
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
                  <div className="grid gap-1">
                    <label className="text-[11px] font-semibold text-ink/70">Display IDs</label>
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Display IDs (comma separated)"
                      value={commandTargets}
                      onChange={(event) => setCommandTargets(event.target.value)}
                    />
                  </div>
                  {commandStatus && <p className="text-xs text-slate">{commandStatus}</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      {showSimDock && (
        <div
          className={`fixed z-50 overflow-hidden rounded-2xl border border-ink/15 bg-white shadow-lift ${
            dockPosition === "left"
              ? "left-6 top-28"
              : dockPosition === "right"
              ? "right-6 top-28"
              : dockPosition === "bottom"
              ? "left-6 right-6 bottom-6"
              : ""
          }`}
          style={{
            width:
              dockPosition === "left" || dockPosition === "right"
                ? dockSize
                : dockPosition === "float"
                ? dockSize
                : "auto",
            height:
              ((dockPosition === "left" || dockPosition === "right" || dockPosition === "float")
                ? Math.round(dockSize / (simFrameSize.width / simFrameSize.height))
                : Math.min(
                    simFrameSize.height,
                    Math.max(120, Math.round(windowSize.h * 0.6) - SIM_HEADER_HEIGHT)
                  )) + SIM_HEADER_HEIGHT,
            left: dockPosition === "float" ? dockPos.x : undefined,
            top: dockPosition === "float" ? dockPos.y : undefined,
            minHeight: SIM_HEADER_HEIGHT + 40,
            maxHeight: dockPosition === "bottom" ? Math.round(windowSize.h * 0.6) : undefined,
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.2em] cursor-move select-none"
            style={{ backgroundColor: "#0b0f12", color: "#ffffff", position: "relative", zIndex: 2 }}
            onPointerDown={(event) => {
              event.preventDefault();
              const target = event.currentTarget.getBoundingClientRect();
              setDockOffset({ x: event.clientX - target.left, y: event.clientY - target.top });
              setDockPosition("float");
              setIsDraggingDock(true);
            }}
          >
            <span>Preview</span>
            <button
              className="rounded-full border border-white/40 px-2 py-1 text-[10px] text-white"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                setShowSimDock(false);
              }}
            >
              Close
            </button>
          </div>
          <div
            className="relative w-full"
            style={{ height: `calc(100% - ${SIM_HEADER_HEIGHT}px)` }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative"
                style={{
                  width:
                    dockPosition === "right"
                      ? dockSize
                      : Math.round(dockSize * (simFrameSize.width / simFrameSize.height)),
                  height:
                    dockPosition === "right"
                      ? Math.round(dockSize / (simFrameSize.width / simFrameSize.height))
                      : dockSize,
                }}
              >
                <iframe title="Sim Output" src={simUrl} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
