import { LOCAL_MODEL_CATALOG } from "./constants";
import {
  buildWorkspaceFiles,
  createAssistantPayload,
  createId,
  createMockJob,
  createWorkspaceToken,
  createUserMessage,
  pairCodeFromWorkspaceToken,
} from "./helpers";

const EMPTY_ACCOUNT = {
  displayName: "",
  username: "",
  role: "Roblox account",
};

function createWorkspaceBase(overrides = {}) {
  const now = new Date().toISOString();
  const workspaceToken = overrides.workspaceToken || createWorkspaceToken();

  return {
    id: createId("workspace"),
    name: "New Workspace",
    description: "A focused Roblox workspace for UI systems, gameplay loops, and Studio-ready mock output.",
    workspaceToken,
    accessMode: "guest",
    modelKey: LOCAL_MODEL_CATALOG[0].key,
    selectedPackIds: [],
    promptDraft: "",
    messages: [],
    jobs: [],
    pairCode: pairCodeFromWorkspaceToken(workspaceToken),
    studioStatus: "waiting",
    pluginInstalled: false,
    pluginOnline: false,
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
    systemPacks: [],
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
  return {
    ...createWorkspaceBase({
      name: "Starter Workspace",
      description: "A focused Roblox workspace for build ideas, pair previews, and polished mock Studio history.",
      selectedPackIds: [],
    }),
    explorerFiles: buildWorkspaceFiles([], []),
  };
}

export function createDefaultAppState() {
  const sample = createSampleWorkspace();
  const starter = createStarterWorkspace();

  return {
    isAuthenticated: false,
    hasCompletedOnboarding: false,
    onboardingChoice: "",
    authProfile: EMPTY_ACCOUNT,
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
    selectedPackIds: values.selectedPackIds || [],
    modelKey: values.modelKey || LOCAL_MODEL_CATALOG[0].key,
  });

  return {
    ...workspace,
    explorerFiles: buildWorkspaceFiles(workspace.selectedPackIds, []),
  };
}
