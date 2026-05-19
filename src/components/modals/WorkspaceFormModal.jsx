import { useEffect, useMemo, useState } from "react";
import { LOCAL_MODEL_CATALOG, PACK_LIBRARY } from "../../lib/constants";
import { ModalShell } from "./ModalShell";

export function WorkspaceFormModal({ open, mode, workspace, onClose, onSubmit }) {
  const initialState = useMemo(
    () => ({
      name: workspace?.name || "",
      description: workspace?.description || "",
      modelKey: workspace?.modelKey || LOCAL_MODEL_CATALOG[0].key,
      selectedPackIds: workspace?.selectedPackIds || ["inventory-ui"],
    }),
    [workspace],
  );

  const [values, setValues] = useState(initialState);

  useEffect(() => {
    setValues(initialState);
  }, [initialState]);

  if (!open) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  function togglePack(packId) {
    setValues((current) => ({
      ...current,
      selectedPackIds: current.selectedPackIds.includes(packId)
        ? current.selectedPackIds.filter((item) => item !== packId)
        : [...current.selectedPackIds, packId],
    }));
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="dialog-head">
          <div>
            <span className="sidebar-label">{mode === "rename" ? "Rename workspace" : "Create workspace"}</span>
            <h2>{mode === "rename" ? "Update workspace details" : "Create a new workspace"}</h2>
          </div>
          <button className="drawer-close-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="Inventory Revamp"
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="A clean Roblox workspace for UI, systems, and Studio previews."
            required
          />
        </label>

        <label className="field">
          <span>Default model</span>
          <select
            value={values.modelKey}
            onChange={(event) => setValues((current) => ({ ...current, modelKey: event.target.value }))}
          >
            {LOCAL_MODEL_CATALOG.map((model) => (
              <option key={model.key} value={model.key}>
                {model.label} · {model.providerLabel}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Starter packs</span>
          <div className="workspace-pack-grid">
            {PACK_LIBRARY.map((pack) => (
              <button
                className={`workspace-pack-toggle ${
                  values.selectedPackIds.includes(pack.id) ? "workspace-pack-toggle-active" : ""
                }`}
                key={pack.id}
                type="button"
                onClick={() => togglePack(pack.id)}
              >
                <strong>{pack.name}</strong>
                <span>{pack.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            {mode === "rename" ? "Save changes" : "Create workspace"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
