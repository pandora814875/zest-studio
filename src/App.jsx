import { useEffect, useState } from "react";
import pluginSource from "../plugin/robolua-plugin.lua?raw";
import { PLUGIN_FOLDER_HINT } from "./lib/constants";
import { useZestAppState } from "./hooks/useZestAppState";
import { AuthModal } from "./components/modals/AuthModal";
import { BillingModal } from "./components/modals/BillingModal";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { CreatePackModal } from "./components/modals/CreatePackModal";
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
  const [billingOpen, setBillingOpen] = useState(false);
  const {
    appState,
    ui,
    activeWorkspace,
    activeWorkspaceMessages,
    activeWorkspaceJobs,
    systemPacks,
    filteredWorkspaces,
    recentWorkspaces,
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
    openWorkspaceModal,
    closeWorkspaceModal,
    submitWorkspaceForm,
    openCreatePackModal,
    closeCreatePackModal,
    submitCreatePack,
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

  useEffect(() => {
    const className = "app-shell-mode";

    if (ui.view === "workspace") {
      document.body.classList.add(className);
      return () => {
        document.body.classList.remove(className);
      };
    }

    document.body.classList.remove(className);
    return undefined;
  }, [ui.view]);

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
          systemPacks={systemPacks}
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
          onOpenCreatePack={openCreatePackModal}
          onCopyPairCode={handleCopyPairCode}
          onCopyPluginPath={handleCopyPluginPath}
          onDownloadPlugin={downloadPluginFile}
          onRegeneratePairCode={regeneratePairCode}
          onReconnectStudio={reconnectStudio}
          onSetStudioInstalled={setStudioInstalled}
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

      <AuthModal
        open={ui.authModalOpen}
        onClose={closeAuthModal}
        onContinue={continueMockSignIn}
        authError={ui.authError}
      />

      <OnboardingModal
        open={ui.onboardingOpen}
        onClose={() => setUi((current) => ({ ...current, onboardingOpen: false }))}
        onSelect={completeOnboarding}
      />

      <WorkspaceFormModal
        open={Boolean(ui.workspaceModal)}
        mode={ui.workspaceModal?.mode}
        workspace={modalWorkspace}
        packs={systemPacks}
        error={ui.workspaceModalError}
        onClose={closeWorkspaceModal}
        onSubmit={submitWorkspaceForm}
      />

      <CreatePackModal
        open={ui.createPackModalOpen}
        error={ui.createPackError}
        isSubmitting={ui.isCreatingPack}
        onClose={closeCreatePackModal}
        onSubmit={submitCreatePack}
      />

      <ConfirmModal
        open={Boolean(ui.deleteWorkspaceId)}
        title="Delete workspace?"
        body="This permanently removes the workspace row from Supabase along with its related history."
        error={ui.deleteWorkspaceError}
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
        onOpenBilling={() => setBillingOpen(true)}
        onCopyPluginPath={handleCopyPluginPath}
        onSignOut={signOut}
      />

      <BillingModal
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        workspace={activeWorkspace}
      />
    </>
  );
}
