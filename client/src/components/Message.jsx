import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Wraps each code block with a Copy button. The copied text is the <pre>'s visible text.
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
      <button className="code-copy" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

const markdownComponents = { pre: CodeBlock };

export default function Message({ role, content, tool, model }) {
  return (
    <div className={`message message-${role}`}>
      {role === "assistant" ? (
        <>
          {/* No text yet and no tool running: show the thinking dots. */}
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
          {tool && <em className="message-tool">Using {tool}…</em>}
          {model && content && <span className="message-model">{model}</span>}
        </>
      ) : (
        content
      )}
    </div>
  );
}
