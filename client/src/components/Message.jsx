import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Message({ role, content }) {
  return (
    <div className={`message message-${role}`}>
      {role === "assistant" ? (
        // An empty reply is still streaming in, so show a placeholder.
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "…"}</ReactMarkdown>
      ) : (
        content
      )}
    </div>
  );
}
