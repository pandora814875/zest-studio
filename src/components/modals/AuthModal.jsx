import { PRODUCT_FULL_NAME } from "../../lib/constants";
import { ModalShell } from "./ModalShell";

export function AuthModal({ open, onClose, onContinue }) {
  return (
    <ModalShell open={open} onClose={onClose} className="dialog-card-auth">
      <button className="auth-modal-close" type="button" onClick={onClose}>
        ×
      </button>
      <div className="auth-modal-card">
        <div className="auth-modal-copy">
          <span className="sidebar-label">Mock auth preview</span>
          <h2>Welcome to {PRODUCT_FULL_NAME}</h2>
          <p>
            This is a frontend-only Roblox sign-in preview. It keeps the same product
            flow and visual feel without calling a real auth provider yet.
          </p>
          <button className="primary-button auth-modal-button" type="button" onClick={onContinue}>
            Continue as Roblox user
          </button>
          <ul className="auth-modal-list">
            <li>The homepage flow stays intact.</li>
            <li>No backend or real OAuth is used in this build.</li>
            <li>You can still preview Studio pairing and workspace behavior.</li>
          </ul>
          <div className="auth-modal-warning">
            Local preview only. This sign-in state is stored in your browser.
          </div>
        </div>
        <div className="auth-modal-preview">
          <div className="auth-preview-stack">
            <div className="auth-preview-pill">Official Roblox redirect</div>
            <div className="auth-preview-card">
              <strong>Roblox account</strong>
              <span>Read User ID</span>
              <span>Read User Profile</span>
            </div>
            <div className="auth-preview-card auth-preview-card-active">
              <strong>Studio unlock</strong>
              <span>Homepage sign-in</span>
              <span>Plugin setup after login</span>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
