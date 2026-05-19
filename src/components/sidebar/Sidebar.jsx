import { BrandLockup } from "../common/BrandLockup";

const QUICK_LINKS = [
  { id: "library", label: "Systems" },
  { id: "explorer", label: "Explorer" },
  { id: "studio", label: "Studio" },
  { id: "jobs", label: "History" },
];

export function Sidebar({
  account,
  activeWorkspaceId,
  workspaces,
  recentWorkspaces,
  search,
  onSearch,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onHome,
  onOpenDrawer,
  onCopyPairCode,
  onToggleMobile,
  mobileOpen,
  activeWorkspace,
}) {
  return (
    <>
      <button className="sidebar-mobile-toggle" type="button" onClick={onToggleMobile}>
        {mobileOpen ? "Close" : "Menu"}
      </button>
      <aside className={`sidebar sidebar-clean ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-top">
          <button className="home-back-btn" type="button" onClick={onHome}>
            Back Home
          </button>
          <BrandLockup />
          <div className="studio-identity-card studio-identity-card-subtle">
            <strong>@{account.username}</strong>
            <span>Signed in with Roblox</span>
          </div>
          <button className="primary-button new-workspace-button" type="button" onClick={onCreateWorkspace}>
            + New Workspace
          </button>
          <label className="field field-compact">
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search workspaces..."
            />
          </label>
        </div>

        {recentWorkspaces.length ? (
          <div className="sidebar-section">
            <div className="sidebar-label">Recent</div>
            <div className="recent-workspace-list">
              {recentWorkspaces.map((workspace) => (
                <button
                  className="recent-workspace-card"
                  key={workspace.id}
                  type="button"
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  <strong>{workspace.name}</strong>
                  <span>{workspace.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="sidebar-section">
          <div className="sidebar-label">Workspaces</div>
          <div className="workspace-list">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspaceId;
              return (
                <div className={`workspace-item workspace-item-shell ${active ? "workspace-item-active" : ""}`} key={workspace.id}>
                  <button className="workspace-item-main" type="button" onClick={() => onSelectWorkspace(workspace.id)}>
                    <div className="workspace-item-copy">
                      <strong>{workspace.name}</strong>
                      <span>{workspace.description}</span>
                    </div>
                  </button>
                  <div className="workspace-item-actions">
                    <button className="workspace-item-icon" type="button" onClick={() => onRenameWorkspace(workspace)}>
                      ✎
                    </button>
                    {workspaces.length > 1 ? (
                      <button className="workspace-item-icon workspace-item-icon-danger" type="button" onClick={() => onDeleteWorkspace(workspace.id)}>
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Open</div>
          <div className="workspace-nav">
            {QUICK_LINKS.map((link) => (
              <button className="workspace-nav-item" key={link.id} type="button" onClick={() => onOpenDrawer(link.id)}>
                <strong>{link.label}</strong>
                <span>Open {link.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section sidebar-bottom">
          <div className="sidebar-label">Status</div>
          <div className="sidebar-card sidebar-status-card">
            <div className="status-line">
              <span className={`status-dot ${activeWorkspace.studioStatus === "connected" ? "status-dot-live" : ""}`} />
              <span>{activeWorkspace.studioStatus === "connected" ? "Studio connected" : "Studio waiting"}</span>
            </div>
            <p className="sidebar-status-copy">
              Use the Studio drawer to pair, reconnect, or regenerate the code when you need it.
            </p>
            <div className="sidebar-inline-actions">
              <button className="secondary-button sidebar-inline-button" type="button" onClick={() => onOpenDrawer("studio")}>
                Open Studio
              </button>
              <button className="secondary-button sidebar-inline-button" type="button" onClick={() => onCopyPairCode(activeWorkspace.pairCode)}>
                Copy code
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
