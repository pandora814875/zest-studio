import { PRODUCT_FULL_NAME } from "../../lib/constants";
import { ModalShell } from "./ModalShell";

export function AuthModal({ open, onClose, onContinue, authError }) {
  return (
    <ModalShell open={open} onClose={onClose} className="dialog-card-auth">
      <button className="auth-modal-close" type="button" onClick={onClose}>
        ×
      </button>
      <div className="auth-modal-card">
        <div className="auth-modal-copy">
          <span className="sidebar-label">Official Roblox sign-in</span>
          <h2>Welcome to {PRODUCT_FULL_NAME}</h2>
          <p>
            Sign in through the real Roblox OAuth flow powered by Supabase Auth,
            then come back to the same Zest workspace and Studio pairing UI.
          </p>
          <button className="primary-button auth-modal-button" type="button" onClick={onContinue}>
            Sign in with Roblox
          </button>
          <ul className="auth-modal-list">
            <li>The homepage sign-in flow stays intact.</li>
            <li>Supabase handles the Roblox redirect and callback.</li>
            <li>Studio pairing still happens after login inside the workspace.</li>
          </ul>
          {authError ? <div className="auth-modal-error">{authError}</div> : null}
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
