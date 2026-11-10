import { useState } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const content = text.trim();
    if (!content || disabled) return;

    setText("");
    onSend(content);
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Message Jarvis"
        autoFocus
      />
      <button type="submit" disabled={disabled}>Send</button>
    </form>
  );
}
