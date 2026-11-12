import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ArcReactor from "./ArcReactor.jsx";

/** Wraps each code block with a Copy button. */
function CodeBlock({ children }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(preRef.current.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="code-block">
      <button className="code-copy" onClick={copy}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

const markdownComponents = { pre: CodeBlock };

export default function Message({ role, content, tool, model }) {
  if (role === "user") {
    return (
      <div className="message message-user">
        {content}
      </div>
    );
  }

  // Assistant message
  return (
    <div className="message message-assistant">
      {/* JARVIS label row */}
      <div className="message-assistant-header">
        <ArcReactor />
        <span className="message-assistant-label">J.A.R.V.I.S</span>
      </div>

      {/* Content or thinking indicator */}
      {content ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      ) : (
        !tool && (
          <span className="thinking" role="status" aria-label="Jarvis is thinking">
            <i /><i /><i />
          </span>
        )
      )}

      {/* Tool-use badge */}
      {tool && <em className="message-tool">{tool}…</em>}

      {/* Model attribution */}
      {model && content && (
        <span className="message-model">◈ {model}</span>
      )}
    </div>
  );
}
