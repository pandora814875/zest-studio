import { LOCAL_MODEL_CATALOG, PLUGIN_FOLDER_HINT, SETTINGS_SECTIONS } from "../../lib/constants";
import { ModalShell } from "../modals/ModalShell";

export function SettingsModal({
  open,
  section,
  workspace,
  account,
  onClose,
  onSectionChange,
  onSaveWorkspace,
  onOpenBilling,
  onCopyPluginPath,
  onSignOut,
}) {
  const content = {
    models: (
      <div className="settings-section-body">
        <h3>Models</h3>
        <p className="drawer-copy">Pick the model that the generate-job Edge Function should route to next.</p>
        <div className="settings-model-list">
          {LOCAL_MODEL_CATALOG.map((model) => (
            <div className={`settings-model-card ${workspace.modelKey === model.key ? "settings-model-card-active" : ""}`} key={model.key}>
              <div>
                <strong>{model.label}</strong>
                <span>{model.providerLabel}</span>
              </div>
              <p>{model.summary}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    workspace: (
      <div className="settings-section-body">
        <h3>Workspace settings</h3>
        <p className="drawer-copy">Workspace details are editable through the create and rename modal flow.</p>
        <div className="settings-detail-grid">
          <div className="settings-detail-card">
            <strong>{workspace.name}</strong>
            <span>{workspace.description}</span>
          </div>
          <div className="settings-detail-card">
            <strong>Loaded packs</strong>
            <span>{workspace.selectedPackIds.length} active systems</span>
          </div>
          <div className="settings-detail-card">
            <strong>Plan state</strong>
            <span>{workspace.billingStatus || "free"}</span>
          </div>
        </div>
      </div>
    ),
    plugin: (
      <div className="settings-section-body">
        <h3>Plugin settings</h3>
        <p className="drawer-copy">Keep install details and reconnect actions away from the main build canvas.</p>
        <div className="settings-detail-grid">
          <div className="settings-detail-card">
            <strong>Plugin folder</strong>
            <span>{PLUGIN_FOLDER_HINT}</span>
            <button className="secondary-button" type="button" onClick={onCopyPluginPath}>
              Copy path
            </button>
          </div>
          <div className="settings-detail-card">
            <strong>Pairing state</strong>
            <span>{workspace.studioStatus}</span>
          </div>
        </div>
      </div>
    ),
    account: (
      <div className="settings-section-body">
        <h3>Account settings</h3>
        <p className="drawer-copy">Your Roblox identity now comes from the live Supabase session.</p>
        <div className="settings-detail-grid">
          <div className="settings-detail-card">
            <strong>@{account.username}</strong>
            <span>{account.displayName}</span>
          </div>
          <div className="settings-detail-card">
            <strong>Mode</strong>
            <span>{account.role}</span>
          </div>
          <div className="settings-detail-card">
            <strong>Billing</strong>
            <span>Upgrade this workspace to Pro or Studio.</span>
            <button className="primary-button" type="button" onClick={onOpenBilling}>
              Open billing
            </button>
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    ),
  };

  return (
    <ModalShell open={open} onClose={onClose} className="settings-modal-card">
      <div className="settings-modal-layout">
        <div className="settings-modal-sidebar">
          <div>
            <span className="sidebar-label">Settings</span>
            <h2>Workspace controls</h2>
          </div>
          <div className="settings-nav">
            {SETTINGS_SECTIONS.map((item) => (
              <button
                className={`settings-nav-item ${section === item.id ? "settings-nav-item-active" : ""}`}
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-modal-content">
          <button className="drawer-close-button settings-modal-close" type="button" onClick={onClose}>
            ×
          </button>
          {content[section]}
        </div>
      </div>
    </ModalShell>
  );
}
