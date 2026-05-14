import React, { useEffect, useMemo, useRef, useState } from "react";
import pluginSource from "../plugin/robolua-plugin.lua?raw";

const PRODUCT_NAME = "Zest";
const PRODUCT_FULL_NAME = "Zest Studio";
const STORAGE_KEY = "zest-studio-local-v2";
const LEGACY_STORAGE_KEYS = ["zest-studio-local-v1", "robolua-studio-config-v3", "robolua-studio-config-v2", "robolua-studio-config-v1"];
const PAIR_CODE_LENGTH = 16;
const PLUGIN_FOLDER_HINT = "Windows: %LocalAppData%\\Roblox\\Plugins";

const LOCAL_MODEL_CATALOG = [
  { key: "zest/starter-builder", label: "Zest Starter", providerLabel: "Built-in", creditCost: 0, enabled: true, freeStarter: true, summary: "No key needed. Good for proving the whole site-to-Studio loop first." },
  { key: "groq/openai-gpt-oss-20b", label: "GPT OSS 20B", providerLabel: "Groq", creditCost: 0, enabled: true, freeStarter: true, summary: "Free-friendly Groq starter for better planning once you add a key." },
  { key: "groq/llama-3.3-70b-versatile", label: "Llama 3.3 70B", providerLabel: "Groq", creditCost: 0, enabled: true, freeStarter: true, summary: "Fast general-purpose generation for common mechanics and UI." },
  { key: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", providerLabel: "Google", creditCost: 1, enabled: true, freeStarter: true, summary: "Good fast fallback when Gemini is configured." },
  { key: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", providerLabel: "Anthropic", creditCost: 3, enabled: true, freeStarter: false, summary: "Better for larger and more exact system generation." },
  { key: "anthropic/claude-opus-4-1", label: "Claude Opus 4.1", providerLabel: "Anthropic", creditCost: 6, enabled: true, freeStarter: false, summary: "Heavy reasoning for bigger project architecture." },
  { key: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", providerLabel: "OpenAI", creditCost: 1, enabled: true, freeStarter: false, summary: "Quick scaffolding and quick follow-up iterations." },
  { key: "moonshot/kimi-k2.5", label: "Kimi K2.5", providerLabel: "Moonshot", creditCost: 2, enabled: true, freeStarter: false, summary: "Strong OpenAI-compatible coding model when configured." },
];

const PACK_LIBRARY = [
  { id: "inventory-ui", name: "Inventory UI", description: "Slots, inspect cards, rarity borders, equip states, and hotbar structure." },
  { id: "economy-core", name: "Economy Core", description: "Coins, shop rows, bundles, purchase states, and reward pacing." },
  { id: "round-director", name: "Round Director", description: "Lobby timers, intermission loops, teleports, and round flow." },
  { id: "combat-kit", name: "Combat Kit", description: "Hitboxes, cooldowns, remotes, combo flow, and impact feedback." },
  { id: "rng-cards", name: "RNG Cards", description: "Weighted rarity rolls, pity logic, reveal cards, and collection loops." },
  { id: "datastore-safe", name: "Save Layer", description: "Profile schemas, retry-safe saves, rollback-friendly structure, and sessions." },
  { id: "monster-ai", name: "Monster AI", description: "Simple pursuit, attack loops, aggro checks, and enemy logic." },
  { id: "housing-plots", name: "Plot Builder", description: "Claimable plots, placement validation, permissions, and ownership loops." },
];

const PROMPT_SUGGESTIONS = [
  "Create a premium inventory UI with rarity borders, hover detail, and equip buttons.",
  "Build a round survival system with lobby waiting, intermission, and win rewards.",
  "Make a shop UI with bundles, developer products, and a balance display.",
  "Create daily quests with progress bars, claims, and simple save handling.",
];

const HOME_FEATURES = [
  {
    icon: "✦",
    title: "Prompt → Roblox Script",
    body: "Describe a mechanic, UI, or system in plain English. Zest generates structured Lua that your Studio plugin applies automatically.",
  },
  {
    icon: "⟳",
    title: "Live Studio Sync",
    body: "The plugin polls for jobs every few seconds. Accept changes with one click or let it auto-apply — no copy-paste, no export.",
  },
  {
    icon: "▤",
    title: "Pack Library",
    body: "Seed the AI with context packs — Inventory UI, Combat Kit, Save Layer, and more — so generated code fits your game's patterns.",
  },
  {
    icon: "◈",
    title: "Any AI Model",
    body: "Switch between Llama, Gemini, Claude, and GPT from the model selector. Free starter models need no API key to try.",
  },
];

const HOME_STEPS = [
  { num: "01", label: "Describe your feature", body: 'Type a prompt like "create a shop with currency display" into the composer.' },
  { num: "02", label: "Zest queues a job", body: "The server plans, writes, and structures the Lua operations." },
  { num: "03", label: "Studio applies it", body: "The Roblox plugin picks up the job and inserts scripts into your game tree." },
];

class WorkspaceErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-shell">
          <div className="fatal-card">
            <div className="fatal-logo">{PRODUCT_NAME}</div>
            <h1>Something broke in the workspace.</h1>
            <p>Reload the page and try again.</p>
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload</button>
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
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePairCode(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pairCodeFromWorkspaceToken(workspaceToken) {
  return normalizePairCode(workspaceToken).slice(0, PAIR_CODE_LENGTH).toUpperCase();
}

function formatPairCode(value) {
  const normalized = String(value || "").replace(/[^A-Z0-9]/g, "");
  return normalized.match(/.{1,4}/g)?.join("-") || "";
}

function createDefaultProject(overrides = {}) {
  return {
    id: createId(),
    name: "New Workspace",
    description: "A Roblox workspace for prototyping mechanics, UI, and systems.",
    workspaceToken: createWorkspaceToken(),
    modelKey: "zest/starter-builder",
    selectedPacks: ["inventory-ui", "datastore-safe"],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function defaultAppState() {
  const project = createDefaultProject();
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
    pollingSeconds: 4,
    projects: [project],
    activeProjectId: project.id,
  };
}

function loadAppState() {
  const fallback = defaultAppState();
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) || "null");
      if (saved?.projects?.length) {
        return {
          ...fallback,
          supabaseUrl: saved.supabaseUrl || fallback.supabaseUrl,
          supabaseAnonKey: saved.supabaseAnonKey || fallback.supabaseAnonKey,
          pollingSeconds: Number(saved.pollingSeconds) || fallback.pollingSeconds,
          projects: saved.projects,
          activeProjectId: saved.activeProjectId || saved.projects[0]?.id || fallback.activeProjectId,
        };
      }
    } catch {}
  }
  return fallback;
}

function emptyWorkspaceState() {
  return { accessMode: "guest", project: null, workspace: null, pluginOnline: false, messages: [], jobs: [], modelCatalog: [] };
}

function functionUrl(baseUrl, functionName) {
  return `${baseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`;
}

async function callEdgeFunction(baseUrl, anonKey, functionName, body) {
  const response = await fetch(functionUrl(baseUrl, functionName), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`);
  return payload;
}

function formatDateTime(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatStatus(status) {
  switch (status) {
    case "queued": return "Queued";
    case "claimed": return "Claimed";
    case "applied": return "Applied";
    case "failed": return "Failed";
    default: return status;
  }
}

function summarizeOperation(operation) {
  if (operation.type === "upsert_script") return `${operation.script_type} · ${operation.name}`;
  if (operation.type === "ensure_instance") return `${operation.class_name} · ${operation.name}`;
  if (operation.type === "delete_instance") return `Delete · ${operation.path}`;
  return operation.description || operation.type || "Unknown operation";
}

function BrandLockup() {
  return (
    <div className="brand-lockup">
      <span className="brand-dot" />
      <div>
        <strong>{PRODUCT_NAME}</strong>
        <span>Roblox AI builder</span>
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────

function HomePage({ onEnter }) {
  const pageRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof window === "undefined") return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealTargets = Array.from(page.querySelectorAll("[data-reveal]"));
    let frame = 0;
    let observer;

    const updateScrollMotion = () => {
      frame = 0;
      const progress = Math.min(window.scrollY / 960, 1);
      page.style.setProperty("--home-scroll-progress", progress.toFixed(3));
    };

    if (!reducedMotion.matches) {
      updateScrollMotion();

      const handleScroll = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(updateScrollMotion);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });

      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            });
          },
          {
            threshold: 0.16,
            rootMargin: "0px 0px -10% 0px",
          },
        );

        revealTargets.forEach((target) => observer.observe(target));
      } else {
        revealTargets.forEach((target) => target.classList.add("is-visible"));
      }

      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (frame) window.cancelAnimationFrame(frame);
        observer?.disconnect();
        page.style.removeProperty("--home-scroll-progress");
      };
    }

    revealTargets.forEach((target) => target.classList.add("is-visible"));

    return () => {
      page.style.removeProperty("--home-scroll-progress");
    };
  }, []);

  return (
    <div className="home-page" ref={pageRef}>
      <nav className="home-nav">
        <div className="home-nav-inner">
          <div className="brand-lockup">
            <span className="brand-dot" />
            <div>
              <strong>{PRODUCT_NAME}</strong>
              <span>Roblox AI builder</span>
            </div>
          </div>
          <button className="primary-button home-nav-cta" type="button" onClick={onEnter}>
            Open Studio →
          </button>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-progress-line" aria-hidden="true" />
        <div className="home-hero-eyebrow motion-reveal" data-reveal>AI-powered Roblox development</div>
        <h1 className="home-hero-headline motion-reveal" data-reveal style={{ "--reveal-delay": "80ms" }}>
          Build Roblox games<br />
          <span className="home-hero-accent">from a single prompt.</span>
        </h1>
        <p className="home-hero-sub motion-reveal" data-reveal style={{ "--reveal-delay": "140ms" }}>
          Describe a mechanic, UI, or system. Zest writes the Lua and pushes it
          straight into Roblox Studio — no copy-paste, no friction.
        </p>
        <div className="home-hero-actions motion-reveal" data-reveal style={{ "--reveal-delay": "200ms" }}>
          <button className="primary-button home-hero-btn" type="button" onClick={onEnter}>
            Start building free
          </button>
          <span className="home-hero-note">Free models available · No account needed to try</span>
        </div>

        <div className="home-terminal motion-reveal" data-reveal style={{ "--reveal-delay": "260ms" }}>
          <div className="home-terminal-bar">
            <span className="home-terminal-dot" style={{ background: "#ff5f56" }} />
            <span className="home-terminal-dot" style={{ background: "#ffbd2e" }} />
            <span className="home-terminal-dot" style={{ background: "#27c93f" }} />
            <span className="home-terminal-title">Zest Studio · Workspace</span>
          </div>
          <div className="home-terminal-body">
            <div className="home-terminal-msg home-terminal-msg-user">
              <span className="home-terminal-tag">You</span>
              <p>Create a round director with lobby countdown, teleport, and win reward screen.</p>
            </div>
            <div className="home-terminal-msg home-terminal-msg-ai">
              <span className="home-terminal-tag" style={{ color: "#c7ef5d" }}>Zest</span>
              <p>Planning round flow system… generating 4 scripts and 2 RemoteEvents. Job queued — Studio will apply in ~3 seconds.</p>
            </div>
            <div className="home-terminal-status">
              <span className="status-dot status-dot-live" />
              Studio connected · Job applied ✓
            </div>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="home-section-inner">
          <h2 className="home-section-title motion-reveal" data-reveal>Everything you need to ship faster</h2>
          <div className="home-feature-grid">
            {HOME_FEATURES.map((f, index) => (
              <div className="home-feature-card motion-reveal" data-reveal key={f.title} style={{ "--reveal-delay": `${80 + index * 70}ms` }}>
                <div className="home-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-steps">
        <div className="home-section-inner">
          <h2 className="home-section-title motion-reveal" data-reveal>How it works</h2>
          <div className="home-steps-grid">
            {HOME_STEPS.map((s, index) => (
              <div className="home-step motion-reveal" data-reveal key={s.num} style={{ "--reveal-delay": `${80 + index * 90}ms` }}>
                <div className="home-step-num">{s.num}</div>
                <h3>{s.label}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta-band">
        <div className="home-section-inner home-cta-inner motion-reveal" data-reveal>
          <h2>Ready to build something?</h2>
          <p>Zest runs in your browser. No install, no account required to get started.</p>
          <button className="primary-button home-hero-btn" type="button" onClick={onEnter}>
            Open Zest Studio
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-section-inner home-footer-inner">
          <BrandLockup />
          <span className="home-footer-copy">Built for Roblox developers.</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Workspace ─────────────────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState("home");
  const [app, setApp] = useState(loadAppState);
  const [workspaceState, setWorkspaceState] = useState(emptyWorkspaceState);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const textareaRef = useRef(null);

  const activeProject = app.projects.find((p) => p.id === app.activeProjectId) || app.projects[0];
  const availableModels = workspaceState.modelCatalog?.length ? workspaceState.modelCatalog : LOCAL_MODEL_CATALOG;
  const selectedModel = availableModels.find((m) => m.key === activeProject?.modelKey) || availableModels[0];
  const selectedPacks = useMemo(() => PACK_LIBRARY.filter((p) => activeProject?.selectedPacks?.includes(p.id)), [activeProject]);
  const orderedMessages = useMemo(() => [...(workspaceState.messages || [])].reverse(), [workspaceState.messages]);
  const recentJobs = workspaceState.jobs || [];
  const pluginPairCode = useMemo(() => formatPairCode(pairCodeFromWorkspaceToken(activeProject?.workspaceToken || "")), [activeProject?.workspaceToken]);
  const pluginSnippet = useMemo(
    () => JSON.stringify({ supabaseUrl: app.supabaseUrl.trim(), publicKey: app.supabaseAnonKey.trim(), workspaceToken: activeProject?.workspaceToken || "", projectName: activeProject?.name || "", pairCode: pluginPairCode }, null, 2),
    [activeProject?.name, activeProject?.workspaceToken, app.supabaseAnonKey, app.supabaseUrl, pluginPairCode],
  );

  useEffect(() => { document.title = PRODUCT_FULL_NAME; }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  }, [app]);

  function updateApp(key, value) {
    setApp((c) => ({ ...c, [key]: value }));
  }

  function updateActiveProject(patch) {
    setApp((c) => ({
      ...c,
      projects: c.projects.map((p) => p.id === c.activeProjectId ? { ...p, ...patch } : p),
    }));
  }

  function syncProjectFromServer(projectSummary) {
    if (!projectSummary?.workspaceToken) return;
    setApp((c) => ({
      ...c,
      projects: c.projects.map((p) =>
        p.workspaceToken === projectSummary.workspaceToken
          ? { ...p, name: projectSummary.name || p.name, description: projectSummary.description ?? p.description, modelKey: projectSummary.modelKey || p.modelKey, selectedPacks: Array.isArray(projectSummary.selectedPacks) ? projectSummary.selectedPacks : p.selectedPacks }
          : p,
      ),
    }));
  }

  async function copyText(value, label) {
    if (!value) return;
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
      if (!silent) setError("Missing Supabase settings or workspace token.");
      return;
    }
    if (!silent) setIsRefreshing(true);
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
      if (!silent) setError("");
    } catch (nextError) {
      if (!silent) setError(nextError.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!activeProject?.workspaceToken || !app.supabaseUrl.trim() || !app.supabaseAnonKey.trim()) return undefined;
    refreshWorkspace({ ensure: true, silent: true });
    const pollMs = Math.max(Number(app.pollingSeconds) || 4, 2) * 1000;
    const interval = window.setInterval(() => refreshWorkspace({ ensure: false, silent: true }), pollMs);
    return () => window.clearInterval(interval);
  }, [activeProject?.id, activeProject?.workspaceToken, activeProject?.modelKey, app.pollingSeconds, app.supabaseAnonKey, app.supabaseUrl]);

  async function saveWorkspace() {
    await refreshWorkspace({ ensure: true, silent: false });
  }

  async function submitPrompt(event) {
    event.preventDefault();
    if (!prompt.trim()) { setError("Write a prompt first."); return; }
    if (!activeProject?.workspaceToken) { setError("Create a workspace first."); return; }
    setIsSubmitting(true);
    setError("");
    try {
      await refreshWorkspace({ ensure: true, silent: true });
      const payload = await callEdgeFunction(app.supabaseUrl, app.supabaseAnonKey, "generate-job", {
        workspaceToken: activeProject.workspaceToken,
        modelKey: activeProject.modelKey,
        prompt: prompt.trim(),
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

  // Ctrl+Enter to submit
  function handleTextareaKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitPrompt(event);
    }
  }

  function addProject() {
    const project = createDefaultProject({ name: `Workspace ${app.projects.length + 1}` });
    setApp((c) => ({ ...c, projects: [project, ...c.projects], activeProjectId: project.id }));
    setWorkspaceState(emptyWorkspaceState());
    setPrompt("");
    setError("");
  }

  function removeProject(projectId) {
    if (app.projects.length === 1) return;
    const remaining = app.projects.filter((p) => p.id !== projectId);
    setApp((c) => ({
      ...c,
      projects: remaining,
      activeProjectId: c.activeProjectId === projectId ? remaining[0]?.id || c.activeProjectId : c.activeProjectId,
    }));
  }

  function togglePack(packId) {
    if (!activeProject) return;
    const current = activeProject.selectedPacks || [];
    const next = current.includes(packId) ? current.filter((id) => id !== packId) : [...current, packId];
    updateActiveProject({ selectedPacks: next });
  }

  if (view === "home") {
    return <HomePage onEnter={() => setView("workspace")} />;
  }

  return (
    <WorkspaceErrorBoundary>
      <div className="workspace-app">
        <aside className="sidebar">
          <div className="sidebar-top">
            <button className="home-back-btn" type="button" onClick={() => setView("home")}>
              ← Home
            </button>
            <BrandLockup />
            <button className="primary-button new-workspace-button" type="button" onClick={addProject}>
              + New Workspace
            </button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Workspaces</div>
            <div className="workspace-list">
              {app.projects.map((project) => {
                const active = project.id === activeProject?.id;
                return (
                  <button
                    className={`workspace-item ${active ? "workspace-item-active" : ""}`}
                    key={project.id}
                    type="button"
                    onClick={() => setApp((c) => ({ ...c, activeProjectId: project.id }))}
                  >
                    <div className="workspace-item-copy">
                      <strong>{project.name}</strong>
                      <span>{project.description}</span>
                    </div>
                    {app.projects.length > 1 ? (
                      <span className="workspace-item-remove" onClick={(e) => { e.stopPropagation(); removeProject(project.id); }}>×</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Pair Code</div>
            <div className="sidebar-card">
              <div className="pair-code">{pluginPairCode || "NO-CODE-YET"}</div>
              <button className="text-button" type="button" onClick={() => copyText(pluginPairCode, "Pair code")}>Copy pair code</button>
            </div>
          </div>

          <div className="sidebar-section sidebar-bottom">
            <div className="sidebar-label">Studio</div>
            <div className="sidebar-card">
              <div className="status-line">
                <span className={`status-dot ${workspaceState.pluginOnline ? "status-dot-live" : ""}`} />
                <span>{workspaceState.pluginOnline ? "Studio connected" : "Studio waiting"}</span>
              </div>
              <button className="secondary-button" type="button" onClick={downloadPluginFile}>Download Plugin</button>
              <button className="text-button" type="button" onClick={() => copyText(PLUGIN_FOLDER_HINT, "Plugins folder hint")}>Copy plugin path hint</button>
            </div>
          </div>
        </aside>

        <section className="main-shell">
          <header className="main-header">
            <div>
              <h1>{activeProject?.name || "Workspace"}</h1>
              <p>
                {workspaceState.pluginOnline
                  ? "Roblox Studio is connected and checking for jobs."
                  : "Use the plugin in Roblox Studio, connect with the pair code, then start sync."}
              </p>
            </div>
            <div className="main-header-actions">
              <label className="model-select-shell">
                <span>Model</span>
                <select value={activeProject?.modelKey || ""} onChange={(e) => updateActiveProject({ modelKey: e.target.value })}>
                  {availableModels.map((model) => (
                    <option disabled={!model.enabled} key={model.key} value={model.key}>
                      {model.label} · {model.providerLabel}{!model.enabled ? " (setup needed)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={saveWorkspace} disabled={isRefreshing}>
                {isRefreshing ? "Syncing…" : "Save"}
              </button>
            </div>
          </header>

          <div className="content-grid">
            <section className="chat-panel">
              <div className="chat-scroll">
                {orderedMessages.length ? (
                  <div className="message-list">
                    {orderedMessages.map((message) => (
                      <div className={`message-row ${message.role === "user" ? "message-row-user" : "message-row-assistant"}`} key={message.id}>
                        <div className={`message-bubble message-bubble-${message.role}`}>
                          <div className="message-role">{message.role === "user" ? "You" : PRODUCT_NAME}</div>
                          <div className="message-content">{message.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chat-empty">
                    <div className="chat-empty-logo">{PRODUCT_NAME}</div>
                    <h2>What do you want to build in Roblox?</h2>
                    <p>Start with a prompt below. The app will queue a structured plan, and the Studio plugin can claim and apply it automatically.</p>
                    <div className="suggestion-grid">
                      {PROMPT_SUGGESTIONS.map((suggestion) => (
                        <button className="suggestion-card" key={suggestion} type="button" onClick={() => { setPrompt(suggestion); textareaRef.current?.focus(); }}>
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="composer-panel">
                {error ? <div className="notice notice-error">{error}</div> : null}
                {copyFeedback ? <div className="notice notice-success">{copyFeedback}</div> : null}
                <form className="composer-form" onSubmit={submitPrompt}>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Describe a mechanic, UI, or system you want Zest to build in Roblox Studio…"
                    rows={4}
                  />
                  <div className="composer-footer">
                    <div className="composer-meta">
                      <span className="composer-pill">{selectedModel?.label || "No model"}</span>
                      <span className="composer-pill">{workspaceState.accessMode || "guest"}</span>
                      <span className="composer-pill">{workspaceState.pluginOnline ? "Studio ready" : "Studio not paired"}</span>
                    </div>
                    <div className="composer-send-group">
                      <span className="composer-hint">Ctrl+Enter to send</span>
                      <button className="primary-button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Generating…" : "Send"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            <aside className="utility-column">
              <section className="utility-card">
                <div className="utility-card-head">
                  <h2>Project Settings</h2>
                  <span>{lastSyncedAt ? `Synced ${formatDateTime(lastSyncedAt)}` : "Not synced"}</span>
                </div>
                <label className="field"><span>Name</span><input value={activeProject?.name || ""} onChange={(e) => updateActiveProject({ name: e.target.value })} /></label>
                <label className="field">
                  <span>Description</span>
                  <textarea rows={3} value={activeProject?.description || ""} onChange={(e) => updateActiveProject({ description: e.target.value })} />
                </label>
                <label className="field">
                  <span>Polling seconds</span>
                  <input type="number" min="2" max="30" value={app.pollingSeconds} onChange={(e) => updateApp("pollingSeconds", e.target.value)} />
                </label>
                <details className="details-block">
                  <summary>Advanced</summary>
                  <label className="field"><span>Supabase project URL</span><input value={app.supabaseUrl} onChange={(e) => updateApp("supabaseUrl", e.target.value)} placeholder="https://your-project.supabase.co" /></label>
                  <label className="field"><span>Supabase public key</span><textarea rows={4} value={app.supabaseAnonKey} onChange={(e) => updateApp("supabaseAnonKey", e.target.value)} placeholder="Publishable or anon key" /></label>
                  <label className="field"><span>Workspace token</span><input value={activeProject?.workspaceToken || ""} readOnly /></label>
                  <label className="field"><span>Advanced plugin payload</span><textarea rows={8} readOnly value={pluginSnippet} /></label>
                  <div className="field-action-row">
                    <button className="secondary-button" type="button" onClick={() => copyText(pluginSnippet, "Advanced payload")}>Copy advanced payload</button>
                  </div>
                </details>
              </section>

              <section className="utility-card">
                <div className="utility-card-head"><h2>Packs</h2><span>{selectedPacks.length} loaded</span></div>
                <div className="pack-list">
                  {PACK_LIBRARY.map((pack) => {
                    const active = activeProject?.selectedPacks?.includes(pack.id);
                    return (
                      <label className={`pack-item ${active ? "pack-item-active" : ""}`} key={pack.id}>
                        <input checked={active} type="checkbox" onChange={() => togglePack(pack.id)} />
                        <div><strong>{pack.name}</strong><span>{pack.description}</span></div>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="utility-card">
                <div className="utility-card-head">
                  <h2>Recent Jobs</h2>
                  <button className="text-button" type="button" onClick={() => refreshWorkspace({ ensure: false, silent: false })}>Refresh</button>
                </div>
                {recentJobs.length ? (
                  <div className="job-list">
                    {recentJobs.map((job) => (
                      <div className="job-item" key={job.id}>
                        <div className="job-item-head">
                          <strong>{job.title}</strong>
                          <span className={`job-status job-status-${job.status}`}>{formatStatus(job.status)}</span>
                        </div>
                        <p>{job.summary || "No summary returned."}</p>
                        <div className="job-item-meta">
                          <span>{job.model_key || "Unknown model"}</span>
                          <span>{formatDateTime(job.created_at)}</span>
                        </div>
                        {Array.isArray(job.operations) && job.operations.length ? (
                          <div className="job-operation-list">
                            {job.operations.slice(0, 3).map((op, i) => (
                              <span className="job-operation-pill" key={`${job.id}-${i}`}>{summarizeOperation(op)}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">No jobs yet.</div>
                )}
              </section>
            </aside>
          </div>
        </section>
      </div>
    </WorkspaceErrorBoundary>
  );
}

export default App;
