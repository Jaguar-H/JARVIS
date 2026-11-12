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
    <div className="chat-input-wrapper">
      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Awaiting your command…"
          rows={1}
          disabled={isLoading}
          autoFocus
        />
        {isLoading ? (
          <button type="button" className="chat-input-stop stop" onClick={onStop}>
            ■ Abort
          </button>
        ) : (
          <button type="submit" className="chat-input-send send" disabled={!text.trim()}>
            ▶ Send
          </button>
        )}
      </form>
      <p className="input-hint">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
