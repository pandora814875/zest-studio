import { PACK_COLLECTIONS } from "../../lib/constants";

function createStarterIdeas() {
  return Array.from(
    new Set(PACK_COLLECTIONS.flatMap((collection) => collection.promptIdeas)),
  ).slice(0, 6);
}

export function LibraryPanel({
  activeWorkspace,
  packs = [],
  onOpenCreatePack,
  onTogglePack,
  onUsePrompt,
}) {
  const loadedPacks = packs.filter((pack) => activeWorkspace.selectedPackIds.includes(pack.id));
  const starterIdeas = createStarterIdeas();

  return (
    <div className="drawer-stack">
      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Your system packs</h3>
            <p className="drawer-copy">
              Save your own Lua snippets as reusable context packs, then load them into any
              workspace when you need them.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={onOpenCreatePack}>
            Create pack
          </button>
        </div>

        {packs.length ? (
          <div className="drawer-pack-list">
            {packs.map((pack) => {
              const active = activeWorkspace.selectedPackIds.includes(pack.id);
              const fileCount = Array.isArray(pack.files) ? pack.files.length : 0;

              return (
                <button
                  className={`library-pack-card ${active ? "library-pack-card-active" : ""}`}
                  key={pack.id}
                  type="button"
                  onClick={() => onTogglePack(pack.id)}
                >
                  <div className="library-pack-card-head">
                    <strong>{pack.name}</strong>
                    <span>{active ? "Loaded" : "Available"}</span>
                  </div>
                  <p>{pack.description}</p>
                  <div className="collection-card-tags">
                    <span>{fileCount} file{fileCount === 1 ? "" : "s"}</span>
                    <span>{active ? "In workspace" : "Click to load"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pack-empty-state">
            <strong>No packs yet</strong>
            <p>
              Create your first pack to start turning your own Lua snippets into reusable build
              context.
            </p>
          </div>
        )}
      </div>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Loaded in this workspace</h3>
            <p className="drawer-copy">These are the packs the planner will use as extra context.</p>
          </div>
        </div>

        {loadedPacks.length ? (
          <div className="selected-pack-stack">
            {loadedPacks.map((pack) => (
              <button
                className="selected-pack-chip"
                key={pack.id}
                type="button"
                onClick={() => onTogglePack(pack.id)}
              >
                <strong>{pack.name}</strong>
                <span>{pack.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pack-empty-state pack-empty-state-compact">
            <strong>Nothing loaded yet</strong>
            <p>Choose a pack above to attach it to this workspace.</p>
          </div>
        )}
      </div>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Starter prompts</h3>
            <p className="drawer-copy">Use these when you want to move fast without thinking too hard.</p>
          </div>
        </div>
        <div className="drawer-suggestion-list">
          {starterIdeas.map((idea) => (
            <button
              className="suggestion-card suggestion-card-compact"
              key={idea}
              type="button"
              onClick={() => onUsePrompt(idea)}
            >
              {idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
