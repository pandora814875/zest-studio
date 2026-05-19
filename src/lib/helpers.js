import {
  MAX_PROMPT_LENGTH,
  PACK_COLLECTIONS,
  PACK_LIBRARY,
} from "./constants";

const ROOT_ORDER = [
  "ServerScriptService",
  "StarterGui",
  "ReplicatedStorage",
  "StarterPlayer",
  "Workspace",
];

const PACK_FILE_MAP = {
  "inventory-ui": [
    "StarterGui/Inventory/InventoryScreen.client.lua",
    "ReplicatedStorage/Inventory/InventoryConfig.lua",
  ],
  "economy-core": [
    "ReplicatedStorage/Economy/EconomyConfig.lua",
    "ServerScriptService/Economy/EconomyService.server.lua",
  ],
  "round-director": [
    "ServerScriptService/RoundDirector/RoundDirector.server.lua",
    "ReplicatedStorage/RoundDirector/RoundSignals.lua",
  ],
  "combat-kit": [
    "ServerScriptService/Combat/CombatService.server.lua",
    "ReplicatedStorage/Combat/Hitbox.shared.lua",
  ],
  "rng-cards": [
    "StarterGui/RNG/RNGReveal.client.lua",
    "ReplicatedStorage/RNG/RarityTable.lua",
  ],
  "datastore-safe": [
    "ServerScriptService/Data/ProfileStore.server.lua",
    "ReplicatedStorage/Data/ProfileSchema.lua",
  ],
  "monster-ai": [
    "ServerScriptService/AI/MonsterBrain.server.lua",
    "ReplicatedStorage/AI/MonsterConfig.lua",
  ],
  "housing-plots": [
    "ServerScriptService/Plots/PlotService.server.lua",
    "ReplicatedStorage/Plots/PlacementRules.lua",
  ],
};

const FOCUS_TEMPLATES = [
  {
    key: "inventory",
    match: ["inventory", "equip", "slot", "hotbar", "bag", "item"],
    title: "inventory flow",
    files: [
      "StarterGui/Inventory/InventorySurface.client.lua",
      "ReplicatedStorage/Inventory/InventoryPresenter.lua",
    ],
    summary: "Created a layered inventory surface with slots, inspect states, and a clean data handoff.",
    bullets: [
      "Built a client-facing surface for hover, inspect, and quick equip feedback.",
      "Separated presentation data so the Studio preview feels organized and scalable.",
    ],
  },
  {
    key: "combat",
    match: ["combat", "sword", "attack", "enemy", "boss", "damage"],
    title: "combat loop",
    files: [
      "ServerScriptService/Combat/CombatLoop.server.lua",
      "ReplicatedStorage/Combat/CombatConfig.lua",
    ],
    summary: "Drafted a combat loop with clear server authority, cooldown handling, and readable shared config.",
    bullets: [
      "Centralized combat timing so later balancing changes stay easy.",
      "Added config structure for hit windows, combo cadence, and impact values.",
    ],
  },
  {
    key: "shop",
    match: ["shop", "bundle", "purchase", "currency", "coins", "store"],
    title: "shop surface",
    files: [
      "StarterGui/Shop/ShopScreen.client.lua",
      "ReplicatedStorage/Shop/ShopCatalog.lua",
    ],
    summary: "Put together a premium-feeling shop surface with bundles, balances, and product rows.",
    bullets: [
      "Separated the shop catalog from UI code to keep the surface easy to expand.",
      "Prepared structure for balances, bundles, and offer metadata.",
    ],
  },
  {
    key: "rounds",
    match: ["round", "survival", "wave", "lobby", "intermission", "teleport"],
    title: "round director",
    files: [
      "ServerScriptService/RoundDirector/RoundLoop.server.lua",
      "ReplicatedStorage/RoundDirector/RoundConfig.lua",
    ],
    summary: "Outlined a lobby-to-round flow with phase transitions, pacing hooks, and reward timing.",
    bullets: [
      "Defined phase boundaries for lobby, round, and reward states.",
      "Prepared a shared config so pacing tweaks stay centralized.",
    ],
  },
  {
    key: "quests",
    match: ["quest", "daily", "progress", "objective", "claim"],
    title: "quest system",
    files: [
      "ServerScriptService/Quests/QuestService.server.lua",
      "ReplicatedStorage/Quests/QuestDefinitions.lua",
    ],
    summary: "Sketched a daily quest loop with tracked progress, claim states, and reusable definitions.",
    bullets: [
      "Defined quest state separately from presentation so it scales into future events.",
      "Left room for progress bars, claim timing, and save-safe updates.",
    ],
  },
];

export function createId(prefix = "item") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPairCode() {
  const segment = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "Just now";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function trimPrompt(value) {
  return value.trim().slice(0, MAX_PROMPT_LENGTH);
}

export function toTitleCase(value) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function detectPromptTemplate(prompt, selectedPackIds = []) {
  const normalized = prompt.toLowerCase();
  const packNames = PACK_LIBRARY.filter((pack) => selectedPackIds.includes(pack.id))
    .map((pack) => pack.name.toLowerCase())
    .join(" ");

  return (
    FOCUS_TEMPLATES.find((template) =>
      template.match.some((token) => normalized.includes(token) || packNames.includes(token)),
    ) || FOCUS_TEMPLATES[0]
  );
}

export function createAssistantPayload({ prompt, workspaceName, modelLabel, selectedPackIds }) {
  const template = detectPromptTemplate(prompt, selectedPackIds);
  const focusName = toTitleCase(template.title);
  const moduleName = toTitleCase(template.key).replace(/\s+/g, "");
  const promptComment = prompt.replace(/\s+/g, " ").trim();

  const codeBlocks = template.files.map((filePath, index) => {
    const leafName = filePath.split("/").at(-1) || `Module${index + 1}.lua`;
    const isClient = filePath.includes(".client.");
    const body = isClient
      ? `local Players = game:GetService("Players")\nlocal player = Players.LocalPlayer\n\nlocal ${moduleName}View = {}\n\nfunction ${moduleName}View.mount()\n  -- ${promptComment}\n  print("Mounting ${focusName.toLowerCase()} for", player.Name)\nend\n\nreturn ${moduleName}View`
      : `local ${moduleName}Service = {}\n\nfunction ${moduleName}Service.start()\n  -- ${promptComment}\n  print("Booting ${focusName.toLowerCase()} in ${workspaceName}")\nend\n\nreturn ${moduleName}Service`;

    return {
      id: createId("code"),
      title: leafName,
      language: "lua",
      path: filePath,
      code: body,
    };
  });

  return {
    id: createId("msg"),
    role: "assistant",
    createdAt: new Date().toISOString(),
    summary: template.summary,
    body: `Mock plan generated with ${modelLabel}. This keeps the same polished product flow while staying entirely local.`,
    bullets: [
      ...template.bullets,
      selectedPackIds.length
        ? `Used ${selectedPackIds.length} loaded system ${selectedPackIds.length === 1 ? "pack" : "packs"} as build context.`
        : "No extra system packs were loaded, so the plan stays general and lightweight.",
    ],
    codeBlocks,
    tags: ["Mock output", focusName],
  };
}

export function createUserMessage(prompt) {
  return {
    id: createId("msg"),
    role: "user",
    createdAt: new Date().toISOString(),
    text: prompt,
  };
}

export function createMockJob({ prompt, assistantMessage, modelKey }) {
  const focus = assistantMessage?.tags?.[1] || "Build";
  return {
    id: createId("job"),
    title: `Generated ${focus}`,
    prompt,
    status: "synced",
    createdAt: new Date().toISOString(),
    modelKey,
    summary: assistantMessage.summary,
    operations: (assistantMessage.codeBlocks || []).map((block) => ({
      id: createId("op"),
      label: "Updated script",
      path: block.path,
    })),
  };
}

export function buildWorkspaceFiles(selectedPackIds = [], jobs = []) {
  const fileSet = new Set();

  selectedPackIds.forEach((packId) => {
    (PACK_FILE_MAP[packId] || []).forEach((filePath) => fileSet.add(filePath));
  });

  jobs.forEach((job) => {
    (job.operations || []).forEach((operation) => {
      if (operation.path) {
        fileSet.add(operation.path);
      }
    });
  });

  return Array.from(fileSet).sort((left, right) => left.localeCompare(right));
}

function createTreeNode(id, name, type, path) {
  return {
    id,
    name,
    type,
    path,
    children: [],
  };
}

export function buildExplorerTree(files = []) {
  const rootMap = new Map(
    ROOT_ORDER.map((root) => [
      root,
      createTreeNode(root, root, "root", root),
    ]),
  );

  files.forEach((filePath) => {
    const segments = filePath.split("/");
    const [rootName, ...rest] = segments;
    const rootNode = rootMap.get(rootName) || createTreeNode(rootName, rootName, "root", rootName);

    let current = rootNode;
    let currentPath = rootName;

    rest.forEach((segment, index) => {
      currentPath = `${currentPath}/${segment}`;
      const isFile = index === rest.length - 1;
      let child = current.children.find((node) => node.name === segment);

      if (!child) {
        child = createTreeNode(
          currentPath,
          segment,
          isFile ? "file" : "folder",
          currentPath,
        );
        current.children.push(child);
      }

      current = child;
    });

    rootMap.set(rootName, rootNode);
  });

  return Array.from(rootMap.values())
    .map((root) => ({
      ...root,
      children: sortTreeChildren(root.children),
    }))
    .filter((root) => root.children.length || ROOT_ORDER.includes(root.name));
}

function sortTreeChildren(children) {
  return [...children]
    .sort((left, right) => {
      if (left.type === right.type) {
        return left.name.localeCompare(right.name);
      }

      return left.type === "folder" ? -1 : 1;
    })
    .map((child) => ({
      ...child,
      children: sortTreeChildren(child.children || []),
    }));
}

export function getCollectionLoadedCount(collection, selectedPackIds = []) {
  return collection.packIds.filter((packId) => selectedPackIds.includes(packId)).length;
}

export function getCollectionById(collectionId) {
  return PACK_COLLECTIONS.find((collection) => collection.id === collectionId) || PACK_COLLECTIONS[0];
}

export function getPackById(packId) {
  return PACK_LIBRARY.find((pack) => pack.id === packId) || null;
}

export function getRecentWorkspaces(workspaces = [], activeWorkspaceId) {
  return [...workspaces]
    .filter((workspace) => workspace.id !== activeWorkspaceId)
    .sort((left, right) => new Date(right.lastOpenedAt) - new Date(left.lastOpenedAt))
    .slice(0, 4);
}

export function matchesSearch(value, query) {
  if (!query.trim()) {
    return true;
  }

  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export function filterExplorerNodes(nodes, query) {
  if (!query.trim()) {
    return nodes;
  }

  const normalized = query.trim().toLowerCase();

  return nodes
    .map((node) => filterExplorerNode(node, normalized))
    .filter(Boolean);
}

function filterExplorerNode(node, normalized) {
  const childMatches = (node.children || [])
    .map((child) => filterExplorerNode(child, normalized))
    .filter(Boolean);

  if (
    node.name.toLowerCase().includes(normalized) ||
    node.path.toLowerCase().includes(normalized) ||
    childMatches.length
  ) {
    return {
      ...node,
      children: childMatches,
    };
  }

  return null;
}

export function createLoadingMessage() {
  return {
    id: createId("msg"),
    role: "assistant",
    createdAt: new Date().toISOString(),
    loading: true,
  };
}
