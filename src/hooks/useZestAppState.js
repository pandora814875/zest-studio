import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCAL_MODEL_CATALOG,
  MAX_PROMPT_LENGTH,
  MAX_RECENT_WORKSPACES,
  PACK_COLLECTIONS,
  STORAGE_KEY,
} from "../lib/constants";
import {
  buildExplorerTree,
  buildWorkspaceFiles,
  createAssistantPayload,
  createLoadingMessage,
  createMockJob,
  createPairCode,
  createUserMessage,
  filterExplorerNodes,
  getCollectionById,
  getRecentWorkspaces,
  matchesSearch,
  trimPrompt,
} from "../lib/helpers";
import { createDefaultAppState, createWorkspaceFromInput } from "../lib/mockData";

const DEFAULT_UI = {
  view: "workspace",
  activeDrawer: null,
  workspaceSearch: "",
  explorerSearch: "",
  authModalOpen: false,
  onboardingOpen: false,
  settingsOpen: false,
  settingsSection: "models",
  collectionId: PACK_COLLECTIONS[0].id,
  workspaceModal: null,
  deleteWorkspaceId: null,
  mobileSidebarOpen: false,
  copyFeedback: "",
  promptError: "",
  isSubmitting: false,
  isWorkspaceLoading: false,
};

function loadPersistedState() {
  if (typeof window === "undefined") {
    return createDefaultAppState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultAppState();
    }

    const parsed = JSON.parse(raw);
    const fallback = createDefaultAppState();

    return {
      ...fallback,
      ...parsed,
      workspaces: parsed.workspaces?.length ? parsed.workspaces : fallback.workspaces,
      activeWorkspaceId: parsed.activeWorkspaceId || fallback.activeWorkspaceId,
    };
  } catch {
    return createDefaultAppState();
  }
}

export function useZestAppState() {
  const [appState, setAppState] = useState(loadPersistedState);
  const [ui, setUi] = useState(DEFAULT_UI);
  const submitTimeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        window.clearTimeout(submitTimeoutRef.current);
      }
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const activeWorkspace =
    appState.workspaces.find((workspace) => workspace.id === appState.activeWorkspaceId) ||
    appState.workspaces[0];

  const filteredWorkspaces = useMemo(
    () =>
      appState.workspaces.filter((workspace) =>
        matchesSearch(`${workspace.name} ${workspace.description}`, ui.workspaceSearch),
      ),
    [appState.workspaces, ui.workspaceSearch],
  );

  const recentWorkspaces = useMemo(
    () =>
      getRecentWorkspaces(appState.workspaces, activeWorkspace?.id).slice(0, MAX_RECENT_WORKSPACES),
    [appState.workspaces, activeWorkspace?.id],
  );

  const activeCollection = useMemo(() => {
    return getCollectionById(ui.collectionId);
  }, [ui.collectionId]);

  const workspaceExplorerTree = useMemo(() => {
    return filterExplorerNodes(
      buildExplorerTree(activeWorkspace?.explorerFiles || []),
      ui.explorerSearch,
    );
  }, [activeWorkspace?.explorerFiles, ui.explorerSearch]);

  const selectedModel =
    LOCAL_MODEL_CATALOG.find((model) => model.key === activeWorkspace?.modelKey) ||
    LOCAL_MODEL_CATALOG[0];

  function setCopyFeedback(message) {
    setUi((current) => ({ ...current, copyFeedback: message }));

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setUi((current) => ({ ...current, copyFeedback: "" }));
    }, 1800);
  }

  function updateWorkspace(workspaceId, updater) {
    setAppState((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) =>
        workspace.id === workspaceId ? updater(workspace) : workspace,
      ),
    }));
  }

  function patchActiveWorkspace(patch) {
    updateWorkspace(activeWorkspace.id, (workspace) => ({ ...workspace, ...patch }));
  }

  function markWorkspaceOpened(workspaceId) {
    const lastOpenedAt = new Date().toISOString();
    setAppState((current) => ({
      ...current,
      activeWorkspaceId: workspaceId,
      workspaces: current.workspaces.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, lastOpenedAt } : workspace,
      ),
    }));
  }

  function openWorkspace(workspaceId) {
    setUi((current) => ({
      ...current,
      isWorkspaceLoading: true,
      activeDrawer: null,
      mobileSidebarOpen: false,
    }));
    markWorkspaceOpened(workspaceId);
    window.setTimeout(() => {
      setUi((current) => ({ ...current, isWorkspaceLoading: false }));
    }, 260);
  }

  function openAuthModal() {
    setUi((current) => ({ ...current, authModalOpen: true }));
  }

  function closeAuthModal() {
    setUi((current) => ({ ...current, authModalOpen: false }));
  }

  function continueMockSignIn() {
    setAppState((current) => ({
      ...current,
      isAuthenticated: true,
    }));
    setUi((current) => ({
      ...current,
      authModalOpen: false,
      onboardingOpen: !appState.hasCompletedOnboarding,
      view: "workspace",
    }));
  }

  function completeOnboarding(choice) {
    setAppState((current) => ({
      ...current,
      hasCompletedOnboarding: true,
      onboardingChoice: choice,
    }));
    setUi((current) => ({ ...current, onboardingOpen: false, view: "workspace" }));
  }

  function signOut() {
    setAppState((current) => ({
      ...current,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
    }));
    setUi((current) => ({
      ...current,
      view: "home",
      activeDrawer: null,
      settingsOpen: false,
    }));
  }

  function openDrawer(drawerId) {
    setUi((current) => ({
      ...current,
      activeDrawer: current.activeDrawer === drawerId ? null : drawerId,
      mobileSidebarOpen: false,
    }));
  }

  function closeDrawer() {
    setUi((current) => ({ ...current, activeDrawer: null }));
  }

  function openSettings(section = "models") {
    setUi((current) => ({
      ...current,
      settingsOpen: true,
      settingsSection: section,
      activeDrawer: null,
    }));
  }

  function closeSettings() {
    setUi((current) => ({ ...current, settingsOpen: false }));
  }

  function setWorkspaceSearch(value) {
    setUi((current) => ({ ...current, workspaceSearch: value }));
  }

  function setExplorerSearch(value) {
    setUi((current) => ({ ...current, explorerSearch: value }));
  }

  function setPromptDraft(value) {
    patchActiveWorkspace({
      promptDraft: value.slice(0, MAX_PROMPT_LENGTH),
    });
  }

  function setModel(modelKey) {
    patchActiveWorkspace({ modelKey });
  }

  function togglePack(packId) {
    const selected = activeWorkspace.selectedPackIds.includes(packId);
    const selectedPackIds = selected
      ? activeWorkspace.selectedPackIds.filter((item) => item !== packId)
      : [...activeWorkspace.selectedPackIds, packId];

    patchActiveWorkspace({
      selectedPackIds,
      explorerFiles: buildWorkspaceFiles(selectedPackIds, activeWorkspace.jobs),
    });
  }

  function toggleCollection(collectionId) {
    const collection = getCollectionById(collectionId);
    const everyLoaded = collection.packIds.every((packId) =>
      activeWorkspace.selectedPackIds.includes(packId),
    );

    const selectedPackIds = everyLoaded
      ? activeWorkspace.selectedPackIds.filter((packId) => !collection.packIds.includes(packId))
      : Array.from(new Set([...activeWorkspace.selectedPackIds, ...collection.packIds]));

    patchActiveWorkspace({
      selectedPackIds,
      explorerFiles: buildWorkspaceFiles(selectedPackIds, activeWorkspace.jobs),
    });
    setUi((current) => ({ ...current, collectionId }));
  }

  function focusCollection(collectionId) {
    setUi((current) => ({ ...current, collectionId, activeDrawer: "library" }));
  }

  function openWorkspaceModal(mode, workspace = null) {
    setUi((current) => ({
      ...current,
      workspaceModal: {
        mode,
        workspaceId: workspace?.id || null,
      },
    }));
  }

  function closeWorkspaceModal() {
    setUi((current) => ({ ...current, workspaceModal: null }));
  }

  function submitWorkspaceForm(values) {
    if (ui.workspaceModal?.mode === "rename" && ui.workspaceModal.workspaceId) {
      updateWorkspace(ui.workspaceModal.workspaceId, (workspace) => ({
        ...workspace,
        name: values.name.trim(),
        description: values.description.trim(),
      }));
    } else {
      const workspace = createWorkspaceFromInput(values);
      setAppState((current) => ({
        ...current,
        workspaces: [workspace, ...current.workspaces],
        activeWorkspaceId: workspace.id,
      }));
    }

    setUi((current) => ({
      ...current,
      workspaceModal: null,
      isWorkspaceLoading: false,
      mobileSidebarOpen: false,
    }));
  }

  function askDeleteWorkspace(workspaceId) {
    setUi((current) => ({ ...current, deleteWorkspaceId: workspaceId }));
  }

  function closeDeleteWorkspace() {
    setUi((current) => ({ ...current, deleteWorkspaceId: null }));
  }

  function deleteWorkspace() {
    const workspaceId = ui.deleteWorkspaceId;
    if (!workspaceId) {
      return;
    }

    setAppState((current) => {
      const remaining = current.workspaces.filter((workspace) => workspace.id !== workspaceId);
      const nextActive = remaining[0]?.id || current.activeWorkspaceId;
      return {
        ...current,
        workspaces: remaining,
        activeWorkspaceId: nextActive,
      };
    });
    setUi((current) => ({ ...current, deleteWorkspaceId: null }));
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copied`);
    } catch {
      setCopyFeedback(`${label} unavailable`);
    }
  }

  function regeneratePairCode() {
    patchActiveWorkspace({
      pairCode: createPairCode(),
      studioStatus: "pairing",
    });

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      patchActiveWorkspace({
        studioStatus: "connected",
        lastSyncedAt: new Date().toISOString(),
        pluginInstalled: true,
      });
    }, 900);
  }

  function reconnectStudio() {
    patchActiveWorkspace({
      studioStatus: "syncing",
      syncPulse: true,
    });

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      patchActiveWorkspace({
        studioStatus: "connected",
        syncPulse: false,
        pluginInstalled: true,
        lastSyncedAt: new Date().toISOString(),
      });
    }, 1100);
  }

  function setStudioInstalled(installed) {
    patchActiveWorkspace({
      pluginInstalled: installed,
      studioStatus: installed ? "pairing" : "waiting",
    });
  }

  function toggleExplorerNode(nodeId) {
    updateWorkspace(activeWorkspace.id, (workspace) => {
      const expandedIds = workspace.explorerExpandedIds.includes(nodeId)
        ? workspace.explorerExpandedIds.filter((id) => id !== nodeId)
        : [...workspace.explorerExpandedIds, nodeId];

      return {
        ...workspace,
        explorerExpandedIds: expandedIds,
      };
    });
  }

  function saveWorkspaceSettings(values) {
    patchActiveWorkspace({
      name: values.name.trim(),
      description: values.description.trim(),
      modelKey: values.modelKey,
    });
    closeSettings();
  }

  function toggleSidebar() {
    setUi((current) => ({ ...current, mobileSidebarOpen: !current.mobileSidebarOpen }));
  }

  function goHome() {
    setUi((current) => ({ ...current, view: "home", mobileSidebarOpen: false }));
  }

  function goWorkspace() {
    setUi((current) => ({ ...current, view: "workspace" }));
  }

  function usePromptSuggestion(prompt) {
    patchActiveWorkspace({ promptDraft: prompt });
    setUi((current) => ({ ...current, activeDrawer: null }));
  }

  function sendPrompt(rawPrompt) {
    const prompt = trimPrompt(rawPrompt || activeWorkspace.promptDraft || "");
    if (!prompt) {
      setUi((current) => ({ ...current, promptError: "Write a prompt before sending." }));
      return;
    }

    const userMessage = createUserMessage(prompt);
    const loadingMessage = createLoadingMessage();

    setUi((current) => ({
      ...current,
      isSubmitting: true,
      promptError: "",
    }));

    updateWorkspace(activeWorkspace.id, (workspace) => ({
      ...workspace,
      promptDraft: "",
      messages: [...workspace.messages, userMessage, loadingMessage],
      lastOpenedAt: new Date().toISOString(),
    }));

    if (submitTimeoutRef.current) {
      window.clearTimeout(submitTimeoutRef.current);
    }

    submitTimeoutRef.current = window.setTimeout(() => {
      const assistantMessage = createAssistantPayload({
        prompt,
        workspaceName: activeWorkspace.name,
        modelLabel: selectedModel.label,
        selectedPackIds: activeWorkspace.selectedPackIds,
      });
      const job = createMockJob({
        prompt,
        assistantMessage,
        modelKey: activeWorkspace.modelKey,
      });

      updateWorkspace(activeWorkspace.id, (workspace) => {
        const messages = workspace.messages.filter((message) => !message.loading);
        const jobs = [job, ...workspace.jobs];
        return {
          ...workspace,
          messages: [...messages, assistantMessage],
          jobs,
          studioStatus:
            workspace.pluginInstalled && workspace.studioStatus !== "waiting" ? "syncing" : workspace.studioStatus,
          syncPulse: workspace.pluginInstalled,
          lastSyncedAt: workspace.pluginInstalled ? new Date().toISOString() : workspace.lastSyncedAt,
          explorerFiles: buildWorkspaceFiles(workspace.selectedPackIds, jobs),
        };
      });

      setUi((current) => ({ ...current, isSubmitting: false, activeDrawer: null }));

      if (activeWorkspace.pluginInstalled) {
        if (syncTimeoutRef.current) {
          window.clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = window.setTimeout(() => {
          patchActiveWorkspace({
            studioStatus: "connected",
            syncPulse: false,
          });
        }, 900);
      }
    }, 880);
  }

  const activeWorkspaceMessages = activeWorkspace?.messages || [];
  const activeWorkspaceJobs = activeWorkspace?.jobs || [];
  const selectedCollection = getCollectionById(activeCollection.id);

  return {
    appState,
    ui,
    activeWorkspace,
    activeWorkspaceMessages,
    activeWorkspaceJobs,
    filteredWorkspaces,
    recentWorkspaces,
    selectedModel,
    selectedCollection,
    workspaceExplorerTree,
    openAuthModal,
    closeAuthModal,
    continueMockSignIn,
    completeOnboarding,
    signOut,
    openDrawer,
    closeDrawer,
    openSettings,
    closeSettings,
    setWorkspaceSearch,
    setExplorerSearch,
    setPromptDraft,
    setModel,
    togglePack,
    toggleCollection,
    focusCollection,
    openWorkspaceModal,
    closeWorkspaceModal,
    submitWorkspaceForm,
    askDeleteWorkspace,
    closeDeleteWorkspace,
    deleteWorkspace,
    copyText,
    regeneratePairCode,
    reconnectStudio,
    setStudioInstalled,
    toggleExplorerNode,
    saveWorkspaceSettings,
    toggleSidebar,
    goHome,
    goWorkspace,
    openWorkspace,
    sendPrompt,
    usePromptSuggestion,
    setUi,
  };
}
