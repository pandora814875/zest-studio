import { PLUGIN_FOLDER_HINT } from "../../lib/constants";
import { formatDateTime } from "../../lib/helpers";

export function StudioPanel({
  workspace,
  onCopyPairCode,
  onCopyPluginPath,
  onDownloadPlugin,
  onRegeneratePairCode,
  onReconnect,
  onSetInstalled,
}) {
  const connected = Boolean(workspace.pluginOnline);
  const syncing = workspace.studioStatus === "syncing";
  const statusLabel = connected
    ? "connected"
    : syncing
      ? "syncing"
      : workspace.pluginInstalled
        ? "pairing"
        : "waiting";

  return (
    <div className="drawer-stack">
      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Connection status</h3>
            <p className="drawer-copy">This now reads the live plugin heartbeat from the workspace-state function.</p>
          </div>
          <span className={`studio-status-pill studio-status-${statusLabel}`}>
            {statusLabel}
          </span>
        </div>
        <div className="studio-pair-grid">
          <div className="studio-pair-code-card">
            <span className="sidebar-label">Pair code</span>
            <strong>{workspace.pairCode}</strong>
            <div className="studio-action-row">
              <button className="secondary-button" type="button" onClick={() => onCopyPairCode(workspace.pairCode)}>
                Copy code
              </button>
              <button className="secondary-button" type="button" onClick={onRegeneratePairCode}>
                Regenerate
              </button>
            </div>
          </div>
          <div className="studio-sync-card">
            <span className="sidebar-label">Sync</span>
            <strong>{syncing ? "Sync pulse active" : connected ? "Studio connected" : "Waiting for Studio"}</strong>
            <span>
              {workspace.lastSyncedAt
                ? `Last synced ${formatDateTime(workspace.lastSyncedAt)}`
                : "No sync activity yet"}
            </span>
            <div className={`studio-sync-indicator ${workspace.pluginOnline ? "studio-sync-indicator-live" : ""}`} />
          </div>
        </div>
      </div>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Plugin install</h3>
            <p className="drawer-copy">Install the plugin once, then keep reconnecting from the same focused Studio panel.</p>
          </div>
        </div>
        <ol className="studio-step-list">
          <li>Download the plugin file.</li>
          <li>Move it into the Roblox plugins folder.</li>
          <li>Restart Studio and enter the pair code.</li>
        </ol>
        <div className="studio-action-row">
          <button className="primary-button" type="button" onClick={onDownloadPlugin}>
            Download plugin
          </button>
          <button className="secondary-button" type="button" onClick={onCopyPluginPath}>
            Copy plugin path
          </button>
        </div>
        <div className="studio-path-hint">{PLUGIN_FOLDER_HINT}</div>
      </div>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Connected Studio state</h3>
            <p className="drawer-copy">The install toggle is local, but the connected label only comes from the live plugin heartbeat.</p>
          </div>
        </div>
        <div className="studio-toggle-row">
          <button
            className={`workspace-action-chip ${workspace.pluginInstalled ? "workspace-action-chip-active" : ""}`}
            type="button"
            onClick={() => onSetInstalled(!workspace.pluginInstalled)}
          >
            {workspace.pluginInstalled ? "Plugin installed" : "Mark plugin installed"}
          </button>
          <button className="secondary-button" type="button" onClick={onReconnect}>
            Reconnect Studio
          </button>
        </div>
      </div>
    </div>
  );
}
