import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCAL_MODEL_CATALOG,
  MAX_PROMPT_LENGTH,
  MAX_RECENT_WORKSPACES,
  PACK_COLLECTIONS,
  PACK_LIBRARY,
  STORAGE_KEY,
} from "../lib/constants";
import {
  buildExplorerTree,
  buildWorkspaceFiles,
  createLoadingMessage,
  createUserMessage,
  createWorkspaceToken,
  filterExplorerNodes,
  getCollectionById,
  getRecentWorkspaces,
  matchesSearch,
  pairCodeFromWorkspaceToken,
  trimPrompt,
} from "../lib/helpers";
import { createDefaultAppState, createWorkspaceFromInput } from "../lib/mockData";
import { SUPABASE_ANON_KEY, SUPABASE_URL, requireSupabase } from "../lib/supabaseClient";

const DEFAULT_EXPANDED_IDS = ["ServerScriptService", "StarterGui", "ReplicatedStorage"];
const EMPTY_AUTH_PROFILE = {
  displayName: "",
  username: "",
  role: "Roblox account",
};

const DEFAULT_UI = {
  view: "home",
  activeDrawer: null,
  workspaceSearch: "",
  explorerSearch: "",
  authModalOpen: false,
  authError: "",
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

function createEdgeHeaders(session, includeUserAuth = false) {
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };

  if (includeUserAuth && session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

function shouldUseUserAuth(workspace, session) {
  return workspace?.accessMode === "owned" && Boolean(session?.access_token);
}

function modelLabelFromKey(modelKey) {
  return LOCAL_MODEL_CATALOG.find((model) => model.key === modelKey)?.label || modelKey || "Model";
}

function buildSelectedPackPayload(selectedPackIds = []) {
  return selectedPackIds
    .map((packId) => {
      const pack = PACK_LIBRARY.find((item) => item.id === packId);
      const collection = PACK_COLLECTIONS.find((item) => item.packIds.includes(packId));

      if (!pack) {
        return null;
      }

      return {
        id: pack.id,
        name: pack.name,
        blurb: pack.description,
        systems: collection?.name || "",
      };
    })
    .filter(Boolean);
}

function normalizeWorkspace(workspace = {}) {
  const workspaceToken = workspace.workspaceToken || createWorkspaceToken();
  const selectedPackIds = Array.isArray(workspace.selectedPackIds)
    ? workspace.selectedPackIds.filter(Boolean)
    : ["inventory-ui"];
  const jobs = Array.isArray(workspace.jobs) ? workspace.jobs : [];
  const pluginOnline = Boolean(workspace.pluginOnline);
  const pluginInstalled =
    typeof workspace.pluginInstalled === "boolean"
      ? workspace.pluginInstalled
      : pluginOnline || Boolean(workspace.studioAuthorizedAt || workspace.studioUsername);
  const studioStatus =
    typeof workspace.studioStatus === "string" && workspace.studioStatus
      ? workspace.studioStatus
      : pluginOnline
        ? "connected"
        : pluginInstalled
          ? "pairing"
          : "waiting";

  return {
    ...workspace,
    workspaceToken,
    accessMode: workspace.accessMode || "guest",
    name: workspace.name || "Untitled Workspace",
    description: workspace.description || "",
    modelKey: workspace.modelKey || LOCAL_MODEL_CATALOG[0].key,
    selectedPackIds,
    promptDraft: workspace.promptDraft || "",
    messages: Array.isArray(workspace.messages) ? workspace.messages : [],
    jobs,
    pairCode: pairCodeFromWorkspaceToken(workspaceToken),
    pluginOnline,
    pluginInstalled,
    syncPulse: typeof workspace.syncPulse === "boolean" ? workspace.syncPulse : pluginOnline,
    studioStatus,
    lastSyncedAt: workspace.lastSyncedAt || "",
    lastOpenedAt: workspace.lastOpenedAt || new Date().toISOString(),
    createdAt: workspace.createdAt || new Date().toISOString(),
    explorerFiles:
      Array.isArray(workspace.explorerFiles) && workspace.explorerFiles.length
        ? workspace.explorerFiles
        : buildWorkspaceFiles(selectedPackIds, jobs),
    explorerExpandedIds:
      Array.isArray(workspace.explorerExpandedIds) && workspace.explorerExpandedIds.length
        ? workspace.explorerExpandedIds
        : DEFAULT_EXPANDED_IDS,
    studioUserId: workspace.studioUserId || null,
    studioUsername: workspace.studioUsername || "",
    studioDisplayName: workspace.studioDisplayName || "",
    studioAuthorizedAt: workspace.studioAuthorizedAt || "",
  };
}

function loadPersistedState() {
  const fallback = createDefaultAppState();

  if (typeof window === "undefined") {
    return {
      ...fallback,
      authProfile: EMPTY_AUTH_PROFILE,
      workspaces: fallback.workspaces.map(normalizeWorkspace),
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...fallback,
        authProfile: EMPTY_AUTH_PROFILE,
        workspaces: fallback.workspaces.map(normalizeWorkspace),
      };
    }

    const parsed = JSON.parse(raw);
    const workspaces = (parsed.workspaces?.length ? parsed.workspaces : fallback.workspaces).map(
      normalizeWorkspace,
    );
    const activeWorkspaceId = workspaces.some(
      (workspace) => workspace.id === parsed.activeWorkspaceId,
    )
      ? parsed.activeWorkspaceId
      : workspaces[0]?.id || fallback.activeWorkspaceId;

    return {
      ...fallback,
      ...parsed,
      isAuthenticated: false,
      authProfile: EMPTY_AUTH_PROFILE,
      workspaces,
      activeWorkspaceId,
    };
  } catch {
    return {
      ...fallback,
      authProfile: EMPTY_AUTH_PROFILE,
      workspaces: fallback.workspaces.map(normalizeWorkspace),
    };
  }
}

function getSessionProfile(session) {
  const user = session?.user;
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const identityData = identities
    .map((identity) =>
      identity && typeof identity === "object" && typeof identity.identity_data === "object"
        ? identity.identity_data
        : null,
    )
    .filter(Boolean);

  const usernameCandidates = [
    user?.user_metadata?.preferred_username,
    user?.user_metadata?.user_name,
    user?.user_metadata?.username,
    user?.user_metadata?.nickname,
    ...identityData.map((item) => item.preferred_username),
    ...identityData.map((item) => item.user_name),
    ...identityData.map((item) => item.username),
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const displayNameCandidates = [
    user?.user_metadata?.display_name,
    user?.user_metadata?.name,
    user?.user_metadata?.full_name,
    ...identityData.map((item) => item.name),
    ...identityData.map((item) => item.display_name),
    ...usernameCandidates,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return {
    username:
      usernameCandidates[0] ||
      (typeof user?.email === "string" && user.email.includes("@")
        ? user.email.split("@")[0]
        : "roblox"),
    displayName: displayNameCandidates[0] || usernameCandidates[0] || "Roblox user",
    role: "Roblox account",
  };
}

function mapJobOperation(operation, index, jobId) {
  const resolvedPath =
    String(operation?.path || "").trim() ||
    [operation?.parent_path, operation?.name].filter(Boolean).join("/");

  return {
    id: `${jobId}-operation-${index}`,
    label: String(operation?.description || operation?.type || "Workspace update"),
    path: resolvedPath,
  };
}

function mapJobRow(job = {}) {
  const operations = Array.isArray(job.operations)
    ? job.operations.map((operation, index) => mapJobOperation(operation, index, job.id))
    : [];
  const manualSteps = Array.isArray(job.manual_steps)
    ? job.manual_steps.map((step) => String(step))
    : [];

  return {
    id: job.id,
    title: job.title || "Generated plan",
    prompt: job.prompt || "",
    status: job.status || "queued",
    createdAt: job.created_at || new Date().toISOString(),
    modelKey: job.model_key || "",
    summary: job.summary || job.explanation || "Plan queued.",
    explanation: job.explanation || "",
    manualSteps,
    operations,
    rawOperations: Array.isArray(job.operations) ? job.operations : [],
  };
}

function buildCodeBlocksFromJob(job) {
  if (!job) {
    return [];
  }

  return (job.rawOperations || [])
    .filter((operation) => typeof operation?.source === "string" && operation.source.trim())
    .map((operation, index) => ({
      id: `${job.id}-code-${index}`,
      title: operation.name || operation.path?.split("/").at(-1) || `Script ${index + 1}`,
      language: "lua",
      path: operation.path || "",
      code: operation.source,
    }));
}

function mapAssistantMessage(row, jobsById) {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const linkedJob = jobsById.get(metadata.job_id) || null;
  const rawContent = typeof row.content === "string" ? row.content.trim() : "";
  const contentParts = rawContent.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  const summary = linkedJob?.summary || contentParts[1] || contentParts[0] || "Plan ready";
  const body = linkedJob?.explanation || rawContent || summary;

  return {
    id: row.id,
    role: "assistant",
    createdAt: row.created_at || new Date().toISOString(),
    summary,
    body,
    bullets: linkedJob?.manualSteps || [],
    tags: [
      linkedJob ? `${linkedJob.operations.length} ops` : null,
      linkedJob?.modelKey ? modelLabelFromKey(linkedJob.modelKey) : null,
    ].filter(Boolean),
    codeBlocks: buildCodeBlocksFromJob(linkedJob),
    text: rawContent,
  };
}

function mapMessageRow(row, jobsById) {
  if (row.role === "user") {
    return {
      id: row.id,
      role: "user",
      createdAt: row.created_at || new Date().toISOString(),
      text: typeof row.content === "string" ? row.content : "",
    };
  }

  return mapAssistantMessage(row, jobsById);
}

function mergeWorkspaceState(currentWorkspace, snapshot) {
  const mappedJobs = Array.isArray(snapshot.jobs) ? snapshot.jobs.map(mapJobRow) : [];
  const jobsById = new Map(mappedJobs.map((job) => [job.id, job]));
  const mappedMessages = Array.isArray(snapshot.messages)
    ? [...snapshot.messages].reverse().map((message) => mapMessageRow(message, jobsById))
    : currentWorkspace.messages;
  const project = snapshot.project || {};
  const workspaceToken = project.workspaceToken || currentWorkspace.workspaceToken || createWorkspaceToken();
  const selectedPackIds = Array.isArray(project.selectedPacks)
    ? project.selectedPacks
    : currentWorkspace.selectedPackIds;
  const pluginOnline = Boolean(snapshot.pluginOnline);
  const pluginInstalled =
    currentWorkspace.pluginInstalled ||
    pluginOnline ||
    Boolean(project.studioAuthorizedAt || project.studioUsername);

  return normalizeWorkspace({
    ...currentWorkspace,
    name: project.name || currentWorkspace.name,
    description: project.description ?? currentWorkspace.description,
    workspaceToken,
    accessMode: snapshot.accessMode || currentWorkspace.accessMode || "guest",
    modelKey: project.modelKey || currentWorkspace.modelKey,
    selectedPackIds,
    messages: mappedMessages,
    jobs: mappedJobs,
    pairCode: pairCodeFromWorkspaceToken(workspaceToken),
    pluginOnline,
    pluginInstalled,
    syncPulse: pluginOnline,
    studioStatus: pluginOnline ? "connected" : pluginInstalled ? "pairing" : "waiting",
    lastSyncedAt: snapshot.workspace?.last_seen_at || currentWorkspace.lastSyncedAt || "",
    explorerFiles: buildWorkspaceFiles(selectedPackIds, mappedJobs),
    studioUserId: project.studioUserId || null,
    studioUsername: project.studioUsername || "",
    studioDisplayName: project.studioDisplayName || "",
    studioAuthorizedAt: project.studioAuthorizedAt || "",
  });
}

async function parseEdgeResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The request failed.");
  }

  return data;
}

export function useZestAppState() {
  const [appState, setAppState] = useState(loadPersistedState);
  const [ui, setUi] = useState(DEFAULT_UI);
  const [session, setSession] = useState(null);
  const feedbackTimeoutRef = useRef(null);
  const appStateRef = useRef(appState);
  const sessionRef = useRef(session);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription;

    async function hydrateSession() {
      try {
        const client = requireSupabase();
        const { data, error } = await client.auth.getSession();

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        const nextSession = data.session || null;
        setSession(nextSession);

        if (nextSession?.user) {
          setAppState((current) => ({
            ...current,
            isAuthenticated: true,
            authProfile: getSessionProfile(nextSession),
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setUi((current) => ({
            ...current,
            authError:
              error instanceof Error ? error.message : "Supabase auth is not configured correctly.",
          }));
        }
      }
    }

    try {
      const client = requireSupabase();
      hydrateSession();

      const authListener = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession || null);

        if (nextSession?.user) {
          setAppState((current) => ({
            ...current,
            isAuthenticated: true,
            authProfile: getSessionProfile(nextSession),
          }));
          setUi((current) => ({
            ...current,
            authModalOpen: false,
            authError: "",
            onboardingOpen: !appStateRef.current.hasCompletedOnboarding,
            view: "workspace",
          }));
          return;
        }

        setAppState((current) => ({
          ...current,
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          onboardingChoice: "",
          authProfile: EMPTY_AUTH_PROFILE,
        }));
        setUi((current) => ({
          ...current,
          authModalOpen: false,
          authError: "",
          onboardingOpen: false,
          settingsOpen: false,
          activeDrawer: null,
          view: "home",
        }));
      });

      subscription = authListener.data.subscription;
    } catch (error) {
      if (!cancelled) {
        setUi((current) => ({
          ...current,
          authError:
            error instanceof Error ? error.message : "Supabase auth is not configured correctly.",
        }));
      }
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
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

  const activeCollection = useMemo(() => getCollectionById(ui.collectionId), [ui.collectionId]);

  const workspaceExplorerTree = useMemo(
    () =>
      filterExplorerNodes(buildExplorerTree(activeWorkspace?.explorerFiles || []), ui.explorerSearch),
    [activeWorkspace?.explorerFiles, ui.explorerSearch],
  );

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
        workspace.id === workspaceId ? normalizeWorkspace(updater(workspace)) : workspace,
      ),
    }));
  }

  function patchActiveWorkspace(patch) {
    if (!activeWorkspace) {
      return;
    }

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
    setUi((current) => ({ ...current, authModalOpen: true, authError: "" }));
  }

  function closeAuthModal() {
    setUi((current) => ({ ...current, authModalOpen: false, authError: "" }));
  }

  async function continueMockSignIn() {
    try {
      const client = requireSupabase();
      setUi((current) => ({ ...current, authError: "" }));
      const { error } = await client.auth.signInWithOAuth({
        provider: "custom:roblox",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setUi((current) => ({
        ...current,
        authError: error instanceof Error ? error.message : "Unable to start Roblox sign-in.",
      }));
    }
  }

  function completeOnboarding(choice) {
    setAppState((current) => ({
      ...current,
      hasCompletedOnboarding: true,
      onboardingChoice: choice,
    }));
    setUi((current) => ({ ...current, onboardingOpen: false, view: "workspace" }));
  }

  async function signOut() {
    try {
      const client = requireSupabase();
      await client.auth.signOut();
    } catch {
      // Best effort: local state is still cleared below if auth is unavailable.
    }

    setSession(null);
    setAppState((current) => ({
      ...current,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      onboardingChoice: "",
      authProfile: EMPTY_AUTH_PROFILE,
    }));
    setUi((current) => ({
      ...current,
      view: "home",
      activeDrawer: null,
      settingsOpen: false,
      authError: "",
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
    setUi((current) => ({ ...current, promptError: "" }));
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
      const workspace = normalizeWorkspace(createWorkspaceFromInput(values));
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

  async function requestWorkspaceState(workspace, options = {}) {
    const includeUserAuth = shouldUseUserAuth(workspace, sessionRef.current);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/workspace-state`, {
      method: "POST",
      headers: createEdgeHeaders(sessionRef.current, includeUserAuth),
      body: JSON.stringify({
        workspaceToken: workspace.workspaceToken,
        ensure: options.ensure ?? true,
        name: workspace.name,
        description: workspace.description,
        modelKey: workspace.modelKey,
        selectedPacks: workspace.selectedPackIds,
      }),
    });

    return parseEdgeResponse(response);
  }

  async function refreshWorkspaceState(workspaceId, options = {}) {
    const workspace = appStateRef.current.workspaces.find((item) => item.id === workspaceId);
    if (!workspace?.workspaceToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }

    const snapshot = await requestWorkspaceState(workspace, options);
    updateWorkspace(workspaceId, (current) => mergeWorkspaceState(current, snapshot));
    return snapshot;
  }

  function regeneratePairCode() {
    setCopyFeedback("Pair codes stay tied to the workspace token until rotation is added server-side.");
  }

  async function reconnectStudio() {
    if (!activeWorkspace) {
      return;
    }

    updateWorkspace(activeWorkspace.id, (workspace) => ({
      ...workspace,
      syncPulse: true,
      studioStatus: workspace.pluginOnline ? "syncing" : workspace.pluginInstalled ? "pairing" : "waiting",
    }));

    try {
      await refreshWorkspaceState(activeWorkspace.id, { ensure: false });
    } catch {
      updateWorkspace(activeWorkspace.id, (workspace) => ({
        ...workspace,
        syncPulse: false,
        studioStatus: workspace.pluginOnline ? "connected" : workspace.pluginInstalled ? "pairing" : "waiting",
      }));
    }
  }

  function setStudioInstalled(installed) {
    patchActiveWorkspace({
      pluginInstalled: installed,
      studioStatus: activeWorkspace.pluginOnline ? "connected" : installed ? "pairing" : "waiting",
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
    setUi((current) => ({ ...current, activeDrawer: null, promptError: "" }));
  }

  async function sendPrompt(rawPrompt) {
    const prompt = trimPrompt(rawPrompt || activeWorkspace?.promptDraft || "");
    if (!prompt || !activeWorkspace) {
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
      syncPulse: workspace.pluginOnline,
      studioStatus: workspace.pluginOnline ? "syncing" : workspace.studioStatus,
    }));

    try {
      const workspaceSnapshot =
        appStateRef.current.workspaces.find((workspace) => workspace.id === activeWorkspace.id) ||
        activeWorkspace;

      const ensuredWorkspace = await requestWorkspaceState(workspaceSnapshot, { ensure: true });

      updateWorkspace(activeWorkspace.id, (workspace) => ({
        ...mergeWorkspaceState(workspace, ensuredWorkspace),
        messages: workspace.messages,
        promptDraft: "",
      }));

      const latestWorkspace =
        appStateRef.current.workspaces.find((workspace) => workspace.id === activeWorkspace.id) ||
        workspaceSnapshot;
      const includeUserAuth = shouldUseUserAuth(latestWorkspace, sessionRef.current);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-job`, {
        method: "POST",
        headers: createEdgeHeaders(sessionRef.current, includeUserAuth),
        body: JSON.stringify({
          workspaceToken: latestWorkspace.workspaceToken,
          prompt,
          modelKey: latestWorkspace.modelKey,
          projectDescription: latestWorkspace.description,
          selectedPacks: buildSelectedPackPayload(latestWorkspace.selectedPackIds),
        }),
      });
      const result = await parseEdgeResponse(response);

      updateWorkspace(activeWorkspace.id, (workspace) => mergeWorkspaceState(workspace, result.workspace));
      setUi((current) => ({
        ...current,
        isSubmitting: false,
        activeDrawer: null,
        promptError: "",
      }));
    } catch (error) {
      updateWorkspace(activeWorkspace.id, (workspace) => ({
        ...workspace,
        promptDraft: prompt,
        messages: workspace.messages.filter(
          (message) => message.id !== userMessage.id && message.id !== loadingMessage.id,
        ),
        syncPulse: false,
        studioStatus: workspace.pluginOnline ? "connected" : workspace.pluginInstalled ? "pairing" : "waiting",
      }));

      setUi((current) => ({
        ...current,
        isSubmitting: false,
        promptError: error instanceof Error ? error.message : "Unable to generate this job.",
      }));
    }
  }

  useEffect(() => {
    if (!activeWorkspace?.id || !activeWorkspace.workspaceToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const snapshot = await requestWorkspaceState(
          appStateRef.current.workspaces.find((workspace) => workspace.id === activeWorkspace.id) ||
            activeWorkspace,
          { ensure: true },
        );

        if (cancelled) {
          return;
        }

        updateWorkspace(activeWorkspace.id, (workspace) => mergeWorkspaceState(workspace, snapshot));
      } catch {
        if (cancelled) {
          return;
        }

        updateWorkspace(activeWorkspace.id, (workspace) => ({
          ...workspace,
          pluginOnline: false,
          syncPulse: false,
          studioStatus: workspace.pluginInstalled ? "pairing" : "waiting",
        }));
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeWorkspace?.id,
    activeWorkspace?.workspaceToken,
    activeWorkspace?.name,
    activeWorkspace?.description,
    activeWorkspace?.modelKey,
    activeWorkspace?.selectedPackIds?.join("|"),
  ]);

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
