import { useState } from "react";

export default function ChatInput({ onSend, onStop, isLoading }) {
  const [text, setText] = useState("");

  function submit() {
    const content = text.trim();
    if (!content || isLoading) return;

    setText("");
    onSend(content);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit();
  }

  // Enter sends, Shift+Enter adds a line. Enter during IME composition is left alone.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Jarvis"
        rows={1}
        disabled={isLoading}
        autoFocus
      />
      {isLoading ? (
        <button type="button" className="stop" onClick={onStop}>Stop</button>
      ) : (
        <button type="submit" className="send" disabled={!text.trim()}>Send</button>
      )}
    </form>
  );
}
