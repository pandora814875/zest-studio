export function WorkspaceDrawer({ open, title, subtitle, onClose, children }) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button className="workspace-drawer-scrim" type="button" onClick={onClose} aria-label="Close panel" />
      <aside className="workspace-drawer">
        <div className="workspace-drawer-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="drawer-close-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="workspace-drawer-body">{children}</div>
      </aside>
    </>
  );
}
