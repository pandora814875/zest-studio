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

export function ChatHistory({ messages }) {
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

        return (
          <div className="message-row message-row-assistant" key={message.id}>
            <div className="message-bubble message-bubble-assistant message-bubble-rich">
              <div className="message-rich-head">
                <div className="message-role">{PRODUCT_NAME}</div>
                <span>{formatDateTime(message.createdAt)}</span>
              </div>
              <div className="message-content">{message.summary}</div>
              <p className="message-body">{message.body}</p>
              <ul className="message-bullet-list">
                {(message.bullets || []).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="message-tag-row">
                {(message.tags || []).map((tag) => (
                  <span className="composer-pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="message-code-stack">
                {(message.codeBlocks || []).map((block) => (
                  <CodeBlockCard block={block} key={block.id} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
