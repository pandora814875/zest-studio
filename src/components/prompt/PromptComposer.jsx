import { useRef } from "react";
import {
  BUILD_STAGE_SHORTCUTS,
  MAX_PROMPT_LENGTH,
} from "../../lib/constants";
import { useAutosizeTextarea } from "../../hooks/useAutosizeTextarea";

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  selectedModel,
  statusLabel,
  promptError,
  copyFeedback,
  centered = false,
}) {
  const textareaRef = useRef(null);
  useAutosizeTextarea(textareaRef, value);

  const trimmed = value.trim();
  const remaining = MAX_PROMPT_LENGTH - value.length;

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div
      className={`composer-panel ${centered ? "composer-panel-centered" : "composer-panel-docked"}`}
    >
      {promptError ? <div className="notice notice-error">{promptError}</div> : null}
      {copyFeedback ? <div className="notice notice-success">{copyFeedback}</div> : null}
      <div className={`composer-shell ${centered ? "composer-shell-centered" : ""}`}>
        <div className="build-stage-suggestions composer-suggestion-row">
          {BUILD_STAGE_SHORTCUTS.map((shortcut) => (
            <button
              className="suggestion-card suggestion-card-pill"
              key={shortcut.label}
              type="button"
              onClick={() => onChange(shortcut.prompt)}
            >
              {shortcut.label}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a mechanic, UI, or system you want Zest to build..."
          rows={1}
        />

        <div className="composer-footer composer-footer-clean">
          <div className="composer-meta">
            <span className="composer-pill">{selectedModel?.label || "Model"}</span>
            <span className="composer-pill">{statusLabel}</span>
            <span className={`composer-counter ${remaining < 40 ? "composer-counter-warning" : ""}`}>
              {value.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>
          <div className="composer-send-group">
            <span className="composer-hint">Ctrl+Enter to send</span>
            <button
              className="primary-button composer-send-button"
              type="button"
              onClick={onSubmit}
              disabled={!trimmed || isSubmitting}
            >
              {isSubmitting ? "Generating..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
