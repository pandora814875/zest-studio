function iconForNode(node) {
  if (node.type === "root") {
    return "▣";
  }
  if (node.type === "folder") {
    return "▸";
  }
  if (node.name.includes(".server.")) {
    return "S";
  }
  if (node.name.includes(".client.")) {
    return "C";
  }
  return "M";
}

function ExplorerNode({ node, level, expandedIds, onToggle }) {
  const isExpanded = expandedIds.includes(node.id);
  const hasChildren = node.children?.length > 0;

  return (
    <div className="explorer-node">
      <button
        className="explorer-node-button"
        type="button"
        style={{ "--node-depth": level }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <span className={`explorer-node-icon ${hasChildren ? "explorer-node-icon-folder" : ""}`}>
          {iconForNode(node)}
        </span>
        <span className="explorer-node-label">{node.name}</span>
        {hasChildren ? <span className="explorer-node-chevron">{isExpanded ? "−" : "+"}</span> : null}
      </button>
      {hasChildren && isExpanded ? (
        <div className="explorer-children">
          {node.children.map((child) => (
            <ExplorerNode
              node={child}
              key={child.id}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ExplorerPanel({
  search,
  onSearch,
  tree,
  expandedIds,
  onToggle,
}) {
  return (
    <div className="drawer-stack">
      <label className="field">
        <span>Search files</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search ServerScriptService or Inventory..."
        />
      </label>

      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Roblox hierarchy</h3>
            <p className="drawer-copy">Mock Studio explorer with folders, scripts, and modules.</p>
          </div>
        </div>
        <div className="explorer-tree">
          {tree.length ? (
            tree.map((node) => (
              <ExplorerNode
                key={node.id}
                node={node}
                level={0}
                expandedIds={expandedIds}
                onToggle={onToggle}
              />
            ))
          ) : (
            <div className="empty-state-small">No explorer results for this search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
