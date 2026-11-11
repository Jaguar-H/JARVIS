import { useEffect, useRef } from "react";
import Message from "./Message.jsx";

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  return (
    <div className="message-list">
      {/* Append-only list, so the index is a stable key. */}
      {messages.map((message, index) => (
        <Message key={index} role={message.role} content={message.content} tool={message.tool} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
