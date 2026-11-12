import { useEffect, useRef } from "react";
import EmptyState from "./EmptyState.jsx";
import Message from "./Message.jsx";

// Within this many pixels of the bottom, the list keeps following the streamed reply.
const FOLLOW_THRESHOLD_PX = 80;

export default function MessageList({ messages, onPrompt }) {
  const listRef = useRef(null);
  const following = useRef(true);
  const lastCount = useRef(0);

  useEffect(() => {
    const list = listRef.current;
    // A new message (yours, or the reply's placeholder) always scrolls down.
    if (messages.length !== lastCount.current) following.current = true;
    lastCount.current = messages.length;
    if (following.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const list = listRef.current;
    following.current =
      list.scrollHeight - list.scrollTop - list.clientHeight < FOLLOW_THRESHOLD_PX;
  }

  return (
    <div className="message-list" ref={listRef} onScroll={handleScroll}>
      {messages.length === 0 && <EmptyState onPrompt={onPrompt} />}
      {/* Append-only list, so the index is a stable key. */}
      {messages.map((message, index) => (
        <Message key={index} role={message.role} content={message.content} tool={message.tool} model={message.model} />
      ))}
    </div>
  );
}
