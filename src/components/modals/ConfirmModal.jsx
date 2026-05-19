import { ModalShell } from "./ModalShell";

export function ConfirmModal({ open, title, body, onCancel, onConfirm, confirmLabel = "Delete" }) {
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
