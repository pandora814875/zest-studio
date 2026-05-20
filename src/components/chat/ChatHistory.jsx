import { PRODUCT_NAME } from "../../lib/constants";
import { formatDateTime } from "../../lib/helpers";
import { CodeBlockCard } from "./CodeBlockCard";

function LoadingMessage() {
  return (
    <div className="message-row message-row-assistant">
      <div className="message-bubble message-bubble-assistant message-bubble-loading">
        <div className="message-role">{PRODUCT_NAME}</div>
        <div className="message-skeleton-line" />
        <div className="message-skeleton-line message-skeleton-line-short" />
        <div className="message-skeleton-code" />
      </div>
    </div>
  );
}

export function ChatHistory({ messages, isSubmitting = false, onSuggestedAction }) {
  return (
    <div className="message-list">
      {messages.map((message) => {
        if (message.loading) {
          return <LoadingMessage key={message.id} />;
        }

        if (message.role === "user") {
          return (
            <div className="message-row message-row-user" key={message.id}>
              <div className="message-bubble message-bubble-user">
                <div className="message-role">You</div>
                <div className="message-content">{message.text}</div>
              </div>
            </div>
          );
        }

        const summary = message.summary || message.text || "Plan ready";
        const body =
          message.body && message.body !== summary ? message.body : message.text && message.text !== summary ? message.text : "";
        const bullets = Array.isArray(message.bullets) ? message.bullets : [];
        const tags = Array.isArray(message.tags) ? message.tags : [];
        const codeBlocks = Array.isArray(message.codeBlocks) ? message.codeBlocks : [];
        const suggestedActions = Array.isArray(message.suggestedActions)
          ? message.suggestedActions
          : Array.isArray(message.metadata?.suggested_actions)
            ? message.metadata.suggested_actions
            : [];

        return (
          <div className="message-row message-row-assistant" key={message.id}>
            <div className="message-bubble message-bubble-assistant message-bubble-rich">
              <div className="message-rich-head">
                <div className="message-role">{PRODUCT_NAME}</div>
                <span>{formatDateTime(message.createdAt)}</span>
              </div>
              <div className="message-content">{summary}</div>
              {body ? <p className="message-body">{body}</p> : null}
              {bullets.length ? (
                <ul className="message-bullet-list">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {tags.length ? (
                <div className="message-tag-row">
                  {tags.map((tag) => (
                    <span className="composer-pill" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {suggestedActions.length ? (
                <div className="message-action-row">
                  {suggestedActions.map((action) => (
                    <button
                      className="message-action-pill"
                      key={`${message.id}-${action}`}
                      type="button"
                      onClick={() => onSuggestedAction?.(action)}
                      disabled={isSubmitting}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              ) : null}
              {codeBlocks.length ? (
                <div className="message-code-stack">
                  {codeBlocks.map((block) => (
                    <CodeBlockCard block={block} key={block.id} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
