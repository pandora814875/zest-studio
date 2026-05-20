import { ModalShell } from "./ModalShell";

export function ConfirmModal({
  open,
  title,
  body,
  error,
  onCancel,
  onConfirm,
  confirmLabel = "Delete",
}) {
  return (
    <ModalShell open={open} onClose={onCancel}>
      <div className="dialog-form">
        <div className="dialog-head">
          <div>
            <span className="sidebar-label">Confirm action</span>
            <h2>{title}</h2>
          </div>
        </div>
        <p className="drawer-copy">{body}</p>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button button-danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
