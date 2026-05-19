import { PACK_COLLECTIONS, PACK_LIBRARY } from "../../lib/constants";
import { getCollectionLoadedCount } from "../../lib/helpers";

export function LibraryPanel({
  activeWorkspace,
  selectedCollection,
  onSelectCollection,
  onToggleCollection,
  onTogglePack,
  onUsePrompt,
}) {
  return (
    <div className="drawer-stack">
      <div className="collection-grid collection-grid-drawer">
        {PACK_COLLECTIONS.map((collection) => {
          const active = collection.id === selectedCollection.id;
          const loadedCount = getCollectionLoadedCount(collection, activeWorkspace.selectedPackIds);
          return (
            <button
              className={`collection-card ${active ? "collection-card-active" : ""}`}
              key={collection.id}
              type="button"
              onClick={() => onSelectCollection(collection.id)}
            >
              <div className="collection-card-head">
                <strong>{collection.name}</strong>
                <span>{loadedCount}/{collection.packIds.length}</span>
              </div>
              <p>{collection.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>{selectedCollection.name}</h3>
            <p className="drawer-copy">{selectedCollection.blurb}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => onToggleCollection(selectedCollection.id)}>
            Toggle collection
          </button>
        </div>
        <div className="drawer-pack-list">
          {selectedCollection.packIds.map((packId) => {
            const pack = PACK_LIBRARY.find((entry) => entry.id === packId);
            if (!pack) {
              return null;
            }

            const active = activeWorkspace.selectedPackIds.includes(pack.id);
            return (
              <button
                className={`library-pack-card ${active ? "library-pack-card-active" : ""}`}
                key={pack.id}
                type="button"
                onClick={() => onTogglePack(pack.id)}
              >
                <strong>{pack.name}</strong>
                <p>{pack.description}</p>
                <span>{active ? "Loaded" : "Not loaded"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Starter prompts</h3>
            <p className="drawer-copy">Open ideas without cluttering the main build surface.</p>
          </div>
        </div>
        <div className="drawer-suggestion-list">
          {selectedCollection.promptIdeas.map((idea) => (
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
