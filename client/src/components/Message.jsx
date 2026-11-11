import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Message({ role, content, tool }) {
  return (
    <div className={`message message-${role}`}>
      {role === "assistant" ? (
        <>
          {/* An empty reply is still streaming in, so show a placeholder. */}
          {(content || !tool) && (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "…"}</ReactMarkdown>
          )}
          {tool && <em className="message-tool">Using {tool}…</em>}
        </>
      ) : (
        content
      )}
    </div>
  );
}
