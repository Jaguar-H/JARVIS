/** collapsed hides the panel via CSS, so the memory panel keeps its open/closed state. */
export default function ChatSidebar({
  chats, selectedId, error, disabled, collapsed, onSelect, onNew, onDelete, children,
}) {
  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"} aria-label="Chat history">
      <div className="sidebar-label">Mission Log</div>

      <button className="sidebar-new" onClick={onNew} disabled={disabled}>
        New session
      </button>

      {error && <p className="chat-error">{error}</p>}

      <ul className="sidebar-list" role="list">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className={chat.id === selectedId ? "sidebar-item active" : "sidebar-item"}
          >
            <button
              className="sidebar-title"
              onClick={() => onSelect(chat.id)}
              disabled={disabled}
            >
              {chat.title}
            </button>
            <button
              className="sidebar-delete"
              onClick={() => onDelete(chat.id)}
              disabled={disabled}
              aria-label={`Delete ${chat.title}`}
              title="Delete"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {children}
    </aside>
  );
}
