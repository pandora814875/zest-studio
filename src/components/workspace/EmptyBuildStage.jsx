import {
  BUILD_STAGE_PREVIEWS,
  PACK_COLLECTIONS,
} from "../../lib/constants";

export function EmptyBuildStage({ onOpenCollection }) {
  return (
    <div className="chat-scroll chat-scroll-stage">
      <div className="build-stage">
        <div className="build-stage-canvas">
          {BUILD_STAGE_PREVIEWS.map((preview, index) => (
            <div className={`build-preview-card build-preview-card-${index + 1}`} key={preview.id}>
              <span>{preview.eyebrow}</span>
              <strong>{preview.title}</strong>
            </div>
          ))}
          <div className="build-stage-copy">
            <div className="chat-empty-logo">Zest</div>
            <h2>Describe the next Roblox system.</h2>
            <p>
              Keep the workspace calm. Open Systems, Explorer, Studio, or History only when you need them,
              then come right back here to build.
            </p>
            <div className="build-stage-loaded">
              {PACK_COLLECTIONS.slice(0, 3).map((collection) => (
                <button
                  className="build-stage-chip"
                  key={collection.id}
                  type="button"
                  onClick={onOpenCollection}
                >
                  {collection.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
