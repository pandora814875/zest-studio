import pluginSource from "../plugin/robolua-plugin.lua?raw";
import { PRODUCT_NAME, PLUGIN_FOLDER_HINT } from "./lib/constants";
import { useZestAppState } from "./hooks/useZestAppState";
import { AuthModal } from "./components/modals/AuthModal";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { OnboardingModal } from "./components/modals/OnboardingModal";
import { WorkspaceFormModal } from "./components/modals/WorkspaceFormModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { HomePage } from "./components/workspace/HomePage";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell";

function downloadPluginFile() {
  const blob = new Blob([pluginSource], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "zest-studio-plugin.lua";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function App() {
  const {
    appState,
    ui,
    activeWorkspace,
    activeWorkspaceMessages,
    activeWorkspaceJobs,
    filteredWorkspaces,
    recentWorkspaces,
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
    toggleSidebar,
    goHome,
    goWorkspace,
    openWorkspace,
    sendPrompt,
    usePromptSuggestion,
    setUi,
  } = useZestAppState();

  const modalWorkspace =
    appState.workspaces.find((workspace) => workspace.id === ui.workspaceModal?.workspaceId) || null;

  function handlePrimaryAction() {
    if (!appState.isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!appState.hasCompletedOnboarding) {
      setUi((current) => ({ ...current, onboardingOpen: true, view: "workspace" }));
      return;
    }

    goWorkspace();
  }

  async function handleCopyPluginPath() {
    await copyText(PLUGIN_FOLDER_HINT, "Plugin path");
  }

  async function handleCopyPairCode(pairCode = activeWorkspace.pairCode) {
    await copyText(pairCode, "Pair code");
  }

  return (
    <>
      {ui.view === "home" ? (
        <HomePage
          isAuthenticated={appState.isAuthenticated}
          hasCompletedOnboarding={appState.hasCompletedOnboarding}
          authProfile={appState.authProfile}
          workspaceName={activeWorkspace.name}
          pairCode={activeWorkspace.pairCode}
          onPrimaryAction={handlePrimaryAction}
          onOpenAuth={openAuthModal}
          onDownloadPlugin={downloadPluginFile}
          onCopyPairCode={handleCopyPairCode}
          onCopyPluginPath={handleCopyPluginPath}
        />
      ) : (
        <WorkspaceShell
          account={appState.authProfile}
          activeWorkspace={activeWorkspace}
          messages={activeWorkspaceMessages}
          jobs={activeWorkspaceJobs}
          filteredWorkspaces={filteredWorkspaces}
          recentWorkspaces={recentWorkspaces}
          selectedCollection={selectedCollection}
          explorerTree={workspaceExplorerTree}
          ui={ui}
          onHome={goHome}
          onToggleSidebar={toggleSidebar}
          onSearchWorkspaces={setWorkspaceSearch}
          onSelectWorkspace={openWorkspace}
          onCreateWorkspace={() => openWorkspaceModal("create")}
          onRenameWorkspace={(workspace) => openWorkspaceModal("rename", workspace)}
          onDeleteWorkspace={askDeleteWorkspace}
          onOpenDrawer={openDrawer}
          onCloseDrawer={closeDrawer}
          onOpenSettings={openSettings}
          onCopyPairCode={handleCopyPairCode}
          onCopyPluginPath={handleCopyPluginPath}
          onDownloadPlugin={downloadPluginFile}
          onRegeneratePairCode={regeneratePairCode}
          onReconnectStudio={reconnectStudio}
          onSetStudioInstalled={setStudioInstalled}
          onToggleCollection={toggleCollection}
          onSelectCollection={focusCollection}
          onTogglePack={togglePack}
          onUsePrompt={usePromptSuggestion}
          onSearchExplorer={setExplorerSearch}
          onToggleExplorerNode={toggleExplorerNode}
          onPromptChange={setPromptDraft}
          onSendPrompt={() => sendPrompt(activeWorkspace.promptDraft)}
          onSetModel={setModel}
          onSignOut={signOut}
        />
      )}

      <AuthModal open={ui.authModalOpen} onClose={closeAuthModal} onContinue={continueMockSignIn} />

      <OnboardingModal
        open={ui.onboardingOpen}
        onClose={() => setUi((current) => ({ ...current, onboardingOpen: false }))}
        onSelect={completeOnboarding}
      />

      <WorkspaceFormModal
        open={Boolean(ui.workspaceModal)}
        mode={ui.workspaceModal?.mode}
        workspace={modalWorkspace}
        onClose={closeWorkspaceModal}
        onSubmit={submitWorkspaceForm}
      />

      <ConfirmModal
        open={Boolean(ui.deleteWorkspaceId)}
        title="Delete workspace?"
        body="This removes the local mock workspace, recent history, and pairing preview state from the browser."
        onCancel={closeDeleteWorkspace}
        onConfirm={deleteWorkspace}
        confirmLabel="Delete workspace"
      />

      <SettingsModal
        open={ui.settingsOpen}
        section={ui.settingsSection}
        workspace={activeWorkspace}
        account={appState.authProfile}
        onClose={closeSettings}
        onSectionChange={(section) => setUi((current) => ({ ...current, settingsSection: section }))}
        onCopyPluginPath={handleCopyPluginPath}
        onSignOut={signOut}
      />
    </>
  );
}
