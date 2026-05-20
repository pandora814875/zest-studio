import { useEffect, useMemo, useState } from "react";
import { ModalShell } from "./ModalShell";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultPackPath(packName, index) {
  const base = slugify(packName) || "system-pack";
  return `ReplicatedStorage/Packs/${base}${index > 0 ? `-${index + 1}` : ""}.lua`;
}

function parsePackFiles(rawText, packName) {
  const source = rawText.trim();
  if (!source) {
    return [];
  }

  const filePattern = /^--\s*file\s*:\s*(.+)$/gim;
  if (!filePattern.test(source)) {
    return [
      {
        path: defaultPackPath(packName, 0),
        language: "lua",
        code: source,
      },
    ];
  }

  filePattern.lastIndex = 0;
  const matches = [...source.matchAll(filePattern)];

  return matches
    .map((match, index) => {
      const header = match[0];
      const explicitPath = match[1]?.trim();
      const start = match.index + header.length;
      const end = matches[index + 1]?.index ?? source.length;
      const code = source.slice(start, end).trim();

      if (!code) {
        return null;
      }

      return {
        path: explicitPath || defaultPackPath(packName, index),
        language: "lua",
        code,
      };
    })
    .filter(Boolean);
}

export function CreatePackModal({ open, error, isSubmitting, onClose, onSubmit }) {
  const initialState = useMemo(
    () => ({
      name: "",
      description: "",
      snippets: "",
    }),
    [],
  );

  const [values, setValues] = useState(initialState);

  useEffect(() => {
    if (open) {
      setValues(initialState);
    }
  }, [initialState, open]);

  if (!open) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const files = parsePackFiles(values.snippets, values.name);
    onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      files,
    });
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="dialog-head">
          <div>
            <span className="sidebar-label">Create pack</span>
            <h2>Turn your Lua snippets into a reusable system pack</h2>
          </div>
          <button className="drawer-close-button" type="button" onClick={onClose}>
            x
          </button>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <label className="field">
          <span>Pack name</span>
          <input
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="RNG Card System"
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
            placeholder="Weighted rolls, pity handling, reveal states, and collection metadata."
            required
          />
        </label>

        <label className="field">
          <span>Lua snippets</span>
          <textarea
            rows={12}
            value={values.snippets}
            onChange={(event) =>
              setValues((current) => ({ ...current, snippets: event.target.value }))
            }
            placeholder={`-- file: ReplicatedStorage/RNG/RarityTable.lua\nlocal rarityTable = {}\n\nreturn rarityTable\n\n-- file: ServerScriptService/RNG/RNGService.server.lua\nlocal RNGService = {}\n\nreturn RNGService`}
            required
          />
        </label>

        <div className="notice pack-snippet-note">
          Paste one snippet or several. To split into multiple files, start each block with
          <code> -- file: path/to/File.lua</code>.
        </div>

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving pack..." : "Save pack"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
