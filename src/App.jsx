import React, { useEffect, useMemo, useState } from "react";
import pluginSource from "../plugin/robolua-plugin.lua?raw";

const PRODUCT_NAME = "Zest";
const PRODUCT_FULL_NAME = "Zest Studio";
const STORAGE_KEY = "zest-studio-local-v1";
const LEGACY_STORAGE_KEYS = ["robolua-studio-config-v3", "robolua-studio-config-v2", "robolua-studio-config-v1"];
const PAIR_CODE_LENGTH = 16;
const PLUGIN_FOLDER_HINT = "Windows: %LocalAppData%\\\\Roblox\\\\Plugins";

const LOCAL_MODEL_CATALOG = [
  {
    key: "zest/starter-builder",
    label: "Zest Starter",
    providerLabel: "Built-in",
    creditCost: 0,
    speedScore: 4,
    depthScore: 2,
    summary: "Zero-key starter planner so the full website-to-Studio loop works even before you add any API provider.",
    enabled: true,
    freeStarter: true,
  },
  {
    key: "groq/openai-gpt-oss-20b",
    label: "GPT OSS 20B",
    providerLabel: "Groq",
    creditCost: 0,
    speedScore: 5,
    depthScore: 4,
    summary: "Free-friendly Groq starter model for fast Roblox scaffolds and structured planning.",
    enabled: true,
    freeStarter: true,
  },
  {
    key: "groq/llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    providerLabel: "Groq",
    creditCost: 0,
    speedScore: 5,
    depthScore: 3,
    summary: "Fast general-purpose free-start generation for mechanic drafts, UI systems, and gameplay loops.",
    enabled: true,
    freeStarter: true,
  },
  {
    key: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    providerLabel: "Google",
    creditCost: 1,
    speedScore: 5,
    depthScore: 3,
    summary: "Great fallback when you want faster iterations and already have a Gemini key.",
    enabled: true,
    freeStarter: true,
  },
  {
    key: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    providerLabel: "Anthropic",
    creditCost: 3,
    speedScore: 4,
    depthScore: 4,
    summary: "Stronger decomposition and instruction following for bigger Roblox systems.",
    enabled: true,
    freeStarter: false,
  },
  {
    key: "anthropic/claude-opus-4-1",
    label: "Claude Opus 4.1",
    providerLabel: "Anthropic",
    creditCost: 6,
    speedScore: 2,
    depthScore: 5,
    summary: "Heavy reasoning for large migrations and more complex technical planning.",
    enabled: true,
    freeStarter: false,
  },
  {
    key: "openai/gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    providerLabel: "OpenAI",
    creditCost: 1,
    speedScore: 5,
    depthScore: 2,
    summary: "Quick scaffolding and responsive iteration when you already have OpenAI wired in.",
    enabled: true,
    freeStarter: false,
  },
  {
    key: "moonshot/kimi-k2.5",
    label: "Kimi K2.5",
    providerLabel: "Moonshot",
    creditCost: 2,
    speedScore: 4,
    depthScore: 4,
    summary: "A strong coding model with an OpenAI-compatible setup once you are ready to expand.",
    enabled: true,
    freeStarter: false,
  },
];

const PACK_LIBRARY = [
  {
    id: "inventory-ui",
    name: "Inventory UI",
    blurb: "Slot grids, inspect cards, rarity borders, equip states, and hotbar structure.",
    systems: "StarterGui shell, client inventory state, hover detail, future drag support.",
    accent: "violet",
  },
  {
    id: "economy-core",
    name: "Economy Core",
    blurb: "Coins, shop rows, bundle sections, purchase states, and reward pacing.",
    systems: "Leaderstats, product stubs, price display, balance UI, reward loops.",
    accent: "gold",
  },
  {
    id: "round-director",
    name: "Round Director",
    blurb: "Lobby timers, intermission loops, teleports, round endings, and reward flow.",
    systems: "Server authority, transitions, status UI, replay-friendly control flow.",
    accent: "cyan",
  },
  {
    id: "combat-kit",
    name: "Combat Kit",
    blurb: "Hitboxes, cooldowns, remotes, combo flow, and impact feedback.",
    systems: "Validation, anti-spam guardrails, client feel, damage flow.",
    accent: "crimson",
  },
  {
    id: "rng-cards",
    name: "RNG Cards",
    blurb: "Weighted rarity rolls, pity logic, reveal cards, and collection loops.",
    systems: "Roll math, duplicate handling, card UI, collection storage.",
    accent: "magenta",
  },
  {
    id: "datastore-safe",
    name: "Save Layer",
    blurb: "Profile schemas, retry-safe saves, rollback-friendly structure, and sessions.",
    systems: "DataStore patterns, serialization, profile modules, safer writes.",
    accent: "mint",
  },
  {
    id: "monster-ai",
    name: "Monster AI",
    blurb: "Simple pursuit, attack loops, aggro checks, and spawn-aware enemy logic.",
    systems: "NPC scripts, cooldown loops, target selection, spawner integration.",
    accent: "ocean",
  },
  {
    id: "housing-plots",
    name: "Plot Builder",
    blurb: "Claimable plots, placement validation, permissions, and ownership loops.",
    systems: "Workspace anchors, snapping checks, plot UI, reset actions.",
    accent: "stone",
  },
];

const LANDING_SCENES = [
  {
    id: "shop",
    label: "Shop UI",
    title: "Prompt an entire Roblox store system and send it straight into Studio.",
    copy:
      "Zest keeps the site, planner, and Studio plugin in one loop so you can describe the mechanic once and watch the workspace update.",
    prompt: "Create a premium shop UI with 6 items, balance UI, featured bundles, and product purchase states.",
    tags: ["Storefronts", "Bundles", "Balance UI", "Receipt flow"],
  },
  {
    id: "inventory",
    label: "Inventory",
    title: "Build polished inventory surfaces with reusable packs instead of starting from scratch.",
    copy:
      "Load the Inventory UI and Save Layer packs, choose a free-start model, then iterate in short prompt turns until the experience feels right.",
    prompt: "Make an inventory window with rarity frames, hover detail, equip buttons, and a compact hotbar.",
    tags: ["Rarity cards", "Inspect panel", "Equip flow", "Hotbar"],
  },
  {
    id: "rounds",
    label: "Round system",
    title: "Design loop-heavy gameplay without hand-writing every round, timer, and teleport edge case.",
    copy:
      "Use the round pack, keep all the prior messages in context, and let the Studio bridge claim the queued changes.",
    prompt: "Make a round survival loop with lobby waiting, map teleport, win rewards, and intermission UI.",
    tags: ["Lobby", "Teleports", "Reward logic", "Status UI"],
  },
];

const SUGGESTIONS = [
  "Create a premium inventory UI with rarity borders, hover detail, equip buttons, and a hotbar shell.",
  "Build a round-based survival system with a lobby timer, teleport flow, win states, and match rewards.",
  "Make an RNG rolling button with reveal cards, pity logic, rarity colors, and a small save layer.",
  "Create a shop UI with developer product bundles, receipt handling, featured offers, and cash balance UI.",
  "Build daily quests with progress bars, reward claiming, and stored completion state.",
  "Make a plot claiming system with ownership, placement checks, reset flow, and build permissions.",
];

const FAQS = [
  {
    q: "Do I need money to start?",
    a: "No. The current flow is built to start with free-friendly providers like Groq. You still need to bring your own free API key, but the app no longer depends on Stripe or paid plans just to work.",
  },
  {
    q: "Do I have to log in with email first?",
    a: "Not anymore for the core flow. Guest workspaces live locally in your browser and sync by workspace token. Roblox account verification can be layered in later.",
  },
  {
    q: "How close is this to Lemonade?",
    a: "The important part is the real loop: prompt on the site, queue a structured plan, claim it in Studio, and apply the changes automatically. This pass is focused on making that flow simple and actually usable.",
  },
];

class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-shell">
          <div className="crash-card">
            <p className="eyebrow">Something broke</p>
            <h2>Reload the dashboard and try again.</h2>
            <p>The workspace shell hit an unexpected render error.</p>
            <button className="primary-cta" type="button" onClick={() => window.location.reload()}>
              Reload Zest
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function createWorkspaceToken() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "") || Math.random().toString(36).slice(2, 22);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePairCode(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pairCodeFromWorkspaceToken(workspaceToken) {
  return normalizePairCode(workspaceToken).slice(0, PAIR_CODE_LENGTH).toUpperCase();
}

function formatPairCode(code) {
  const normalized = String(code || "").replace(/[^A-Z0-9]/g, "");
  return normalized.match(/.{1,4}/g)?.join("-") || "";
}

function createDefaultProject(overrides = {}) {
  return {
    id: createId(),
    name: "Starter Workspace",
    description: "A lightweight Roblox workspace for fast mechanic prototyping, UI systems, and gameplay loops.",
    workspaceToken: createWorkspaceToken(),
    modelKey: "zest/starter-builder",
    selectedPacks: ["inventory-ui", "economy-core", "datastore-safe"],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function defaultAppState() {
  const project = createDefaultProject();

  return {
    screen: "landing",
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
    pollingSeconds: 4,
    projects: [project],
    activeProjectId: project.id,
  };
}

function loadAppState() {
  const fallback = defaultAppState();

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.projects?.length) {
      return {
        ...fallback,
        ...saved,
      };
    }
  } catch {}

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const legacy = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!legacy) {
        continue;
      }

      if (legacy.projects?.length) {
        return {
          ...fallback,
          screen: legacy.screen || "studio",
          supabaseUrl: legacy.supabaseUrl || fallback.supabaseUrl,
          supabaseAnonKey: legacy.supabaseAnonKey || fallback.supabaseAnonKey,
          pollingSeconds: Number(legacy.pollingSeconds) || fallback.pollingSeconds,
          projects: legacy.projects,
          activeProjectId: legacy.activeProjectId || legacy.projects[0]?.id || fallback.activeProjectId,
        };
      }

      const migratedProject = createDefaultProject({
        name: legacy.workspaceName || fallback.projects[0].name,
        workspaceToken: legacy.workspaceToken || fallback.projects[0].workspaceToken,
      });

      return {
        ...fallback,
        screen: "studio",
        supabaseUrl: legacy.supabaseUrl || fallback.supabaseUrl,
        supabaseAnonKey: legacy.supabaseAnonKey || fallback.supabaseAnonKey,
        pollingSeconds: Number(legacy.pollingSeconds) || fallback.pollingSeconds,
        projects: [migratedProject],
        activeProjectId: migratedProject.id,
      };
    } catch {}
  }

  return fallback;
}

function emptyWorkspaceState() {
  return {
    accessMode: "guest",
    project: null,
    workspace: null,
    pluginOnline: false,
    messages: [],
    jobs: [],
    modelCatalog: [],
    authProviders: null,
  };
}

function functionUrl(baseUrl, functionName) {
  return `${baseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`;
}

async function callEdgeFunction(baseUrl, anonKey, functionName, body) {
  const response = await fetch(functionUrl(baseUrl, functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

function formatDateTime(value) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(status) {
  switch (status) {
    case "queued":
      return "Queued";
    case "claimed":
      return "Claimed in Studio";
    case "applied":
      return "Applied";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function summarizeOperation(operation) {
  if (operation.type === "upsert_script") {
    return `${operation.script_type} ${operation.parent_path}/${operation.name}`;
  }

  if (operation.type === "ensure_instance") {
    return `${operation.class_name} ${operation.parent_path}/${operation.name}`;
  }

  if (operation.type === "delete_instance") {
    return `Delete ${operation.path}`;
  }

  return operation.description || operation.type || "Unknown operation";
}

function scoreDots(count) {
  return Array.from({ length: 5 }, (_, index) => index < count);
}

function BrandLockup({ compact = false }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`}>
      <span className="brand-orb" />
      <div>
        <strong>{PRODUCT_NAME}</strong>
        <span>turn words into Roblox systems</span>
      </div>
    </div>
  );
}

function App() {
  const [app, setApp] = useState(loadAppState);
  const [workspaceState, setWorkspaceState] = useState(emptyWorkspaceState);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [landingIndex, setLandingIndex] = useState(0);
  const [inventorySearch, setInventorySearch] = useState("");

  const activeProject =
    app.projects.find((project) => project.id === app.activeProjectId) || app.projects[0];

  const availableModels = workspaceState.modelCatalog?.length
    ? workspaceState.modelCatalog
    : LOCAL_MODEL_CATALOG;

  const selectedModel =
    availableModels.find((model) => model.key === activeProject?.modelKey) || availableModels[0];

  const selectedPacks = useMemo(
    () =>
      PACK_LIBRARY.filter((pack) =>
        Array.isArray(activeProject?.selectedPacks) ? activeProject.selectedPacks.includes(pack.id) : false,
      ),
    [activeProject],
  );

  const filteredInventory = useMemo(() => {
    const search = inventorySearch.trim().toLowerCase();
    if (!search) {
      return PACK_LIBRARY;
    }

    return PACK_LIBRARY.filter((pack) =>
      [pack.name, pack.blurb, pack.systems].join(" ").toLowerCase().includes(search),
    );
  }, [inventorySearch]);

  const pluginPairCode = useMemo(
    () => formatPairCode(pairCodeFromWorkspaceToken(activeProject?.workspaceToken || "")),
    [activeProject?.workspaceToken],
  );

  const pluginSnippet = useMemo(
    () =>
      JSON.stringify(
        {
          supabaseUrl: app.supabaseUrl.trim(),
          publicKey: app.supabaseAnonKey.trim(),
          workspaceToken: activeProject?.workspaceToken || "",
          projectName: activeProject?.name || "",
          pairCode: pluginPairCode,
        },
        null,
        2,
      ),
    [activeProject?.name, activeProject?.workspaceToken, app.supabaseAnonKey, app.supabaseUrl, pluginPairCode],
  );

  const scene = LANDING_SCENES[landingIndex % LANDING_SCENES.length];

  useEffect(() => {
    document.title = `${PRODUCT_FULL_NAME} | Free-first Roblox AI builder`;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  }, [app]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLandingIndex((current) => (current + 1) % LANDING_SCENES.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  function updateApp(key, value) {
    setApp((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateActiveProject(patch) {
    setApp((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId
          ? {
              ...project,
              ...patch,
            }
          : project,
      ),
    }));
  }

  function syncProjectFromServer(projectSummary) {
    if (!projectSummary?.workspaceToken) {
      return;
    }

    setApp((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.workspaceToken === projectSummary.workspaceToken
          ? {
              ...project,
              name: projectSummary.name || project.name,
              description: projectSummary.description ?? project.description,
              modelKey: projectSummary.modelKey || project.modelKey,
              selectedPacks: Array.isArray(projectSummary.selectedPacks)
                ? projectSummary.selectedPacks
                : project.selectedPacks,
            }
          : project,
      ),
    }));
  }

  async function copyText(value, label) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copied.`);
      window.setTimeout(() => setCopyFeedback(""), 1800);
    } catch {
      setCopyFeedback(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  function downloadPluginFile() {
    const blob = new Blob([pluginSource], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zest-studio-plugin.lua";
    anchor.click();
    URL.revokeObjectURL(url);
    setCopyFeedback("Plugin download started.");
    window.setTimeout(() => setCopyFeedback(""), 1800);
  }

  async function refreshWorkspace({ ensure = false, silent = false } = {}) {
    if (!app.supabaseUrl.trim() || !app.supabaseAnonKey.trim() || !activeProject?.workspaceToken) {
      if (!silent) {
        setError("Missing Supabase project settings or workspace token.");
      }
      return;
    }

    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      const payload = await callEdgeFunction(app.supabaseUrl, app.supabaseAnonKey, "workspace-state", {
        workspaceToken: activeProject.workspaceToken,
        ensure,
        name: activeProject.name,
        description: activeProject.description,
        modelKey: activeProject.modelKey,
        selectedPacks: activeProject.selectedPacks,
      });

      setWorkspaceState(payload);
      syncProjectFromServer(payload.project);
      setLastSyncedAt(new Date().toISOString());
      if (!silent) {
        setError("");
      }
    } catch (nextError) {
      if (!silent) {
        setError(nextError.message);
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!activeProject?.workspaceToken || !app.supabaseUrl.trim() || !app.supabaseAnonKey.trim()) {
      return undefined;
    }

    refreshWorkspace({ ensure: true, silent: app.screen !== "studio" });

    const pollMs = Math.max(Number(app.pollingSeconds) || 4, 2) * 1000;
    const interval = window.setInterval(() => {
      refreshWorkspace({ ensure: false, silent: true });
    }, pollMs);

    return () => window.clearInterval(interval);
  }, [activeProject?.id, activeProject?.workspaceToken, app.pollingSeconds, app.screen, app.supabaseAnonKey, app.supabaseUrl]);

  async function saveWorkspace() {
    await refreshWorkspace({ ensure: true, silent: false });
  }

  async function submitPrompt(event) {
    event?.preventDefault?.();

    if (!prompt.trim()) {
      setError("Write a prompt for the Roblox agent first.");
      return;
    }

    if (!activeProject?.workspaceToken) {
      setError("Create or select a workspace first.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await refreshWorkspace({ ensure: true, silent: true });

      const payload = await callEdgeFunction(app.supabaseUrl, app.supabaseAnonKey, "generate-job", {
        workspaceToken: activeProject.workspaceToken,
        prompt: prompt.trim(),
        modelKey: activeProject.modelKey,
        projectDescription: activeProject.description,
        selectedPacks,
      });

      setWorkspaceState(payload.workspace);
      syncProjectFromServer(payload.workspace?.project);
      setPrompt("");
      setLastSyncedAt(new Date().toISOString());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function addProject() {
    const project = createDefaultProject({
      name: `Workspace ${app.projects.length + 1}`,
    });

    setApp((current) => ({
      ...current,
      screen: "studio",
      projects: [project, ...current.projects],
      activeProjectId: project.id,
    }));
  }

  function removeProject(projectId) {
    if (app.projects.length === 1) {
      return;
    }

    const remaining = app.projects.filter((project) => project.id !== projectId);
    setApp((current) => ({
      ...current,
      projects: remaining,
      activeProjectId:
        current.activeProjectId === projectId ? remaining[0]?.id || current.activeProjectId : current.activeProjectId,
    }));
  }

  function togglePack(packId) {
    if (!activeProject) {
      return;
    }

    const next = activeProject.selectedPacks.includes(packId)
      ? activeProject.selectedPacks.filter((id) => id !== packId)
      : [...activeProject.selectedPacks, packId];

    updateActiveProject({ selectedPacks: next });
  }

  function openStudio() {
    updateApp("screen", "studio");
  }

  function returnHome() {
    updateApp("screen", "landing");
  }

  const messageFeed = workspaceState.messages || [];
  const jobFeed = workspaceState.jobs || [];

  return (
    <WorkspaceErrorBoundary>
      <div className="app-shell">
        <header className="site-header">
          <BrandLockup compact={app.screen === "studio"} />

          <nav className="site-nav">
            <button className="nav-link" type="button" onClick={returnHome}>
              Overview
            </button>
            <button className="nav-link" type="button" onClick={openStudio}>
              Studio
            </button>
            <button className="nav-link" type="button" onClick={() => copyText(PLUGIN_FOLDER_HINT, "Plugins folder hint")}>
              Plugin path
            </button>
          </nav>

          <div className="site-actions">
            <span className={`header-pill ${workspaceState.pluginOnline ? "header-pill-live" : ""}`}>
              {workspaceState.pluginOnline ? "Studio connected" : "Studio waiting"}
            </span>
            <button className="primary-cta" type="button" onClick={openStudio}>
              Open workspace
            </button>
          </div>
        </header>

        {app.screen === "landing" ? (
          <main className="landing-shell">
            <section className="hero-grid">
              <div className="hero-copy">
                <p className="eyebrow">AI code tool for Roblox</p>
                <h1>The simplest way to go from prompt to Roblox Studio changes.</h1>
                <p className="hero-lead">
                  Zest is a free-first, plugin-driven workspace that lets you describe mechanics on the web,
                  queue a structured plan, and let Studio apply the scripts and instances automatically.
                </p>

                <div className="hero-actions">
                  <button className="primary-cta" type="button" onClick={openStudio}>
                    Start prototyping
                  </button>
                  <button className="ghost-cta" type="button" onClick={downloadPluginFile}>
                    Download plugin
                  </button>
                </div>

                <div className="hero-stat-row">
                  <div className="hero-stat">
                    <strong>Guest mode</strong>
                    <span>No email gate for the core loop</span>
                  </div>
                  <div className="hero-stat">
                    <strong>Free-first</strong>
                    <span>Groq-ready models at the top of the stack</span>
                  </div>
                  <div className="hero-stat">
                    <strong>Real Studio sync</strong>
                    <span>Short-code pair, claim job, apply changes</span>
                  </div>
                </div>
              </div>

              <div className="hero-demo-card">
                <div className="hero-demo-top">
                  <span className="hero-demo-pill">{scene.label}</span>
                  <div className="hero-demo-tabs">
                    {LANDING_SCENES.map((item, index) => (
                      <button
                        className={`hero-demo-tab ${index === landingIndex ? "hero-demo-tab-active" : ""}`}
                        key={item.id}
                        type="button"
                        onClick={() => setLandingIndex(index)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hero-demo-visual">
                  <div className="hero-demo-stage">
                    <div className="hero-panel hero-panel-back" />
                    <div className="hero-panel hero-panel-mid" />
                    <div className="hero-panel hero-panel-front">
                      <div className="hero-panel-ui">
                        <div className="hero-ui-top">
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="hero-ui-grid">
                          <div className="hero-ui-card" />
                          <div className="hero-ui-card" />
                          <div className="hero-ui-card" />
                          <div className="hero-ui-card hero-ui-card-wide" />
                          <div className="hero-ui-card hero-ui-card-wide" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hero-demo-prompt">
                    <span>Prompt</span>
                    <p>{scene.prompt}</p>
                  </div>
                </div>

                <div className="hero-demo-copy">
                  <h2>{scene.title}</h2>
                  <p>{scene.copy}</p>
                  <div className="chip-row">
                    {scene.tags.map((tag) => (
                      <span className="chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="landing-strip">
              <article className="strip-card">
                <p className="eyebrow">Install once</p>
                <strong>Drop the plugin into the Roblox plugins folder and restart Studio.</strong>
                      <p>Use `Plugins {" > "} Plugins Folder` inside Studio if you want Roblox to open the exact location for you.</p>
              </article>
              <article className="strip-card">
                <p className="eyebrow">Pair in seconds</p>
                <strong>Copy the short code from the dashboard and click `Connect with code` inside Studio.</strong>
                <p>No giant payload paste is required for the standard path anymore.</p>
              </article>
              <article className="strip-card">
                <p className="eyebrow">Start free</p>
                <strong>Point the planner at Groq first, then upgrade providers later only if you need to.</strong>
                <p>This pass is aimed at getting the flow usable before you spend money.</p>
              </article>
            </section>

            <section className="faq-grid">
              {FAQS.map((item) => (
                <article className="faq-card" key={item.q}>
                  <strong>{item.q}</strong>
                  <p>{item.a}</p>
                </article>
              ))}
            </section>
          </main>
        ) : (
          <main className="studio-shell">
            <aside className="project-rail">
              <div className="project-rail-head">
                <p className="eyebrow">Workspaces</p>
                <button className="project-create" type="button" onClick={addProject}>
                  + New workspace
                </button>
              </div>

              <div className="project-list">
                {app.projects.map((project) => {
                  const active = project.id === activeProject?.id;
                  return (
                    <button
                      className={`project-card ${active ? "project-card-active" : ""}`}
                      key={project.id}
                      type="button"
                      onClick={() => setApp((current) => ({ ...current, activeProjectId: project.id }))}
                    >
                      <div>
                        <strong>{project.name}</strong>
                        <span>{project.description}</span>
                      </div>
                      {app.projects.length > 1 ? (
                        <span
                          className="project-remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeProject(project.id);
                          }}
                        >
                          ×
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="rail-note">
                <strong>Short-code pair flow</strong>
                <p>
                  Each local workspace gets its own token and pairing code. You can keep several game ideas
                  separate without needing account setup first.
                </p>
              </div>
            </aside>

            <section className="studio-main">
              <section className="studio-hero">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h1>{activeProject?.name || "Starter Workspace"}</h1>
                  <p className="studio-lead">
                    Describe the system, queue the plan, then let the Studio plugin claim and apply it.
                  </p>
                </div>

                <div className="studio-hero-status">
                  <span className="mini-stat">
                    <strong>{selectedModel?.label || "No model"}</strong>
                    <span>Current model</span>
                  </span>
                  <span className={`mini-stat ${workspaceState.pluginOnline ? "mini-stat-live" : ""}`}>
                    <strong>{workspaceState.pluginOnline ? "Connected" : "Waiting"}</strong>
                    <span>Studio bridge</span>
                  </span>
                </div>
              </section>

              <div className="workspace-grid">
                <section className="composer-card">
                  <div className="composer-head">
                    <div>
                      <p className="eyebrow">Composer</p>
                      <h2>Describe the next mechanic</h2>
                    </div>
                    <div className="composer-actions">
                      <button className="ghost-cta inline-ghost" type="button" onClick={() => setShowInventory(true)}>
                        Inventory
                      </button>
                      <button className="ghost-cta inline-ghost" type="button" onClick={() => setShowModels(true)}>
                        Models
                      </button>
                    </div>
                  </div>

                  <div className="context-row">
                    <span className="context-pill context-pill-model">
                      Model: {selectedModel?.label || "Choose one"}
                    </span>
                    <span className="context-pill context-pill-free">
                      {selectedModel?.freeStarter || selectedModel?.creditCost === 0
                        ? "Free-start friendly"
                        : "Bring your own paid key"}
                    </span>
                    <span className="context-pill context-pill-plugin">
                      {workspaceState.pluginOnline ? "Studio ready" : "Studio not yet paired"}
                    </span>
                  </div>

                  <div className="selected-pack-row">
                    {selectedPacks.length ? (
                      selectedPacks.map((pack) => (
                        <span className={`selected-pack selected-pack-${pack.accent}`} key={pack.id}>
                          {pack.name}
                        </span>
                      ))
                    ) : (
                      <span className="selected-pack selected-pack-empty">No packs loaded</span>
                    )}
                  </div>

                  <form className="composer-form" onSubmit={submitPrompt}>
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Make a premium inventory UI with rarity borders, inspect detail, equip buttons, and a matching hotbar shell."
                      rows={7}
                    />

                    <div className="suggestion-row">
                      {SUGGESTIONS.slice(0, 4).map((suggestion) => (
                        <button className="suggestion-chip" key={suggestion} type="button" onClick={() => setPrompt(suggestion)}>
                          {suggestion}
                        </button>
                      ))}
                    </div>

                    {error ? <div className="banner banner-error">{error}</div> : null}
                    {copyFeedback ? <div className="banner banner-success">{copyFeedback}</div> : null}

                    <div className="composer-footer">
                      <button className="primary-cta" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Queueing plan..." : "Generate in Studio"}
                      </button>
                      <button className="ghost-cta" type="button" onClick={saveWorkspace} disabled={isRefreshing}>
                        {isRefreshing ? "Syncing..." : "Save workspace"}
                      </button>
                    </div>
                  </form>
                </section>

                <aside className="side-stack">
                  <section className="side-card">
                    <div className="side-card-head">
                      <div>
                        <p className="eyebrow">Pairing</p>
                        <h2>Install and connect Studio</h2>
                      </div>
                    </div>

                    <div className="pairing-flow">
                      <article className="pairing-step">
                        <span className="pair-step-index">1</span>
                        <div>
                          <strong>Install the plugin</strong>
                          <p>Download it here, move it into the Roblox plugins folder, then restart Studio once.</p>
                          <div className="inline-row">
                            <button className="primary-cta" type="button" onClick={downloadPluginFile}>
                              Download plugin
                            </button>
                            <button className="ghost-cta inline-ghost" type="button" onClick={() => copyText(PLUGIN_FOLDER_HINT, "Plugins folder hint")}>
                              Copy path hint
                            </button>
                          </div>
                        </div>
                      </article>

                      <article className="pairing-step">
                        <span className="pair-step-index">2</span>
                        <div>
                          <strong>Paste this code in Studio</strong>
                          <p>Open the Zest Studio plugin, paste the code below, then click `Connect with code`.</p>
                          <div className="pair-code-box">{pluginPairCode || "NO-CODE-YET"}</div>
                          <div className="inline-row">
                            <button className="primary-cta" type="button" onClick={() => copyText(pluginPairCode, "Pairing code")}>
                              Copy pairing code
                            </button>
                            <button className="ghost-cta inline-ghost" type="button" onClick={() => copyText(pluginSnippet, "Advanced plugin payload")}>
                              Copy advanced payload
                            </button>
                          </div>
                        </div>
                      </article>

                      <article className="pairing-step">
                        <span className="pair-step-index">3</span>
                        <div>
                          <strong>Start sync</strong>
                          <p>Once the plugin says it is paired, click `Start sync` and keep Studio open.</p>
                          <div className="plugin-status-row">
                            <span className={`status-dot ${workspaceState.pluginOnline ? "status-dot-live" : ""}`} />
                            <span>
                              {workspaceState.pluginOnline
                                ? "Studio is checking for queued jobs right now."
                                : "The dashboard will flip live when the plugin starts polling."}
                            </span>
                          </div>
                        </div>
                      </article>
                    </div>

                    <details className="details-block">
                      <summary>Advanced workspace settings</summary>

                      <label className="field">
                        <span>Project name</span>
                        <input
                          value={activeProject?.name || ""}
                          onChange={(event) => updateActiveProject({ name: event.target.value })}
                        />
                      </label>

                      <label className="field">
                        <span>Project brief</span>
                        <textarea
                          value={activeProject?.description || ""}
                          onChange={(event) => updateActiveProject({ description: event.target.value })}
                          rows={4}
                        />
                      </label>

                      <label className="field">
                        <span>Supabase project URL</span>
                        <input
                          value={app.supabaseUrl}
                          onChange={(event) => updateApp("supabaseUrl", event.target.value)}
                          placeholder="https://your-project.supabase.co"
                        />
                      </label>

                      <label className="field">
                        <span>Supabase public key</span>
                        <textarea
                          value={app.supabaseAnonKey}
                          onChange={(event) => updateApp("supabaseAnonKey", event.target.value)}
                          rows={4}
                          placeholder="Publishable or anon key"
                        />
                      </label>

                      <label className="field">
                        <span>Polling seconds</span>
                        <input
                          type="number"
                          min="2"
                          max="30"
                          value={app.pollingSeconds}
                          onChange={(event) => updateApp("pollingSeconds", event.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span>Workspace token</span>
                        <input value={activeProject?.workspaceToken || ""} readOnly />
                      </label>
                    </details>
                  </section>

                  <section className="side-card">
                    <div className="side-card-head">
                      <div>
                        <p className="eyebrow">Free setup</p>
                        <h2>Zero-money start path</h2>
                      </div>
                    </div>

                    <div className="setup-stack">
                      <div className="setup-step">
                        <strong>1. Start with Zest Starter</strong>
                        <p>The built-in starter model works without any external AI key, so the complete site-to-Studio loop is usable from zero.</p>
                      </div>
                      <div className="setup-step">
                        <strong>2. Add Groq only when you want more power</strong>
                        <pre>{`GROQ_API_KEY=...\nGROQ_BASE_URL=https://api.groq.com/openai/v1`}</pre>
                      </div>
                      <div className="setup-step">
                        <strong>3. Deploy the core functions</strong>
                        <pre>{`npx supabase functions deploy workspace-state --no-verify-jwt\nnpx supabase functions deploy generate-job --no-verify-jwt\nnpx supabase functions deploy plugin-sync --no-verify-jwt`}</pre>
                      </div>
                    </div>
                  </section>
                </aside>
              </div>

              <div className="feed-grid">
                <section className="feed-card">
                  <div className="feed-head">
                    <div>
                      <p className="eyebrow">Planner feed</p>
                      <h2>Recent jobs</h2>
                    </div>
                    <button className="ghost-cta inline-ghost" type="button" onClick={() => refreshWorkspace({ ensure: false, silent: false })}>
                      Refresh
                    </button>
                  </div>

                  {jobFeed.length ? (
                    <div className="job-list">
                      {jobFeed.map((job) => (
                        <article className="job-card" key={job.id}>
                          <div className="job-head">
                            <strong>{job.title}</strong>
                            <span className={`job-status job-status-${job.status}`}>{formatStatus(job.status)}</span>
                          </div>
                          <p>{job.summary || "No summary was returned."}</p>
                          <div className="job-meta">
                            <span>{job.model_key || "Unknown model"}</span>
                            <span>{formatDateTime(job.created_at)}</span>
                          </div>
                          {Array.isArray(job.operations) && job.operations.length ? (
                            <div className="operation-list">
                              {job.operations.slice(0, 4).map((operation, index) => (
                                <span className="operation-pill" key={`${job.id}-${index}`}>
                                  {summarizeOperation(operation)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-panel">
                      <strong>No jobs yet.</strong>
                      <p>Queue your first mechanic above and it will show up here for Studio to claim.</p>
                    </div>
                  )}
                </section>

                <section className="feed-card">
                  <div className="feed-head">
                    <div>
                      <p className="eyebrow">Memory</p>
                      <h2>Recent conversation</h2>
                    </div>
                    <span className="last-sync">
                      {lastSyncedAt ? `Synced ${formatDateTime(lastSyncedAt)}` : "Waiting for first sync"}
                    </span>
                  </div>

                  {messageFeed.length ? (
                    <div className="message-list">
                      {messageFeed.map((message) => (
                        <article className={`message-card message-card-${message.role}`} key={message.id}>
                          <span className="message-role">{message.role}</span>
                          <p>{message.content}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-panel">
                      <strong>No memory yet.</strong>
                      <p>The planner history will appear here once you start iterating on a workspace.</p>
                    </div>
                  )}
                </section>
              </div>
            </section>
          </main>
        )}

        {showModels ? (
          <div className="overlay-shell" role="dialog" aria-modal="true">
            <div className="overlay-backdrop" onClick={() => setShowModels(false)} />
            <section className="overlay-panel">
              <div className="overlay-head">
                <div>
                  <p className="eyebrow">Model shelf</p>
                  <h2>Pick the right engine for this workspace</h2>
                </div>
                <button className="overlay-close" type="button" onClick={() => setShowModels(false)}>
                  Close
                </button>
              </div>

              <div className="model-grid">
                {availableModels.map((model) => {
                  const active = model.key === activeProject?.modelKey;
                  return (
                    <button
                      className={`model-card ${active ? "model-card-active" : ""} ${!model.enabled ? "model-card-disabled" : ""}`}
                      disabled={!model.enabled}
                      key={model.key}
                      type="button"
                      onClick={() => updateActiveProject({ modelKey: model.key })}
                    >
                      <div className="model-card-top">
                        <div>
                          <span className="model-provider">{model.providerLabel}</span>
                          <strong>{model.label}</strong>
                        </div>
                        <span className="model-price">
                          {model.creditCost === 0 ? "Free" : `${model.creditCost}c`}
                        </span>
                      </div>
                      <p>{model.summary}</p>
                      <div className="score-row">
                        <span>Speed</span>
                        <div className="score-dots">
                          {scoreDots(model.speedScore).map((filled, index) => (
                            <span className={`score-dot ${filled ? "score-dot-filled" : ""}`} key={`${model.key}-speed-${index}`} />
                          ))}
                        </div>
                      </div>
                      <div className="score-row">
                        <span>Depth</span>
                        <div className="score-dots">
                          {scoreDots(model.depthScore).map((filled, index) => (
                            <span className={`score-dot ${filled ? "score-dot-filled" : ""}`} key={`${model.key}-depth-${index}`} />
                          ))}
                        </div>
                      </div>
                      <div className="model-card-footer">
                        {!model.enabled
                          ? "Key missing on the server"
                          : model.freeStarter || model.creditCost === 0
                            ? "Best place to start for free"
                            : active
                              ? "Selected"
                              : "Ready when you need it"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {showInventory ? (
          <div className="overlay-shell" role="dialog" aria-modal="true">
            <div className="overlay-backdrop" onClick={() => setShowInventory(false)} />
            <section className="overlay-panel">
              <div className="overlay-head">
                <div>
                  <p className="eyebrow">Inventory vault</p>
                  <h2>Load reusable systems into this workspace</h2>
                </div>
                <button className="overlay-close" type="button" onClick={() => setShowInventory(false)}>
                  Close
                </button>
              </div>

              <div className="inventory-toolbar">
                <input
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  placeholder="Search packs..."
                />
                <span className="inventory-count">{selectedPacks.length} loaded</span>
              </div>

              <div className="inventory-grid">
                {filteredInventory.map((pack) => {
                  const active = activeProject?.selectedPacks?.includes(pack.id);

                  return (
                    <button
                      className={`inventory-card inventory-card-${pack.accent} ${active ? "inventory-card-active" : ""}`}
                      key={pack.id}
                      type="button"
                      onClick={() => togglePack(pack.id)}
                    >
                      <div className="inventory-card-top">
                        <span className="inventory-tag">{active ? "Loaded" : "Optional"}</span>
                        <strong>{pack.name}</strong>
                      </div>
                      <p>{pack.blurb}</p>
                      <span>{pack.systems}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </WorkspaceErrorBoundary>
  );
}

export default App;
