export default function ChatSidebar({ chats, selectedId, error, disabled, onSelect, onNew, onDelete }) {
  return (
    <aside className="sidebar">
      <button className="sidebar-new" onClick={onNew} disabled={disabled}>
        New chat
      </button>
      {error && <p className="chat-error">{error}</p>}
      <ul className="sidebar-list">
        {chats.map((chat) => (
          <li key={chat.id} className={chat.id === selectedId ? "sidebar-item active" : "sidebar-item"}>
            <button className="sidebar-title" onClick={() => onSelect(chat.id)} disabled={disabled}>
              {chat.title}
            </button>
            <button
              className="sidebar-delete"
              onClick={() => onDelete(chat.id)}
              disabled={disabled}
              aria-label={`Delete ${chat.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
