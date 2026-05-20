export const PRODUCT_NAME = "Zest";
export const PRODUCT_FULL_NAME = "Zest Studio";
export const STORAGE_KEY = "zest-studio-mock-local-v1";
export const MAX_PROMPT_LENGTH = 420;
export const MAX_RECENT_WORKSPACES = 4;
export const PLUGIN_FOLDER_HINT = "Windows: %LocalAppData%\\Roblox\\Plugins";

export const LOCAL_MODEL_CATALOG = [
  {
    key: "zest/starter-builder",
    label: "Zest Starter",
    providerLabel: "Built-in",
    creditCost: 0,
    enabled: true,
    summary: "Fast local mock model used for frontend preview flows.",
  },
  {
    key: "groq/openai-gpt-oss-20b",
    label: "GPT OSS 20B",
    providerLabel: "Groq",
    creditCost: 0,
    enabled: true,
    summary: "Free-friendly mock model slot for production-style routing UI.",
  },
  {
    key: "groq/llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    providerLabel: "Groq",
    creditCost: 0,
    enabled: true,
    summary: "General-purpose mock model for mechanics and systems.",
  },
  {
    key: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    providerLabel: "Google",
    creditCost: 1,
    enabled: true,
    summary: "Fast mock model for quick iteration states.",
  },
  {
    key: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    providerLabel: "Anthropic",
    creditCost: 3,
    enabled: true,
    summary: "Mock premium model for longer responses and planning.",
  },
  {
    key: "anthropic/claude-opus-4-5",
    label: "Claude Opus 4.5",
    providerLabel: "Anthropic",
    creditCost: 6,
    enabled: true,
    summary: "Mock heavy reasoning model for larger architecture tasks.",
  },
  {
    key: "openai/gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    providerLabel: "OpenAI",
    creditCost: 1,
    enabled: true,
    summary: "Mock OpenAI model for short feature bursts.",
  },
  {
    key: "moonshot/kimi-k2.5",
    label: "Kimi K2.5",
    providerLabel: "Moonshot",
    creditCost: 2,
    enabled: true,
    summary: "Mock alternative coding model slot.",
  },
];

export const PACK_COLLECTIONS = [
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

export const HOME_FEATURES = [
  {
    icon: "AI",
    title: "Prompt to Roblox Script",
    body: "Describe a mechanic, UI, or system in plain English. Zest previews a polished build flow with mock Roblox outputs and history.",
  },
  {
    icon: "WS",
    title: "Project-first Workspace",
    body: "Jump between recent workspaces, open focused panels, and keep the main builder calm and uncluttered.",
  },
  {
    icon: "PL",
    title: "Studio Pairing Preview",
    body: "The Studio page simulates connection states, pair code changes, sync pulses, and reconnect flows.",
  },
  {
    icon: "PK",
    title: "System Context Packs",
    body: "Load mock system families like Inventory UI, Combat Kit, and Save Layer to guide the build experience.",
  },
];

export const HOME_STEPS = [
  {
    num: "01",
    label: "Open a workspace",
    body: "Use the homepage flow to enter the frontend preview and choose how you want to build.",
  },
  {
    num: "02",
    label: "Describe your feature",
    body: "Type a mechanic, UI, or system into the prompt composer and send it into build history.",
  },
  {
    num: "03",
    label: "Review Studio outputs",
    body: "Inspect history, explorer updates, and the Studio pairing panel without any backend dependencies.",
  },
];

export const PROMPT_SUGGESTIONS = [
  "Create a premium inventory UI with rarity borders, hover detail, and equip buttons.",
  "Build a round survival system with lobby waiting, intermission, and win rewards.",
  "Make a shop UI with bundles, developer products, and a balance display.",
  "Create daily quests with progress bars, claims, and simple save handling.",
];

export const BUILD_STAGE_SHORTCUTS = [
  { label: "Inventory UI", prompt: PROMPT_SUGGESTIONS[0] },
  { label: "Round Survival", prompt: PROMPT_SUGGESTIONS[1] },
  { label: "Shop System", prompt: PROMPT_SUGGESTIONS[2] },
  { label: "Daily Quests", prompt: PROMPT_SUGGESTIONS[3] },
];

export const BUILD_STAGE_PREVIEWS = [
  { id: "inventory", eyebrow: "Inventory UI", title: "rarity borders" },
  { id: "combat", eyebrow: "Combat Loop", title: "wave pacing" },
  { id: "economy", eyebrow: "Economy Core", title: "shop bundles" },
  { id: "rng", eyebrow: "RNG Cards", title: "reveal flow" },
];

export const WORKSPACE_DRAWERS = [
  {
    id: "library",
    label: "Systems",
    title: "System Library",
    subtitle: "Open system families only when you need them, then drop back into the main build canvas.",
  },
  {
    id: "explorer",
    label: "Explorer",
    title: "Roblox Explorer",
    subtitle: "Browse the mock Studio hierarchy, search files, and inspect where generated systems landed.",
  },
  {
    id: "studio",
    label: "Studio",
    title: "Studio Setup",
    subtitle: "Install the plugin, pair Roblox Studio, and review connection state in one focused panel.",
  },
  {
    id: "jobs",
    label: "History",
    title: "Build History",
    subtitle: "Review recent jobs and generated outputs without cluttering the main workspace.",
  },
];

export const SETTINGS_SECTIONS = [
  { id: "models", label: "Models" },
  { id: "workspace", label: "Workspace" },
  { id: "plugin", label: "Plugin" },
  { id: "account", label: "Account" },
];

export const ONBOARDING_OPTIONS = [
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

export const MOCK_ACCOUNT = {
  displayName: "Pandora",
  username: "COOL_PANDAalt",
  role: "Frontend preview",
};
