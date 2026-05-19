import {
  LOCAL_MODEL_CATALOG,
  MOCK_ACCOUNT,
  PACK_COLLECTIONS,
} from "./constants";
import {
  buildWorkspaceFiles,
  createAssistantPayload,
  createId,
  createMockJob,
  createPairCode,
  createUserMessage,
} from "./helpers";

function createWorkspaceBase(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: createId("workspace"),
    name: "New Workspace",
    description: "A focused Roblox workspace for UI systems, gameplay loops, and Studio-ready mock output.",
    modelKey: LOCAL_MODEL_CATALOG[0].key,
    selectedPackIds: ["inventory-ui", "economy-core"],
    promptDraft: "",
    messages: [],
    jobs: [],
    pairCode: createPairCode(),
    studioStatus: "waiting",
    pluginInstalled: false,
    syncPulse: false,
    lastSyncedAt: "",
    lastOpenedAt: now,
    createdAt: now,
    explorerFiles: [],
    explorerExpandedIds: [
      "ServerScriptService",
      "StarterGui",
      "ReplicatedStorage",
    ],
    ...overrides,
  };
}

function createSampleWorkspace() {
  const workspace = createWorkspaceBase({
    name: "Workspace 2",
    description: "A lightweight Roblox workspace for fast mechanic prototyping, UI systems, and gameplay loops.",
    studioStatus: "connected",
    pluginInstalled: true,
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  });

  const prompt = "Create a premium inventory UI with rarity borders, hover detail, and equip buttons.";
  const userMessage = createUserMessage(prompt);
  const assistantMessage = createAssistantPayload({
    prompt,
    workspaceName: workspace.name,
    modelLabel: "Zest Starter",
    selectedPackIds: workspace.selectedPackIds,
  });
  const job = createMockJob({
    prompt,
    assistantMessage,
    modelKey: workspace.modelKey,
  });

  return {
    ...workspace,
    messages: [userMessage, assistantMessage],
    jobs: [job],
    explorerFiles: buildWorkspaceFiles(workspace.selectedPackIds, [job]),
  };
}

function createStarterWorkspace() {
  const selectedPackIds = PACK_COLLECTIONS[0].packIds.slice(0, 3);
  return {
    ...createWorkspaceBase({
      name: "Starter Workspace",
      description: "A focused Roblox workspace for build ideas, pair previews, and polished mock Studio history.",
      selectedPackIds,
    }),
    explorerFiles: buildWorkspaceFiles(selectedPackIds, []),
  };
}

export function createDefaultAppState() {
  const sample = createSampleWorkspace();
  const starter = createStarterWorkspace();

  return {
    isAuthenticated: true,
    hasCompletedOnboarding: true,
    onboardingChoice: "builder",
    authProfile: MOCK_ACCOUNT,
    workspaces: [sample, starter],
    activeWorkspaceId: sample.id,
  };
}

export function createWorkspaceFromInput(values = {}) {
  const workspace = createWorkspaceBase({
    name: values.name?.trim() || "Untitled Workspace",
    description:
      values.description?.trim() ||
      "A fresh Roblox workspace for structured prompts, mock Studio output, and reusable system packs.",
    selectedPackIds: values.selectedPackIds || ["inventory-ui"],
    modelKey: values.modelKey || LOCAL_MODEL_CATALOG[0].key,
  });

  return {
    ...workspace,
    explorerFiles: buildWorkspaceFiles(workspace.selectedPackIds, []),
  };
}
