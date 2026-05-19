import { LOCAL_MODEL_CATALOG, PACK_COLLECTIONS, WORKSPACE_DRAWERS } from "../../lib/constants";
import { ChatHistory } from "../chat/ChatHistory";
import { ExplorerPanel } from "../explorer/ExplorerPanel";
import { PromptComposer } from "../prompt/PromptComposer";
import { Sidebar } from "../sidebar/Sidebar";
import { StudioPanel } from "../studio/StudioPanel";
import { HistoryPanel } from "./HistoryPanel";
import { LibraryPanel } from "./LibraryPanel";
import { WorkspaceDrawer } from "./WorkspaceDrawer";
import { EmptyBuildStage } from "./EmptyBuildStage";
import { WorkspaceSkeleton } from "./WorkspaceSkeleton";

export function WorkspaceShell({
  account,
  activeWorkspace,
  messages,
  jobs,
  filteredWorkspaces,
  recentWorkspaces,
  selectedCollection,
  explorerTree,
  ui,
  onHome,
  onToggleSidebar,
  onSearchWorkspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onOpenDrawer,
  onCloseDrawer,
  onOpenSettings,
  onCopyPairCode,
  onCopyPluginPath,
  onDownloadPlugin,
  onRegeneratePairCode,
  onReconnectStudio,
  onSetStudioInstalled,
  onToggleCollection,
  onSelectCollection,
  onTogglePack,
  onUsePrompt,
  onSearchExplorer,
  onToggleExplorerNode,
  onPromptChange,
  onSendPrompt,
  onSetModel,
  onSignOut,
}) {
  const activeDrawer = WORKSPACE_DRAWERS.find((drawer) => drawer.id === ui.activeDrawer);
  const selectedModel =
    LOCAL_MODEL_CATALOG.find((model) => model.key === activeWorkspace.modelKey) ||
    LOCAL_MODEL_CATALOG[0];
  const statusLabel =
    activeWorkspace.studioStatus === "connected"
      ? "Studio ready"
      : activeWorkspace.studioStatus === "syncing"
        ? "Syncing"
        : "Studio waiting";

  return (
    <div className="workspace-app workspace-app-clean">
      <Sidebar
        account={account}
        activeWorkspace={activeWorkspace}
        activeWorkspaceId={activeWorkspace.id}
        workspaces={filteredWorkspaces}
        recentWorkspaces={recentWorkspaces}
        search={ui.workspaceSearch}
        onSearch={onSearchWorkspaces}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
        onRenameWorkspace={onRenameWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        onHome={onHome}
        onOpenDrawer={onOpenDrawer}
        onCopyPairCode={onCopyPairCode}
        onToggleMobile={onToggleSidebar}
        mobileOpen={ui.mobileSidebarOpen}
      />

      <section className="main-shell main-shell-clean">
        <header className="main-header main-header-clean">
          <div className="main-header-copy">
            <span className="pane-eyebrow">Build</span>
            <h1>{activeWorkspace.name}</h1>
            <p>{activeWorkspace.description}</p>
          </div>
          <div className="main-header-actions">
            <div className="workspace-action-row workspace-action-row-centered workspace-action-row-wrap">
              {WORKSPACE_DRAWERS.map((drawer) => (
                <button
                  className={`workspace-action-chip ${
                    ui.activeDrawer === drawer.id ? "workspace-action-chip-active" : ""
                  }`}
                  key={drawer.id}
                  type="button"
                  onClick={() => onOpenDrawer(drawer.id)}
                >
                  {drawer.label}
                </button>
              ))}
              <button className="workspace-action-chip" type="button" onClick={() => onOpenSettings("models")}>
                Settings
              </button>
            </div>
            <label className="model-select-shell">
              <span>Model</span>
              <select value={activeWorkspace.modelKey} onChange={(event) => onSetModel(event.target.value)}>
                {LOCAL_MODEL_CATALOG.map((model) => (
                  <option key={model.key} value={model.key}>
                    {model.label} · {model.providerLabel}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="content-grid content-grid-clean">
          <section className="chat-panel chat-panel-clean">
            {ui.isWorkspaceLoading ? (
              <WorkspaceSkeleton />
            ) : messages.length ? (
              <>
                <div className="chat-scroll chat-scroll-thread">
                  <div className="thread-shell">
                    <div className="thread-topbar">
                      <span className="chat-empty-logo thread-logo">Zest</span>
                      <div className="thread-topbar-pills">
                        {PACK_COLLECTIONS.filter((collection) =>
                          collection.packIds.some((packId) => activeWorkspace.selectedPackIds.includes(packId)),
                        )
                          .slice(0, 3)
                          .map((collection) => (
                            <button
                              className="thread-pack-pill"
                              key={collection.id}
                              type="button"
                              onClick={() => onOpenDrawer("library")}
                            >
                              {collection.name}
                            </button>
                          ))}
                      </div>
                    </div>
                    <ChatHistory messages={messages} />
                  </div>
                </div>
                <PromptComposer
                  value={activeWorkspace.promptDraft}
                  onChange={onPromptChange}
                  onSubmit={onSendPrompt}
                  isSubmitting={ui.isSubmitting}
                  selectedModel={selectedModel}
                  statusLabel={statusLabel}
                  promptError={ui.promptError}
                  copyFeedback={ui.copyFeedback}
                />
              </>
            ) : (
              <>
                <EmptyBuildStage onOpenCollection={() => onOpenDrawer("library")} />
                <PromptComposer
                  value={activeWorkspace.promptDraft}
                  onChange={onPromptChange}
                  onSubmit={onSendPrompt}
                  isSubmitting={ui.isSubmitting}
                  selectedModel={selectedModel}
                  statusLabel={statusLabel}
                  promptError={ui.promptError}
                  copyFeedback={ui.copyFeedback}
                  centered
                />
              </>
            )}
          </section>
        </div>

        <WorkspaceDrawer
          open={Boolean(activeDrawer)}
          title={activeDrawer?.title}
          subtitle={activeDrawer?.subtitle}
          onClose={onCloseDrawer}
        >
          {ui.activeDrawer === "library" ? (
            <LibraryPanel
              activeWorkspace={activeWorkspace}
              selectedCollection={selectedCollection}
              onSelectCollection={onSelectCollection}
              onToggleCollection={onToggleCollection}
              onTogglePack={onTogglePack}
              onUsePrompt={onUsePrompt}
            />
          ) : null}
          {ui.activeDrawer === "explorer" ? (
            <ExplorerPanel
              search={ui.explorerSearch}
              onSearch={onSearchExplorer}
              tree={explorerTree}
              expandedIds={activeWorkspace.explorerExpandedIds}
              onToggle={onToggleExplorerNode}
            />
          ) : null}
          {ui.activeDrawer === "studio" ? (
            <StudioPanel
              workspace={activeWorkspace}
              onCopyPairCode={onCopyPairCode}
              onCopyPluginPath={onCopyPluginPath}
              onDownloadPlugin={onDownloadPlugin}
              onRegeneratePairCode={onRegeneratePairCode}
              onReconnect={onReconnectStudio}
              onSetInstalled={onSetStudioInstalled}
            />
          ) : null}
          {ui.activeDrawer === "jobs" ? <HistoryPanel jobs={jobs} /> : null}
        </WorkspaceDrawer>
      </section>
    </div>
  );
}
