import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import pluginSource from "../plugin/robolua-plugin.lua?raw";

const PRODUCT_NAME = "Zest";
const PRODUCT_FULL_NAME = "Zest Studio";
const STORAGE_KEY = "zest-studio-local-v2";
const SUPABASE_CLIENT_CACHE = new Map();
const LEGACY_STORAGE_KEYS = [
  "zest-studio-local-v1",
  "robolua-studio-config-v3",
  "robolua-studio-config-v2",
  "robolua-studio-config-v1",
];
const PAIR_CODE_LENGTH = 16;
const PLUGIN_FOLDER_HINT = "Windows: %LocalAppData%\\Roblox\\Plugins";

const LOCAL_MODEL_CATALOG = [
  {
    key: "zest/starter-builder",
    label: "Zest Starter",
    providerLabel: "Built-in",
    creditCost: 0,
    enabled: true,
    freeStarter: true,
    summary: "No key needed. Good for proving the whole site-to-Studio loop first.",
  },
  {
    key: "groq/openai-gpt-oss-20b",
    label: "GPT OSS 20B",
    providerLabel: "Groq",
    creditCost: 0,
    enabled: true,
    freeStarter: true,
    summary: "Free-friendly Groq starter for better planning once you add a key.",
  },
  {
    key: "groq/llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    providerLabel: "Groq",
    creditCost: 0,
    enabled: true,
    freeStarter: true,
    summary: "Fast general-purpose generation for common mechanics and UI.",
  },
  {
    key: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    providerLabel: "Google",
    creditCost: 1,
    enabled: true,
    freeStarter: true,
    summary: "Good fast fallback when Gemini is configured.",
  },
  {
    key: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    providerLabel: "Anthropic",
    creditCost: 3,
    enabled: true,
    freeStarter: false,
    summary: "Better for larger and more exact system generation.",
  },
  {
    key: "anthropic/claude-opus-4-1",
    label: "Claude Opus 4.1",
    providerLabel: "Anthropic",
    creditCost: 6,
    enabled: true,
    freeStarter: false,
    summary: "Heavy reasoning for bigger project architecture.",
  },
  {
    key: "openai/gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    providerLabel: "OpenAI",
    creditCost: 1,
    enabled: true,
    freeStarter: false,
    summary: "Quick scaffolding and quick follow-up iterations.",
  },
  {
    key: "moonshot/kimi-k2.5",
    label: "Kimi K2.5",
    providerLabel: "Moonshot",
    creditCost: 2,
    enabled: true,
    freeStarter: false,
    summary: "Strong OpenAI-compatible coding model when configured.",
  },
];

const PACK_LIBRARY = [
  {
    id: "inventory-ui",
    name: "Inventory UI",
    description: "Slots, inspect cards, rarity borders, equip states, and hotbar structure.",
  },
  {
    id: "economy-core",
    name: "Economy Core",
    description: "Coins, shop rows, bundles, purchase states, and reward pacing.",
  },
  {
    id: "round-director",
    name: "Round Director",
    description: "Lobby timers, intermission loops, teleports, and round flow.",
  },
  {
    id: "combat-kit",
    name: "Combat Kit",
    description: "Hitboxes, cooldowns, remotes, combo flow, and impact feedback.",
  },
  {
    id: "rng-cards",
    name: "RNG Cards",
    description: "Weighted rarity rolls, pity logic, reveal cards, and collection loops.",
  },
  {
    id: "datastore-safe",
    name: "Save Layer",
    description: "Profile schemas, retry-safe saves, rollback-friendly structure, and sessions.",
  },
  {
    id: "monster-ai",
    name: "Monster AI",
    description: "Simple pursuit, attack loops, aggro checks, and enemy logic.",
  },
  {
    id: "housing-plots",
    name: "Plot Builder",
    description: "Claimable plots, placement validation, permissions, and ownership loops.",
  },
];

const PROMPT_SUGGESTIONS = [
  "Create a premium inventory UI with rarity borders, hover detail, and equip buttons.",
  "Build a round survival system with lobby waiting, intermission, and win rewards.",
  "Make a shop UI with bundles, developer products, and a balance display.",
  "Create daily quests with progress bars, claims, and simple save handling.",
];

const BUILD_STAGE_SHORTCUTS = [
  {
    label: "Inventory UI",
    prompt: PROMPT_SUGGESTIONS[0],
  },
  {
    label: "Round Survival",
    prompt: PROMPT_SUGGESTIONS[1],
  },
  {
    label: "Shop System",
    prompt: PROMPT_SUGGESTIONS[2],
  },
  {
    label: "Daily Quests",
    prompt: PROMPT_SUGGESTIONS[3],
  },
];

const HOME_FEATURES = [
  {
    icon: "AI",
    title: "Prompt to Roblox Script",
    body: "Describe a mechanic, UI, or system in plain English. Zest generates structured Lua that your Studio plugin applies automatically.",
  },
  {
    icon: "WS",
    title: "Web-first Sign In",
    body: "Sign in with Roblox on the website first, keep your builder unlocked, then connect Studio only when you are ready.",
  },
  {
    icon: "PL",
    title: "Live Studio Sync",
    body: "The plugin checks for jobs every few seconds. Accept changes with one click or let it auto-apply.",
  },
  {
    icon: "PK",
    title: "Pack Library",
    body: "Seed the AI with context packs like Inventory UI, Combat Kit, and Save Layer so generated code fits your game.",
  },
];

const HOME_STEPS = [
  {
    num: "01",
    label: "Sign in with Roblox",
    body: "Start on the homepage and complete the official Roblox account consent flow.",
  },
  {
    num: "02",
    label: "Describe your feature",
    body: "Use the workspace composer to queue a plan for your mechanic, UI, or system.",
  },
  {
    num: "03",
    label: "Pair Studio and apply",
    body: "Install the plugin, paste your pair code, and let Studio pull the job into your game tree.",
  },
];

const WORKSPACE_DRAWERS = [
  {
    id: "library",
    label: "Systems",
    title: "System Library",
    subtitle: "Open system families only when you need them, then drop back into the main build canvas.",
  },
  {
    id: "studio",
    label: "Studio",
    title: "Studio Setup",
    subtitle: "Install the plugin, connect Roblox Studio, and keep this workspace in sync.",
  },
  {
    id: "jobs",
    label: "Jobs",
    title: "Recent Jobs",
    subtitle: "Review generated work without turning the main workspace into a full dashboard.",
  },
  {
    id: "settings",
    label: "Settings",
    title: "Workspace Settings",
    subtitle: "Keep project details and advanced connection options tucked away until you need them.",
  },
];

const BUILD_STAGE_PREVIEWS = [
  {
    id: "inventory",
    eyebrow: "Inventory UI",
    title: "rarity borders",
  },
  {
    id: "combat",
    eyebrow: "Combat Loop",
    title: "wave pacing",
  },
  {
    id: "economy",
    eyebrow: "Economy Core",
    title: "shop bundles",
  },
  {
    id: "rng",
    eyebrow: "RNG Cards",
    title: "reveal flow",
  },
];

const PACK_COLLECTIONS = [
  {
    id: "inventory-suite",
    name: "Inventory Systems",
    blurb: "Menus, cards, rarity, shops, and the reward loop around them.",
    packIds: ["inventory-ui", "rng-cards", "economy-core", "datastore-safe"],
    promptIdeas: [
      "Create a card inventory with rarity borders, inspect states, and equip slots.",
      "Build an RNG reveal flow with pity, duplicate conversion, and collection progress.",
    ],
  },
  {
    id: "combat-suite",
    name: "Combat Systems",
    blurb: "Movement pressure, enemy behavior, hit confirmation, and survival pacing.",
    packIds: ["combat-kit", "monster-ai", "round-director"],
    promptIdeas: [
      "Make a wave combat loop with enemy spawns, cooldowns, and hit feedback.",
      "Create a boss arena with aggro checks, attack telegraphs, and victory rewards.",
    ],
  },
  {
    id: "world-suite",
    name: "World & Progression",
    blurb: "Plots, rounds, ownership, and the save structure behind long-term progress.",
    packIds: ["housing-plots", "round-director", "datastore-safe"],
    promptIdeas: [
      "Build a claimable plot system with permissions, placement limits, and save support.",
      "Create a survival loop with lobby, round states, checkpoints, and persistent rewards.",
    ],
  },
];

const ONBOARDING_OPTIONS = [
  {
    id: "builder",
    title: "I know what I'm building",
    body: "I already have a feature or idea and want to start prototyping right away.",
    badge: "Stay focused",
  },
  {
    id: "exploring",
    title: "Still figuring it out",
    body: "I want starter ideas and room to explore before locking a direction.",
    badge: "Exploring",
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
        <div className="fatal-shell">
          <div className="fatal-card">
            <div className="fatal-logo">{PRODUCT_NAME}</div>
            <h1>Something broke in the workspace.</h1>
            <p>Reload the page and try again.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function createWorkspaceToken() {
  return (
    globalThis.crypto?.randomUUID?.().replaceAll("-", "") ||
    Math.random().toString(36).slice(2, 22)
  );
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
    studioAuth: null,
    onboardingByUser: {},
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
          activeProjectId:
            saved.activeProjectId || saved.projects[0]?.id || fallback.activeProjectId,
          studioAuth: saved.studioAuth || fallback.studioAuth,
          onboardingByUser:
            saved.onboardingByUser && typeof saved.onboardingByUser === "object"
              ? saved.onboardingByUser
              : fallback.onboardingByUser,
        };
      }
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
    authProviders: {},
  };
}

function functionUrl(baseUrl, functionName) {
  return `${baseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`;
}

function getBrowserSupabaseClient(url, anonKey) {
  const cacheKey = `${url}::${anonKey}`;
  if (!SUPABASE_CLIENT_CACHE.has(cacheKey)) {
    SUPABASE_CLIENT_CACHE.set(
      cacheKey,
      createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          flowType: "pkce",
        },
      }),
    );
  }

  return SUPABASE_CLIENT_CACHE.get(cacheKey);
}

async function callEdgeFunction(baseUrl, anonKey, functionName, body) {
  const response = await fetch(functionUrl(baseUrl, functionName), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
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
      return "Claimed";
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
    return `${operation.script_type} · ${operation.name}`;
  }
  if (operation.type === "ensure_instance") {
    return `${operation.class_name} · ${operation.name}`;
  }
  if (operation.type === "delete_instance") {
    return `Delete · ${operation.path}`;
  }
  return operation.description || operation.type || "Unknown operation";
}

function normalizeStudioAuth(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const userId = Number(value.userId ?? value.studio_user_id ?? 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    return null;
  }
  const username = String(value.username ?? value.studio_username ?? "").trim();
  const displayName =
    String(value.displayName ?? value.studio_display_name ?? username).trim() || username;
  const authorizedAt = String(value.authorizedAt ?? value.studio_authorized_at ?? "").trim();
  return {
    userId,
    username,
    displayName,
    authorizedAt,
  };
}

function normalizeRobloxProfile(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata
      : {};

  const displayName =
    [
      metadata.preferred_username,
      metadata.display_name,
      metadata.name,
      metadata.full_name,
      metadata.user_name,
      metadata.nickname,
      typeof user.email === "string" && user.email.includes("@")
        ? user.email.split("@")[0]
        : "",
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "Roblox creator";

  const username =
    [
      metadata.preferred_username,
      metadata.user_name,
      metadata.nickname,
      metadata.name,
      displayName,
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || displayName;

  const avatarUrl =
    [metadata.avatar_url, metadata.picture, metadata.profile_image]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";

  const profileUrl =
    [metadata.profile, metadata.profile_url, metadata.website]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";

  return {
    displayName,
    username,
    avatarUrl,
    profileUrl,
  };
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

function AuthModal({ open, onClose, onContinue, providerReady, pending, error }) {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay-shell" role="dialog" aria-modal="true" aria-label="Sign in with Roblox">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="auth-modal">
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Close sign in">
          x
        </button>
        <div className="auth-modal-card">
          <div className="auth-modal-copy">
            <h2>Welcome to {PRODUCT_NAME}</h2>
            <p>Let&apos;s set up your account.</p>
            <button
              className="primary-button auth-modal-button"
              type="button"
              onClick={onContinue}
              disabled={!providerReady || pending}
            >
              {pending ? "Redirecting..." : "Sign in with Roblox"}
            </button>
            <ul className="auth-modal-list">
              <li>Signing in takes you to the official Roblox website.</li>
              <li>We only ask for your basic Roblox profile identity.</li>
              <li>The Studio plugin comes after login, not before it.</li>
            </ul>
            {!providerReady ? (
              <div className="auth-modal-warning">
                Roblox sign-in is not configured on this deployment yet. Add the Roblox OAuth app in Supabase first.
              </div>
            ) : null}
            {error ? <div className="auth-modal-error">{error}</div> : null}
          </div>
          <div className="auth-modal-preview">
            <div className="auth-preview-brand">
              <span className="brand-dot" />
              <span>{PRODUCT_FULL_NAME}</span>
            </div>
            <div className="auth-preview-lock">Official Roblox redirect</div>
            <div className="auth-preview-user">Roblox account</div>
            <div className="auth-preview-panel">
              <strong>Your personal profile</strong>
              <div className="auth-preview-row">
                <span>Read User ID</span>
                <span>Low risk</span>
              </div>
              <div className="auth-preview-row">
                <span>Read User Profile</span>
                <span>Low risk</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingModal({ open, onClose, onSelect }) {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay-shell" role="dialog" aria-modal="true" aria-label="Choose your setup">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="onboarding-modal">
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Close onboarding">
          x
        </button>
        <div className="onboarding-copy">
          <span className="onboarding-step">required · step 1 of 1</span>
          <h2>Which best describes you now?</h2>
        </div>
        <div className="onboarding-grid">
          {ONBOARDING_OPTIONS.map((option) => (
            <button
              className="onboarding-card"
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
            >
              <strong>{option.title}</strong>
              <p>{option.body}</p>
              <span>{option.badge}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomePage({
  onPrimaryAction,
  onOpenAuth,
  onDownloadPlugin,
  onCopyPairCode,
  onCopyPluginPath,
  workspaceName,
  pairCode,
  pluginOnline,
  studioAuth,
  authProfile,
  isAuthenticated,
  hasCompletedOnboarding,
}) {
  const pageRef = useRef(null);
  const authPanelRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof window === "undefined") {
      return undefined;
    }

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
        if (frame) {
          return;
        }
        frame = window.requestAnimationFrame(updateScrollMotion);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });

      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }
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
        if (frame) {
          window.cancelAnimationFrame(frame);
        }
        observer?.disconnect();
        page.style.removeProperty("--home-scroll-progress");
      };
    }

    revealTargets.forEach((target) => target.classList.add("is-visible"));

    return () => {
      page.style.removeProperty("--home-scroll-progress");
    };
  }, []);

  function handlePrimaryAction() {
    if (isAuthenticated) {
      onPrimaryAction();
      return;
    }

    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
  }

  return (
    <div className="home-page" ref={pageRef}>
      <nav className="home-nav">
        <div className="home-nav-inner">
          <BrandLockup />
          <button
            className="primary-button home-nav-cta"
            type="button"
            onClick={handlePrimaryAction}
            data-label={isAuthenticated ? (hasCompletedOnboarding ? "Dashboard" : "Finish setup") : "Sign up"}
            aria-label={isAuthenticated ? (hasCompletedOnboarding ? "Dashboard" : "Finish setup") : "Sign up"}
          >
            Sign up
          </button>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-progress-line" aria-hidden="true" />
        <div className="home-hero-eyebrow motion-reveal" data-reveal>
          Sign in with Roblox · Build in Studio
        </div>
        <h1
          className="home-hero-headline motion-reveal"
          data-reveal
          style={{ "--reveal-delay": "80ms" }}
        >
          The easiest AI builder
          <br />
          <span className="home-hero-accent">for Roblox Studio.</span>
        </h1>
        <p
          className="home-hero-sub motion-reveal"
          data-reveal
          style={{ "--reveal-delay": "140ms" }}
        >
          Sign in with Roblox on the web, choose your workspace, then let the plugin
          sync generated systems straight into Studio.
        </p>
        <div
          className="home-hero-actions motion-reveal"
          data-reveal
          style={{ "--reveal-delay": "200ms" }}
        >
          <button
            className="primary-button home-hero-btn"
            type="button"
            onClick={handlePrimaryAction}
            data-label={isAuthenticated ? (hasCompletedOnboarding ? "Open workspace" : "Continue setup") : "Start prototyping"}
            aria-label={isAuthenticated ? (hasCompletedOnboarding ? "Open workspace" : "Continue setup") : "Start prototyping"}
          >
            Start prototyping
          </button>
          <span className="home-hero-note home-hero-note-dynamic">
            {isAuthenticated
              ? `Signed in as @${authProfile?.username || authProfile?.displayName || "creator"}`
              : "Official Roblox redirect · Plugin setup comes after login"}
          </span>
          <span className="home-hero-note">Free models available · Install the plugin after login</span>
        </div>

        <div
          className="home-terminal motion-reveal"
          data-reveal
          style={{ "--reveal-delay": "260ms" }}
        >
          <div className="home-terminal-bar">
            <span className="home-terminal-dot" style={{ background: "#ff5f56" }} />
            <span className="home-terminal-dot" style={{ background: "#ffbd2e" }} />
            <span className="home-terminal-dot" style={{ background: "#27c93f" }} />
            <span className="home-terminal-title">{PRODUCT_FULL_NAME} · Workspace</span>
          </div>
          <div className="home-terminal-body">
            <div className="home-terminal-msg home-terminal-msg-user">
              <span className="home-terminal-tag">You</span>
              <p>Create a round director with lobby countdown, teleport, and win reward screen.</p>
            </div>
            <div className="home-terminal-msg home-terminal-msg-ai">
              <span className="home-terminal-tag" style={{ color: "#c7ef5d" }}>
                {PRODUCT_NAME}
              </span>
              <p>Planning round flow system... generating 4 scripts and 2 RemoteEvents. Job queued and waiting for Studio sync.</p>
            </div>
            <div className="home-terminal-status">
              <span className="status-dot status-dot-live" />
              Website account ready · Studio sync optional until you pair
            </div>
          </div>
        </div>
      </section>

      <section className="home-auth-band">
        <div className="home-section-inner">
          <div className="home-auth-card motion-reveal" data-reveal ref={authPanelRef}>
            <div className="home-auth-copy">
              <span
                className={`home-auth-status ${
                  isAuthenticated
                    ? "home-auth-status-live"
                    : pluginOnline
                      ? "home-auth-status-waiting"
                      : ""
                }`}
              >
                {isAuthenticated ? "Signed in with Roblox" : pluginOnline ? "Studio connected" : "Waiting for login"}
              </span>
              <h2>{isAuthenticated ? "Your Roblox account is ready." : "Sign in with Roblox before you start building."}</h2>
              <p>
                {isAuthenticated
                  ? `You are signed in as ${authProfile?.displayName || authProfile?.username || "your Roblox account"}. Next, install the plugin, pair ${workspaceName}, and start syncing jobs into Studio.`
                  : "Use the homepage sign-in to go through Roblox's official consent screen. After that, you can install the plugin and connect Studio to this workspace."}
              </p>

              {isAuthenticated ? (
                <div className="home-auth-user">
                  <strong>@{authProfile?.username || authProfile?.displayName || "roblox-user"}</strong>
                  <span>{authProfile?.profileUrl ? authProfile.profileUrl : "Basic Roblox profile granted"}</span>
                  <span>
                    {studioAuth?.authorizedAt
                      ? `Studio paired ${formatDateTime(studioAuth.authorizedAt)}`
                      : pluginOnline
                        ? "Studio is online for this workspace"
                        : "Studio not paired yet"}
                  </span>
                </div>
              ) : (
                <div className="home-auth-action-row">
                  <button className="primary-button home-auth-enter" type="button" onClick={onOpenAuth}>
                    Sign in with Roblox
                  </button>
                  <button className="secondary-button" type="button" onClick={onDownloadPlugin}>
                    Download Plugin
                  </button>
                </div>
              )}

              <div className="home-auth-action-row">
                {isAuthenticated ? (
                  <button className="primary-button home-auth-enter" type="button" onClick={onPrimaryAction}>
                    {hasCompletedOnboarding ? "Continue to Workspace" : "Finish setup"}
                  </button>
                ) : null}
                {isAuthenticated ? (
                  <button className="secondary-button" type="button" onClick={() => onCopyPairCode(pairCode)}>
                    Copy Pair Code
                  </button>
                ) : null}
                <button className="text-button" type="button" onClick={onCopyPluginPath}>
                  Copy plugin folder path
                </button>
              </div>
            </div>

            <div className="home-auth-steps">
              <div className="home-auth-step">
                <span>01</span>
                <strong>Sign in with Roblox</strong>
                <p>Use the homepage button and complete the official Roblox consent flow before you open the builder.</p>
              </div>
              <div className="home-auth-step">
                <span>02</span>
                <strong>Install the plugin</strong>
                <p>Drop the Zest plugin into your Roblox Plugins folder and restart Studio once.</p>
              </div>
              <div className="home-auth-step">
                <span>03</span>
                <strong>Paste this pair code</strong>
                <div className="home-auth-pair">{pairCode || "PAIR-CODE"}</div>
                <p>Open the plugin inside Studio and use this code to pair {workspaceName} with the web app.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="home-section-inner">
          <h2 className="home-section-title motion-reveal" data-reveal>
            Everything you need to ship faster
          </h2>
          <div className="home-feature-grid">
            {HOME_FEATURES.map((feature, index) => (
              <div
                className="home-feature-card motion-reveal"
                data-reveal
                key={feature.title}
                style={{ "--reveal-delay": `${80 + index * 70}ms` }}
              >
                <div className="home-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-steps">
        <div className="home-section-inner">
          <h2 className="home-section-title motion-reveal" data-reveal>
            How it works
          </h2>
          <div className="home-steps-grid">
            {HOME_STEPS.map((step, index) => (
              <div
                className="home-step motion-reveal"
                data-reveal
                key={step.num}
                style={{ "--reveal-delay": `${80 + index * 90}ms` }}
              >
                <div className="home-step-num">{step.num}</div>
                <h3>{step.label}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta-band">
        <div className="home-section-inner home-cta-inner motion-reveal" data-reveal>
          <h2>{isAuthenticated ? "You are ready to build." : "Sign in first, then connect Studio."}</h2>
          <p>{isAuthenticated ? "Open the workspace, install the plugin, and start sending systems into Roblox Studio." : "The website account comes first. Studio pairing happens after you are through Roblox sign-in."}</p>
          <button
            className="primary-button home-hero-btn"
            type="button"
            onClick={handlePrimaryAction}
            data-label={isAuthenticated ? (hasCompletedOnboarding ? "Open Zest Studio" : "Continue setup") : "Sign up with Roblox"}
            aria-label={isAuthenticated ? (hasCompletedOnboarding ? "Open Zest Studio" : "Continue setup") : "Sign up with Roblox"}
          >
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authSession, setAuthSession] = useState(null);
  const [workspacePane, setWorkspacePane] = useState("build");
  const [selectedCollectionId, setSelectedCollectionId] = useState(PACK_COLLECTIONS[0].id);
  const textareaRef = useRef(null);

  const activeProject = app.projects.find((project) => project.id === app.activeProjectId) || app.projects[0];
  const supabase = useMemo(() => {
    if (!app.supabaseUrl.trim() || !app.supabaseAnonKey.trim()) {
      return null;
    }

    return getBrowserSupabaseClient(app.supabaseUrl.trim(), app.supabaseAnonKey.trim());
  }, [app.supabaseAnonKey, app.supabaseUrl]);
  const availableModels =
    workspaceState.modelCatalog?.length ? workspaceState.modelCatalog : LOCAL_MODEL_CATALOG;
  const selectedModel =
    availableModels.find((model) => model.key === activeProject?.modelKey) || availableModels[0];
  const selectedPacks = useMemo(
    () => PACK_LIBRARY.filter((pack) => activeProject?.selectedPacks?.includes(pack.id)),
    [activeProject],
  );
  const orderedMessages = useMemo(
    () => [...(workspaceState.messages || [])].reverse(),
    [workspaceState.messages],
  );
  const recentJobs = workspaceState.jobs || [];
  const latestJob = recentJobs[0] || null;
  const pluginPairCode = useMemo(
    () => formatPairCode(pairCodeFromWorkspaceToken(activeProject?.workspaceToken || "")),
    [activeProject?.workspaceToken],
  );
  const studioAuth = useMemo(
    () => normalizeStudioAuth(workspaceState.workspace) || normalizeStudioAuth(app.studioAuth),
    [workspaceState.workspace, app.studioAuth],
  );
  const authUser = authSession?.user || null;
  const authProfile = useMemo(() => normalizeRobloxProfile(authUser), [authUser]);
  const isAuthenticated = Boolean(authUser?.id);
  const robloxProvider = workspaceState.authProviders?.roblox || null;
  const isRobloxProviderReady = Boolean(robloxProvider?.configured && robloxProvider?.enabled);
  const onboardingState = authUser?.id ? app.onboardingByUser?.[authUser.id] || null : null;
  const hasCompletedOnboarding = Boolean(onboardingState?.path);
  const activeDrawer =
    WORKSPACE_DRAWERS.find((pane) => pane.id === workspacePane) || null;
  const activeCollection =
    PACK_COLLECTIONS.find((collection) => collection.id === selectedCollectionId) ||
    PACK_COLLECTIONS[0];
  const activeCollectionPacks = useMemo(
    () =>
      activeCollection.packIds
        .map((packId) => PACK_LIBRARY.find((pack) => pack.id === packId))
        .filter(Boolean),
    [activeCollection],
  );
  const loadedCollections = useMemo(
    () =>
      PACK_COLLECTIONS.filter((collection) =>
        collection.packIds.some((packId) => activeProject?.selectedPacks?.includes(packId)),
      ),
    [activeProject],
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

  useEffect(() => {
    document.title = PRODUCT_FULL_NAME;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  }, [app]);

  useEffect(() => {
    if (view === "workspace" && (!isAuthenticated || !hasCompletedOnboarding)) {
      setView("home");
    }
  }, [hasCompletedOnboarding, isAuthenticated, view]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      setAuthSession(null);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setAuthSession(data.session || null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setAuthSession(session || null);
      setAuthReady(true);
      setAuthPending(false);
      setAuthError("");
      if (session) {
        setAuthModalOpen(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (authReady && isAuthenticated && !hasCompletedOnboarding) {
      setOnboardingOpen(true);
    }
  }, [authReady, hasCompletedOnboarding, isAuthenticated]);

  function updateApp(key, value) {
    setApp((current) => ({ ...current, [key]: value }));
  }

  function updateActiveProject(patch) {
    setApp((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId ? { ...project, ...patch } : project,
      ),
    }));
  }

  function saveOnboardingChoice(choice) {
    if (!authUser?.id) {
      return;
    }

    setApp((current) => ({
      ...current,
      onboardingByUser: {
        ...(current.onboardingByUser || {}),
        [authUser.id]: {
          path: choice.id,
          title: choice.title,
          completedAt: new Date().toISOString(),
        },
      },
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

  function syncStudioAuthFromServer(workspace) {
    const nextStudioAuth = normalizeStudioAuth(workspace);
    if (!nextStudioAuth) {
      return;
    }

    setApp((current) => {
      const existing = normalizeStudioAuth(current.studioAuth);
      if (
        existing?.userId === nextStudioAuth.userId &&
        existing?.username === nextStudioAuth.username &&
        existing?.displayName === nextStudioAuth.displayName &&
        existing?.authorizedAt === nextStudioAuth.authorizedAt
      ) {
        return current;
      }

      return {
        ...current,
        studioAuth: nextStudioAuth,
      };
    });
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
        setError("Missing Supabase settings or workspace token.");
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
      syncStudioAuthFromServer(payload.workspace);
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

    refreshWorkspace({ ensure: true, silent: true });
    const pollMs = Math.max(Number(app.pollingSeconds) || 4, 2) * 1000;
    const interval = window.setInterval(
      () => refreshWorkspace({ ensure: false, silent: true }),
      pollMs,
    );
    return () => window.clearInterval(interval);
  }, [
    activeProject?.id,
    activeProject?.workspaceToken,
    activeProject?.modelKey,
    app.pollingSeconds,
    app.supabaseAnonKey,
    app.supabaseUrl,
  ]);

  async function saveWorkspace() {
    await refreshWorkspace({ ensure: true, silent: false });
  }

  async function submitPrompt(event) {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Write a prompt first.");
      return;
    }
    if (!activeProject?.workspaceToken) {
      setError("Create a workspace first.");
      return;
    }
    if (!isAuthenticated) {
      setError("Sign in with Roblox from the homepage first.");
      return;
    }

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
      syncStudioAuthFromServer(payload.workspace?.workspace);
      setPrompt("");
      setLastSyncedAt(new Date().toISOString());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTextareaKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitPrompt(event);
    }
  }

  function addProject() {
    const project = createDefaultProject({ name: `Workspace ${app.projects.length + 1}` });
    setApp((current) => ({
      ...current,
      projects: [project, ...current.projects],
      activeProjectId: project.id,
    }));
    setWorkspacePane("build");
    setWorkspaceState(emptyWorkspaceState());
    setPrompt("");
    setError("");
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
        current.activeProjectId === projectId
          ? remaining[0]?.id || current.activeProjectId
          : current.activeProjectId,
    }));
  }

  function togglePack(packId) {
    if (!activeProject) {
      return;
    }
    const current = activeProject.selectedPacks || [];
    const next = current.includes(packId)
      ? current.filter((id) => id !== packId)
      : [...current, packId];
    updateActiveProject({ selectedPacks: next });
  }

  function openCollection(collectionId) {
    setSelectedCollectionId(collectionId);
    setWorkspacePane("library");
  }

  function toggleCollection(collectionId) {
    const collection = PACK_COLLECTIONS.find((entry) => entry.id === collectionId);
    if (!collection || !activeProject) {
      return;
    }

    const current = activeProject.selectedPacks || [];
    const hasWholeCollection = collection.packIds.every((packId) => current.includes(packId));
    const next = hasWholeCollection
      ? current.filter((packId) => !collection.packIds.includes(packId))
      : [...new Set([...current, ...collection.packIds])];

    updateActiveProject({ selectedPacks: next });
  }

  function closeWorkspacePane() {
    setWorkspacePane("build");
  }

  async function startRobloxSignIn() {
    if (!supabase) {
      setAuthError("Supabase settings are missing on this deployment.");
      return;
    }

    if (!isRobloxProviderReady) {
      setAuthError("Roblox sign-in is not configured yet. Add the Roblox OAuth app in Supabase first.");
      return;
    }

    setAuthPending(true);
    setAuthError("");
    const { error: nextError } = await supabase.auth.signInWithOAuth({
      provider: "custom:roblox",
      options: {
        redirectTo: window.location.origin,
        scopes: "openid profile",
      },
    });

    if (nextError) {
      setAuthPending(false);
      setAuthError(nextError.message);
    }
  }

  async function signOutRoblox() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setView("home");
    setOnboardingOpen(false);
  }

  function handlePrimaryHomeAction() {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    if (!hasCompletedOnboarding) {
      setOnboardingOpen(true);
      return;
    }

    setWorkspacePane("build");
    setView("workspace");
  }

  function renderComposer({ centered = false } = {}) {
    return (
      <div className={`composer-panel ${centered ? "composer-panel-centered" : "composer-panel-docked"}`}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        {copyFeedback ? <div className="notice notice-success">{copyFeedback}</div> : null}

        <div className={`workspace-action-row ${centered ? "workspace-action-row-centered" : ""}`}>
          {WORKSPACE_DRAWERS.map((pane) => (
            <button
              className={`workspace-action-chip ${workspacePane === pane.id ? "workspace-action-chip-active" : ""}`}
              key={pane.id}
              type="button"
              onClick={() => setWorkspacePane(pane.id)}
            >
              {pane.label}
            </button>
          ))}
        </div>

        <form className="composer-form" onSubmit={submitPrompt}>
          <div className={`composer-shell ${centered ? "composer-shell-centered" : ""}`}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Describe a mechanic, UI, or system you want Zest to build in Roblox Studio..."
              rows={centered ? 4 : 3}
            />
            <div className="composer-footer composer-footer-clean">
              <div className="composer-meta">
                <span className="composer-pill">{selectedModel?.label || "No model"}</span>
                <span className="composer-pill">{isAuthenticated ? "roblox" : workspaceState.accessMode || "guest"}</span>
                <span className="composer-pill">{workspaceState.pluginOnline ? "Studio ready" : "Studio waiting"}</span>
              </div>
              <div className="composer-send-group">
                <span className="composer-hint">Ctrl+Enter to send</span>
                <button className="primary-button composer-send-button" type="submit" disabled={isSubmitting || !isAuthenticated}>
                  {isSubmitting ? "Generating..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  function renderWorkspaceDrawer() {
    if (workspacePane === "build" || !activeDrawer) {
      return null;
    }

    return (
      <>
        <button
          aria-label="Close panel"
          className="workspace-drawer-scrim"
          type="button"
          onClick={closeWorkspacePane}
        />
        <aside className="workspace-drawer">
          <div className="workspace-drawer-head">
            <div>
              <span className="pane-eyebrow">{activeDrawer.label}</span>
              <h2>{activeDrawer.title}</h2>
              <p>{activeDrawer.subtitle}</p>
            </div>
            <button className="drawer-close-button" type="button" onClick={closeWorkspacePane}>
              x
            </button>
          </div>

          <div className="workspace-drawer-body">
            {workspacePane === "library" ? (
              <div className="drawer-stack">
                <div className="drawer-chip-row">
                  {PACK_COLLECTIONS.map((collection) => {
                    const loaded = collection.packIds.filter((packId) =>
                      activeProject?.selectedPacks?.includes(packId),
                    ).length;
                    return (
                      <button
                        className={`drawer-chip ${collection.id === activeCollection.id ? "drawer-chip-active" : ""}`}
                        key={collection.id}
                        type="button"
                        onClick={() => setSelectedCollectionId(collection.id)}
                      >
                        {collection.name}
                        <span>{loaded}</span>
                      </button>
                    );
                  })}
                </div>

                <section className="drawer-card">
                  <div className="drawer-card-head">
                    <div>
                      <span className="sidebar-label">Open collection</span>
                      <h3>{activeCollection.name}</h3>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => toggleCollection(activeCollection.id)}
                    >
                      {activeCollection.packIds.every((packId) => activeProject?.selectedPacks?.includes(packId))
                        ? "Unload"
                        : "Load"}
                    </button>
                  </div>
                  <p className="drawer-copy">{activeCollection.blurb}</p>
                </section>

                <div className="drawer-pack-list">
                  {activeCollectionPacks.map((pack) => {
                    const active = activeProject?.selectedPacks?.includes(pack.id);
                    return (
                      <label className={`pack-item ${active ? "pack-item-active" : ""}`} key={pack.id}>
                        <input checked={active} type="checkbox" onChange={() => togglePack(pack.id)} />
                        <div>
                          <strong>{pack.name}</strong>
                          <span>{pack.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <section className="drawer-card">
                  <div className="drawer-card-head">
                    <div>
                      <span className="sidebar-label">Starter prompts</span>
                      <h3>Jump back into Build with one click.</h3>
                    </div>
                  </div>
                  <div className="drawer-suggestion-list">
                    {activeCollection.promptIdeas.map((idea) => (
                      <button
                        className="suggestion-card suggestion-card-compact"
                        key={idea}
                        type="button"
                        onClick={() => {
                          setPrompt(idea);
                          closeWorkspacePane();
                          window.setTimeout(() => textareaRef.current?.focus(), 0);
                        }}
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            ) : workspacePane === "studio" ? (
              <div className="drawer-stack">
                <section className="drawer-card">
                  <span className="sidebar-label">Step 01</span>
                  <h3>Install the plugin</h3>
                  <p className="drawer-copy">Download the plugin, move it into the Roblox plugins folder, then restart Studio once.</p>
                  <div className="studio-action-row">
                    <button className="primary-button" type="button" onClick={downloadPluginFile}>
                      Download Plugin
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => copyText(PLUGIN_FOLDER_HINT, "Plugins folder hint")}
                    >
                      Copy plugin path
                    </button>
                  </div>
                </section>

                <section className="drawer-card">
                  <span className="sidebar-label">Step 02</span>
                  <h3>Pair this workspace</h3>
                  <div className="pair-code">{pluginPairCode || "NO-CODE-YET"}</div>
                  <p className="drawer-copy">Paste this code into the plugin so Studio knows which workspace should receive jobs.</p>
                  <button className="secondary-button" type="button" onClick={() => copyText(pluginPairCode, "Pair code")}>
                    Copy pair code
                  </button>
                </section>

                <section className="drawer-card">
                  <span className="sidebar-label">Step 03</span>
                  <h3>Check connection</h3>
                  <div className="status-line">
                    <span className={`status-dot ${workspaceState.pluginOnline ? "status-dot-live" : ""}`} />
                    <span>{workspaceState.pluginOnline ? "Studio connected" : "Studio waiting"}</span>
                  </div>
                  <p className="drawer-copy">
                    {workspaceState.pluginOnline
                      ? "This workspace is live and Roblox Studio is already polling for jobs."
                      : "Once the plugin is connected, Studio will start claiming jobs and reporting results back here."}
                  </p>
                  {studioAuth ? (
                    <div className="studio-identity-card">
                      <strong>@{studioAuth.username || studioAuth.displayName || "creator"}</strong>
                      <span>Paired from Roblox Studio</span>
                    </div>
                  ) : null}
                </section>
              </div>
            ) : workspacePane === "jobs" ? (
              recentJobs.length ? (
                <div className="job-list job-list-expanded">
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
                          {job.operations.map((operation, index) => (
                            <span className="job-operation-pill" key={`${job.id}-${index}`}>
                              {summarizeOperation(operation)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-small">No jobs yet.</div>
              )
            ) : (
              <div className="drawer-stack">
                <section className="drawer-card">
                  <div className="drawer-card-head">
                    <div>
                      <span className="sidebar-label">Workspace basics</span>
                      <h3>Keep the main screen clean.</h3>
                    </div>
                    <span>{lastSyncedAt ? `Synced ${formatDateTime(lastSyncedAt)}` : "Not synced"}</span>
                  </div>
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={activeProject?.name || ""}
                      onChange={(event) => updateActiveProject({ name: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      rows={3}
                      value={activeProject?.description || ""}
                      onChange={(event) => updateActiveProject({ description: event.target.value })}
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
                </section>

                <section className="drawer-card">
                  <div className="drawer-card-head">
                    <div>
                      <span className="sidebar-label">Loaded systems</span>
                      <h3>{selectedPacks.length ? `${selectedPacks.length} systems in this workspace` : "No systems loaded yet"}</h3>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setWorkspacePane("library")}>
                      Open Systems
                    </button>
                  </div>
                  <div className="selected-pack-stack">
                    {selectedPacks.length ? (
                      selectedPacks.map((pack) => (
                        <button
                          className="selected-pack-chip"
                          key={pack.id}
                          type="button"
                          onClick={() => {
                            const matchingCollection = PACK_COLLECTIONS.find((collection) =>
                              collection.packIds.includes(pack.id),
                            );
                            if (matchingCollection) {
                              setSelectedCollectionId(matchingCollection.id);
                              setWorkspacePane("library");
                            }
                          }}
                        >
                          <strong>{pack.name}</strong>
                          <span>{pack.description}</span>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state-small">Open Systems to load packs like Inventory UI, RNG Cards, or Save Layer.</div>
                    )}
                  </div>
                </section>

                <section className="drawer-card">
                  <span className="sidebar-label">Advanced</span>
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
                      rows={4}
                      value={app.supabaseAnonKey}
                      onChange={(event) => updateApp("supabaseAnonKey", event.target.value)}
                      placeholder="Publishable or anon key"
                    />
                  </label>
                  <label className="field">
                    <span>Workspace token</span>
                    <input value={activeProject?.workspaceToken || ""} readOnly />
                  </label>
                  <label className="field">
                    <span>Advanced plugin payload</span>
                    <textarea rows={8} readOnly value={pluginSnippet} />
                  </label>
                  <div className="field-action-row">
                    <button className="secondary-button" type="button" onClick={() => copyText(pluginSnippet, "Advanced payload")}>
                      Copy advanced payload
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>
      </>
    );
  }

  if (view === "home") {
    return (
      <>
        <HomePage
          onPrimaryAction={handlePrimaryHomeAction}
          onOpenAuth={() => setAuthModalOpen(true)}
          onDownloadPlugin={downloadPluginFile}
          onCopyPairCode={(value) => copyText(value, "Pair code")}
          onCopyPluginPath={() => copyText(PLUGIN_FOLDER_HINT, "Plugins folder hint")}
          workspaceName={activeProject?.name || "Starter Workspace"}
          pairCode={pluginPairCode || "NO-CODE-YET"}
          pluginOnline={workspaceState.pluginOnline}
          studioAuth={studioAuth}
          authProfile={authProfile}
          isAuthenticated={isAuthenticated}
          hasCompletedOnboarding={hasCompletedOnboarding}
        />
        <AuthModal
          open={authModalOpen}
          onClose={() => {
            setAuthError("");
            setAuthModalOpen(false);
          }}
          onContinue={startRobloxSignIn}
          providerReady={isRobloxProviderReady}
          pending={authPending}
          error={authError}
        />
        <OnboardingModal
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onSelect={(choice) => {
            saveOnboardingChoice(choice);
            setOnboardingOpen(false);
            setWorkspacePane("build");
            setView("workspace");
          }}
        />
      </>
    );
  }

  return (
    <WorkspaceErrorBoundary>
      <div className="workspace-app workspace-app-clean">
        <aside className="sidebar sidebar-clean">
          <div className="sidebar-top">
            <button className="home-back-btn" type="button" onClick={() => setView("home")}>
              Back Home
            </button>
            <BrandLockup />
            {isAuthenticated ? (
              <div className="studio-identity-card studio-identity-card-subtle">
                <strong>@{authProfile?.username || authProfile?.displayName || "creator"}</strong>
                <span>Signed in with Roblox</span>
              </div>
            ) : null}
            <button className="primary-button new-workspace-button" type="button" onClick={addProject}>
              + New Workspace
            </button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Projects</div>
            <div className="workspace-list">
              {app.projects.map((project) => {
                const active = project.id === activeProject?.id;
                return (
                  <button
                    className={`workspace-item ${active ? "workspace-item-active" : ""}`}
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setApp((current) => ({ ...current, activeProjectId: project.id }));
                      closeWorkspacePane();
                    }}
                  >
                    <div className="workspace-item-copy">
                      <strong>{project.name}</strong>
                      <span>{project.description}</span>
                    </div>
                    {app.projects.length > 1 ? (
                      <span
                        className="workspace-item-remove"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeProject(project.id);
                        }}
                      >
                        x
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section sidebar-bottom">
            <div className="sidebar-label">Studio</div>
            <div className="sidebar-card sidebar-status-card">
              <div className="status-line">
                <span className={`status-dot ${workspaceState.pluginOnline ? "status-dot-live" : ""}`} />
                <span>{workspaceState.pluginOnline ? "Studio connected" : "Studio waiting"}</span>
              </div>
              {studioAuth ? (
                <div className="studio-identity-card studio-identity-card-subtle">
                  <strong>@{studioAuth.username || studioAuth.displayName || "creator"}</strong>
                  <span>Paired from Roblox Studio</span>
                </div>
              ) : null}
              <p className="sidebar-status-copy">
                {workspaceState.pluginOnline
                  ? "Studio is live and already polling for work from this workspace."
                  : latestJob
                    ? `${formatStatus(latestJob.status)} · ${latestJob.title}`
                    : "Leave setup tucked away until you need it, then open Studio from the build controls."}
              </p>
              <div className="sidebar-inline-actions">
                <button className="secondary-button sidebar-inline-button" type="button" onClick={() => setWorkspacePane("studio")}>
                  Open Studio
                </button>
                <button className="secondary-button sidebar-inline-button" type="button" onClick={downloadPluginFile}>
                  Download Plugin
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="main-shell main-shell-clean">
          <header className="main-header main-header-clean">
            <div className="main-header-copy">
              <span className="pane-eyebrow">Workspace</span>
              <h1>{activeProject?.name || "Workspace"}</h1>
              <p>{activeProject?.description || "Describe a mechanic, UI, or system and send it to Roblox Studio from one clean build screen."}</p>
            </div>
            <div className="main-header-actions">
              <label className="model-select-shell">
                <span>Model</span>
                <select
                  value={activeProject?.modelKey || ""}
                  onChange={(event) => updateActiveProject({ modelKey: event.target.value })}
                >
                  {availableModels.map((model) => (
                    <option disabled={!model.enabled} key={model.key} value={model.key}>
                      {model.label} · {model.providerLabel}
                      {!model.enabled ? " (setup needed)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={saveWorkspace} disabled={isRefreshing}>
                {isRefreshing ? "Syncing..." : "Save"}
              </button>
              {isAuthenticated ? (
                <button className="secondary-button" type="button" onClick={signOutRoblox}>
                  Sign out
                </button>
              ) : null}
            </div>
          </header>

          <div className="content-grid content-grid-clean">
            <section className="chat-panel chat-panel-clean">
              {orderedMessages.length ? (
                <>
                  <div className="chat-scroll chat-scroll-thread">
                    <div className="thread-shell">
                      <div className="thread-topbar">
                        <span className="chat-empty-logo thread-logo">{PRODUCT_NAME}</span>
                        <div className="thread-topbar-pills">
                          {selectedPacks.slice(0, 3).map((pack) => (
                            <button
                              className="thread-pack-pill"
                              key={pack.id}
                              type="button"
                              onClick={() => {
                                const matchingCollection = PACK_COLLECTIONS.find((collection) =>
                                  collection.packIds.includes(pack.id),
                                );
                                if (matchingCollection) {
                                  setSelectedCollectionId(matchingCollection.id);
                                  setWorkspacePane("library");
                                }
                              }}
                            >
                              {pack.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="message-list">
                        {orderedMessages.map((message) => (
                          <div
                            className={`message-row ${
                              message.role === "user" ? "message-row-user" : "message-row-assistant"
                            }`}
                            key={message.id}
                          >
                            <div className={`message-bubble message-bubble-${message.role}`}>
                              <div className="message-role">{message.role === "user" ? "You" : PRODUCT_NAME}</div>
                              <div className="message-content">{message.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {renderComposer()}
                </>
              ) : (
                <div className="chat-scroll chat-scroll-stage">
                  <div className="build-stage">
                    <div className="build-stage-canvas">
                      {BUILD_STAGE_PREVIEWS.map((preview, index) => (
                        <div className={`build-preview-card build-preview-card-${index + 1}`} key={preview.id}>
                          <span>{preview.eyebrow}</span>
                          <strong>{preview.title}</strong>
                        </div>
                      ))}

                      <div className="build-stage-copy">
                        <div className="chat-empty-logo">{PRODUCT_NAME}</div>
                        <h2>Describe the next Roblox system.</h2>
                        <p>
                          Keep the canvas clean. Open Systems, Studio, Jobs, or Settings only when you need them,
                          then come right back here to build.
                        </p>
                        <div className="build-stage-loaded">
                          {(loadedCollections.length ? loadedCollections : PACK_COLLECTIONS.slice(0, 2)).map((collection) => (
                            <button
                              className="build-stage-chip"
                              key={collection.id}
                              type="button"
                              onClick={() => openCollection(collection.id)}
                            >
                              {collection.name}
                            </button>
                          ))}
                        </div>
                        <div className="build-stage-suggestions">
                          {BUILD_STAGE_SHORTCUTS.map((shortcut) => (
                            <button
                              className="suggestion-card suggestion-card-pill"
                              key={shortcut.label}
                              type="button"
                              onClick={() => {
                                setPrompt(shortcut.prompt);
                                window.setTimeout(() => textareaRef.current?.focus(), 0);
                              }}
                            >
                              {shortcut.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {renderComposer({ centered: true })}
                  </div>
                </div>
              )}
            </section>
          </div>

          {renderWorkspaceDrawer()}
        </section>
      </div>
    </WorkspaceErrorBoundary>
  );

  return (
    <WorkspaceErrorBoundary>
      <div className="workspace-app">
        <aside className="sidebar">
          <div className="sidebar-top">
            <button className="home-back-btn" type="button" onClick={() => setView("home")}>
              Back Home
            </button>
            <BrandLockup />
            {isAuthenticated ? (
              <div className="studio-identity-card">
                <strong>@{authProfile?.username || authProfile?.displayName || "creator"}</strong>
                <span>Signed in with Roblox</span>
              </div>
            ) : null}
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
                    onClick={() => {
                      setApp((current) => ({ ...current, activeProjectId: project.id }));
                      setWorkspacePane("build");
                    }}
                  >
                    <div className="workspace-item-copy">
                      <strong>{project.name}</strong>
                      <span>{project.description}</span>
                    </div>
                    {app.projects.length > 1 ? (
                      <span
                        className="workspace-item-remove"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeProject(project.id);
                        }}
                      >
                        x
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section sidebar-bottom">
            <div className="sidebar-label">Studio</div>
            <div className="sidebar-card sidebar-status-card">
              <div className="status-line">
                <span className={`status-dot ${workspaceState.pluginOnline ? "status-dot-live" : ""}`} />
                <span>{workspaceState.pluginOnline ? "Studio connected" : "Studio waiting"}</span>
              </div>
              {studioAuth ? (
                <div className="studio-identity-card">
                  <strong>@{studioAuth.username || studioAuth.displayName || "creator"}</strong>
                  <span>Paired from Roblox Studio</span>
                </div>
              ) : null}
              <p className="sidebar-status-copy">
                {workspacePane === "studio"
                  ? workspaceState.pluginOnline
                    ? "Studio is linked and polling for changes."
                    : "Open Studio setup to install the plugin and pair this workspace."
                  : latestJob
                    ? `${formatStatus(latestJob.status)} · ${latestJob.title}`
                    : "Start in Build, then open Library or Studio when you need them."}
              </p>
              {workspacePane !== "studio" ? (
                <button className="text-button" type="button" onClick={() => setWorkspacePane("studio")}>
                  Open Studio setup
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="main-shell">
          <header className="main-header">
            <div>
              <span className="pane-eyebrow">{activePane.title}</span>
              <h1>{activeProject?.name || "Workspace"}</h1>
              <p>{activePane.subtitle}</p>
            </div>
            <div className="main-header-actions">
              <label className="model-select-shell">
                <span>Model</span>
                <select
                  value={activeProject?.modelKey || ""}
                  onChange={(event) => updateActiveProject({ modelKey: event.target.value })}
                >
                  {availableModels.map((model) => (
                    <option disabled={!model.enabled} key={model.key} value={model.key}>
                      {model.label} · {model.providerLabel}
                      {!model.enabled ? " (setup needed)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={saveWorkspace} disabled={isRefreshing}>
                {isRefreshing ? "Syncing..." : "Save"}
              </button>
              {isAuthenticated ? (
                <button className="secondary-button" type="button" onClick={signOutRoblox}>
                  Sign out
                </button>
              ) : null}
            </div>
          </header>

          <div className="workspace-tabs">
            {WORKSPACE_PANES.map((pane) => (
              <button
                className={`workspace-tab ${workspacePane === pane.id ? "workspace-tab-active" : ""}`}
                key={pane.id}
                type="button"
                onClick={() => setWorkspacePane(pane.id)}
              >
                {pane.label}
              </button>
            ))}
          </div>

          <div className="content-grid">
            <section className="chat-panel">
              {workspacePane === "build" ? (
                <>
                  <div className="chat-scroll">
                    {orderedMessages.length ? (
                      <div className="message-list">
                        {orderedMessages.map((message) => (
                          <div
                            className={`message-row ${
                              message.role === "user" ? "message-row-user" : "message-row-assistant"
                            }`}
                            key={message.id}
                          >
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
                            <button
                              className="suggestion-card"
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setPrompt(suggestion);
                                textareaRef.current?.focus();
                              }}
                            >
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
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        placeholder="Describe a mechanic, UI, or system you want Zest to build in Roblox Studio..."
                        rows={4}
                      />
                      <div className="composer-footer">
                        <div className="composer-meta">
                          <span className="composer-pill">{selectedModel?.label || "No model"}</span>
                          <span className="composer-pill">{isAuthenticated ? "roblox" : workspaceState.accessMode || "guest"}</span>
                          <span className="composer-pill">{workspaceState.pluginOnline ? "Studio ready" : "Studio not paired"}</span>
                        </div>
                        <div className="composer-send-group">
                          <span className="composer-hint">Ctrl+Enter to send</span>
                          <button className="primary-button" type="submit" disabled={isSubmitting || !isAuthenticated}>
                            {isSubmitting ? "Generating..." : "Send"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </>
              ) : workspacePane === "library" ? (
                <div className="mode-scroll">
                  <div className="library-shell">
                    <div className="library-hero">
                      <span className="chat-empty-logo">Library</span>
                      <h2>Pick a system family first.</h2>
                      <p>Open one focused set of building blocks at a time. Inventory can open cards, economy, and save layers without crowding your main workspace.</p>
                    </div>

                    <div className="collection-grid">
                      {PACK_COLLECTIONS.map((collection) => {
                        const active = collection.id === activeCollection.id;
                        const loaded = collection.packIds.filter((packId) =>
                          activeProject?.selectedPacks?.includes(packId),
                        ).length;
                        return (
                          <button
                            className={`collection-card ${active ? "collection-card-active" : ""}`}
                            key={collection.id}
                            type="button"
                            onClick={() => setSelectedCollectionId(collection.id)}
                          >
                            <div className="collection-card-head">
                              <strong>{collection.name}</strong>
                              <span>{loaded}/{collection.packIds.length} loaded</span>
                            </div>
                            <p>{collection.blurb}</p>
                            <div className="collection-card-tags">
                              {collection.packIds.map((packId) => {
                                const pack = PACK_LIBRARY.find((entry) => entry.id === packId);
                                return pack ? <span key={pack.id}>{pack.name}</span> : null;
                              })}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="library-preview">
                      <div className="library-preview-head">
                        <div>
                          <span className="sidebar-label">Open collection</span>
                          <h2>{activeCollection.name}</h2>
                        </div>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => toggleCollection(activeCollection.id)}
                        >
                          {activeCollection.packIds.every((packId) => activeProject?.selectedPacks?.includes(packId))
                            ? "Unload collection"
                            : "Load collection"}
                        </button>
                      </div>
                      <p>{activeCollection.blurb}</p>

                      <div className="library-pack-grid">
                        {activeCollectionPacks.map((pack) => {
                          const active = activeProject?.selectedPacks?.includes(pack.id);
                          return (
                            <button
                              className={`library-pack-card ${active ? "library-pack-card-active" : ""}`}
                              key={pack.id}
                              type="button"
                              onClick={() => togglePack(pack.id)}
                            >
                              <strong>{pack.name}</strong>
                              <p>{pack.description}</p>
                              <span>{active ? "Loaded into this workspace" : "Click to add"}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="library-idea-list">
                        {activeCollection.promptIdeas.map((idea) => (
                          <button
                            className="suggestion-card"
                            key={idea}
                            type="button"
                            onClick={() => {
                              setPrompt(idea);
                              setWorkspacePane("build");
                              window.setTimeout(() => textareaRef.current?.focus(), 0);
                            }}
                          >
                            {idea}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : workspacePane === "studio" ? (
                <div className="mode-scroll">
                  <div className="studio-setup-shell">
                    <div className="studio-setup-card">
                      <span className="sidebar-label">Step 01</span>
                      <h2>Install the plugin</h2>
                      <p>Download the plugin, drop it into the Roblox plugins folder, then restart Studio once.</p>
                      <div className="studio-action-row">
                        <button className="primary-button" type="button" onClick={downloadPluginFile}>
                          Download Plugin
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => copyText(PLUGIN_FOLDER_HINT, "Plugins folder hint")}
                        >
                          Copy plugin folder path
                        </button>
                      </div>
                    </div>

                    <div className="studio-setup-grid">
                      <div className="studio-setup-card">
                        <span className="sidebar-label">Step 02</span>
                        <h2>Pair this workspace</h2>
                        <div className="pair-code">{pluginPairCode || "NO-CODE-YET"}</div>
                        <p>Paste this code inside the Studio plugin so it knows which workspace should receive jobs.</p>
                        <button className="secondary-button" type="button" onClick={() => copyText(pluginPairCode, "Pair code")}>
                          Copy pair code
                        </button>
                      </div>

                      <div className="studio-setup-card">
                        <span className="sidebar-label">Step 03</span>
                        <h2>Check connection</h2>
                        <div className="status-line">
                          <span className={`status-dot ${workspaceState.pluginOnline ? "status-dot-live" : ""}`} />
                          <span>{workspaceState.pluginOnline ? "Studio connected" : "Studio waiting"}</span>
                        </div>
                        <p>
                          {workspaceState.pluginOnline
                            ? "This workspace is live and Roblox Studio is already polling for jobs."
                            : "After pairing, the plugin will start claiming jobs and reporting results back here."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mode-scroll">
                  <div className="jobs-shell">
                    <div className="library-hero">
                      <span className="chat-empty-logo">Jobs</span>
                      <h2>See what Zest already generated.</h2>
                      <p>Use this view to inspect recent runs instead of mixing job history into your build screen.</p>
                    </div>
                    {recentJobs.length ? (
                      <div className="job-list job-list-expanded">
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
                                {job.operations.map((operation, index) => (
                                  <span className="job-operation-pill" key={`${job.id}-${index}`}>
                                    {summarizeOperation(operation)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state-small">No jobs yet.</div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <aside className="utility-column">
              <section className="utility-card">
                <div className="utility-card-head">
                  <h2>Workspace Basics</h2>
                  <span>{lastSyncedAt ? `Synced ${formatDateTime(lastSyncedAt)}` : "Not synced"}</span>
                </div>
                <label className="field">
                  <span>Name</span>
                  <input
                    value={activeProject?.name || ""}
                    onChange={(event) => updateActiveProject({ name: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={activeProject?.description || ""}
                    onChange={(event) => updateActiveProject({ description: event.target.value })}
                  />
                </label>
                <details className="details-block">
                  <summary>More settings</summary>
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
                      rows={4}
                      value={app.supabaseAnonKey}
                      onChange={(event) => updateApp("supabaseAnonKey", event.target.value)}
                      placeholder="Publishable or anon key"
                    />
                  </label>
                  <label className="field">
                    <span>Workspace token</span>
                    <input value={activeProject?.workspaceToken || ""} readOnly />
                  </label>
                  <label className="field">
                    <span>Advanced plugin payload</span>
                    <textarea rows={8} readOnly value={pluginSnippet} />
                  </label>
                  <div className="field-action-row">
                    <button className="secondary-button" type="button" onClick={() => copyText(pluginSnippet, "Advanced payload")}>
                      Copy advanced payload
                    </button>
                  </div>
                </details>
              </section>

              {workspacePane === "library" ? (
                <section className="utility-card">
                  <div className="utility-card-head">
                    <h2>{activeCollection.name}</h2>
                    <span>{activeCollectionPacks.length} packs</span>
                  </div>
                  <p className="utility-copy">{activeCollection.blurb}</p>
                  <div className="pack-list">
                    {activeCollectionPacks.map((pack) => {
                      const active = activeProject?.selectedPacks?.includes(pack.id);
                      return (
                        <label className={`pack-item ${active ? "pack-item-active" : ""}`} key={pack.id}>
                          <input checked={active} type="checkbox" onChange={() => togglePack(pack.id)} />
                          <div>
                            <strong>{pack.name}</strong>
                            <span>{pack.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ) : workspacePane === "studio" ? (
                <section className="utility-card">
                  <div className="utility-card-head">
                    <h2>Studio Pairing</h2>
                    <span>{workspaceState.pluginOnline ? "Live" : "Waiting"}</span>
                  </div>
                  <div className="pair-code">{pluginPairCode || "NO-CODE-YET"}</div>
                  <div className="field-action-row utility-button-stack">
                    <button className="secondary-button" type="button" onClick={() => copyText(pluginPairCode, "Pair code")}>
                      Copy pair code
                    </button>
                    <button className="secondary-button" type="button" onClick={downloadPluginFile}>
                      Download plugin
                    </button>
                  </div>
                  <p className="utility-copy">
                    {studioAuth?.username
                      ? `Connected from @${studioAuth.username}.`
                      : "Use the plugin in Roblox Studio and paste the code shown here."}
                  </p>
                </section>
              ) : (
                <section className="utility-card">
                  <div className="utility-card-head">
                    <h2>Loaded Systems</h2>
                    <span>{selectedPacks.length} loaded</span>
                  </div>
                  <div className="selected-pack-stack">
                    {selectedPacks.length ? (
                      selectedPacks.map((pack) => (
                        <button
                          className="selected-pack-chip"
                          key={pack.id}
                          type="button"
                          onClick={() => {
                            const matchingCollection = PACK_COLLECTIONS.find((collection) =>
                              collection.packIds.includes(pack.id),
                            );
                            if (matchingCollection) {
                              openCollection(matchingCollection.id);
                            }
                          }}
                        >
                          <strong>{pack.name}</strong>
                          <span>{pack.description}</span>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state-small">No systems loaded yet. Open Library to add one.</div>
                    )}
                  </div>
                  <div className="field-action-row">
                    <button className="secondary-button" type="button" onClick={() => setWorkspacePane("library")}>
                      Open library
                    </button>
                  </div>
                </section>
              )}

              {workspacePane !== "jobs" ? (
                <section className="utility-card">
                  <div className="utility-card-head">
                    <h2>Quick Progress</h2>
                    <button className="text-button" type="button" onClick={() => refreshWorkspace({ ensure: false, silent: false })}>
                      Refresh
                    </button>
                  </div>
                  <div className="progress-mini-grid">
                    <div className="progress-mini-card">
                      <strong>{loadedCollections.length}</strong>
                      <span>system groups active</span>
                    </div>
                    <div className="progress-mini-card">
                      <strong>{recentJobs.length}</strong>
                      <span>jobs in history</span>
                    </div>
                    <div className="progress-mini-card">
                      <strong>{workspaceState.pluginOnline ? "live" : "idle"}</strong>
                      <span>studio status</span>
                    </div>
                  </div>
                  {latestJob ? (
                    <div className="job-mini-card">
                      <div className="job-item-head">
                        <strong>{latestJob.title}</strong>
                        <span className={`job-status job-status-${latestJob.status}`}>{formatStatus(latestJob.status)}</span>
                      </div>
                      <p>{latestJob.summary || "No summary returned."}</p>
                      <button className="text-button" type="button" onClick={() => setWorkspacePane("jobs")}>
                        Open all jobs
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </WorkspaceErrorBoundary>
  );
}

export default App;
