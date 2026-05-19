import { useState } from "react";

export function CodeBlockCard({ block }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block-card">
      <div className="code-block-head">
        <div>
          <strong>{block.title}</strong>
          <span>{block.path}</span>
        </div>
        <button className="secondary-button code-copy-button" type="button" onClick={handleCopy}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="code-block-pre">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}
