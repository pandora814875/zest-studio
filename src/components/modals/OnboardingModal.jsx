import { ONBOARDING_OPTIONS } from "../../lib/constants";
import { ModalShell } from "./ModalShell";

export function OnboardingModal({ open, onClose, onSelect }) {
  return (
    <ModalShell open={open} onClose={onClose} className="dialog-card-onboarding">
      <button className="auth-modal-close" type="button" onClick={onClose}>
        ×
      </button>
      <div className="onboarding-modal">
        <div className="onboarding-copy">
          <span className="sidebar-label">Step 1 of 1</span>
          <h2>Which best describes you right now?</h2>
          <p>Choose a starting mode. You can still change direction once you are inside the workspace.</p>
        </div>

        <div className="onboarding-grid">
          {ONBOARDING_OPTIONS.map((option) => (
            <button
              className="onboarding-card"
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
            >
              <strong>{option.title}</strong>
              <p>{option.body}</p>
              <span>{option.badge}</span>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
