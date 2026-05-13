import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import pluginSource from "../plugin/robolua-plugin.lua?raw";

const PRODUCT_NAME = "Zest";
const PRODUCT_FULL_NAME = "Zest Studio";
const ROBLOX_PROVIDER = "custom:roblox";
const SUPABASE_BROWSER_CLIENTS = new Map();
const ROBLOX_PLUGIN_FOLDER = "C:\\Users\\ayoub\\AppData\\Local\\Roblox\\Plugins";
const PAIR_CODE_LENGTH = 16;

const STORAGE_KEY = "robolua-studio-config-v3";
const LEGACY_STORAGE_KEYS = ["robolua-studio-config-v2", "robolua-studio-config-v1"];

const LOCAL_MODEL_CATALOG = [
  {
    key: "openai/gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    providerLabel: "OpenAI",
    creditCost: 1,
    speedScore: 5,
    depthScore: 2,
    summary: "Fast drafts, responsive UI iteration, low-cost mechanic scaffolds.",
    enabled: true,
  },
  {
    key: "openai/gpt-4.1",
    label: "GPT-4.1",
    providerLabel: "OpenAI",
    creditCost: 3,
    speedScore: 4,
    depthScore: 4,
    summary: "Balanced coding and architecture quality for most Roblox systems.",
    enabled: true,
  },
  {
    key: "openai/o4-mini",
    label: "o4-mini",
    providerLabel: "OpenAI",
    creditCost: 4,
    speedScore: 3,
    depthScore: 5,
    summary: "More deliberate planning for larger or tightly-coupled game systems.",
    enabled: true,
  },
  {
    key: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    providerLabel: "Anthropic",
    creditCost: 3,
    speedScore: 4,
    depthScore: 4,
    summary: "Strong instruction following and reliable system decomposition.",
    enabled: true,
  },
  {
    key: "anthropic/claude-opus-4-1",
    label: "Claude Opus 4.1",
    providerLabel: "Anthropic",
    creditCost: 6,
    speedScore: 2,
    depthScore: 5,
    summary: "Heavyweight reasoning for large migrations and harder planning.",
    enabled: true,
  },
  {
    key: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    providerLabel: "Google",
    creditCost: 1,
    speedScore: 5,
    depthScore: 3,
    summary: "Fast and affordable prompting for everyday mechanic generation.",
    enabled: true,
  },
  {
    key: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    providerLabel: "Google",
    creditCost: 4,
    speedScore: 3,
    depthScore: 5,
    summary: "Long-context reasoning for dense codebases and more complex requests.",
    enabled: true,
  },
  {
    key: "moonshot/kimi-k2.5",
    label: "Kimi K2.5",
    providerLabel: "Moonshot",
    creditCost: 2,
    speedScore: 4,
    depthScore: 4,
    summary: "Strong coding output with an OpenAI-compatible provider pipeline.",
    enabled: true,
  },
  {
    key: "moonshot/kimi-k2-thinking",
    label: "Kimi K2 Thinking",
    providerLabel: "Moonshot",
    creditCost: 5,
    speedScore: 2,
    depthScore: 5,
    summary: "Longer reasoning path for ambitious planning and larger systems.",
    enabled: true,
  },
];

const LOCAL_PLAN_CATALOG = [
  {
    key: "free",
    label: "Free",
    dailyCredits: 100,
    upgradeBonus: 0,
    maxProjects: 3,
    features: ["100 credits daily", "Core model access", "3 active project tokens"],
  },
  {
    key: "pro",
    label: "Pro",
    dailyCredits: 260,
    upgradeBonus: 220,
    maxProjects: 12,
    features: ["Bigger daily allowance", "Better for larger systems", "More project capacity"],
  },
  {
    key: "studio",
    label: "Studio",
    dailyCredits: 900,
    upgradeBonus: 900,
    maxProjects: 40,
    features: ["Heavy model usage", "Premium workspace scale", "Big daily credit budget"],
  },
];

const LOCAL_CREDIT_PACKS = [
  { key: "boost_25", label: "Boost Pack", priceLabel: "$4.99", totalCredits: 25, bonusCredits: 0 },
  { key: "builder_120", label: "Builder Pack", priceLabel: "$14.99", totalCredits: 140, bonusCredits: 20 },
  { key: "studio_500", label: "Studio Pack", priceLabel: "$39.99", totalCredits: 580, bonusCredits: 80 },
];

const PACK_LIBRARY = [
  {
    id: "inventory-ui",
    name: "Inventory UI",
    blurb: "Slot grids, hover states, rarity borders, equip buttons, and hotbar structure.",
    systems: "StarterGui shells, client state, item inspect, drag-ready layout direction.",
    tone: "violet",
  },
  {
    id: "economy-core",
    name: "Economy Core",
    blurb: "Coins, shop rows, bundle cards, purchases, and reward pacing.",
    systems: "Leaderstats, developer product stubs, price display, purchase balancing.",
    tone: "gold",
  },
  {
    id: "round-director",
    name: "Round Director",
    blurb: "Lobby loops, intermissions, wave logic, win states, and round flow.",
    systems: "Server authority, round transitions, UI timing, teleport sequencing.",
    tone: "cyan",
  },
  {
    id: "combat-kit",
    name: "Combat Kit",
    blurb: "Hitboxes, cooldowns, remotes, combo flow, and impact feedback.",
    systems: "Server validation, client feel, damage flow, anti-spam guard rails.",
    tone: "crimson",
  },
  {
    id: "quest-ops",
    name: "Quest Ops",
    blurb: "Quest definitions, daily objectives, progress bars, and claims.",
    systems: "Mission modules, task listeners, reward handling, reset schedules.",
    tone: "mint",
  },
  {
    id: "datastore-safe",
    name: "Save Layer",
    blurb: "Profile schemas, retry-safe saves, rollback-friendly structure, and sessions.",
    systems: "DataStore patterns, serialization, profile modules, safety-first saves.",
    tone: "lime",
  },
  {
    id: "rng-cards",
    name: "RNG Cards",
    blurb: "Weighted rarity rolls, pity systems, reveals, and collection loops.",
    systems: "Roll logic, duplicate handling, reveal cards, collection storage.",
    tone: "magenta",
  },
  {
    id: "housing-plots",
    name: "Plot Builder",
    blurb: "Claimable plots, placement validation, permissions, and ownership loops.",
    systems: "Workspace anchors, snapping checks, plot UI scaffolds, resets.",
    tone: "slate",
  },
  {
    id: "monster-ai",
    name: "Monster AI",
    blurb: "Basic enemy pursuit, attack loops, aggro checks, and simple state logic.",
    systems: "NPC scripts, target selection, cooldown loops, spawn integration.",
    tone: "ocean",
  },
];

const LANDING_TABS = [
  {
    id: "shop",
    eyebrow: "Store systems",
    title: "Create a premium storefront with bundles, receipts, and polished UI.",
    copy:
      "Push a single prompt through a better planner stack, then let Studio apply the resulting scripts and structure automatically.",
    accent: "gold",
    chips: ["Product rows", "Receipts", "Currency UI", "Bundle cards"],
  },
  {
    id: "inventory",
    eyebrow: "Inventory vault",
    title: "Design real item grids, hover detail, rarity states, and equip actions.",
    copy:
      "Load the Inventory UI pack, route the request through Claude or Gemini, and keep the full prompt memory inside the project.",
    accent: "violet",
    chips: ["Grid layout", "Inspect panel", "Hotbar", "Equip states"],
  },
  {
    id: "rounds",
    eyebrow: "Loop design",
    title: "Prototype round systems without hand-writing the boilerplate every time.",
    copy:
      "Use faster models for simple loops and deeper ones for harder state machines, all inside the same workspace.",
    accent: "cyan",
    chips: ["Lobby", "Intermission", "Teleport", "Win state"],
  },
];

const SUGGESTIONS = [
  "Build a premium inventory UI with rarity borders, item hover details, equip buttons, and a hotbar shell.",
  "Create a round-based survival system with a lobby timer, map teleport, status UI, and win rewards.",
  "Make an RNG rolling button with card reveals, pity logic, rarity colors, and a simple collection save layer.",
  "Create a shop UI with developer product bundles, receipt processing, featured offers, and cash balance UI.",
  "Build a quest framework with daily missions, progress bars, reward claiming, and saved completion state.",
  "Make a plot claiming system with ownership, placement checks, reset flow, and build permission rules.",
];

function createWorkspaceToken() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "") || Math.random().toString(36).slice(2, 14);
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
    description:
      "A focused Roblox workspace for prototyping polished systems, UI, and gameplay loops.",
    workspaceToken: createWorkspaceToken(),
    modelKey: "openai/gpt-4.1-mini",
    selectedPacks: ["inventory-ui", "economy-core", "datastore-safe"],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function emptyWorkspaceState() {
  return {
    workspace: null,
    pluginOnline: false,
    messages: [],
    jobs: [],
    billing: null,
    modelCatalog: [],
    authProviders: null,
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

function normalizeProject(project, fallbackProject, index) {
  return createDefaultProject({
    id: project.id || createId(),
    name: project.name || `Project ${index + 1}`,
    description: project.description || fallbackProject.description,
    workspaceToken: project.workspaceToken || createWorkspaceToken(),
    modelKey: project.modelKey || project.model || fallbackProject.modelKey,
    selectedPacks:
      Array.isArray(project.selectedPacks) && project.selectedPacks.length
        ? project.selectedPacks
        : fallbackProject.selectedPacks,
    createdAt: project.createdAt || new Date().toISOString(),
  });
}

function loadAppState() {
  const fallback = defaultAppState();
  const fallbackProject = fallback.projects[0];

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.projects?.length) {
      return {
        ...fallback,
        ...saved,
        projects: saved.projects.map((project, index) =>
          normalizeProject(project, fallbackProject, index),
        ),
      };
    }
  } catch {
    return fallback;
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const legacy = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!legacy) {
        continue;
      }

      if (legacy.projects?.length) {
        return {
          ...fallback,
          screen: "studio",
          supabaseUrl: legacy.supabaseUrl || fallback.supabaseUrl,
          supabaseAnonKey: legacy.supabaseAnonKey || fallback.supabaseAnonKey,
          pollingSeconds: Number(legacy.pollingSeconds) || fallback.pollingSeconds,
          projects: legacy.projects.map((project, index) =>
            normalizeProject(project, fallbackProject, index),
          ),
          activeProjectId: legacy.activeProjectId || legacy.projects[0]?.id || fallback.activeProjectId,
        };
      }

      const migratedProject = createDefaultProject({
        name: legacy.workspaceName || fallbackProject.name,
        description: "Migrated from an earlier workspace profile.",
        workspaceToken: legacy.workspaceToken || fallbackProject.workspaceToken,
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
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function functionUrl(baseUrl, functionName) {
  return `${baseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`;
}

async function callEdgeFunction(baseUrl, anonKey, functionName, body) {
  return callEdgeFunctionWithAuth(baseUrl, anonKey, functionName, body, "");
}

async function callEdgeFunctionWithAuth(baseUrl, anonKey, functionName, body, accessToken) {
  const response = await fetch(functionUrl(baseUrl, functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  return `Delete ${operation.path}`;
}

function statusTone(status) {
  switch (status) {
    case "applied":
      return "ok";
    case "claimed":
      return "active";
    case "failed":
      return "danger";
    default:
      return "idle";
  }
}

function scoreDots(count) {
  return Array.from({ length: 5 }, (_, index) => index < count);
}

function getSupabaseBrowserClient(url, anonKey) {
  const cacheKey = `${url}::${anonKey}`;

  if (!SUPABASE_BROWSER_CLIENTS.has(cacheKey)) {
    SUPABASE_BROWSER_CLIENTS.set(
      cacheKey,
      createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      }),
    );
  }

  return SUPABASE_BROWSER_CLIENTS.get(cacheKey);
}

function readUserDisplayName(user) {
  const candidates = [
    user?.user_metadata?.display_name,
    user?.user_metadata?.name,
    user?.user_metadata?.preferred_username,
    user?.user_metadata?.user_name,
    user?.user_metadata?.nickname,
    user?.user_metadata?.full_name,
    user?.email ? user.email.split("@")[0] : "",
  ];

  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function readUserProviderKeys(user) {
  const providerKeys = new Set();

  if (typeof user?.app_metadata?.provider === "string" && user.app_metadata.provider.trim()) {
    providerKeys.add(user.app_metadata.provider.trim().toLowerCase());
  }

  if (Array.isArray(user?.app_metadata?.providers)) {
    user.app_metadata.providers.forEach((provider) => {
      if (typeof provider === "string" && provider.trim()) {
        providerKeys.add(provider.trim().toLowerCase());
      }
    });
  }

  if (Array.isArray(user?.identities)) {
    user.identities.forEach((identity) => {
      if (typeof identity?.provider === "string" && identity.provider.trim()) {
        providerKeys.add(identity.provider.trim().toLowerCase());
      }

      if (
        typeof identity?.identity_data?.iss === "string" &&
        identity.identity_data.iss.includes("roblox.com/oauth")
      ) {
        providerKeys.add(ROBLOX_PROVIDER);
      }
    });
  }

  return [...providerKeys];
}

function hasRobloxProvider(user) {
  return readUserProviderKeys(user).some((providerKey) => {
    const normalized = providerKey.toLowerCase();
    return (
      normalized === "roblox" ||
      normalized === ROBLOX_PROVIDER ||
      normalized.endsWith(":roblox")
    );
  });
}

function BrandLockup({ compact = false }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`}>
      <span className="brand-orb" />
      <div>
        <strong>{PRODUCT_NAME}</strong>
        <span>ai for roblox</span>
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [showInventory, setShowInventory] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [showProjectMaker, setShowProjectMaker] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ name: "", description: "" });
  const [landingIndex, setLandingIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authDraft, setAuthDraft] = useState({ email: "", password: "", displayName: "" });
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [authProviderState, setAuthProviderState] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmailBusy, setAuthEmailBusy] = useState(false);
  const [authProviderBusy, setAuthProviderBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [isProjectSyncing, setIsProjectSyncing] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectsReady, setProjectsReady] = useState(false);

  const supabase = useMemo(() => {
    if (!app.supabaseUrl.trim() || !app.supabaseAnonKey.trim()) {
      return null;
    }

    return getSupabaseBrowserClient(app.supabaseUrl.trim(), app.supabaseAnonKey.trim());
  }, [app.supabaseAnonKey, app.supabaseUrl]);

  const accessToken = session?.access_token || "";
  const authed = Boolean(accessToken);
  const currentUser = session?.user || null;
  const userLabel = readUserDisplayName(currentUser) || currentUser?.email || "Signed in";
  const robloxVerified = hasRobloxProvider(currentUser);
  const robloxProviderStatus =
    authProviderState?.roblox || workspaceState.authProviders?.roblox || null;
  const robloxProviderConfigured = Boolean(robloxProviderStatus?.configured);
  const robloxProviderEnabled = robloxProviderStatus?.enabled !== false;

  const activeProject =
    app.projects.find((project) => project.id === app.activeProjectId) || app.projects[0];

  const selectedPacks = useMemo(
    () => PACK_LIBRARY.filter((pack) => activeProject?.selectedPacks?.includes(pack.id)),
    [activeProject],
  );

  const availableModels = workspaceState.modelCatalog?.length
    ? workspaceState.modelCatalog
    : LOCAL_MODEL_CATALOG;
  const billing = workspaceState.billing;
  const planCards = billing?.plans?.length ? billing.plans : LOCAL_PLAN_CATALOG;
  const creditPackCards = billing?.creditPacks?.length ? billing.creditPacks : LOCAL_CREDIT_PACKS;
  const wallet = billing?.wallet;
  const activePlanKey = billing?.plan?.key || wallet?.plan_tier || "free";
  const activePlan = planCards.find((plan) => plan.key === activePlanKey) || planCards[0];
  const activeModel =
    availableModels.find((model) => model.key === activeProject?.modelKey) || availableModels[0];
  const ready =
    authed &&
    projectsReady &&
    Boolean(app.supabaseUrl.trim()) &&
    Boolean(app.supabaseAnonKey.trim()) &&
    Boolean(activeProject?.workspaceToken?.trim());
  const latestJob = workspaceState.jobs[0] || null;
  const appliedCount = workspaceState.jobs.filter((job) => job.status === "applied").length;
  const queuedCount = workspaceState.jobs.filter((job) => job.status === "queued").length;
  const messageCount = workspaceState.messages.length;
  const landingTab = LANDING_TABS[landingIndex % LANDING_TABS.length];
  const pollMs = Math.max(Number(app.pollingSeconds) || 4, 2) * 1000;
  const filteredInventory = PACK_LIBRARY.filter((pack) => {
    const needle = inventorySearch.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return (
      pack.name.toLowerCase().includes(needle) ||
      pack.blurb.toLowerCase().includes(needle) ||
      pack.systems.toLowerCase().includes(needle)
    );
  });

  const pluginSnippet = useMemo(
    () =>
      [
        `SUPABASE URL: ${app.supabaseUrl || "https://your-project.supabase.co"}`,
        `ANON KEY: ${app.supabaseAnonKey || "paste-your-key"}`,
        `WORKSPACE TOKEN: ${activeProject?.workspaceToken || "generate-a-token"}`,
        `POLLING: ${Math.max(Number(app.pollingSeconds) || 4, 2)}s`,
      ].join("\n"),
    [activeProject?.workspaceToken, app.pollingSeconds, app.supabaseAnonKey, app.supabaseUrl],
  );
  const pluginPairCode = useMemo(
    () => formatPairCode(pairCodeFromWorkspaceToken(activeProject?.workspaceToken || "")),
    [activeProject?.workspaceToken],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  }, [app]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLandingIndex((current) => (current + 1) % LANDING_TABS.length);
    }, 3400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkoutState = new URLSearchParams(window.location.search).get("checkout");
    if (!checkoutState) {
      return;
    }

    setCopyFeedback(
      checkoutState === "success"
        ? "Stripe checkout completed. Billing will refresh in a moment."
        : "Stripe checkout was canceled.",
    );
    window.setTimeout(() => setCopyFeedback(""), 2400);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    document.title = PRODUCT_FULL_NAME;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        `${PRODUCT_FULL_NAME} turns plain-English prompts into Roblox Studio systems with live plugin sync.`,
      );
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setProjectsReady(false);
      setAuthReady(Boolean(app.supabaseUrl.trim() && app.supabaseAnonKey.trim()));
      return undefined;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session || null);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [app.supabaseAnonKey, app.supabaseUrl, supabase]);

  useEffect(() => {
    if (!app.supabaseUrl.trim() || !app.supabaseAnonKey.trim()) {
      setAuthProviderState(null);
      return;
    }

    let cancelled = false;

    callEdgeFunction(app.supabaseUrl, app.supabaseAnonKey, "provider-status", {})
      .then((payload) => {
        if (!cancelled) {
          setAuthProviderState(payload.authProviders || null);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setAuthProviderState({
            roblox: {
              configured: false,
              enabled: false,
              error: nextError.message,
            },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [app.supabaseAnonKey, app.supabaseUrl]);

  async function syncProjects(options = {}) {
    const { seedIfEmpty = false } = options;

    if (!authed || !accessToken) {
      return;
    }

    setProjectsReady(false);
    setIsProjectSyncing(true);

    try {
      let payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "project-hub",
        {
          action: "list",
        },
        accessToken,
      );

      if (!payload.projects?.length && seedIfEmpty) {
        const fallbackProject = app.projects[0] || createDefaultProject();
        payload = await callEdgeFunctionWithAuth(
          app.supabaseUrl,
          app.supabaseAnonKey,
          "project-hub",
          {
            action: "create",
            name: fallbackProject.name,
            description: fallbackProject.description,
            modelKey: fallbackProject.modelKey,
            selectedPacks: fallbackProject.selectedPacks,
          },
          accessToken,
        );
      }

      const fallbackProject = createDefaultProject();
      const projects = (payload.projects || []).map((project, index) =>
        normalizeProject(project, fallbackProject, index),
      );

      if (projects.length) {
        setApp((current) => ({
          ...current,
          projects,
          activeProjectId: projects.some((project) => project.id === current.activeProjectId)
            ? current.activeProjectId
            : projects[0].id,
        }));
      }

      setProjectsReady(true);
      setError("");
      return projects;
    } catch (nextError) {
      setProjectsReady(false);
      setError(nextError.message);
      return [];
    } finally {
      setIsProjectSyncing(false);
    }
  }

  useEffect(() => {
    if (!authed || !accessToken) {
      setProjectsReady(false);
      setWorkspaceState(emptyWorkspaceState());
      return;
    }

    syncProjects({ seedIfEmpty: true });
  }, [accessToken, authed]);

  useEffect(() => {
    setWorkspaceState(emptyWorkspaceState());
    setError("");
    setLastSyncedAt("");
  }, [activeProject?.id]);

  useEffect(() => {
    if (!ready || !activeProject) {
      return undefined;
    }

    let cancelled = false;

    const refresh = async () => {
      setIsRefreshing(true);

      try {
        const payload = await callEdgeFunctionWithAuth(
          app.supabaseUrl,
          app.supabaseAnonKey,
          "workspace-state",
          {
            workspaceToken: activeProject.workspaceToken,
          },
          accessToken,
        );

        if (!cancelled) {
          setWorkspaceState(payload);
          setError("");
          setLastSyncedAt(new Date().toISOString());
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    };

    refresh();
    const timer = window.setInterval(refresh, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken, activeProject, app.supabaseAnonKey, app.supabaseUrl, pollMs, ready]);

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

  async function persistProjectPatch(patch) {
    if (!activeProject) {
      return;
    }

    const nextProject = {
      ...activeProject,
      ...patch,
    };

    updateActiveProject(patch);

    if (!authed || !accessToken) {
      return;
    }

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "project-hub",
        {
          action: "update",
          workspaceToken: nextProject.workspaceToken,
          name: nextProject.name,
          description: nextProject.description,
          modelKey: nextProject.modelKey,
          selectedPacks: nextProject.selectedPacks,
        },
        accessToken,
      );

      const fallbackProject = createDefaultProject();
      const projects = (payload.projects || []).map((project, index) =>
        normalizeProject(project, fallbackProject, index),
      );

      if (projects.length) {
        setApp((current) => ({
          ...current,
          projects,
          activeProjectId: projects.some((project) => project.id === current.activeProjectId)
            ? current.activeProjectId
            : projects[0].id,
        }));
      }
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function saveActiveProject() {
    if (!activeProject) {
      return;
    }

    setIsSavingProject(true);

    try {
      await persistProjectPatch({
        name: activeProject.name,
        description: activeProject.description,
        modelKey: activeProject.modelKey,
        selectedPacks: activeProject.selectedPacks,
      });
      setCopyFeedback("Workspace saved.");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    } finally {
      setIsSavingProject(false);
    }
  }

  async function refreshNow() {
    if (!ready || !activeProject) {
      setError("Sign in and pair a workspace token before refreshing.");
      return;
    }

    setError("");
    setIsRefreshing(true);

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "workspace-state",
        {
          workspaceToken: activeProject.workspaceToken,
        },
        accessToken,
      );

      setWorkspaceState(payload);
      setLastSyncedAt(new Date().toISOString());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function runBillingAction(action, extra = {}) {
    if (!ready || !activeProject) {
      setError("Sign in and pair the workspace before using billing actions.");
      return;
    }

    setError("");

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "billing-control",
        {
          action,
          workspaceToken: activeProject.workspaceToken,
          ...extra,
        },
        accessToken,
      );

      setWorkspaceState(payload);
      setLastSyncedAt(new Date().toISOString());
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function submitPrompt(event) {
    event.preventDefault();

    if (!ready || !activeProject) {
      setError("Sign in and pair a workspace token before sending prompts.");
      return;
    }

    if (!prompt.trim()) {
      setError("Write a prompt for the Roblox agent first.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "generate-job",
        {
          workspaceToken: activeProject.workspaceToken,
          prompt,
          modelKey: activeProject.modelKey,
          projectDescription: activeProject.description,
          selectedPacks: selectedPacks.map((pack) => ({
            id: pack.id,
            name: pack.name,
            blurb: pack.blurb,
            systems: pack.systems,
          })),
        },
        accessToken,
      );

      setPrompt("");
      setWorkspaceState(payload.workspace);
      setLastSyncedAt(new Date().toISOString());
      setApp((current) => ({
        ...current,
        screen: "studio",
      }));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copied.`);
      window.setTimeout(() => setCopyFeedback(""), 1800);
    } catch {
      setCopyFeedback("Copy failed. Try manually.");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    }
  }

  function downloadPluginFile() {
    const blob = new Blob([pluginSource], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "zest-studio-plugin.lua";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    setCopyFeedback("Plugin download started.");
    window.setTimeout(() => setCopyFeedback(""), 1800);
  }

  function togglePack(packId) {
    const current = activeProject?.selectedPacks || [];
    const next = current.includes(packId)
      ? current.filter((id) => id !== packId)
      : [...current, packId];

    persistProjectPatch({ selectedPacks: next });
  }

  async function createProjectFromDraft() {
    if (!authed || !accessToken) {
      openAuthScreen("signup");
      return;
    }

    const draft = {
      name: projectDraft.name.trim() || `Project ${app.projects.length + 1}`,
      description:
        projectDraft.description.trim() ||
        "A new Roblox workspace ready for premium systems, UI layers, and gameplay loops.",
      modelKey: activeProject?.modelKey || LOCAL_MODEL_CATALOG[0].key,
      selectedPacks:
        activeProject?.selectedPacks?.length
          ? activeProject.selectedPacks
          : ["inventory-ui", "round-director", "datastore-safe"],
    };

    setIsProjectSyncing(true);

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "project-hub",
        {
          action: "create",
          ...draft,
        },
        accessToken,
      );

      const fallbackProject = createDefaultProject();
      const projects = (payload.projects || []).map((project, index) =>
        normalizeProject(project, fallbackProject, index),
      );
      const newProject =
        projects.find((project) => project.name === draft.name) || projects[0] || null;

      if (projects.length) {
        setApp((current) => ({
          ...current,
          screen: "studio",
          projects,
          activeProjectId: newProject?.id || projects[0].id,
        }));
      }

      setProjectDraft({ name: "", description: "" });
      setShowProjectMaker(false);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsProjectSyncing(false);
    }
  }

  function switchProject(projectId) {
    setApp((current) => ({
      ...current,
      screen: "studio",
      activeProjectId: projectId,
    }));
  }

  function openAuthScreen(mode = "signin") {
    setAuthMode(mode);
    setShowPasswordAuth(false);
    setAuthNotice("");
    setError("");
    setShowAuth(true);
  }

  function closeAuthScreen() {
    setShowAuth(false);
    setShowPasswordAuth(false);
    setAuthNotice("");
    setError("");
    setAuthDraft((current) => ({
      ...current,
      password: "",
    }));
  }

  async function startRobloxAuth() {
    if (!supabase) {
      setError("Add your Supabase URL and public key first.");
      return;
    }

    if (!robloxProviderConfigured) {
      setAuthNotice(
        "Roblox login is not configured in Supabase yet. Create a Roblox OAuth app first, then register it as the custom provider custom:roblox in Supabase Auth.",
      );
      setError("");
      return;
    }

    if (!robloxProviderEnabled) {
      setAuthNotice(
        "The Roblox auth provider exists in Supabase but is disabled. Re-enable custom:roblox in Supabase Auth and try again.",
      );
      setError("");
      return;
    }

    setAuthProviderBusy(true);
    setAuthNotice("");
    setError("");

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: ROBLOX_PROVIDER,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (nextError) {
      const message =
        nextError?.message?.includes("custom provider custom:roblox not found")
          ? "Supabase does not have the custom:roblox provider yet. Register the Roblox OAuth app in Supabase Auth first."
          : nextError?.message?.includes("provider") ||
              nextError?.message?.includes("OAuth")
            ? "Roblox login is not enabled yet. Add a Supabase custom OIDC provider with the identifier custom:roblox first."
          : nextError.message;
      setError(message);
    } finally {
      setAuthProviderBusy(false);
    }
  }

  async function sendMagicLink(event) {
    event.preventDefault();

    if (!supabase) {
      setError("Add your Supabase URL and public key first.");
      return;
    }

    if (!authDraft.email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setAuthEmailBusy(true);
    setAuthNotice("");
    setError("");

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: authDraft.email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: authMode === "signup",
          data:
            authMode === "signup" && authDraft.displayName.trim()
              ? {
                  display_name: authDraft.displayName.trim(),
                }
              : undefined,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setAuthNotice(
        authMode === "signup"
          ? "Magic link sent. Open your email to create the account and jump back into Zest."
          : "Magic link sent. Open your email to sign in.",
      );
      setAuthDraft((current) => ({
        ...current,
        password: "",
      }));
      setShowPasswordAuth(false);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setAuthEmailBusy(false);
    }
  }

  async function submitAuthForm(event) {
    event.preventDefault();

    if (!supabase) {
      setError("Add your Supabase URL and public key first.");
      return;
    }

    if (!authDraft.email.trim() || !authDraft.password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setAuthBusy(true);
    setAuthNotice("");
    setError("");

    try {
      if (authMode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authDraft.email.trim(),
          password: authDraft.password,
          options: {
            data: {
              display_name: authDraft.displayName.trim(),
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.session) {
          setAuthNotice("Account created. Check your email to confirm sign-in.");
        } else {
          closeAuthScreen();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authDraft.email.trim(),
          password: authDraft.password,
        });

        if (signInError) {
          throw signInError;
        }

        closeAuthScreen();
      }
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setProjectsReady(false);
    setWorkspaceState(emptyWorkspaceState());
    setPrompt("");
  }

  async function startCheckout(kind, value) {
    if (!ready || !activeProject) {
      setError("Sign in and pair a workspace before opening checkout.");
      return;
    }

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "create-checkout",
        {
          kind,
          workspaceToken: activeProject.workspaceToken,
          origin: window.location.origin,
          ...(kind === "plan" ? { planTier: value } : { packId: value }),
        },
        accessToken,
      );

      if (payload.url) {
        window.location.assign(payload.url);
      }
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function openBillingPortal() {
    if (!ready || !activeProject) {
      setError("Sign in and connect a workspace before opening billing.");
      return;
    }

    try {
      const payload = await callEdgeFunctionWithAuth(
        app.supabaseUrl,
        app.supabaseAnonKey,
        "customer-portal",
        {
          workspaceToken: activeProject.workspaceToken,
          origin: window.location.origin,
        },
        accessToken,
      );

      if (payload.url) {
        window.location.assign(payload.url);
      }
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function openStudio() {
    if (!authed) {
      openAuthScreen("signup");
      return;
    }

    setApp((current) => ({
      ...current,
      screen: "studio",
    }));
  }

  function openLanding() {
    setApp((current) => ({
      ...current,
      screen: "landing",
    }));
  }

  function openSetup() {
    if (!authed) {
      openAuthScreen("signin");
      return;
    }

    openStudio();
    window.setTimeout(() => {
      document.getElementById("setup-runbook")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  return (
    <div className="app-shell">
      <div className="surface-glow surface-glow-a" />
      <div className="surface-glow surface-glow-b" />
      <div className="surface-grid" />

      <header className="site-header">
        <button className="brand-button" type="button" onClick={openLanding}>
          <BrandLockup compact />
        </button>

        <nav className="site-nav">
          <button
            className={`nav-link ${app.screen === "landing" ? "nav-link-active" : ""}`}
            type="button"
            onClick={openLanding}
          >
            Homepage
          </button>
          <button
            className={`nav-link ${app.screen === "studio" ? "nav-link-active" : ""}`}
            type="button"
            onClick={openStudio}
          >
            Studio
          </button>
          <button className="nav-link" type="button" onClick={openSetup}>
            Setup
          </button>
        </nav>

        <div className="site-actions">
          {authed ? (
            <>
              <span
                className={`top-status ${
                  workspaceState.pluginOnline ? "top-status-live" : ""
                }`}
              >
                {workspaceState.pluginOnline ? "Plugin online" : "Waiting for plugin"}
              </span>
              <div className="credit-pill">
                <strong>{wallet?.credits_balance ?? "--"}</strong>
                <span>credits</span>
              </div>
              <div className={`user-pill ${robloxVerified ? "user-pill-verified" : ""}`}>
                <strong>{userLabel}</strong>
                <span>{robloxVerified ? "Roblox verified" : currentUser?.email ? currentUser.email : "Signed in"}</span>
              </div>
              <button className="ghost-cta" type="button" onClick={signOut}>
                Sign out
              </button>
              <button className="primary-cta" type="button" onClick={openStudio}>
                Dashboard
              </button>
            </>
          ) : (
            <>
              <span className="top-status">Early access</span>
              <button className="ghost-cta" type="button" onClick={() => openAuthScreen("signin")}>
                Sign in
              </button>
              <button className="primary-cta" type="button" onClick={() => openAuthScreen("signup")}>
                Create Account
              </button>
            </>
          )}
        </div>
      </header>

      {app.screen === "landing" ? (
        <main className="landing-page">
          <section className="landing-hero">
            <div className="landing-copy">
              <p className="eyebrow">AI code tool for Roblox</p>
              <h1>The cleanest way to turn ideas into Roblox systems.</h1>
              <p className="landing-text">
                {PRODUCT_NAME} keeps the workflow simple: pick a model, describe the mechanic,
                sync with Studio, and ship faster. Projects, credits, and plugin history stay in
                one place.
              </p>

              <div className="hero-cta-row">
                <button className="primary-cta" type="button" onClick={openStudio}>
                  {authed ? "Open Dashboard" : "Start Prototyping"}
                </button>
                <button className="ghost-cta" type="button" onClick={openSetup}>
                  {authed ? "Open Setup" : "View Product"}
                </button>
              </div>

              <div className="hero-stat-row">
                <div className="hero-stat-card">
                  <span>Providers</span>
                  <strong>4</strong>
                </div>
                <div className="hero-stat-card">
                  <span>Models</span>
                  <strong>{availableModels.length}</strong>
                </div>
                <div className="hero-stat-card">
                  <span>Packs</span>
                  <strong>{PACK_LIBRARY.length}</strong>
                </div>
              </div>
            </div>

            <div className="showcase-stage">
              <div className="showcase-shell">
                <div className="showcase-shell-top">
                  <span className={`showcase-accent showcase-accent-${landingTab.accent}`}>
                    {landingTab.eyebrow}
                  </span>
                  <span className="showcase-mini-status">Live workspace</span>
                </div>

                <div className={`showcase-canvas showcase-${landingTab.accent}`}>
                  <strong>{landingTab.title}</strong>
                  <p>{landingTab.copy}</p>

                  <div className="showcase-chip-grid">
                    {landingTab.chips.map((chip) => (
                      <span className="showcase-chip" key={chip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="showcase-tabs">
                  {LANDING_TABS.map((tab, index) => (
                    <button
                      key={tab.id}
                      className={`showcase-tab ${landingTab.id === tab.id ? "showcase-tab-active" : ""}`}
                      type="button"
                      onClick={() => setLandingIndex(index)}
                    >
                      {tab.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="feature-row">
            <article className="feature-card">
              <p className="eyebrow">Model routing</p>
              <h2>Use Claude, Gemini, Kimi, or OpenAI on the same workspace.</h2>
              <p>
                Light tasks can stay cheap. Bigger tasks can route to stronger models without
                leaving the project.
              </p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">Credits</p>
              <h2>Simple plans, daily credits, and clear model costs.</h2>
              <p>
                The wallet is tracked in Supabase so usage, upgrades, and refunds stay visible.
              </p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">System packs</p>
              <h2>Load reusable gameplay packs before you generate.</h2>
              <p>
                Inventory, quests, saves, rounds, combat, and economy can all shape the prompt.
              </p>
            </article>
          </section>

          <section className="plans-preview">
            {LOCAL_PLAN_CATALOG.map((plan) => (
              <article
                className={`plan-preview-card ${plan.key === "pro" ? "plan-preview-featured" : ""}`}
                key={plan.key}
              >
                <div className="plan-preview-head">
                  <span>{plan.label} Plan</span>
                  {plan.key === "pro" ? <span className="plan-tag">Popular</span> : null}
                </div>
                <strong>{plan.dailyCredits} credits / day</strong>
                <p>{plan.features.join(" - ")}</p>
              </article>
            ))}
          </section>
        </main>
      ) : !authed ? (
        <main className="studio-gate">
          <section className="gate-card">
            <p className="eyebrow">Cloud workspace required</p>
            <h1>Sign in before you pair Studio, save projects, or use paid models.</h1>
            <p>
              {PRODUCT_NAME} keeps projects in the cloud so your Roblox plugin, memory, and
              billing stay attached to your account.
            </p>
            <div className="hero-cta-row">
              <button className="primary-cta" type="button" onClick={() => openAuthScreen("signup")}>
                Create account
              </button>
              <button className="ghost-cta" type="button" onClick={() => openAuthScreen("signin")}>
                Sign in
              </button>
            </div>
          </section>
        </main>
      ) : (
        <main className="studio-page">
          <div className="studio-layout">
            <aside className="project-rail">
              <section className="rail-card">
                <div className="rail-head">
                  <div>
                    <p className="eyebrow">Workspace list</p>
                    <h2>Projects</h2>
                  </div>
                  <button
                    className="rail-action"
                    type="button"
                    disabled={isProjectSyncing}
                    onClick={() => setShowProjectMaker((current) => !current)}
                  >
                    {isProjectSyncing ? "Syncing..." : showProjectMaker ? "Close" : "New Project"}
                  </button>
                </div>

                {showProjectMaker ? (
                  <div className="project-maker">
                    <label className="field">
                      <span>Project name</span>
                      <input
                        value={projectDraft.name}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Anime dungeon battler"
                      />
                    </label>

                    <label className="field">
                      <span>Project brief</span>
                      <textarea
                        value={projectDraft.description}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Short direction for the game and the next prototype."
                      />
                    </label>

                    <button className="create-project-button" type="button" onClick={createProjectFromDraft}>
                      {isProjectSyncing ? "Forging..." : "Forge Project"}
                    </button>
                  </div>
                ) : null}

                <div className="project-list">
                  {app.projects.length ? app.projects.map((project) => {
                    const projectModel =
                      availableModels.find((model) => model.key === project.modelKey) ||
                      LOCAL_MODEL_CATALOG[0];

                    return (
                      <button
                        className={`project-row ${
                          project.id === activeProject?.id ? "project-row-active" : ""
                        }`}
                        key={project.id}
                        type="button"
                        onClick={() => switchProject(project.id)}
                      >
                        <span className="project-mark" />
                        <div className="project-copy">
                          <strong>{project.name}</strong>
                          <span>{projectModel.label}</span>
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="empty-panel">
                      <p>No cloud projects yet.</p>
                      <span>Create your first workspace to start pairing Studio.</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="rail-card rail-card-soft">
                <div className="rail-tool-stack">
                  <button className="tool-button" type="button" onClick={() => setShowModels(true)}>
                    Model marketplace
                  </button>
                  <button className="tool-button" type="button" onClick={() => setShowInventory(true)}>
                    Inventory vault
                  </button>
                  <button className="tool-button" type="button" onClick={() => setShowBilling(true)}>
                    Credits and plans
                  </button>
                </div>
              </section>
            </aside>

            <section className="studio-main">
              <section className="workspace-hero">
                <div>
                  <p className="eyebrow">Active workspace</p>
                  <h1>{activeProject?.name || "Untitled Project"}</h1>
                  <p>{activeProject?.description}</p>
                </div>

                <div className="workspace-hero-stats">
                  <div className="hero-mini-card">
                    <span>Credits</span>
                    <strong>{wallet?.credits_balance ?? "--"}</strong>
                  </div>
                  <div className="hero-mini-card">
                    <span>Plan</span>
                    <strong>{activePlan?.label || "Free"}</strong>
                  </div>
                  <div className="hero-mini-card">
                    <span>Model</span>
                    <strong>{activeModel?.label || "--"}</strong>
                  </div>
                </div>
              </section>

              <section className="command-stage">
                <div className="command-head">
                  <div>
                    <p className="eyebrow">Prompt deck</p>
                    <h2>Describe the next Roblox mechanic</h2>
                  </div>
                  <div className="command-status-row">
                    <span className={`top-status ${workspaceState.pluginOnline ? "top-status-live" : ""}`}>
                      {workspaceState.pluginOnline ? "Studio synced" : "Plugin offline"}
                    </span>
                    <button className="ghost-cta" type="button" onClick={refreshNow}>
                      {isRefreshing ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                </div>

                <div className="context-row">
                  <button className="context-pill context-pill-model" type="button" onClick={() => setShowModels(true)}>
                    {activeModel?.label || "Choose model"} - {activeModel?.creditCost ?? "--"} credits
                  </button>
                  <button
                    className="context-pill context-pill-billing"
                    type="button"
                    onClick={() => setShowBilling(true)}
                  >
                    {wallet?.credits_balance ?? "--"} credits left
                  </button>
                  <button
                    className="context-pill context-pill-inventory"
                    type="button"
                    onClick={() => setShowInventory(true)}
                  >
                    {selectedPacks.length} packs loaded
                  </button>
                </div>

                <div className="selected-pack-row">
                  {selectedPacks.map((pack) => (
                    <span className={`selected-pack selected-pack-${pack.tone}`} key={pack.id}>
                      {pack.name}
                    </span>
                  ))}
                </div>

                <form className="composer" onSubmit={submitPrompt}>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={6}
                    placeholder="Example: Make an inventory UI with rarity borders, hover detail, equip buttons, a hotbar shell, and saved loadout state."
                  />

                  <div className="suggestion-row">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="suggestion-pill"
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <div className="composer-foot">
                    <p>
                      The selected model, current project brief, and loaded inventory packs are
                      all included when the planner builds this job.
                    </p>
                    <button className="primary-cta" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Queuing..." : "Send to Studio"}
                    </button>
                  </div>
                </form>

                {error ? <div className="banner banner-error">{error}</div> : null}
                {copyFeedback ? <div className="banner banner-success">{copyFeedback}</div> : null}
              </section>

              <section className="metric-grid">
                <article className="metric-card">
                  <span>Queued jobs</span>
                  <strong>{queuedCount}</strong>
                  <p>Waiting for the plugin to claim and apply.</p>
                </article>
                <article className="metric-card">
                  <span>Applied jobs</span>
                  <strong>{appliedCount}</strong>
                  <p>Studio changes reported back successfully.</p>
                </article>
                <article className="metric-card">
                  <span>Memory entries</span>
                  <strong>{messageCount}</strong>
                  <p>Conversation and planner notes stored for this project.</p>
                </article>
                <article className="metric-card">
                  <span>Last sync</span>
                  <strong>{lastSyncedAt ? "Live" : "Idle"}</strong>
                  <p>{formatDateTime(lastSyncedAt)}</p>
                </article>
              </section>

              <section className="feed-grid">
                <section className="feed-panel">
                  <div className="feed-head">
                    <div>
                      <p className="eyebrow">Job feed</p>
                      <h2>Generated Studio plans</h2>
                    </div>
                    {latestJob ? (
                      <span className={`status-badge tone-${statusTone(latestJob.status)}`}>
                        {formatStatus(latestJob.status)}
                      </span>
                    ) : null}
                  </div>

                  {workspaceState.jobs.length ? (
                    <div className="job-list">
                      {workspaceState.jobs.map((job) => (
                        <article className="job-card" key={job.id}>
                          <div className="job-card-head">
                            <div>
                              <p className="job-title">{job.title || "Untitled plan"}</p>
                              <p className="job-meta">
                                {formatStatus(job.status)} - {formatDateTime(job.created_at)}
                              </p>
                            </div>
                            <div className="job-meta-stack">
                              <span className={`status-badge tone-${statusTone(job.status)}`}>
                                {job.operations.length} ops
                              </span>
                              {job.credit_cost ? (
                                <span className="credit-cost-chip">{job.credit_cost} credits</span>
                              ) : null}
                            </div>
                          </div>

                          <p className="job-summary">{job.summary}</p>

                          <div className="operation-list">
                            {job.operations.slice(0, 4).map((operation, index) => (
                              <div className="operation-row" key={`${job.id}-${index}`}>
                                <span className="operation-index">{String(index + 1).padStart(2, "0")}</span>
                                <div>
                                  <strong>{operation.description || operation.type}</strong>
                                  <p>{summarizeOperation(operation)}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {job.manual_steps.length ? (
                            <div className="manual-steps">
                              {job.manual_steps.map((step, index) => (
                                <p key={`${job.id}-manual-${index}`}>Manual: {step}</p>
                              ))}
                            </div>
                          ) : null}

                          {job.result_log.length ? (
                            <details className="details-block">
                              <summary>Plugin result log</summary>
                              <pre>{JSON.stringify(job.result_log, null, 2)}</pre>
                            </details>
                          ) : null}

                          {job.last_error ? <div className="banner banner-error">{job.last_error}</div> : null}

                          <details className="details-block">
                            <summary>Generated sources</summary>
                            <div className="script-stack">
                              {job.operations
                                .filter((operation) => operation.type === "upsert_script")
                                .map((operation, index) => (
                                  <div className="script-card" key={`${job.id}-script-${index}`}>
                                    <div className="script-head">
                                      <strong>{operation.name}</strong>
                                      <button
                                        className="ghost-cta inline-ghost"
                                        type="button"
                                        onClick={() => copyText(operation.source, operation.name)}
                                      >
                                        Copy source
                                      </button>
                                    </div>
                                    <p className="script-path">
                                      {operation.script_type} in {operation.parent_path}
                                    </p>
                                    <pre>{operation.source}</pre>
                                  </div>
                                ))}
                            </div>
                          </details>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-panel">
                      <p>No jobs yet.</p>
                      <span>Your first prompt will show up here with model cost and generated scripts.</span>
                    </div>
                  )}
                </section>

                <section className="feed-panel">
                  <div className="feed-head">
                    <div>
                      <p className="eyebrow">Workspace memory</p>
                      <h2>Conversation thread</h2>
                    </div>
                  </div>

                  {workspaceState.messages.length ? (
                    <div className="memory-thread">
                      {workspaceState.messages.map((message) => (
                        <article
                          className={`memory-bubble ${
                            message.role === "user" ? "memory-user" : "memory-assistant"
                          }`}
                          key={message.id}
                        >
                          <div className="memory-head">
                            <strong>{message.role === "user" ? "You" : "Planner"}</strong>
                            <span>{formatDateTime(message.created_at)}</span>
                          </div>
                          <p>{message.content}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-panel">
                      <p>No memory yet.</p>
                      <span>The planner thread will start filling once you send the first prompt.</span>
                    </div>
                  )}
                </section>
              </section>
            </section>

            <aside className="utility-dock">
              <section className="dock-card">
                <div className="dock-head">
                  <div>
                    <p className="eyebrow">Pairing</p>
                    <h2>Install and connect Studio</h2>
                  </div>
                  <div className="dock-action-row">
                    <button className="ghost-cta inline-ghost" type="button" onClick={saveActiveProject}>
                      {isSavingProject ? "Saving..." : "Save workspace"}
                    </button>
                  </div>
                </div>

                <div className="pairing-flow">
                  <article className="pairing-step-card">
                    <span className="pairing-step-index">1</span>
                    <div className="pairing-step-copy">
                      <strong>Download the plugin</strong>
                      <p>
                        Put the plugin into your Roblox Studio plugins folder, then restart
                        Studio once.
                      </p>
                      <div className="dock-action-row">
                        <button className="primary-cta" type="button" onClick={downloadPluginFile}>
                          Download plugin
                        </button>
                        <button
                          className="ghost-cta inline-ghost"
                          type="button"
                          onClick={() => copyText(ROBLOX_PLUGIN_FOLDER, "Plugins folder path")}
                        >
                          Copy plugins folder
                        </button>
                      </div>
                    </div>
                  </article>

                  <article className="pairing-step-card">
                    <span className="pairing-step-index">2</span>
                    <div className="pairing-step-copy">
                      <strong>Enter this pairing code in Studio</strong>
                      <p>
                        Open the Zest plugin in Roblox Studio, paste this short code, then click
                        `Connect with code`.
                      </p>
                      <div className="pairing-code-box">{pluginPairCode || "NO-CODE-YET"}</div>
                      <div className="dock-action-row">
                        <button
                          className="primary-cta"
                          type="button"
                          onClick={() => copyText(pluginPairCode, "Pairing code")}
                        >
                          Copy pairing code
                        </button>
                        <button
                          className="ghost-cta inline-ghost"
                          type="button"
                          onClick={() => copyText(pluginSnippet, "Legacy plugin payload")}
                        >
                          Copy legacy payload
                        </button>
                      </div>
                    </div>
                  </article>

                  <article className="pairing-step-card">
                    <span className="pairing-step-index">3</span>
                    <div className="pairing-step-copy">
                      <strong>Start sync in Studio</strong>
                      <p>
                        After the plugin pairs, click `Start sync`. Zest will begin claiming queued
                        jobs and reporting results back here.
                      </p>
                      <div className="pairing-status-row">
                        <span
                          className={`top-status ${
                            workspaceState.pluginOnline ? "top-status-live" : ""
                          }`}
                        >
                          {workspaceState.pluginOnline ? "Plugin connected" : "Plugin waiting"}
                        </span>
                        <span className="pairing-status-copy">
                          {workspaceState.pluginOnline
                            ? "Studio is actively checking for jobs."
                            : "The web app will flip live as soon as Studio pairs and starts syncing."}
                        </span>
                      </div>
                    </div>
                  </article>
                </div>

                <details className="details-block">
                  <summary>Advanced manual setup</summary>

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
                      placeholder="Paste your publishable or legacy anon key"
                    />
                  </label>

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
                      placeholder="Direction, references, and what this workspace is trying to ship."
                    />
                  </label>

                  <label className="field">
                    <span>Workspace token</span>
                    <div className="inline-field">
                      <input value={activeProject?.workspaceToken || ""} readOnly />
                    </div>
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

                  <pre className="snippet-block">{pluginSnippet}</pre>
                </details>
              </section>

              <section className="dock-card" id="setup-runbook">
                <div className="dock-head">
                  <div>
                    <p className="eyebrow">Setup</p>
                    <h2>Deploy checklist</h2>
                  </div>
                </div>

                <div className="setup-list">
                  <div className="setup-step">
                    <strong>1. Link Supabase</strong>
                    <pre>{`npx supabase login\nnpx supabase link --project-ref your-project-ref`}</pre>
                  </div>
                  <div className="setup-step">
                    <strong>2. Add secrets</strong>
                    <pre>{`OPENAI_API_KEY=...\nANTHROPIC_API_KEY=...\nGEMINI_API_KEY=...\nMOONSHOT_API_KEY=...`}</pre>
                  </div>
                  <div className="setup-step">
                    <strong>3. Deploy functions</strong>
                    <pre>{`npx supabase functions deploy project-hub\nnpx supabase functions deploy workspace-state\nnpx supabase functions deploy generate-job\nnpx supabase functions deploy billing-control\nnpx supabase functions deploy create-checkout\nnpx supabase functions deploy customer-portal\nnpx supabase functions deploy plugin-sync --no-verify-jwt\nnpx supabase functions deploy auth-status --no-verify-jwt\nnpx supabase functions deploy provider-status --no-verify-jwt\nnpx supabase functions deploy stripe-webhook --no-verify-jwt`}</pre>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      )}

      {showModels ? (
        <div className="overlay-shell" role="dialog" aria-modal="true">
          <div className="overlay-backdrop" onClick={() => setShowModels(false)} />
          <section className="overlay-panel overlay-wide">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Model marketplace</p>
                <h2>Route each project through the right provider</h2>
              </div>
              <button className="overlay-close" type="button" onClick={() => setShowModels(false)}>
                Close
              </button>
            </div>

            <div className="model-board">
              {availableModels.map((model) => {
                const active = model.key === activeProject?.modelKey;
                const locked = wallet && wallet.credits_balance < model.creditCost;

                return (
                  <button
                    className={`model-card ${active ? "model-card-active" : ""} ${
                      !model.enabled ? "model-card-disabled" : ""
                    }`}
                    disabled={!model.enabled}
                    key={model.key}
                    type="button"
                    onClick={() => persistProjectPatch({ modelKey: model.key })}
                  >
                    <div className="model-card-head">
                      <div>
                        <span className="model-provider">{model.providerLabel}</span>
                        <strong>{model.label}</strong>
                      </div>
                      <span className="model-cost">{model.creditCost}c</span>
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
                      {!model.enabled ? (
                        <span>Server key missing</span>
                      ) : locked ? (
                        <span>Need more credits</span>
                      ) : active ? (
                        <span>Selected</span>
                      ) : (
                        <span>Tap to use</span>
                      )}
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
          <section className="overlay-panel overlay-wide">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Inventory vault</p>
                <h2>Load reusable system packs into your hand</h2>
              </div>
              <button className="overlay-close" type="button" onClick={() => setShowInventory(false)}>
                Close
              </button>
            </div>

            <div className="inventory-toolbar">
              <input
                value={inventorySearch}
                onChange={(event) => setInventorySearch(event.target.value)}
                placeholder="Search cards..."
              />
              <div className="inventory-hand">{selectedPacks.length} loaded</div>
            </div>

            <div className="inventory-grid">
              {filteredInventory.map((pack) => {
                const selected = activeProject?.selectedPacks?.includes(pack.id);
                return (
                  <button
                    className={`inventory-card inventory-card-${pack.tone} ${
                      selected ? "inventory-card-active" : ""
                    }`}
                    key={pack.id}
                    type="button"
                    onClick={() => togglePack(pack.id)}
                  >
                    <div className="inventory-card-top">
                      <span className="inventory-badge">{selected ? "Loaded" : "Optional"}</span>
                      <span className="inventory-card-name">{pack.name}</span>
                    </div>
                    <strong>{pack.blurb}</strong>
                    <p>{pack.systems}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {showBilling ? (
        <div className="overlay-shell" role="dialog" aria-modal="true">
          <div className="overlay-backdrop" onClick={() => setShowBilling(false)} />
          <section className="overlay-panel overlay-wide">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Credits and plans</p>
                <h2>Daily claims, upgrades, and credit packs</h2>
              </div>
              <button className="overlay-close" type="button" onClick={() => setShowBilling(false)}>
                Close
              </button>
            </div>

            <div className="billing-hero">
              <div className="billing-stat-card">
                <span>Current balance</span>
                <strong>{wallet?.credits_balance ?? "--"}</strong>
              </div>
              <div className="billing-stat-card">
                <span>Current plan</span>
                <strong>{activePlan?.label || "Free"}</strong>
              </div>
              <div className="billing-stat-card">
                <span>Daily claim</span>
                <button
                  className="claim-button"
                  type="button"
                  disabled={!billing?.canClaimDaily}
                  onClick={() => runBillingAction("claim_daily")}
                >
                  {billing?.canClaimDaily ? "Claim now" : "Claimed today"}
                </button>
              </div>
            </div>

            <div className="plan-grid">
              {planCards.map((plan) => {
                const active = plan.key === activePlanKey;
                const paidPlan = plan.key !== "free";

                return (
                  <article
                    className={`plan-card ${active ? "plan-card-active" : ""}`}
                    key={plan.key}
                  >
                    <div className="plan-card-head">
                      <span>{plan.label} Plan</span>
                      {active ? <span className="plan-tag">Current</span> : null}
                    </div>
                    <strong>{plan.dailyCredits} credits / day</strong>
                    <p>Up to {plan.maxProjects} project tokens. Upgrade bonus {plan.upgradeBonus}.</p>
                    <div className="plan-feature-list">
                      {plan.features.map((feature) => (
                        <span key={feature}>{feature}</span>
                      ))}
                    </div>
                    <button
                      className={`plan-action ${
                        active && !workspaceState.workspace?.stripe_customer_id
                          ? "plan-action-disabled"
                          : ""
                      }`}
                      disabled={active && !workspaceState.workspace?.stripe_customer_id}
                      type="button"
                      onClick={() =>
                        active
                          ? workspaceState.workspace?.stripe_customer_id
                            ? openBillingPortal()
                            : undefined
                          : paidPlan
                            ? startCheckout("plan", plan.key)
                            : runBillingAction("set_plan", { planTier: plan.key })
                      }
                    >
                      {active
                        ? workspaceState.workspace?.stripe_customer_id
                          ? "Manage in Stripe"
                          : "Current plan"
                        : paidPlan
                          ? `Upgrade to ${plan.label}`
                          : `Switch to ${plan.label}`}
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="credit-pack-grid">
              {creditPackCards.map((pack) => (
                <article className="credit-pack-card" key={pack.key}>
                  <div className="credit-pack-head">
                    <span>{pack.label}</span>
                    <strong>{pack.priceLabel}</strong>
                  </div>
                  <p>{pack.totalCredits} credits total</p>
                  <button
                    className="purchase-button"
                    type="button"
                    onClick={() => startCheckout("credits", pack.key)}
                  >
                    Purchase pack
                  </button>
                </article>
              ))}
            </div>

            <div className="ledger-panel">
              <p className="eyebrow">Recent ledger</p>
              {billing?.ledger?.length ? (
                <div className="ledger-list">
                  {billing.ledger.map((entry) => (
                    <div className="ledger-row" key={entry.id}>
                      <div>
                        <strong>{entry.summary}</strong>
                        <span>{formatDateTime(entry.created_at)}</span>
                      </div>
                      <div className={`ledger-delta ${entry.delta >= 0 ? "ledger-plus" : "ledger-minus"}`}>
                        {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-panel">
                  <p>No credit history yet.</p>
                  <span>Claims, purchases, spends, and refunds will appear here.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {showAuth ? (
        <div className="overlay-shell" role="dialog" aria-modal="true">
          <div className="overlay-backdrop" onClick={closeAuthScreen} />
          <section className="overlay-panel auth-panel">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Account</p>
                <h2>
                  {authMode === "signup"
                    ? `Start your ${PRODUCT_NAME} workspace`
                    : `Welcome back to ${PRODUCT_NAME}`}
                </h2>
                <p className="auth-lead">
                  Use Roblox for the cleanest sign-in, send yourself a magic link, or keep a
                  password as the fallback lane.
                </p>
              </div>
              <button className="overlay-close" type="button" onClick={closeAuthScreen}>
                Close
              </button>
            </div>

            <div className="auth-stack">
              <button
                className={`auth-provider-button ${
                  !robloxProviderConfigured || !robloxProviderEnabled
                    ? "auth-provider-button-disabled"
                    : ""
                }`}
                type="button"
                onClick={startRobloxAuth}
                disabled={authProviderBusy}
              >
                <span className="auth-provider-badge">
                  {robloxProviderConfigured
                    ? robloxProviderEnabled
                      ? "Roblox ready"
                      : "Roblox disabled"
                    : "Roblox setup"}
                </span>
                <strong>
                  {authProviderBusy
                    ? "Opening Roblox..."
                    : robloxProviderConfigured && robloxProviderEnabled
                      ? "Continue with Roblox"
                      : "Finish Roblox setup"}
                </strong>
                <span>
                  {robloxProviderConfigured && robloxProviderEnabled
                    ? "Sign in with the same creator account you use in Roblox Studio and keep the workspace identity verified."
                    : "This project still needs a Roblox OAuth app plus a Supabase custom provider before Roblox verification can work."}
                </span>
              </button>

              {!robloxProviderConfigured ? (
                <div className="auth-provider-hint">
                  <strong>What is missing:</strong>
                  <span>
                    No `custom:roblox` provider exists in Supabase yet. After you create a Roblox
                    OAuth app, wire it to Supabase using the callback URL shown in Supabase Auth.
                  </span>
                </div>
              ) : null}

              <div className="auth-divider">
                <span>or use email without a password</span>
              </div>
            </div>

            <form className="auth-form" onSubmit={sendMagicLink}>
              {authMode === "signup" ? (
                <label className="field">
                  <span>Display name</span>
                  <input
                    value={authDraft.displayName}
                    onChange={(event) =>
                      setAuthDraft((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Studio founder"
                  />
                </label>
              ) : null}

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={authDraft.email}
                  onChange={(event) =>
                    setAuthDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@studio.com"
                />
              </label>

              {error ? <div className="banner banner-error">{error}</div> : null}
              {authNotice ? <div className="banner banner-success">{authNotice}</div> : null}

              <button
                className="primary-cta auth-submit"
                type="submit"
                disabled={authEmailBusy || authProviderBusy || authBusy}
              >
                {authEmailBusy
                  ? "Sending magic link..."
                  : authMode === "signup"
                    ? "Create with magic link"
                    : "Email me a magic link"}
              </button>
            </form>

            <div className="auth-footer auth-footer-top">
              <span>Password still works if you want the old flow.</span>
              <button
                className="ghost-cta inline-ghost"
                type="button"
                onClick={() => {
                  setShowPasswordAuth((current) => !current);
                  setAuthNotice("");
                  setError("");
                }}
              >
                {showPasswordAuth ? "Hide password" : "Use password instead"}
              </button>
            </div>

            {showPasswordAuth ? (
              <form className="auth-form auth-form-secondary" onSubmit={submitAuthForm}>
                {authMode === "signup" ? (
                  <label className="field">
                    <span>Display name</span>
                    <input
                      value={authDraft.displayName}
                      onChange={(event) =>
                        setAuthDraft((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="Studio founder"
                    />
                  </label>
                ) : null}

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={authDraft.email}
                    onChange={(event) =>
                      setAuthDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@studio.com"
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={authDraft.password}
                    onChange={(event) =>
                      setAuthDraft((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="At least 6 characters"
                  />
                </label>

                {error ? <div className="banner banner-error">{error}</div> : null}
                {authNotice ? <div className="banner banner-success">{authNotice}</div> : null}

                <button className="ghost-cta auth-submit auth-submit-secondary" type="submit" disabled={authBusy}>
                  {authBusy
                    ? authMode === "signup"
                      ? "Creating account..."
                      : "Signing in..."
                    : authMode === "signup"
                      ? "Create with password"
                      : "Sign in with password"}
                </button>
              </form>
            ) : null}

            <div className="auth-footer">
              <span>
                {authMode === "signup" ? "Already have an account?" : "Need an account?"}
              </span>
              <button
                className="ghost-cta inline-ghost"
                type="button"
                onClick={() => {
                  setAuthMode((current) => (current === "signup" ? "signin" : "signup"));
                  setShowPasswordAuth(false);
                  setAuthNotice("");
                  setError("");
                }}
              >
                {authMode === "signup" ? "Sign in" : "Create one"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default App;
